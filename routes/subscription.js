const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const { UserSubscription, SubscriptionPlan, User } = require('../models');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');
const { sequelize } = require('../models');

// Web Routes
// Subscription plans page
router.get('/plans', (req, res) => {
  res.render('subscription/plans', {
    title: 'Subscription Plans - DaySave',
    user: req.user
  });
});

// Subscription management page
router.get('/manage', isAuthenticated, (req, res) => {
  res.render('subscription/manage', {
    title: 'Manage Subscription - DaySave',
    user: req.user
  });
});

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in subscription route', { 
      errors: errors.array(),
      userId: req.user?.id,
      route: req.route?.path 
    });
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

// Get all subscription plans (API)
router.get('/api/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    
    logger.info('Retrieved subscription plans', { 
      count: plans.length,
      userId: req.user?.id 
    });
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    logger.error('Error retrieving subscription plans', { 
      error: error.message,
      userId: req.user?.id 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription plans'
    });
  }
});

// Get specific plan details (API)
router.get('/api/plans/:planId', [
  param('planId').isUUID().withMessage('Plan ID must be a valid UUID'),
  validateRequest
], async (req, res) => {
  try {
    const plan = await subscriptionService.getPlanById(req.params.planId);
    
    logger.info('Retrieved subscription plan', { 
      planId: req.params.planId,
      planName: plan.name,
      userId: req.user?.id 
    });
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    logger.error('Error retrieving subscription plan', { 
      planId: req.params.planId,
      error: error.message,
      userId: req.user?.id 
    });
    
    if (error.message === 'Subscription plan not found') {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription plan'
    });
  }
});

// Get user's current subscription
router.get('/current', isAuthenticated, async (req, res) => {
  try {
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    
    logger.info('Retrieved user subscription', { 
      userId: req.user.id,
      hasSubscription: !!subscription 
    });
    
    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Error retrieving user subscription', { 
      userId: req.user.id,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription'
    });
  }
});

// Create new subscription
router.post('/subscribe', [
  isAuthenticated,
  body('planId').isUUID().withMessage('Plan ID must be a valid UUID'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be a string'),
  validateRequest
], async (req, res) => {
  try {
    const { planId, billingCycle, paymentMethod } = req.body;
    
    const subscription = await subscriptionService.createSubscription(
      req.user.id,
      planId,
      billingCycle,
      { method: paymentMethod }
    );
    
    logger.info('Created new subscription', { 
      userId: req.user.id,
      planId,
      billingCycle,
      subscriptionId: subscription.id 
    });
    
    res.status(201).json({
      success: true,
      data: subscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    logger.error('Error creating subscription', { 
      userId: req.user.id,
      planId: req.body.planId,
      error: error.message 
    });
    
    if (error.message === 'User already has an active subscription') {
      return res.status(400).json({
        success: false,
        error: 'User already has an active subscription'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// Change subscription plan
router.put('/change', [
  isAuthenticated,
  body('planId').isUUID().withMessage('Plan ID must be a valid UUID'),
  validateRequest
], async (req, res) => {
  try {
    const { planId } = req.body;
    
    const subscription = await subscriptionService.changeSubscription(
      req.user.id,
      planId
    );
    
    logger.info('Changed subscription plan', { 
      userId: req.user.id,
      newPlanId: planId,
      subscriptionId: subscription.id 
    });
    
    res.json({
      success: true,
      data: subscription,
      message: 'Subscription plan changed successfully'
    });
  } catch (error) {
    logger.error('Error changing subscription plan', { 
      userId: req.user.id,
      planId: req.body.planId,
      error: error.message 
    });
    
    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to change subscription plan'
    });
  }
});

// Cancel subscription
router.post('/cancel', [
  isAuthenticated,
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('immediate').optional().isBoolean().withMessage('Immediate must be a boolean'),
  validateRequest
], async (req, res) => {
  try {
    const { reason = '', immediate = false } = req.body;
    
    const subscription = await subscriptionService.cancelSubscription(
      req.user.id,
      reason,
      immediate
    );
    
    logger.info('Cancelled subscription', { 
      userId: req.user.id,
      subscriptionId: subscription.id,
      immediate,
      reason 
    });
    
    res.json({
      success: true,
      data: subscription,
      message: `Subscription cancelled${immediate ? ' immediately' : ' at period end'}`
    });
  } catch (error) {
    logger.error('Error cancelling subscription', { 
      userId: req.user.id,
      error: error.message 
    });
    
    if (error.message === 'No active subscription found') {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Check usage limits
router.get('/usage/:feature', [
  isAuthenticated,
  param('feature').isIn(['file_uploads', 'storage_mb', 'api_requests', 'content_items', 'contacts']).withMessage('Invalid feature'),
  query('amount').optional().isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  validateRequest
], async (req, res) => {
  try {
    const { feature } = req.params;
    const amount = parseInt(req.query.amount) || 1;
    
    const usageCheck = await subscriptionService.checkUsageLimit(
      req.user.id,
      feature,
      amount
    );
    
    logger.info('Checked usage limit', { 
      userId: req.user.id,
      feature,
      amount,
      allowed: usageCheck.allowed 
    });
    
    res.json({
      success: true,
      data: usageCheck
    });
  } catch (error) {
    logger.error('Error checking usage limit', { 
      userId: req.user.id,
      feature: req.params.feature,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to check usage limit'
    });
  }
});

// Update usage
router.post('/usage/:feature', [
  isAuthenticated,
  param('feature').isIn(['file_uploads', 'storage_mb', 'api_requests', 'content_items', 'contacts']).withMessage('Invalid feature'),
  body('amount').optional().isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  validateRequest
], async (req, res) => {
  try {
    const { feature } = req.params;
    const amount = req.body.amount || 1;
    
    const subscription = await subscriptionService.updateUsage(
      req.user.id,
      feature,
      amount
    );
    
    logger.info('Updated usage', { 
      userId: req.user.id,
      feature,
      amount 
    });
    
    res.json({
      success: true,
      data: subscription,
      message: 'Usage updated successfully'
    });
  } catch (error) {
    logger.error('Error updating usage', { 
      userId: req.user.id,
      feature: req.params.feature,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update usage'
    });
  }
});

// Get subscription history
router.get('/history', [
  isAuthenticated,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  validateRequest
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const history = await subscriptionService.getSubscriptionHistory(
      req.user.id,
      { limit, offset }
    );
    
    logger.info('Retrieved subscription history', { 
      userId: req.user.id,
      count: history.count,
      returned: history.rows.length 
    });
    
    res.json({
      success: true,
      data: {
        transactions: history.rows,
        total: history.count,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Error retrieving subscription history', { 
      userId: req.user.id,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription history'
    });
  }
});

// Admin routes
// Get all subscriptions (admin only)
router.get('/admin/subscriptions', [
  isAuthenticated,
  isAdmin,
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('status').optional().isIn(['active', 'cancelled', 'expired', 'pending', 'suspended']).withMessage('Invalid status'),
  validateRequest
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    
    const subscriptions = await UserSubscription.findAndCountAll({
      where,
      include: [
        {
          model: SubscriptionPlan,
          as: 'subscriptionPlan'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    
    logger.info('Admin retrieved all subscriptions', { 
      adminId: req.user.id,
      count: subscriptions.count,
      returned: subscriptions.rows.length,
      status 
    });
    
    res.json({
      success: true,
      data: {
        subscriptions: subscriptions.rows,
        total: subscriptions.count,
        limit,
        offset
      }
    });
  } catch (error) {
    logger.error('Error retrieving all subscriptions', { 
      adminId: req.user.id,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscriptions'
    });
  }
});

// Process subscription renewals (admin only)
router.post('/admin/process-renewals', [
  isAuthenticated,
  isAdmin
], async (req, res) => {
  try {
    const results = await subscriptionService.processRenewals();
    
    logger.info('Admin processed subscription renewals', { 
      adminId: req.user.id,
      results 
    });
    
    res.json({
      success: true,
      data: results,
      message: 'Subscription renewals processed successfully'
    });
  } catch (error) {
    logger.error('Error processing subscription renewals', { 
      adminId: req.user.id,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to process subscription renewals'
    });
  }
});

// Get subscription statistics (admin only)
router.get('/admin/stats', [
  isAuthenticated,
  isAdmin
], async (req, res) => {
  try {
    const stats = await UserSubscription.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    const planStats = await UserSubscription.findAll({
      attributes: [
        'subscription_plan_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      include: [{
        model: SubscriptionPlan,
        as: 'subscriptionPlan',
        attributes: ['name', 'display_name']
      }],
      group: ['subscription_plan_id', 'subscriptionPlan.id']
    });
    
    logger.info('Admin retrieved subscription statistics', { 
      adminId: req.user.id 
    });
    
    res.json({
      success: true,
      data: {
        statusStats: stats,
        planStats: planStats
      }
    });
  } catch (error) {
    logger.error('Error retrieving subscription statistics', { 
      adminId: req.user.id,
      error: error.message 
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription statistics'
    });
  }
});

module.exports = router; 