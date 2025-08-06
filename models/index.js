/**
 * Database Models Index for DaySave
 * 
 * PURPOSE:
 * Centralizes database model definitions and establishes associations between
 * models using Sequelize ORM. Provides a single point of access for all
 * database models throughout the application.
 * 
 * FEATURES:
 * - Automatic model loading from model files
 * - Sequelize database connection management
 * - Model association setup
 * - Environment-specific database configuration
 * - Connection pooling and optimization
 * 
 * MODEL LOADING:
 * - Scans models directory for .js files
 * - Excludes test files and this index file
 * - Automatically requires and initializes models
 * - Sets up model associations after all models are loaded
 * 
 * DATABASE MODELS:
 * - User: User accounts and authentication
 * - Content: User-generated content and metadata
 * - File: Uploaded files and attachments
 * - ProcessingJob: Background task tracking
 * - Subscription: User subscription plans
 * - Role: User roles and permissions
 * - Face: Face recognition data
 * - Speaker: Voice identification data
 * - Thumbnail: Generated thumbnails
 * - VideoAnalysis, AudioAnalysis, ImageAnalysis: AI analysis results
 * 
 * ASSOCIATIONS:
 * - User has many Content, Files, Subscriptions
 * - Content belongs to User, has many Files
 * - ProcessingJob belongs to Content/File
 * - Analysis models belong to Content/File
 * - Face and Speaker models for identity tracking
 * 
 * CONFIGURATION:
 * - Environment-based database settings
 * - Connection pooling configuration
 * - SSL/TLS settings for production
 * - Logging and debugging options
 * 
 * DEPENDENCIES:
 * - Sequelize ORM
 * - Database configuration from config/config.js
 * - Individual model definition files
 * - Environment variables for database connection
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Core Database Layer)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.js')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;