'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('test_runs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the test run'
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
        comment: 'User who executed the test run'
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Name/description of the test run'
      },
      test_type: {
        type: Sequelize.ENUM('file_upload', 'url_analysis', 'mixed'),
        allowNull: false,
        defaultValue: 'mixed',
        comment: 'Type of test run (file upload, URL analysis, or mixed)'
      },
      total_tests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of tests in this run'
      },
      passed_tests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of tests that passed'
      },
      failed_tests: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of tests that failed'
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Current status of the test run'
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Progress percentage (0-100)'
      },
      selected_files: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of selected file paths for testing'
      },
      selected_urls: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of selected URLs for testing'
      },
      selected_ai_jobs: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Array of selected AI jobs to test'
      },
      configuration: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Test configuration options and parameters'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the test run started'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the test run completed'
      },
      duration_seconds: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Total duration of the test run in seconds'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if test run failed'
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
    await queryInterface.addIndex('test_runs', ['user_id'], {
      name: 'idx_test_runs_user_id'
    });
    await queryInterface.addIndex('test_runs', ['status'], {
      name: 'idx_test_runs_status'
    });
    await queryInterface.addIndex('test_runs', ['test_type'], {
      name: 'idx_test_runs_test_type'
    });
    await queryInterface.addIndex('test_runs', ['started_at'], {
      name: 'idx_test_runs_started_at'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('test_runs');
  }
};
