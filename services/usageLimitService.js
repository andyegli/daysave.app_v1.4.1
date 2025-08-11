/**
 * Usage Limit Service
 * 
 * Manages user usage tracking against subscription plan limits including:
 * - AI token usage and costs
 * - Storage costs 
 * - Monthly limit enforcement
 * - Usage alerts and notifications
 * - Real-time usage calculations
 * 
 * FEATURES:
 * - Per-user per-month usage tracking
 * - Automatic limit enforcement
 * - Usage alert system at configurable thresholds
 * - Real-time usage calculations
 * - Admin override capabilities
 * - Detailed usage analytics and reporting
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-11
 */

const { ExternalAiUsage, StorageUsage, UserSubscription, SubscriptionPlan, User } = require('../models');
const { Op } = require('sequelize');

class UsageLimitService {
  constructor() {
    this.name = 'UsageLimitService';
  }

  /**
   * Get current billing period (YYYY-MM format)
   * @returns {string} Current billing period
   */
  getCurrentBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Get user's current subscription plan with limits
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User subscription with plan details
   */
  async getUserSubscriptionPlan(userId) {
    try {
      const userSubscription = await UserSubscription.findOne({
        where: { 
          user_id: userId,
          status: 'active'
        },
        include: [{
          model: SubscriptionPlan,
          as: 'subscriptionPlan',
          required: true
        }],
        order: [['created_at', 'DESC']]
      });

      if (!userSubscription) {
        // Get default free plan if no subscription found
        const freePlan = await SubscriptionPlan.findOne({
          where: { name: 'free' }
        });
        
        if (!freePlan) {
          throw new Error('No subscription plan found for user and no default free plan available');
        }

        return {
          subscriptionPlan: freePlan,
          isDefaultPlan: true
        };
      }

      return {
        subscriptionPlan: userSubscription.subscriptionPlan,
        isDefaultPlan: false,
        subscription: userSubscription
      };
    } catch (error) {
      console.error('Error getting user subscription plan:', error);
      throw error;
    }
  }

  /**
   * Calculate user's current month usage
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Object>} Current usage statistics
   */
  async calculateUserMonthlyUsage(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    
    try {
      // Get AI usage for the month
      const aiUsage = await ExternalAiUsage.findAll({
        where: {
          user_id: userId,
          billing_period: period,
          success: true
        },
        attributes: ['total_tokens', 'estimated_cost_usd']
      });

      // Get storage usage for the month
      const storageUsage = await StorageUsage.findAll({
        where: {
          user_id: userId,
          billing_period: period,
          success: true
        },
        attributes: ['estimated_cost_usd']
      });

      // Calculate totals
      const totalTokens = aiUsage.reduce((sum, record) => sum + (record.total_tokens || 0), 0);
      const totalAiCost = aiUsage.reduce((sum, record) => sum + parseFloat(record.estimated_cost_usd || 0), 0);
      const totalStorageCost = storageUsage.reduce((sum, record) => sum + parseFloat(record.estimated_cost_usd || 0), 0);
      const totalCost = totalAiCost + totalStorageCost;

      return {
        billingPeriod: period,
        ai: {
          tokens: totalTokens,
          cost: totalAiCost,
          recordCount: aiUsage.length
        },
        storage: {
          cost: totalStorageCost,
          recordCount: storageUsage.length
        },
        total: {
          cost: totalCost,
          recordCount: aiUsage.length + storageUsage.length
        }
      };
    } catch (error) {
      console.error('Error calculating user monthly usage:', error);
      throw error;
    }
  }

  /**
   * Check if user is within usage limits
   * @param {string} userId - User ID
   * @param {Object} newUsage - New usage to add (optional)
   * @returns {Promise<Object>} Limit check results
   */
  async checkUsageLimits(userId, newUsage = {}) {
    try {
      // Get user's subscription plan
      const { subscriptionPlan } = await this.getUserSubscriptionPlan(userId);
      
      // Calculate current usage
      const currentUsage = await this.calculateUserMonthlyUsage(userId);
      
      // Add new usage if provided
      const projectedUsage = {
        ai: {
          tokens: currentUsage.ai.tokens + (newUsage.tokens || 0),
          cost: currentUsage.ai.cost + (newUsage.aiCost || 0)
        },
        storage: {
          cost: currentUsage.storage.cost + (newUsage.storageCost || 0)
        },
        total: {
          cost: currentUsage.total.cost + (newUsage.aiCost || 0) + (newUsage.storageCost || 0)
        }
      };

      // Check limits (skip if unlimited = -1)
      const limits = {
        tokens: {
          limit: subscriptionPlan.max_ai_tokens_per_month,
          current: projectedUsage.ai.tokens,
          exceeded: subscriptionPlan.max_ai_tokens_per_month !== -1 && 
                   projectedUsage.ai.tokens > subscriptionPlan.max_ai_tokens_per_month,
          percentage: subscriptionPlan.max_ai_tokens_per_month !== -1 ? 
                     (projectedUsage.ai.tokens / subscriptionPlan.max_ai_tokens_per_month) * 100 : 0
        },
        aiCost: {
          limit: subscriptionPlan.max_ai_cost_per_month_usd,
          current: projectedUsage.ai.cost,
          exceeded: subscriptionPlan.max_ai_cost_per_month_usd !== -1 && 
                   projectedUsage.ai.cost > subscriptionPlan.max_ai_cost_per_month_usd,
          percentage: subscriptionPlan.max_ai_cost_per_month_usd !== -1 ? 
                     (projectedUsage.ai.cost / subscriptionPlan.max_ai_cost_per_month_usd) * 100 : 0
        },
        storageCost: {
          limit: subscriptionPlan.max_storage_cost_per_month_usd,
          current: projectedUsage.storage.cost,
          exceeded: subscriptionPlan.max_storage_cost_per_month_usd !== -1 && 
                   projectedUsage.storage.cost > subscriptionPlan.max_storage_cost_per_month_usd,
          percentage: subscriptionPlan.max_storage_cost_per_month_usd !== -1 ? 
                     (projectedUsage.storage.cost / subscriptionPlan.max_storage_cost_per_month_usd) * 100 : 0
        },
        totalCost: {
          limit: subscriptionPlan.max_total_cost_per_month_usd,
          current: projectedUsage.total.cost,
          exceeded: subscriptionPlan.max_total_cost_per_month_usd !== -1 && 
                   projectedUsage.total.cost > subscriptionPlan.max_total_cost_per_month_usd,
          percentage: subscriptionPlan.max_total_cost_per_month_usd !== -1 ? 
                     (projectedUsage.total.cost / subscriptionPlan.max_total_cost_per_month_usd) * 100 : 0
        }
      };

      // Determine overall status
      const anyLimitExceeded = Object.values(limits).some(limit => limit.exceeded);
      const alertThreshold = subscriptionPlan.usage_alert_threshold_percent;
      const shouldAlert = subscriptionPlan.usage_alerts_enabled && 
                         Object.values(limits).some(limit => 
                           limit.percentage >= alertThreshold && limit.limit !== -1);

      return {
        allowed: !anyLimitExceeded,
        limits,
        currentUsage,
        projectedUsage,
        subscriptionPlan: {
          name: subscriptionPlan.name,
          displayName: subscriptionPlan.display_name,
          alertThreshold,
          alertsEnabled: subscriptionPlan.usage_alerts_enabled
        },
        shouldAlert,
        alertLevel: shouldAlert ? (anyLimitExceeded ? 'critical' : 'warning') : 'ok',
        billingPeriod: currentUsage.billingPeriod
      };
    } catch (error) {
      console.error('Error checking usage limits:', error);
      throw error;
    }
  }

  /**
   * Get usage statistics for multiple months
   * @param {string} userId - User ID
   * @param {number} monthsBack - Number of months to include (default: 12)
   * @returns {Promise<Array>} Monthly usage history
   */
  async getUserUsageHistory(userId, monthsBack = 12) {
    try {
      const history = [];
      const now = new Date();
      
      for (let i = 0; i < monthsBack; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const billingPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        const usage = await this.calculateUserMonthlyUsage(userId, billingPeriod);
        history.push({
          ...usage,
          month: date.toLocaleString('default', { month: 'long', year: 'numeric' })
        });
      }
      
      return history.reverse(); // Return chronological order
    } catch (error) {
      console.error('Error getting user usage history:', error);
      throw error;
    }
  }

  /**
   * Get system-wide usage statistics (admin)
   * @param {string} billingPeriod - Billing period (optional)
   * @returns {Promise<Object>} System usage statistics
   */
  async getSystemUsageStatistics(billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    
    try {
      // Get all users with usage in the period
      const [aiStats, storageStats] = await Promise.all([
        ExternalAiUsage.findOne({
          where: { billing_period: period, success: true },
          attributes: [
            [ExternalAiUsage.sequelize.fn('COUNT', ExternalAiUsage.sequelize.col('id')), 'recordCount'],
            [ExternalAiUsage.sequelize.fn('SUM', ExternalAiUsage.sequelize.col('total_tokens')), 'totalTokens'],
            [ExternalAiUsage.sequelize.fn('SUM', ExternalAiUsage.sequelize.col('estimated_cost_usd')), 'totalCost'],
            [ExternalAiUsage.sequelize.fn('COUNT', ExternalAiUsage.sequelize.fn('DISTINCT', ExternalAiUsage.sequelize.col('user_id'))), 'uniqueUsers']
          ],
          raw: true
        }),
        StorageUsage.findOne({
          where: { billing_period: period, success: true },
          attributes: [
            [StorageUsage.sequelize.fn('COUNT', StorageUsage.sequelize.col('id')), 'recordCount'],
            [StorageUsage.sequelize.fn('SUM', StorageUsage.sequelize.col('estimated_cost_usd')), 'totalCost'],
            [StorageUsage.sequelize.fn('COUNT', StorageUsage.sequelize.fn('DISTINCT', StorageUsage.sequelize.col('user_id'))), 'uniqueUsers']
          ],
          raw: true
        })
      ]);

      return {
        billingPeriod: period,
        ai: {
          recordCount: parseInt(aiStats?.recordCount || 0),
          totalTokens: parseInt(aiStats?.totalTokens || 0),
          totalCost: parseFloat(aiStats?.totalCost || 0),
          uniqueUsers: parseInt(aiStats?.uniqueUsers || 0)
        },
        storage: {
          recordCount: parseInt(storageStats?.recordCount || 0),
          totalCost: parseFloat(storageStats?.totalCost || 0),
          uniqueUsers: parseInt(storageStats?.uniqueUsers || 0)
        },
        total: {
          recordCount: parseInt(aiStats?.recordCount || 0) + parseInt(storageStats?.recordCount || 0),
          totalCost: parseFloat(aiStats?.totalCost || 0) + parseFloat(storageStats?.totalCost || 0),
          uniqueUsers: Math.max(parseInt(aiStats?.uniqueUsers || 0), parseInt(storageStats?.uniqueUsers || 0))
        }
      };
    } catch (error) {
      console.error('Error getting system usage statistics:', error);
      throw error;
    }
  }

  /**
   * Get top users by usage (admin)
   * @param {string} billingPeriod - Billing period (optional)
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top users by usage
   */
  async getTopUsersByUsage(billingPeriod = null, limit = 10) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    
    try {
      // This would require a more complex query, simplified for now
      const users = await User.findAll({
        attributes: ['id', 'username', 'email'],
        limit
      });

      const usersWithUsage = await Promise.all(
        users.map(async user => {
          const usage = await this.calculateUserMonthlyUsage(user.id, period);
          return {
            user: {
              id: user.id,
              username: user.username,
              email: user.email
            },
            usage
          };
        })
      );

      // Sort by total cost
      return usersWithUsage.sort((a, b) => b.usage.total.cost - a.usage.total.cost);
    } catch (error) {
      console.error('Error getting top users by usage:', error);
      throw error;
    }
  }
}

module.exports = UsageLimitService;
