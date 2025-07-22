'use strict';

/**
 * Migration: Create Processing Jobs Table
 * 
 * Creates the processing_jobs table for tracking multimedia analysis processing jobs
 * including status, progress, metadata, and performance metrics. This table enables
 * detailed monitoring and management of AI processing workflows.
 * 
 * Features:
 * - UUID primary keys for all records
 * - Job status and progress tracking
 * - Processing metadata and configuration
 * - Performance metrics and timing data
 * - Error handling and retry capabilities
 * - Job queue management
 * 
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Create processing_jobs table with all required fields and indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async up(queryInterface, Sequelize) {
    console.log('Creating processing_jobs table...');
    
    await queryInterface.createTable('processing_jobs', {
      /**
       * Primary Key - UUID
       * Unique identifier for each processing job
       */
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the processing job'
      },

      /**
       * User Association
       * Links processing job to the user who initiated it
       */
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the user who initiated this processing job'
      },

      /**
       * Content Association
       * Links processing job to content record (for URL-based content)
       */
      content_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'content',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the content record being processed (nullable for file-based content)'
      },

      /**
       * File Association
       * Links processing job to file record (for uploaded files)
       */
      file_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'files',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'UUID of the file record being processed (nullable for URL-based content)'
      },

      /**
       * Job Type
       * Type of processing job being executed
       */
      job_type: {
        type: Sequelize.ENUM('video_analysis', 'audio_analysis', 'image_analysis', 'url_analysis', 'batch_processing'),
        allowNull: false,
        comment: 'Type of processing job being executed'
      },

      /**
       * Media Type
       * Type of media being processed
       */
      media_type: {
        type: Sequelize.ENUM('video', 'audio', 'image', 'document', 'url'),
        allowNull: false,
        comment: 'Type of media being processed'
      },

      /**
       * Job Status
       * Current status of the processing job
       */
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the processing job'
      },

      /**
       * Progress Percentage
       * Current progress of the job (0-100)
       */
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Current progress of the job (0-100)'
      },

      /**
       * Current Stage
       * Current processing stage
       */
      current_stage: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Current processing stage'
      },

      /**
       * Total Stages
       * Total number of processing stages
       */
      total_stages: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total number of processing stages'
      },

      /**
       * Job Configuration
       * Configuration and options for the processing job
       */
      job_config: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Configuration and options for the processing job'
      },

      /**
       * Input Metadata
       * Metadata about the input file or URL
       */
      input_metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Metadata about the input file or URL'
      },

      /**
       * Processing Results
       * Results and outputs from processing stages
       */
      processing_results: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Results and outputs from processing stages'
      },

      /**
       * Performance Metrics
       * Performance data and timing information
       */
      performance_metrics: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Performance data and timing information'
      },

      /**
       * Error Details
       * Error information if job failed
       */
      error_details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Error information if job failed'
      },

      /**
       * Retry Count
       * Number of times job has been retried
       */
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times job has been retried'
      },

      /**
       * Max Retries
       * Maximum number of retry attempts
       */
      max_retries: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
        comment: 'Maximum number of retry attempts'
      },

      /**
       * Priority
       * Job priority for queue management
       */
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Job priority for queue management (1-10, higher is more priority)'
      },

      /**
       * Started At
       * When the job processing started
       */
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the job processing started'
      },

      /**
       * Completed At
       * When the job processing completed
       */
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the job processing completed'
      },

      /**
       * Estimated Completion
       * Estimated completion time
       */
      estimated_completion: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Estimated completion time'
      },

      /**
       * Duration (milliseconds)
       * Total processing duration in milliseconds
       */
      duration_ms: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Total processing duration in milliseconds'
      },

      /**
       * Worker ID
       * Identifier of the worker processing this job
       */
      worker_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Identifier of the worker processing this job'
      },

      /**
       * Timestamps
       */
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('processing_jobs', ['user_id'], {
      name: 'idx_processing_jobs_user_id'
    });
    
    await queryInterface.addIndex('processing_jobs', ['content_id'], {
      name: 'idx_processing_jobs_content_id'
    });
    
    await queryInterface.addIndex('processing_jobs', ['file_id'], {
      name: 'idx_processing_jobs_file_id'
    });
    
    await queryInterface.addIndex('processing_jobs', ['job_type'], {
      name: 'idx_processing_jobs_job_type'
    });
    
    await queryInterface.addIndex('processing_jobs', ['media_type'], {
      name: 'idx_processing_jobs_media_type'
    });
    
    await queryInterface.addIndex('processing_jobs', ['status'], {
      name: 'idx_processing_jobs_status'
    });
    
    await queryInterface.addIndex('processing_jobs', ['priority'], {
      name: 'idx_processing_jobs_priority'
    });
    
    await queryInterface.addIndex('processing_jobs', ['started_at'], {
      name: 'idx_processing_jobs_started_at'
    });
    
    await queryInterface.addIndex('processing_jobs', ['completed_at'], {
      name: 'idx_processing_jobs_completed_at'
    });
    
    await queryInterface.addIndex('processing_jobs', ['worker_id'], {
      name: 'idx_processing_jobs_worker_id'
    });

    // Composite indexes for common queries
    await queryInterface.addIndex('processing_jobs', ['status', 'priority'], {
      name: 'idx_processing_jobs_status_priority'
    });
    
    await queryInterface.addIndex('processing_jobs', ['user_id', 'status'], {
      name: 'idx_processing_jobs_user_status'
    });

    console.log('processing_jobs table created successfully');
  },

  /**
   * Drop processing_jobs table and all indexes
   * 
   * @param {import('sequelize').QueryInterface} queryInterface - Sequelize query interface
   * @param {import('sequelize').Sequelize} Sequelize - Sequelize constructor
   */
  async down(queryInterface, Sequelize) {
    console.log('Dropping processing_jobs table...');
    await queryInterface.dropTable('processing_jobs');
    console.log('processing_jobs table dropped successfully');
  }
}; 