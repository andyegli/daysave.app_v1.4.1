const { v4: uuidv4 } = require('uuid');

/**
 * TestRun Model
 * 
 * Stores information about test execution sessions in the multimedia analysis testing system.
 * Each test run contains multiple test results for different files/URLs and AI jobs.
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} TestRun model
 */
module.exports = (sequelize, DataTypes) => {
  const TestRun = sequelize.define('TestRun', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the test run'
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who executed the test run'
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name/description of the test run'
    },
    test_type: {
      type: DataTypes.ENUM('file_upload', 'url_analysis', 'mixed'),
      allowNull: false,
      defaultValue: 'mixed',
      comment: 'Type of test run (file upload, URL analysis, or mixed)'
    },
    total_tests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total number of tests in this run'
    },
    passed_tests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of tests that passed'
    },
    failed_tests: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of tests that failed'
    },
    status: {
      type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the test run'
    },
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Progress percentage (0-100)'
    },
    selected_files: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of selected file paths for testing'
    },
    selected_urls: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of selected URLs for testing'
    },
    selected_ai_jobs: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Array of selected AI jobs to test'
    },
    configuration: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Test configuration options and parameters'
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the test run started'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the test run completed'
    },
    duration_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Total duration of the test run in seconds'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if test run failed'
    }
  }, {
    tableName: 'test_runs',
    timestamps: true,
    comment: 'Stores test execution sessions for multimedia analysis testing'
  });

  TestRun.associate = (models) => {
    TestRun.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    TestRun.hasMany(models.TestResult, {
      foreignKey: 'test_run_id',
      as: 'testResults',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    TestRun.hasMany(models.TestMetric, {
      foreignKey: 'test_run_id',
      as: 'testMetrics',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  return TestRun;
}; 