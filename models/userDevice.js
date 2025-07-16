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