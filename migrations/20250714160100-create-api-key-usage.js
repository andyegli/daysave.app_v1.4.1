'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_key_usage', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      api_key_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'api_keys',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      endpoint: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'API endpoint that was accessed'
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'HTTP method (GET, POST, PUT, DELETE, etc.)'
      },
      status_code: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'HTTP status code of the response'
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Response time in milliseconds'
      },
      request_size_bytes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Size of the request payload in bytes'
      },
      response_size_bytes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Size of the response payload in bytes'
      },
      client_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address of the client making the request'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string from the request'
      },
      referer: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Referer header from the request'
      },
      origin: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Origin header from the request'
      },
      request_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Unique request identifier for tracking'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if the request failed'
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of tokens used for AI/ML operations'
      },
      estimated_cost: {
        type: Sequelize.DECIMAL(10, 6),
        defaultValue: 0.000000,
        comment: 'Estimated cost of the API call in USD'
      },
      cache_hit: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the request was served from cache'
      },
      rate_limited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the request was rate limited'
      },
      geographic_region: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Geographic region of the client'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the API usage'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('api_key_usage', ['api_key_id']);
    await queryInterface.addIndex('api_key_usage', ['user_id']);
    await queryInterface.addIndex('api_key_usage', ['endpoint']);
    await queryInterface.addIndex('api_key_usage', ['method']);
    await queryInterface.addIndex('api_key_usage', ['status_code']);
    await queryInterface.addIndex('api_key_usage', ['createdAt']);
    await queryInterface.addIndex('api_key_usage', ['client_ip']);
    await queryInterface.addIndex('api_key_usage', ['rate_limited']);
    await queryInterface.addIndex('api_key_usage', ['cache_hit']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('api_key_usage', ['api_key_id', 'createdAt']);
    await queryInterface.addIndex('api_key_usage', ['user_id', 'createdAt']);
    await queryInterface.addIndex('api_key_usage', ['endpoint', 'method', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_key_usage');
  }
}; 