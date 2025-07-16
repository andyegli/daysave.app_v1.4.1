const { v4: uuidv4 } = require('uuid');

/**
 * TestMetric Model
 * 
 * Stores performance metrics and analytics data for test runs.
 * Tracks processing time, API costs, accuracy trends, and other performance indicators.
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} TestMetric model
 */
module.exports = (sequelize, DataTypes) => {
  const TestMetric = sequelize.define('TestMetric', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the test metric'
    },
    test_run_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'test_runs',
        key: 'id'
      },
      comment: 'Test run this metric belongs to'
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who executed the test'
    },
    metric_type: {
      type: DataTypes.ENUM('performance', 'accuracy', 'cost', 'usage'),
      allowNull: false,
      comment: 'Type of metric being tracked'
    },
    metric_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the specific metric'
    },
    ai_job: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'AI job this metric relates to'
    },
    metric_value: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: false,
      comment: 'Numeric value of the metric'
    },
    metric_unit: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Unit of measurement (ms, MB, USD, etc.)'
    },
    aggregation_type: {
      type: DataTypes.ENUM('sum', 'average', 'min', 'max', 'count'),
      allowNull: false,
      defaultValue: 'sum',
      comment: 'How this metric should be aggregated'
    },
    time_period: {
      type: DataTypes.ENUM('test', 'daily', 'weekly', 'monthly'),
      allowNull: false,
      defaultValue: 'test',
      comment: 'Time period this metric covers'
    },
    baseline_value: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Baseline value for comparison'
    },
    threshold_min: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Minimum acceptable value'
    },
    threshold_max: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Maximum acceptable value'
    },
    is_within_threshold: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: 'Whether value is within acceptable thresholds'
    },
    trend_direction: {
      type: DataTypes.ENUM('up', 'down', 'stable', 'unknown'),
      allowNull: true,
      comment: 'Trend direction compared to previous runs'
    },
    comparison_value: {
      type: DataTypes.DECIMAL(15, 6),
      allowNull: true,
      comment: 'Previous value for trend comparison'
    },
    percentage_change: {
      type: DataTypes.DECIMAL(8, 4),
      allowNull: true,
      comment: 'Percentage change from previous value'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the metric'
    },
    collected_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When this metric was collected'
    }
  }, {
    tableName: 'test_metrics',
    timestamps: true,
    comment: 'Stores performance metrics and analytics data for test runs'
  });

  TestMetric.associate = (models) => {
    TestMetric.belongsTo(models.TestRun, {
      foreignKey: 'test_run_id',
      as: 'testRun',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    TestMetric.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return TestMetric;
}; 