const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ApiKeyUsage = sequelize.define('ApiKeyUsage', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    api_key_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
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
    endpoint: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'API endpoint that was accessed'
    },
    method: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: 'HTTP method (GET, POST, PUT, DELETE, etc.)'
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'HTTP status code of the response'
    },
    response_time_ms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Response time in milliseconds'
    },
    request_size_bytes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Size of the request payload in bytes'
    },
    response_size_bytes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Size of the response payload in bytes'
    },
    client_ip: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the client making the request'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string from the request'
    },
    referer: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Referer header from the request'
    },
    origin: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Origin header from the request'
    },
    request_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: 'Unique request identifier for tracking'
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if the request failed'
    },
    tokens_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Number of tokens used for AI/ML operations'
    },
    estimated_cost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0.000000,
      comment: 'Estimated cost of the API call in USD'
    },
    cache_hit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the request was served from cache'
    },
    rate_limited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the request was rate limited'
    },
    geographic_region: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Geographic region of the client'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for the API usage'
    }
  }, {
    tableName: 'api_key_usage',
    timestamps: true,
    indexes: [
      {
        fields: ['api_key_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['endpoint']
      },
      {
        fields: ['method']
      },
      {
        fields: ['status_code']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['client_ip']
      },
      {
        fields: ['rate_limited']
      },
      {
        fields: ['cache_hit']
      },
      // Composite indexes for common queries
      {
        fields: ['api_key_id', 'createdAt']
      },
      {
        fields: ['user_id', 'createdAt']
      },
      {
        fields: ['endpoint', 'method', 'createdAt']
      }
    ]
  });

  ApiKeyUsage.associate = (models) => {
    ApiKeyUsage.belongsTo(models.ApiKey, { foreignKey: 'api_key_id', as: 'apiKey' });
    ApiKeyUsage.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return ApiKeyUsage;
}; 