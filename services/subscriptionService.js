const { SubscriptionPlan, UserSubscription, SubscriptionTransaction, User } = require('../models');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

class SubscriptionService {
  /**
   * Get all active subscription plans
   * @returns {Promise<Array>} Array of subscription plans
   */
  async getAllPlans() {
    try {
      const plans = await SubscriptionPlan.findAll({
        where: { is_active: true },
        order: [['sort_order', 'ASC']]
      });
      
      logger.info('Retrieved all subscription plans', { count: plans.length });
      return plans;
    } catch (error) {
      logger.error('Error retrieving subscription plans', { error: error.message });
      throw error;
    }
  }

  /**
   * Get subscription plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Object>} Subscription plan
   */
  async getPlanById(planId) {
    try {
      const plan = await SubscriptionPlan.findByPk(planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }
      
      logger.info('Retrieved subscription plan', { planId, planName: plan.name });
      return plan;
    } catch (error) {
      logger.error('Error retrieving subscription plan', { planId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user's current subscription
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User subscription or null
   */
  async getUserSubscription(userId) {
    try {
      const subscription = await UserSubscription.findOne({
        where: { user_id: userId },
        include: [{
          model: SubscriptionPlan,
          as: 'subscriptionPlan'
        }]
      });
      
      if (subscription) {
        logger.info('Retrieved user subscription', { 
          userId, 
          planName: subscription.subscriptionPlan.name,
          status: subscription.status 
        });
      }
      
      return subscription;
    } catch (error) {
      logger.error('Error retrieving user subscription', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Create new subscription for user
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @param {Object} paymentDetails - Payment method details
   * @returns {Promise<Object>} Created subscription
   */
  async createSubscription(userId, planId, billingCycle = 'monthly', paymentDetails = {}) {
    try {
      // Check if user already has a subscription
      const existingSubscription = await this.getUserSubscription(userId);
      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Get the plan details
      const plan = await this.getPlanById(planId);
      
      // Calculate subscription period
      const currentDate = new Date();
      const periodEnd = new Date(currentDate);
      
      if (billingCycle === 'yearly') {
        periodEnd.setFullYear(currentDate.getFullYear() + 1);
      } else {
        periodEnd.setMonth(currentDate.getMonth() + 1);
      }

      // Create subscription record
      const subscription = await UserSubscription.create({
        id: uuidv4(),
        user_id: userId,
        subscription_plan_id: planId,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: currentDate,
        current_period_end: periodEnd,
        next_billing_date: periodEnd,
        payment_method: paymentDetails.method || 'mock',
        payment_status: 'paid',
        last_payment_date: currentDate,
        last_payment_amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly
      });

      // Create transaction record
      await this.createTransaction(userId, planId, 'purchase', {
        amount: billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly,
        billingCycle,
        paymentDetails,
        periodStart: currentDate,
        periodEnd: periodEnd
      });

      logger.info('Created new subscription', { 
        userId, 
        planId, 
        billingCycle, 
        subscriptionId: subscription.id 
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription', { 
        userId, 
        planId, 
        billingCycle, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Upgrade or downgrade subscription
   * @param {string} userId - User ID
   * @param {string} newPlanId - New plan ID
   * @param {Object} options - Upgrade options
   * @returns {Promise<Object>} Updated subscription
   */
  async changeSubscription(userId, newPlanId, options = {}) {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      if (!currentSubscription) {
        throw new Error('No active subscription found');
      }

      const newPlan = await this.getPlanById(newPlanId);
      const currentPlan = currentSubscription.subscriptionPlan;

      // Determine if upgrade or downgrade
      const isUpgrade = newPlan.price_monthly > currentPlan.price_monthly;
      const transactionType = isUpgrade ? 'upgrade' : 'downgrade';

      // Calculate proration amount
      const prorationAmount = this.calculateProration(
        currentSubscription,
        currentPlan,
        newPlan
      );

      // Update subscription
      await currentSubscription.update({
        subscription_plan_id: newPlanId,
        updated_at: new Date()
      });

      // Create transaction record
      await this.createTransaction(userId, newPlanId, transactionType, {
        amount: prorationAmount,
        billingCycle: currentSubscription.billing_cycle,
        previousPlanId: currentPlan.id,
        prorationAmount: prorationAmount
      });

      logger.info('Changed subscription', { 
        userId, 
        fromPlan: currentPlan.name,
        toPlan: newPlan.name,
        transactionType,
        prorationAmount 
      });

      return await this.getUserSubscription(userId);
    } catch (error) {
      logger.error('Error changing subscription', { 
        userId, 
        newPlanId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Cancel subscription
   * @param {string} userId - User ID
   * @param {string} reason - Cancellation reason
   * @param {boolean} immediate - Cancel immediately or at period end
   * @returns {Promise<Object>} Updated subscription
   */
  async cancelSubscription(userId, reason = '', immediate = false) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const updateData = {
        cancelled_at: new Date(),
        cancellation_reason: reason,
        auto_renew: false
      };

      if (immediate) {
        updateData.status = 'cancelled';
        updateData.current_period_end = new Date();
      } else {
        // Cancel at period end
        updateData.status = 'cancelled';
      }

      await subscription.update(updateData);

      // Create transaction record
      await this.createTransaction(userId, subscription.subscription_plan_id, 'cancellation', {
        amount: 0,
        billingCycle: subscription.billing_cycle,
        description: `Subscription cancelled${immediate ? ' immediately' : ' at period end'}. Reason: ${reason}`
      });

      logger.info('Cancelled subscription', { 
        userId, 
        subscriptionId: subscription.id,
        immediate,
        reason 
      });

      return subscription;
    } catch (error) {
      logger.error('Error cancelling subscription', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Check if user has exceeded usage limits
   * @param {string} userId - User ID
   * @param {string} feature - Feature to check (file_uploads, storage, api_requests, etc.)
   * @param {number} requestedAmount - Amount being requested
   * @returns {Promise<Object>} Usage check result
   */
  async checkUsageLimit(userId, feature, requestedAmount = 1) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const plan = subscription.subscriptionPlan;
      const usageField = `usage_${feature}`;
      const limitField = `max_${feature}`;

      const currentUsage = subscription[usageField] || 0;
      const limit = plan[limitField];

      // -1 means unlimited
      if (limit === -1) {
        return { allowed: true, unlimited: true };
      }

      const wouldExceed = (currentUsage + requestedAmount) > limit;
      const remaining = Math.max(0, limit - currentUsage);

      logger.info('Usage limit check', {
        userId,
        feature,
        currentUsage,
        limit,
        requestedAmount,
        wouldExceed,
        remaining
      });

      return {
        allowed: !wouldExceed,
        unlimited: false,
        currentUsage,
        limit,
        remaining,
        wouldExceed
      };
    } catch (error) {
      logger.error('Error checking usage limit', { 
        userId, 
        feature, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Update usage counters
   * @param {string} userId - User ID
   * @param {string} feature - Feature being used
   * @param {number} amount - Amount to add (default: 1)
   * @returns {Promise<Object>} Updated subscription
   */
  async updateUsage(userId, feature, amount = 1) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      const usageField = `usage_${feature}`;
      const currentUsage = subscription[usageField] || 0;

      await subscription.update({
        [usageField]: currentUsage + amount
      });

      logger.info('Updated usage', {
        userId,
        feature,
        amount,
        newUsage: currentUsage + amount
      });

      return subscription;
    } catch (error) {
      logger.error('Error updating usage', { 
        userId, 
        feature, 
        amount, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Reset monthly usage counters
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated subscription
   */
  async resetMonthlyUsage(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      await subscription.update({
        usage_api_requests: 0,
        usage_file_uploads: 0
      });

      logger.info('Reset monthly usage', { userId });
      return subscription;
    } catch (error) {
      logger.error('Error resetting monthly usage', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get user's subscription history
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transaction history
   */
  async getSubscriptionHistory(userId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const transactions = await SubscriptionTransaction.findAndCountAll({
        where: { user_id: userId },
        include: [{
          model: SubscriptionPlan,
          as: 'subscriptionPlan'
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      logger.info('Retrieved subscription history', { 
        userId, 
        count: transactions.count,
        returned: transactions.rows.length 
      });

      return transactions;
    } catch (error) {
      logger.error('Error retrieving subscription history', { 
        userId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create transaction record
   * @param {string} userId - User ID
   * @param {string} planId - Plan ID
   * @param {string} type - Transaction type
   * @param {Object} details - Transaction details
   * @returns {Promise<Object>} Created transaction
   */
  async createTransaction(userId, planId, type, details = {}) {
    try {
      const transaction = await SubscriptionTransaction.create({
        id: uuidv4(),
        user_id: userId,
        subscription_plan_id: planId,
        transaction_type: type,
        amount: details.amount || 0,
        currency: details.currency || 'USD',
        billing_cycle: details.billingCycle || 'monthly',
        status: 'completed',
        payment_method: details.paymentDetails?.method || 'mock',
        transaction_id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        payment_gateway: 'mock',
        payment_gateway_response: JSON.stringify({ 
          success: true, 
          mock: true,
          timestamp: new Date().toISOString()
        }),
        period_start: details.periodStart,
        period_end: details.periodEnd,
        previous_plan_id: details.previousPlanId,
        proration_amount: details.prorationAmount,
        description: details.description,
        metadata: details.metadata,
        processed_at: new Date()
      });

      logger.info('Created transaction', { 
        userId, 
        planId, 
        type, 
        amount: details.amount,
        transactionId: transaction.id 
      });

      return transaction;
    } catch (error) {
      logger.error('Error creating transaction', { 
        userId, 
        planId, 
        type, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Calculate proration amount for plan changes
   * @param {Object} currentSubscription - Current subscription
   * @param {Object} currentPlan - Current plan
   * @param {Object} newPlan - New plan
   * @returns {number} Proration amount
   */
  calculateProration(currentSubscription, currentPlan, newPlan) {
    const now = new Date();
    const periodStart = new Date(currentSubscription.current_period_start);
    const periodEnd = new Date(currentSubscription.current_period_end);
    
    const totalPeriodDays = (periodEnd - periodStart) / (1000 * 60 * 60 * 24);
    const remainingDays = (periodEnd - now) / (1000 * 60 * 60 * 24);
    const usedRatio = (totalPeriodDays - remainingDays) / totalPeriodDays;
    
    const currentPrice = currentSubscription.billing_cycle === 'yearly' 
      ? currentPlan.price_yearly 
      : currentPlan.price_monthly;
    
    const newPrice = currentSubscription.billing_cycle === 'yearly' 
      ? newPlan.price_yearly 
      : newPlan.price_monthly;
    
    const refundAmount = currentPrice * (1 - usedRatio);
    const prorationAmount = newPrice - refundAmount;
    
    return Math.max(0, prorationAmount);
  }

  /**
   * Process subscription renewals (to be called by cron job)
   * @returns {Promise<Object>} Renewal results
   */
  async processRenewals() {
    try {
      const now = new Date();
      const subscriptions = await UserSubscription.findAll({
        where: {
          status: 'active',
          auto_renew: true,
          next_billing_date: { [require('sequelize').Op.lte]: now }
        },
        include: [{
          model: SubscriptionPlan,
          as: 'subscriptionPlan'
        }]
      });

      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const subscription of subscriptions) {
        try {
          await this.renewSubscription(subscription);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription.id,
            userId: subscription.user_id,
            error: error.message
          });
        }
        results.processed++;
      }

      logger.info('Processed subscription renewals', results);
      return results;
    } catch (error) {
      logger.error('Error processing renewals', { error: error.message });
      throw error;
    }
  }

  /**
   * Renew individual subscription
   * @param {Object} subscription - Subscription to renew
   * @returns {Promise<Object>} Renewed subscription
   */
  async renewSubscription(subscription) {
    try {
      const plan = subscription.subscriptionPlan;
      const amount = subscription.billing_cycle === 'yearly' 
        ? plan.price_yearly 
        : plan.price_monthly;

      // Calculate new period
      const currentPeriodEnd = new Date(subscription.current_period_end);
      const newPeriodEnd = new Date(currentPeriodEnd);
      
      if (subscription.billing_cycle === 'yearly') {
        newPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);
      }

      // Update subscription
      await subscription.update({
        current_period_start: currentPeriodEnd,
        current_period_end: newPeriodEnd,
        next_billing_date: newPeriodEnd,
        last_payment_date: new Date(),
        last_payment_amount: amount,
        payment_status: 'paid'
      });

      // Create renewal transaction
      await this.createTransaction(subscription.user_id, subscription.subscription_plan_id, 'renewal', {
        amount,
        billingCycle: subscription.billing_cycle,
        periodStart: currentPeriodEnd,
        periodEnd: newPeriodEnd
      });

      // Reset monthly usage counters
      await this.resetMonthlyUsage(subscription.user_id);

      logger.info('Renewed subscription', {
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        amount,
        newPeriodEnd
      });

      return subscription;
    } catch (error) {
      logger.error('Error renewing subscription', {
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new SubscriptionService(); 