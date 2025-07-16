'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_key_audit_logs', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      api_key_id: {
        type: Sequelize.CHAR(36),
        allowNull: true, // Nullable for system-wide events
        references: {
          model: 'api_keys',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      admin_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who performed the action (if applicable)'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type of action performed (CREATE, UPDATE, DELETE, ENABLE, DISABLE, USE, EXPIRE, etc.)'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Human-readable description of the action'
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        defaultValue: 'low',
        comment: 'Severity level of the audit event'
      },
      client_ip: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address where the action originated'
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User agent string from the request'
      },
      session_id: {
        type: Sequelize.STRING(128),
        allowNull: true,
        comment: 'Session identifier for the action'
      },
      request_id: {
        type: Sequelize.STRING(36),
        allowNull: true,
        comment: 'Unique request identifier'
      },
      old_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Previous values before the change (for UPDATE actions)'
      },
      new_values: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'New values after the change (for UPDATE actions)'
      },
      success: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the action was successful'
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for failure if action was unsuccessful'
      },
      geographic_region: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Geographic region of the client'
      },
      security_flags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Security-related flags and alerts'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata for the audit event'
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
    await queryInterface.addIndex('api_key_audit_logs', ['api_key_id']);
    await queryInterface.addIndex('api_key_audit_logs', ['user_id']);
    await queryInterface.addIndex('api_key_audit_logs', ['admin_user_id']);
    await queryInterface.addIndex('api_key_audit_logs', ['action']);
    await queryInterface.addIndex('api_key_audit_logs', ['severity']);
    await queryInterface.addIndex('api_key_audit_logs', ['createdAt']);
    await queryInterface.addIndex('api_key_audit_logs', ['client_ip']);
    await queryInterface.addIndex('api_key_audit_logs', ['success']);
    await queryInterface.addIndex('api_key_audit_logs', ['session_id']);
    await queryInterface.addIndex('api_key_audit_logs', ['request_id']);
    
    // Composite indexes for common queries
    await queryInterface.addIndex('api_key_audit_logs', ['api_key_id', 'createdAt']);
    await queryInterface.addIndex('api_key_audit_logs', ['user_id', 'action', 'createdAt']);
    await queryInterface.addIndex('api_key_audit_logs', ['admin_user_id', 'createdAt']);
    await queryInterface.addIndex('api_key_audit_logs', ['severity', 'createdAt']);
    await queryInterface.addIndex('api_key_audit_logs', ['action', 'success', 'createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('api_key_audit_logs');
  }
}; 