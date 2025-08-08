/**
 * Storage Usage Tracker Service
 * 
 * Tracks Google Cloud Storage usage on a per-user, per-file, per-submission basis
 * for accurate billing and cost management. Integrates with the existing AI usage
 * tracking system to provide comprehensive cost tracking.
 * 
 * FEATURES:
 * - Per-file storage tracking with detailed metadata
 * - GCS storage class optimization and cost calculation
 * - Storage lifecycle tracking (upload, access, deletion)
 * - Bandwidth usage tracking for downloads
 * - Integration with billing periods and user subscriptions
 * - Storage analytics and cost optimization insights
 * 
 * SUPPORTED PROVIDERS:
 * - Google Cloud Storage (primary)
 * - Local storage (development/fallback)
 * - AWS S3 (future support)
 * - Azure Blob Storage (future support)
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-01-30
 */

const { StorageUsage } = require('../models');

class StorageUsageTracker {
  constructor() {
    this.name = 'StorageUsageTracker';
    
    // Current GCS pricing models (USD)
    this.storagePricing = {
      google_cloud_storage: {
        // Storage pricing per GB per month
        storage: {
          standard: 0.020, // $0.020 per GB per month
          nearline: 0.010, // $0.010 per GB per month
          coldline: 0.004, // $0.004 per GB per month
          archive: 0.0012  // $0.0012 per GB per month
        },
        // Operation pricing
        operations: {
          class_a: 0.0050, // Per 1,000 operations (writes, lists)
          class_b: 0.0004  // Per 1,000 operations (reads)
        },
        // Network egress pricing per GB
        egress: {
          same_region: 0.00,     // Free within same region
          same_continent: 0.01,  // $0.01 per GB
          worldwide: 0.12        // $0.12 per GB
        },
        // Early deletion charges
        early_deletion: {
          nearline: 30,  // Days minimum
          coldline: 90,  // Days minimum
          archive: 365   // Days minimum
        }
      },
      local: {
        storage: { standard: 0.00 }, // Free local storage
        operations: { class_a: 0.00, class_b: 0.00 },
        egress: { same_region: 0.00 }
      }
    };

    // File type mappings for billing categorization
    this.fileTypeMapping = {
      'image/jpeg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/webp': 'image',
      'video/mp4': 'video',
      'video/avi': 'video',
      'video/mov': 'video',
      'audio/mp3': 'audio',
      'audio/wav': 'audio',
      'audio/m4a': 'audio',
      'application/pdf': 'document',
      'text/plain': 'document',
      'application/msword': 'document'
    };
  }

  /**
   * Calculate the current billing period (YYYY-MM format)
   * @returns {string} Current billing period
   */
  getCurrentBillingPeriod() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calculate storage cost based on file size, storage class, and duration
   * @param {string} provider - Storage provider
   * @param {string} storageClass - Storage class
   * @param {number} sizeBytes - File size in bytes
   * @param {number} durationDays - Storage duration in days (default: 1 month)
   * @returns {number} Estimated cost in USD
   */
  calculateStorageCost(provider, storageClass, sizeBytes, durationDays = 30) {
    const providerPricing = this.storagePricing[provider];
    if (!providerPricing) {
      console.warn(`Unknown storage provider: ${provider}`);
      return 0;
    }

    const storagePricing = providerPricing.storage[storageClass];
    if (!storagePricing) {
      console.warn(`Unknown storage class for ${provider}: ${storageClass}`);
      return 0;
    }

    // Convert bytes to GB and calculate monthly cost
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    const monthlyRate = sizeGB * storagePricing;
    const dailyRate = monthlyRate / 30;
    const totalCost = dailyRate * durationDays;

    return parseFloat(totalCost.toFixed(6));
  }

  /**
   * Calculate operation cost
   * @param {string} provider - Storage provider
   * @param {string} operationType - Operation type (upload, download, etc.)
   * @param {number} operationCount - Number of operations
   * @returns {number} Estimated cost in USD
   */
  calculateOperationCost(provider, operationType, operationCount = 1) {
    const providerPricing = this.storagePricing[provider];
    if (!providerPricing) return 0;

    let operationClass = 'class_b'; // Default to read operations
    if (['upload', 'delete', 'copy', 'move'].includes(operationType)) {
      operationClass = 'class_a'; // Write operations
    }

    const operationPrice = providerPricing.operations[operationClass];
    const cost = (operationCount / 1000) * operationPrice;

    return parseFloat(cost.toFixed(6));
  }

  /**
   * Calculate bandwidth cost for data egress
   * @param {string} provider - Storage provider
   * @param {number} bandwidthBytes - Bandwidth in bytes
   * @param {string} region - Geographic region ('same_region', 'same_continent', 'worldwide')
   * @returns {number} Estimated cost in USD
   */
  calculateBandwidthCost(provider, bandwidthBytes, region = 'worldwide') {
    const providerPricing = this.storagePricing[provider];
    if (!providerPricing || !providerPricing.egress) return 0;

    const bandwidthGB = bandwidthBytes / (1024 * 1024 * 1024);
    const egressPrice = providerPricing.egress[region] || providerPricing.egress.worldwide;
    const cost = bandwidthGB * egressPrice;

    return parseFloat(cost.toFixed(6));
  }

  /**
   * Determine file type from MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} File type category
   */
  getFileTypeFromMimeType(mimeType) {
    return this.fileTypeMapping[mimeType] || 'other';
  }

  /**
   * Record storage usage in the database
   * @param {Object} usageData - Storage usage data
   * @returns {Promise<Object>} Created usage record
   */
  async recordStorageUsage(usageData) {
    try {
      const {
        userId,
        contentId = null,
        fileId = null,
        processingJobId = null,
        storageProvider = 'google_cloud_storage',
        storageLocation,
        bucketName = null,
        objectName,
        fileType,
        mimeType = null,
        fileSizeBytes,
        storageClass = 'standard',
        operationType,
        operationCount = 1,
        bandwidthBytes = 0,
        success = true,
        errorMessage = null,
        errorCode = null,
        durationMs = null,
        geographicRegion = null,
        accessMethod = null,
        retentionPeriodDays = null,
        sessionId = null,
        metadata = null,
        providerRequestId = null,
        providerResponseMetadata = null
      } = usageData;

      // Calculate costs
      const storageCost = this.calculateStorageCost(storageProvider, storageClass, fileSizeBytes);
      const operationCost = this.calculateOperationCost(storageProvider, operationType, operationCount);
      const bandwidthCost = this.calculateBandwidthCost(storageProvider, bandwidthBytes, geographicRegion);
      const totalCost = storageCost + operationCost + bandwidthCost;

      // Get current billing period
      const billingPeriod = this.getCurrentBillingPeriod();

      // Create storage usage record
      const usageRecord = await StorageUsage.create({
        user_id: userId,
        content_id: contentId,
        file_id: fileId,
        processing_job_id: processingJobId,
        storage_provider: storageProvider,
        storage_location: storageLocation,
        bucket_name: bucketName,
        object_name: objectName,
        file_type: fileType,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        storage_class: storageClass,
        operation_type: operationType,
        operation_count: operationCount,
        bandwidth_bytes: bandwidthBytes,
        estimated_cost_usd: totalCost,
        billing_period: billingPeriod,
        success: success,
        error_message: errorMessage,
        error_code: errorCode,
        duration_ms: durationMs,
        geographic_region: geographicRegion,
        access_method: accessMethod,
        retention_period_days: retentionPeriodDays,
        session_id: sessionId,
        metadata: metadata,
        provider_request_id: providerRequestId,
        provider_response_metadata: providerResponseMetadata
      });

      console.log(`💾 Storage usage recorded: ${storageProvider}/${storageClass} - $${totalCost} (${(fileSizeBytes/1024/1024).toFixed(2)}MB)`);
      
      return usageRecord;
    } catch (error) {
      console.error('❌ Failed to record storage usage:', error);
      throw error;
    }
  }

  /**
   * Track file upload to storage
   * @param {Object} params - Upload tracking parameters
   * @returns {Promise<Object>} Usage record
   */
  async trackFileUpload(params) {
    const {
      userId,
      filePath,
      fileSize,
      mimeType,
      contentId = null,
      fileId = null,
      processingJobId = null,
      storageProvider = 'google_cloud_storage',
      bucketName = null,
      storageClass = 'standard',
      sessionId = null,
      uploadDurationMs = null,
      metadata = null
    } = params;

    const fileType = this.getFileTypeFromMimeType(mimeType);
    const objectName = filePath.split('/').pop(); // Extract filename from path

    return this.recordStorageUsage({
      userId,
      contentId,
      fileId,
      processingJobId,
      storageProvider,
      storageLocation: filePath,
      bucketName,
      objectName,
      fileType,
      mimeType,
      fileSizeBytes: fileSize,
      storageClass,
      operationType: 'upload',
      operationCount: 1,
      bandwidthBytes: fileSize, // Upload bandwidth
      durationMs: uploadDurationMs,
      sessionId,
      metadata: {
        ...metadata,
        originalFilePath: filePath,
        uploadType: 'user_upload'
      }
    });
  }

  /**
   * Track file download from storage
   * @param {Object} params - Download tracking parameters
   * @returns {Promise<Object>} Usage record
   */
  async trackFileDownload(params) {
    const {
      userId,
      fileId,
      filePath,
      fileSize,
      mimeType,
      accessMethod = 'direct',
      geographicRegion = 'worldwide',
      downloadDurationMs = null,
      sessionId = null
    } = params;

    const fileType = this.getFileTypeFromMimeType(mimeType);

    return this.recordStorageUsage({
      userId,
      fileId,
      storageLocation: filePath,
      objectName: filePath.split('/').pop(),
      fileType,
      mimeType,
      fileSizeBytes: fileSize,
      operationType: 'download',
      bandwidthBytes: fileSize, // Download bandwidth
      geographicRegion,
      accessMethod,
      durationMs: downloadDurationMs,
      sessionId,
      metadata: {
        downloadType: 'user_download',
        accessMethod: accessMethod
      }
    });
  }

  /**
   * Track file deletion from storage
   * @param {Object} params - Deletion tracking parameters
   * @returns {Promise<Object>} Usage record
   */
  async trackFileDeletion(params) {
    const {
      userId,
      fileId,
      filePath,
      fileSize,
      mimeType,
      sessionId = null,
      deletionReason = 'user_requested'
    } = params;

    const fileType = this.getFileTypeFromMimeType(mimeType);

    // Mark existing storage records as inactive
    await StorageUsage.update(
      { 
        is_active: false, 
        deleted_at: new Date(),
        metadata: { deletion_reason: deletionReason }
      },
      { 
        where: { 
          file_id: fileId, 
          is_active: true 
        } 
      }
    );

    return this.recordStorageUsage({
      userId,
      fileId,
      storageLocation: filePath,
      objectName: filePath.split('/').pop(),
      fileType,
      mimeType,
      fileSizeBytes: fileSize,
      operationType: 'delete',
      is_active: false,
      deleted_at: new Date(),
      sessionId,
      metadata: {
        deletionReason: deletionReason,
        deletionType: 'user_deletion'
      }
    });
  }

  /**
   * Get user monthly storage usage summary
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Array>} Usage summary
   */
  async getUserMonthlyStorageUsage(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    return StorageUsage.getUserMonthlyStorage(userId, period);
  }

  /**
   * Get system-wide storage usage
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Array>} System usage summary
   */
  async getSystemStorageUsage(billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    return StorageUsage.getSystemStorageUsage(period);
  }

  /**
   * Get user storage growth over time
   * @param {string} userId - User ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Storage growth data
   */
  async getUserStorageGrowth(userId, startDate, endDate) {
    return StorageUsage.getUserStorageGrowth(userId, startDate, endDate);
  }

  /**
   * Get top storage users
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @param {number} limit - Number of users to return
   * @returns {Promise<Array>} Top storage users
   */
  async getTopStorageUsers(billingPeriod = null, limit = 10) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    return StorageUsage.getTopStorageUsers(period, limit);
  }

  /**
   * Calculate user's total storage cost for a billing period
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<number>} Total storage cost in USD
   */
  async calculateUserStorageCost(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    const usage = await this.getUserMonthlyStorageUsage(userId, period);
    
    return usage.reduce((total, item) => {
      return total + parseFloat(item.dataValues.total_cost || 0);
    }, 0);
  }

  /**
   * Get storage pricing for a provider/class
   * @param {string} provider - Storage provider
   * @param {string} storageClass - Storage class
   * @returns {Object|null} Pricing information
   */
  getStoragePricing(provider, storageClass) {
    const providerPricing = this.storagePricing[provider];
    return providerPricing ? providerPricing.storage[storageClass] || null : null;
  }

  /**
   * Update storage pricing (for admin use)
   * @param {Object} newPricing - New pricing structure
   */
  updateStoragePricing(newPricing) {
    this.storagePricing = { ...this.storagePricing, ...newPricing };
  }

  /**
   * Generate storage optimization recommendations
   * @param {string} userId - User ID
   * @param {string} billingPeriod - Billing period
   * @returns {Promise<Array>} Optimization recommendations
   */
  async generateStorageOptimizationRecommendations(userId, billingPeriod = null) {
    const period = billingPeriod || this.getCurrentBillingPeriod();
    const usage = await this.getUserMonthlyStorageUsage(userId, period);
    const recommendations = [];

    for (const item of usage) {
      const { storage_class, file_type, total_bytes, total_cost } = item.dataValues;
      
      // Recommend storage class optimization
      if (storage_class === 'standard' && total_bytes > 100 * 1024 * 1024) { // > 100MB
        const potentialSavings = this.calculateStorageCost('google_cloud_storage', 'standard', total_bytes) -
                               this.calculateStorageCost('google_cloud_storage', 'nearline', total_bytes);
        
        if (potentialSavings > 0.01) { // > $0.01 savings
          recommendations.push({
            type: 'storage_class_optimization',
            current_class: storage_class,
            recommended_class: 'nearline',
            file_type: file_type,
            potential_savings: potentialSavings,
            description: `Move ${file_type} files to Nearline storage to save $${potentialSavings.toFixed(4)}/month`
          });
        }
      }
    }

    return recommendations;
  }
}

module.exports = StorageUsageTracker;