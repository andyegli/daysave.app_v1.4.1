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
  return User;
}; 