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