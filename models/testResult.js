const { v4: uuidv4 } = require('uuid');

/**
 * TestResult Model
 * 
 * Stores individual test results for each file/URL and AI job combination.
 * Each test result contains pass/fail status, AI output, and performance metrics.
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} TestResult model
 */
module.exports = (sequelize, DataTypes) => {
  const TestResult = sequelize.define('TestResult', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the test result'
    },
    test_run_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'test_runs',
        key: 'id'
      },
      comment: 'Test run this result belongs to'
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
    test_type: {
      type: DataTypes.ENUM('file_upload', 'url_analysis'),
      allowNull: false,
      comment: 'Type of test (file upload or URL analysis)'
    },
    test_source: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'File path or URL that was tested'
    },
    ai_job: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'AI job that was tested (e.g., transcription, object_detection)'
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'passed', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Result status of the test'
    },
    pass_fail_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for pass/fail status'
    },
    ai_output: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Actual AI analysis output/results'
    },
    error_details: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Detailed error information if test failed'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the test started'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the test completed'
    },
    duration_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Test duration in milliseconds'
    },
    memory_usage_mb: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Memory usage in MB during test'
    },
    api_calls_made: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of API calls made during test'
    },
    tokens_used: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of tokens used (for AI services)'
    },
    estimated_cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      comment: 'Estimated cost of the test in USD'
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: 'Confidence score of the AI analysis (0.0-1.0)'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata and test parameters'
    }
  }, {
    tableName: 'test_results',
    timestamps: true,
    comment: 'Stores individual test results for multimedia analysis testing'
  });

  TestResult.associate = (models) => {
    TestResult.belongsTo(models.TestRun, {
      foreignKey: 'test_run_id',
      as: 'testRun',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    TestResult.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return TestResult;
}; 