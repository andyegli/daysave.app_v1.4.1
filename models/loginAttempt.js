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
    attempt_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    last_attempt_at: {
      type: DataTypes.DATE
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