const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role_id: {
      type: DataTypes.CHAR(36),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING
    },
    device_fingerprint: {
      type: DataTypes.STRING
    },
    subscription_status: {
      type: DataTypes.ENUM('free', 'trial', 'basic', 'pro'),
      defaultValue: 'trial'
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en'
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'role_id' });
    User.hasMany(models.UserDevice, { foreignKey: 'user_id' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id' });
    User.hasMany(models.SocialAccount, { foreignKey: 'user_id' });
    User.hasMany(models.Content, { foreignKey: 'user_id' });
    User.hasMany(models.File, { foreignKey: 'user_id' });
    User.hasMany(models.Contact, { foreignKey: 'user_id' });
    User.hasMany(models.ContactGroup, { foreignKey: 'user_id' });
    User.hasMany(models.Relationship, { foreignKey: 'user_id' });
    User.hasMany(models.ContactRelation, { foreignKey: 'user_id' });
    User.hasMany(models.ContentGroup, { foreignKey: 'user_id' });
    User.hasMany(models.ContentRelation, { foreignKey: 'user_id' });
    User.hasMany(models.ShareLog, { foreignKey: 'user_id' });
    User.hasMany(models.LoginAttempt, { foreignKey: 'user_id' });
    User.hasMany(models.ContactSubmission, { foreignKey: 'user_id', allowNull: true });
    User.hasMany(models.AdminSetting, { foreignKey: 'user_id' });
  };

  return User;
}; 