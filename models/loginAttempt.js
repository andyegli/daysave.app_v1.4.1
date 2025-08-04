const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const LoginAttempt = sequelize.define('LoginAttempt', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    device_fingerprint: {
      type: DataTypes.STRING
    },
    ip: {
      type: DataTypes.STRING
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the login attempt'
    },
    attempt_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_attempt_at: {
      type: DataTypes.DATE
    },
    attempted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when the login attempt occurred'
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the login attempt was successful'
    },
    failure_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Reason for login failure'
    },
    // Geolocation fields
    country: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Country code (ISO 3166-1 alpha-2)'
    },
    region: {
      type: DataTypes.STRING(3),
      allowNull: true,
      comment: 'Region/state code'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'City name'
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitude coordinate'
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitude coordinate'
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Timezone identifier'
    },
    isp: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Internet Service Provider'
    },
    is_vpn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether IP appears to be from VPN/proxy'
    }
  }, {
    tableName: 'login_attempts',
    timestamps: true
  });

  LoginAttempt.associate = (models) => {
    LoginAttempt.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return LoginAttempt;
}; 