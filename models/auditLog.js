const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: true, // Can be null for system actions
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    target_type: {
      type: DataTypes.STRING
    },
    target_id: {
      type: DataTypes.CHAR(36)
    },
    details: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true
  });

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return AuditLog;
}; 