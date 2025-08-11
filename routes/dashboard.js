const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware');
const UsageLimitService = require('../services/usageLimitService');
const { Content, ProcessingJob, ExternalAiUsage, StorageUsage } = require('../models');
const { Op } = require('sequelize');

/**
 * Usage Analytics Dashboard Routes
 * 
 * Provides user and admin dashboards for monitoring:
 * - AI usage and costs
 * - Storage usage and costs
 * - Subscription limits and alerts
 * - Monthly trends and analytics
 */

// Initialize usage limit service
const usageLimitService = new UsageLimitService();

/**
 * User Usage Analytics Dashboard
 */
router.get('/usage', isAuthenticated, async (req, res) => {
  try {
    console.log(`📊 Loading usage analytics dashboard for user: ${req.user.id}`);

    // Get usage limits and current usage
    const limitCheck = await usageLimitService.checkUsageLimits(req.user.id);
    
    // Get usage history for charts
    const usageHistory = await usageLimitService.getUserUsageHistory(req.user.id, 12);
    
    // Get recent content with usage data
    const recentContent = await getRecentContentWithUsage(req.user.id, 10);

    console.log(`📈 Usage dashboard data loaded for user ${req.user.id}:`, {
      currentCost: limitCheck.currentUsage.total.cost,
      tokensUsed: limitCheck.currentUsage.ai.tokens,
      planName: limitCheck.subscriptionPlan.name,
      alertLevel: limitCheck.alertLevel
    });

    res.render('dashboard/usage-analytics', {
      title: 'Usage Analytics - DaySave',
      user: req.user,
      currentUsage: limitCheck.currentUsage,
      limits: limitCheck.limits,
      subscriptionPlan: limitCheck.subscriptionPlan,
      shouldAlert: limitCheck.shouldAlert,
      alertLevel: limitCheck.alertLevel,
      alertThreshold: limitCheck.subscriptionPlan.alertThreshold,
      billingPeriod: limitCheck.billingPeriod,
      usageHistory,
      recentContent
    });

  } catch (error) {
    console.error('Error loading usage analytics dashboard:', error);
    res.status(500).render('error', { 
      title: 'Error - DaySave',
      message: 'Failed to load usage analytics',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * Usage Analytics API Endpoint (for AJAX updates)
 */
router.get('/api/usage', isAuthenticated, async (req, res) => {
  try {
    const limitCheck = await usageLimitService.checkUsageLimits(req.user.id);
    res.json({
      success: true,
      data: limitCheck
    });
  } catch (error) {
    console.error('Error getting usage data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage data'
    });
  }
});

/**
 * Usage History API Endpoint (for charts)
 */
router.get('/api/usage/history', isAuthenticated, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const usageHistory = await usageLimitService.getUserUsageHistory(req.user.id, months);
    
    res.json({
      success: true,
      data: usageHistory
    });
  } catch (error) {
    console.error('Error getting usage history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage history'
    });
  }
});

/**
 * Helper function to get recent content with usage data
 */
async function getRecentContentWithUsage(userId, limit = 10) {
  try {
    // Get recent processing jobs with content
    const recentJobs = await ProcessingJob.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Content,
          as: 'content',
          required: false,
          attributes: ['id', 'url', 'content_type']
        },
        {
          model: ExternalAiUsage,
          as: 'aiUsage',
          required: false,
          attributes: ['total_tokens', 'estimated_cost_usd']
        },
        {
          model: StorageUsage,
          as: 'storageUsage',
          required: false,
          attributes: ['estimated_cost_usd']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit
    });

    // Format the data for display
    return recentJobs.map(job => {
      const aiCost = job.aiUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd || 0), 0) || 0;
      const storageCost = job.storageUsage?.reduce((sum, usage) => sum + parseFloat(usage.estimated_cost_usd || 0), 0) || 0;
      const tokens = job.aiUsage?.reduce((sum, usage) => sum + (usage.total_tokens || 0), 0) || 0;

      return {
        id: job.id,
        title: job.content?.url ? (() => {
          try { return new URL(job.content.url).hostname; } 
          catch { return job.content.url.substring(0, 50) + '...'; }
        })() : 'Processing Job',
        url: job.content?.url || `Job ${job.id.substring(0, 8)}`,
        type: job.media_type || 'unknown',
        status: job.status,
        createdAt: job.createdAt,
        usage: {
          tokens,
          aiCost,
          storageCost,
          totalCost: aiCost + storageCost
        }
      };
    });
  } catch (error) {
    console.error('Error getting recent content with usage:', error);
    return [];
  }
}

module.exports = router;
