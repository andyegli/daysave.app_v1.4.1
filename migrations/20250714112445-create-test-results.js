'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('test_results', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the test result'
      },
      test_run_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'test_runs',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Test run this result belongs to'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'User who executed the test'
      },
      test_type: {
        type: Sequelize.ENUM('file_upload', 'url_analysis'),
        allowNull: false,
        comment: 'Type of test (file upload or URL analysis)'
      },
      test_source: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'File path or URL that was tested'
      },
      ai_job: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'AI job that was tested (e.g., transcription, object_detection)'
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'passed', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Result status of the test'
      },
      pass_fail_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for pass/fail status'
      },
      ai_output: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Actual AI analysis output/results'
      },
      error_details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Detailed error information if test failed'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the test started'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the test completed'
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Test duration in milliseconds'
      },
      memory_usage_mb: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Memory usage in MB during test'
      },
      api_calls_made: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of API calls made during test'
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of tokens used (for AI services)'
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(10, 4),
        allowNull: true,
        comment: 'Estimated cost of the test in USD'
      },
      confidence_score: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        comment: 'Confidence score of the AI analysis (0.0-1.0)'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata and test parameters'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('test_results', ['test_run_id'], {
      name: 'idx_test_results_test_run_id'
    });
    await queryInterface.addIndex('test_results', ['user_id'], {
      name: 'idx_test_results_user_id'
    });
    await queryInterface.addIndex('test_results', ['status'], {
      name: 'idx_test_results_status'
    });
    await queryInterface.addIndex('test_results', ['ai_job'], {
      name: 'idx_test_results_ai_job'
    });
    await queryInterface.addIndex('test_results', ['test_type'], {
      name: 'idx_test_results_test_type'
    });
    await queryInterface.addIndex('test_results', ['started_at'], {
      name: 'idx_test_results_started_at'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('test_results');
  }
};
