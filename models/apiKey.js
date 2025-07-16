const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    key_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'User-defined name for the API key'
    },
    key_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Hashed version of the API key for security'
    },
    key_prefix: {
      type: DataTypes.STRING(8),
      allowNull: false,
      comment: 'First 8 characters of the key for identification'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional description of the API key purpose'
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether the API key is currently active'
    },
    admin_disabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether the key was disabled by an administrator'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Expiration date for the API key'
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last time the API key was used'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total number of API calls made with this key'
    },
    rate_limit_per_minute: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
      allowNull: false,
      comment: 'Rate limit per minute for this key'
    },
    rate_limit_per_hour: {
      type: DataTypes.INTEGER,
      defaultValue: 1000,
      allowNull: false,
      comment: 'Rate limit per hour for this key'
    },
    rate_limit_per_day: {
      type: DataTypes.INTEGER,
      defaultValue: 10000,
      allowNull: false,
      comment: 'Rate limit per day for this key'
    },
    allowed_origins: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of allowed origin domains for CORS'
    },
    allowed_ips: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of allowed IP addresses/ranges'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'Object containing route permissions and access levels'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the API key'
    }
  }, {
    tableName: 'api_keys',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['key_hash']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['enabled']
      },
      {
        fields: ['expires_at']
      },
      {
        fields: ['last_used_at']
      }
    ]
  });

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.User, { foreignKey: 'user_id', as: 'owner' });
    ApiKey.hasMany(models.ApiKeyUsage, { foreignKey: 'api_key_id', as: 'usage' });
    ApiKey.hasMany(models.ApiKeyAuditLog, { foreignKey: 'api_key_id', as: 'auditLogs' });
  };

  return ApiKey;
}; 