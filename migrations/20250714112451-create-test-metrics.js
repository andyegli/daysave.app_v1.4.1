'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('test_metrics', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false,
        comment: 'Unique UUID identifier for the test metric'
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
        comment: 'Test run this metric belongs to'
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
      metric_type: {
        type: Sequelize.ENUM('performance', 'accuracy', 'cost', 'usage'),
        allowNull: false,
        comment: 'Type of metric being tracked'
      },
      metric_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Name of the specific metric'
      },
      ai_job: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'AI job this metric relates to'
      },
      metric_value: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Numeric value of the metric'
      },
      metric_unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Unit of measurement (ms, MB, USD, etc.)'
      },
      aggregation_type: {
        type: Sequelize.ENUM('sum', 'average', 'min', 'max', 'count'),
        allowNull: false,
        defaultValue: 'sum',
        comment: 'How this metric should be aggregated'
      },
      time_period: {
        type: Sequelize.ENUM('test', 'daily', 'weekly', 'monthly'),
        allowNull: false,
        defaultValue: 'test',
        comment: 'Time period this metric covers'
      },
      baseline_value: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: true,
        comment: 'Baseline value for comparison'
      },
      threshold_min: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: true,
        comment: 'Minimum acceptable value'
      },
      threshold_max: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: true,
        comment: 'Maximum acceptable value'
      },
      is_within_threshold: {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        comment: 'Whether value is within acceptable thresholds'
      },
      trend_direction: {
        type: Sequelize.ENUM('up', 'down', 'stable', 'unknown'),
        allowNull: true,
        comment: 'Trend direction compared to previous runs'
      },
      comparison_value: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: true,
        comment: 'Previous value for trend comparison'
      },
      percentage_change: {
        type: Sequelize.DECIMAL(8, 4),
        allowNull: true,
        comment: 'Percentage change from previous value'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata about the metric'
      },
      collected_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When this metric was collected'
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
    await queryInterface.addIndex('test_metrics', ['test_run_id'], {
      name: 'idx_test_metrics_test_run_id'
    });
    await queryInterface.addIndex('test_metrics', ['user_id'], {
      name: 'idx_test_metrics_user_id'
    });
    await queryInterface.addIndex('test_metrics', ['metric_type'], {
      name: 'idx_test_metrics_metric_type'
    });
    await queryInterface.addIndex('test_metrics', ['metric_name'], {
      name: 'idx_test_metrics_metric_name'
    });
    await queryInterface.addIndex('test_metrics', ['ai_job'], {
      name: 'idx_test_metrics_ai_job'
    });
    await queryInterface.addIndex('test_metrics', ['collected_at'], {
      name: 'idx_test_metrics_collected_at'
    });
    await queryInterface.addIndex('test_metrics', ['time_period'], {
      name: 'idx_test_metrics_time_period'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('test_metrics');
  }
};
