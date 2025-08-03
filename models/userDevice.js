const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const UserDevice = sequelize.define('UserDevice', {
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
    device_fingerprint: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_trusted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    last_login_at: {
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
    location_confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Confidence score for location accuracy (0-1)'
    }
  }, {
    tableName: 'user_devices',
    timestamps: true
  });

  UserDevice.associate = (models) => {
    UserDevice.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return UserDevice;
}; 