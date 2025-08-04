const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AdminSetting = sequelize.define('AdminSetting', {
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
    login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    lock_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 24 // hours
    },
    auto_unlock: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    file_types: {
      type: DataTypes.JSON
    },
    max_file_size: {
      type: DataTypes.INTEGER,
      defaultValue: 25 // MB
    },
    ip_whitelist: {
      type: DataTypes.JSON
    },
    ip_blacklist: {
      type: DataTypes.JSON
    },
    allow_dev_http_any_ip: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Allow HTTP access from any IP during development (security risk - dev only)'
    }
  }, {
    tableName: 'admin_settings',
    timestamps: true
  });

  AdminSetting.associate = (models) => {
    AdminSetting.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return AdminSetting;
}; 