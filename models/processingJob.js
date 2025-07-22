const { v4: uuidv4 } = require('uuid');

/**
 * Processing Job Model
 * 
 * Tracks multimedia analysis processing jobs including status, progress, metadata,
 * and performance metrics. This model enables detailed monitoring and management
 * of AI processing workflows across the entire DaySave platform.
 * 
 * Features:
 * - Job status and progress tracking
 * - Processing metadata and configuration
 * - Performance metrics and timing data
 * - Error handling and retry capabilities
 * - Job queue management
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} ProcessingJob model
 */
module.exports = (sequelize, DataTypes) => {
  const ProcessingJob = sequelize.define('ProcessingJob', {
    /**
     * Primary Key - UUID
     * Unique identifier for each processing job
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the processing job'
    },

    /**
     * User Association
     * Links processing job to the user who initiated it
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who initiated this processing job'
    },

    /**
     * Content Association
     * Links processing job to content record (for URL-based content)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'UUID of the content record being processed (nullable for file-based content)'
    },

    /**
     * File Association
     * Links processing job to file record (for uploaded files)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'UUID of the file record being processed (nullable for URL-based content)'
    },

    /**
     * Job Type
     * Type of processing job being executed
     */
    job_type: {
      type: DataTypes.ENUM('video_analysis', 'audio_analysis', 'image_analysis', 'url_analysis', 'batch_processing'),
      allowNull: false,
      comment: 'Type of processing job being executed'
    },

    /**
     * Media Type
     * Type of media being processed
     */
    media_type: {
      type: DataTypes.ENUM('video', 'audio', 'image', 'document', 'url'),
      allowNull: false,
      comment: 'Type of media being processed'
    },

    /**
     * Job Status
     * Current status of the processing job
     */
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the processing job'
    },

    /**
     * Progress Percentage
     * Current progress of the job (0-100)
     */
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Current progress of the job (0-100)'
    },

    /**
     * Current Stage
     * Current processing stage
     */
    current_stage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Current processing stage'
    },

    /**
     * Total Stages
     * Total number of processing stages
     */
    total_stages: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total number of processing stages'
    },

    /**
     * Job Configuration
     * Configuration and options for the processing job
     */
    job_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Configuration and options for the processing job'
    },

    /**
     * Input Metadata
     * Metadata about the input file or URL
     */
    input_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Metadata about the input file or URL'
    },

    /**
     * Processing Results
     * Results and outputs from processing stages
     */
    processing_results: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Results and outputs from processing stages'
    },

    /**
     * Performance Metrics
     * Performance data and timing information
     */
    performance_metrics: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Performance data and timing information'
    },

    /**
     * Error Details
     * Error information if job failed
     */
    error_details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Error information if job failed'
    },

    /**
     * Retry Count
     * Number of times job has been retried
     */
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times job has been retried'
    },

    /**
     * Max Retries
     * Maximum number of retry attempts
     */
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Maximum number of retry attempts'
    },

    /**
     * Priority
     * Job priority for queue management
     */
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      validate: {
        min: 1,
        max: 10
      },
      comment: 'Job priority for queue management (1-10, higher is more priority)'
    },

    /**
     * Started At
     * When the job processing started
     */
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the job processing started'
    },

    /**
     * Completed At
     * When the job processing completed
     */
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the job processing completed'
    },

    /**
     * Estimated Completion
     * Estimated completion time
     */
    estimated_completion: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Estimated completion time'
    },

    /**
     * Duration (milliseconds)
     * Total processing duration in milliseconds
     */
    duration_ms: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: 'Total processing duration in milliseconds'
    },

    /**
     * Worker ID
     * Identifier of the worker processing this job
     */
    worker_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identifier of the worker processing this job'
    }
  }, {
    tableName: 'processing_jobs',
    timestamps: true,
    comment: 'Tracks multimedia analysis processing jobs and their status',
    
    indexes: [
      {
        name: 'idx_processing_jobs_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_processing_jobs_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_processing_jobs_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_processing_jobs_status',
        fields: ['status']
      },
      {
        name: 'idx_processing_jobs_job_type',
        fields: ['job_type']
      },
      {
        name: 'idx_processing_jobs_priority',
        fields: ['priority']
      },
      {
        name: 'idx_processing_jobs_status_priority',
        fields: ['status', 'priority']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between ProcessingJob and other models
   */
  ProcessingJob.associate = (models) => {
    // ProcessingJob belongs to a User
    ProcessingJob.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ProcessingJob belongs to Content (nullable)
    ProcessingJob.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ProcessingJob belongs to File (nullable)
    ProcessingJob.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ProcessingJob has analysis results
    ProcessingJob.hasOne(models.VideoAnalysis, { 
      foreignKey: 'processing_job_id',
      as: 'videoAnalysis',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    ProcessingJob.hasOne(models.AudioAnalysis, { 
      foreignKey: 'processing_job_id',
      as: 'audioAnalysis',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    ProcessingJob.hasOne(models.ImageAnalysis, { 
      foreignKey: 'processing_job_id',
      as: 'imageAnalysis',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Hooks
   */
  ProcessingJob.addHook('beforeSave', (job) => {
    // Update completed_at when status changes to completed
    if (job.status === 'completed' && !job.completed_at) {
      job.completed_at = new Date();
      job.progress = 100;
    }
    
    // Set started_at if not set and status is processing
    if (job.status === 'processing' && !job.started_at) {
      job.started_at = new Date();
    }
    
    // Calculate duration if both timestamps exist
    if (job.started_at && job.completed_at && !job.duration_ms) {
      job.duration_ms = job.completed_at - job.started_at;
    }
  });

  /**
   * Instance Methods
   */

  /**
   * Update job progress
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} stage - Optional current stage
   */
  ProcessingJob.prototype.updateProgress = function(progress, stage = null) {
    this.progress = Math.min(100, Math.max(0, progress));
    if (stage) this.current_stage = stage;
    
    if (progress >= 100) {
      this.status = 'completed';
      this.completed_at = new Date();
    }
    
    return this.save();
  };

  /**
   * Mark job as failed
   * @param {string|Object} error - Error message or error object
   */
  ProcessingJob.prototype.markAsFailed = function(error) {
    this.status = 'failed';
    this.completed_at = new Date();
    
    if (typeof error === 'string') {
      this.error_details = { message: error, timestamp: new Date().toISOString() };
    } else {
      this.error_details = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...error
      };
    }
    
    return this.save();
  };

  /**
   * Get processing duration in seconds
   * @returns {number|null} Duration in seconds
   */
  ProcessingJob.prototype.getDurationSeconds = function() {
    if (!this.duration_ms) return null;
    return Math.round(this.duration_ms / 1000);
  };

  /**
   * Get formatted duration
   * @returns {string} Formatted duration (HH:MM:SS)
   */
  ProcessingJob.prototype.getFormattedDuration = function() {
    const seconds = this.getDurationSeconds();
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Check if job can be retried
   * @returns {boolean} True if job can be retried
   */
  ProcessingJob.prototype.canRetry = function() {
    return this.status === 'failed' && this.retry_count < this.max_retries;
  };

  /**
   * Class Methods
   */

  /**
   * Get pending jobs for processing
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<Array>} Pending jobs ordered by priority
   */
  ProcessingJob.getPendingJobs = async function(limit = 10) {
    return await this.findAll({
      where: { status: 'pending' },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'ASC']
      ],
      limit
    });
  };

  /**
   * Get job statistics
   * @param {string} userId - Optional user ID to filter by
   * @returns {Promise<Object>} Job statistics
   */
  ProcessingJob.getStatistics = async function(userId = null) {
    const where = userId ? { user_id: userId } : {};
    
    const jobs = await this.findAll({ where });
    
    const stats = {
      total: jobs.length,
      byStatus: {},
      byType: {},
      byMediaType: {},
      averageDuration: 0,
      totalDuration: 0
    };
    
    let totalDuration = 0;
    let completedJobs = 0;
    
    jobs.forEach(job => {
      // Count by status
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
      
      // Count by type
      stats.byType[job.job_type] = (stats.byType[job.job_type] || 0) + 1;
      
      // Count by media type
      stats.byMediaType[job.media_type] = (stats.byMediaType[job.media_type] || 0) + 1;
      
      // Calculate duration
      if (job.duration_ms) {
        totalDuration += job.duration_ms;
        completedJobs++;
      }
    });
    
    stats.totalDuration = totalDuration;
    stats.averageDuration = completedJobs > 0 ? Math.round(totalDuration / completedJobs) : 0;
    
    return stats;
  };

  return ProcessingJob;
}; 