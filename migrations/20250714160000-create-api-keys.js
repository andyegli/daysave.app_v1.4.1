'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
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
      key_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'User-defined name for the API key'
      },
      key_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Hashed version of the API key for security'
      },
      key_prefix: {
        type: Sequelize.STRING(8),
        allowNull: false,
        comment: 'First 8 characters of the key for identification'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Optional description of the API key purpose'
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the API key is currently active'
      },
      admin_disabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether the key was disabled by an administrator'
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Expiration date for the API key'
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time the API key was used'
      },
      usage_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Total number of API calls made with this key'
      },
      rate_limit_per_minute: {
        type: Sequelize.INTEGER,
        defaultValue: 60,
        allowNull: false,
        comment: 'Rate limit per minute for this key'
      },
      rate_limit_per_hour: {
        type: Sequelize.INTEGER,
        defaultValue: 1000,
        allowNull: false,
        comment: 'Rate limit per hour for this key'
      },
      rate_limit_per_day: {
        type: Sequelize.INTEGER,
        defaultValue: 10000,
        allowNull: false,
        comment: 'Rate limit per day for this key'
      },
      allowed_origins: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of allowed origin domains for CORS'
      },
      allowed_ips: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of allowed IP addresses/ranges'
      },
      permissions: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: '{}',
        comment: 'Object containing route permissions and access levels'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the API key'
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

    // Add indexes
    await queryInterface.addIndex('api_keys', ['user_id']);
    await queryInterface.addIndex('api_keys', ['enabled']);
    await queryInterface.addIndex('api_keys', ['expires_at']);
    await queryInterface.addIndex('api_keys', ['last_used_at']);
    await queryInterface.addIndex('api_keys', ['key_hash'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_keys');
  }
}; 