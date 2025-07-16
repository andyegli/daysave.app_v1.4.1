const { v4: uuidv4 } = require('uuid');

/**
 * Processing Job Model
 * 
 * Stores information about orchestrated multimedia processing jobs,
 * including progress tracking, error isolation, and performance metrics.
 * This model coordinates with the AutomationOrchestrator system.
 * 
 * Features:
 * - Job status and progress tracking
 * - Stage-based processing monitoring
 * - Error isolation and circuit breaker data
 * - Performance metrics and timing
 * - Plugin usage and configuration tracking
 * - Resource usage monitoring
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
     * Type of multimedia processing job
     */
    job_type: {
      type: DataTypes.ENUM('video', 'audio', 'image', 'batch'),
      allowNull: false,
      comment: 'Type of multimedia processing job'
    },

    /**
     * Job Status
     * Current status of the processing job
     */
    status: {
      type: DataTypes.ENUM('queued', 'processing', 'completed', 'failed', 'cancelled', 'paused'),
      allowNull: false,
      defaultValue: 'queued',
      comment: 'Current status of the processing job'
    },

    /**
     * Current Stage
     * Current processing stage
     */
    current_stage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Current processing stage name'
    },

    /**
     * Progress Percentage
     * Overall progress of the job (0-100)
     */
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Overall progress of the job (0-100)'
    },

    /**
     * Stage Progress
     * Progress within the current stage (0-100)
     */
    stage_progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Progress within the current stage (0-100)'
    },

    /**
     * Stages Data
     * Information about processing stages
     * Structure: [
     *   {
     *     name: string,
     *     label: string,
     *     status: string,
     *     progress: number,
     *     startTime: timestamp,
     *     endTime: timestamp,
     *     duration: number,
     *     error: object,
     *     warnings: array,
     *     metadata: object
     *   }
     * ]
     */
    stages_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Information about processing stages'
    },

    /**
     * Job Configuration
     * Configuration used for this processing job
     * Structure: {
     *   processors: object,
     *   plugins: object,
     *   features: object,
     *   options: object
     * }
     */
    job_config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Configuration used for this processing job'
    },

    /**
     * Input Metadata
     * Metadata about the input file/content
     * Structure: {
     *   filename: string,
     *   fileSize: number,
     *   mimeType: string,
     *   duration: number,
     *   dimensions: object,
     *   format: string
     * }
     */
    input_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Metadata about the input file/content'
    },

    /**
     * Performance Metrics
     * Performance tracking data
     * Structure: {
     *   processingSpeed: number,
     *   memoryUsage: object,
     *   cpuUsage: object,
     *   diskUsage: object,
     *   networkUsage: object,
     *   estimatedTimeRemaining: number,
     *   averageStageTime: number
     * }
     */
    performance_metrics: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Performance tracking data'
    },

    /**
     * Plugin Usage
     * Information about plugins used in this job
     * Structure: {
     *   pluginsUsed: array,
     *   fallbacksUsed: array,
     *   apiCalls: object,
     *   costs: object,
     *   tokens: object
     * }
     */
    plugin_usage: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Information about plugins used in this job'
    },

    /**
     * Error Data
     * Error information and isolation data
     * Structure: {
     *   errors: array,
     *   warnings: array,
     *   retryAttempts: number,
     *   circuitBreakerEvents: array,
     *   recoveryAttempts: array
     * }
     */
    error_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Error information and isolation data'
    },

    /**
     * Result Summary
     * Summary of processing results
     * Structure: {
     *   audioAnalysisId: string,
     *   videoAnalysisId: string,
     *   imageAnalysisId: string,
     *   thumbnailCount: number,
     *   ocrResultCount: number,
     *   speakerCount: number,
     *   objectCount: number
     * }
     */
    result_summary: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Summary of processing results'
    },

    /**
     * Priority Level
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
      comment: 'Job priority for queue management (1=highest, 10=lowest)'
    },

    /**
     * Queue Position
     * Position in the processing queue
     */
    queue_position: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Position in the processing queue'
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
     * Duration
     * Total processing duration in milliseconds
     */
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total processing duration in milliseconds'
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
     * Last Activity
     * Timestamp of last activity/update
     */
    last_activity: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last activity/update'
    },

    /**
     * Worker ID
     * Identifier of the worker processing this job
     */
    worker_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identifier of the worker processing this job'
    },

    /**
     * Retry Count
     * Number of retry attempts for this job
     */
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of retry attempts for this job'
    },

    /**
     * Max Retries
     * Maximum number of retry attempts allowed
     */
    max_retries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
      comment: 'Maximum number of retry attempts allowed'
    },

    /**
     * Error Message
     * Error message if job failed
     */
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if job failed'
    },

    /**
     * Version
     * Version of the processing system used
     */
    processing_version: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Version of the processing system used'
    }
  }, {
    tableName: 'processing_jobs',
    timestamps: true,
    comment: 'Stores orchestrated multimedia processing job information and progress',
    
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
        name: 'idx_processing_jobs_type',
        fields: ['job_type']
      },
      {
        name: 'idx_processing_jobs_priority',
        fields: ['priority', 'createdAt']
      },
      {
        name: 'idx_processing_jobs_queue',
        fields: ['status', 'queue_position']
      },
      {
        name: 'idx_processing_jobs_worker',
        fields: ['worker_id', 'status']
      },
      {
        name: 'idx_processing_jobs_progress',
        fields: ['progress']
      },
      {
        name: 'idx_processing_jobs_activity',
        fields: ['last_activity']
      },
      {
        name: 'idx_processing_jobs_completion',
        fields: ['completed_at']
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

    // ProcessingJob can have related analysis records
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

    // Update duration if job is completed
    if (job.completed_at && job.started_at) {
      job.duration_ms = job.completed_at - job.started_at;
    }

    // Update last activity
    job.last_activity = new Date();
  });

  return ProcessingJob;
}; 