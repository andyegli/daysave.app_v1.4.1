const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ApiKeyAuditLog = sequelize.define('ApiKeyAuditLog', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    api_key_id: {
      type: DataTypes.CHAR(36),
      allowNull: true, // Nullable for system-wide events
      references: {
        model: 'api_keys',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    admin_user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin user who performed the action (if applicable)'
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Type of action performed (CREATE, UPDATE, DELETE, ENABLE, DISABLE, USE, EXPIRE, etc.)'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Human-readable description of the action'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'low',
      comment: 'Severity level of the audit event'
    },
    client_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address where the action originated'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string from the request'
    },
    session_id: {
      type: DataTypes.STRING(128),
      allowNull: true,
      comment: 'Session identifier for the action'
    },
    request_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: 'Unique request identifier'
    },
    old_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Previous values before the change (for UPDATE actions)'
    },
    new_values: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'New values after the change (for UPDATE actions)'
    },
    success: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the action was successful'
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for failure if action was unsuccessful'
    },
    geographic_region: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Geographic region of the client'
    },
    security_flags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Security-related flags and alerts'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the audit event'
    }
  }, {
    tableName: 'api_key_audit_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['api_key_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['admin_user_id']
      },
      {
        fields: ['action']
      },
      {
        fields: ['severity']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['client_ip']
      },
      {
        fields: ['success']
      },
      {
        fields: ['session_id']
      },
      {
        fields: ['request_id']
      },
      // Composite indexes for common queries
      {
        fields: ['api_key_id', 'createdAt']
      },
      {
        fields: ['user_id', 'action', 'createdAt']
      },
      {
        fields: ['admin_user_id', 'createdAt']
      },
      {
        fields: ['severity', 'createdAt']
      },
      {
        fields: ['action', 'success', 'createdAt']
      }
    ]
  });

  ApiKeyAuditLog.associate = (models) => {
    ApiKeyAuditLog.belongsTo(models.ApiKey, { foreignKey: 'api_key_id', as: 'apiKey' });
    ApiKeyAuditLog.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    ApiKeyAuditLog.belongsTo(models.User, { foreignKey: 'admin_user_id', as: 'admin' });
  };

  return ApiKeyAuditLog;
}; 