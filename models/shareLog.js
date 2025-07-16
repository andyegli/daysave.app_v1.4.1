const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ShareLog = sequelize.define('ShareLog', {
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
    content_id: {
      type: DataTypes.CHAR(36),
      references: { model: 'content', key: 'id' }
    },
    file_id: {
      type: DataTypes.CHAR(36),
      references: { model: 'files', key: 'id' }
    },
    contact_id: {
      type: DataTypes.CHAR(36),
      references: { model: 'contacts', key: 'id' }
    },
    group_id: {
      type: DataTypes.CHAR(36) // Could be contact_group or content_group
    },
    share_method: {
      type: DataTypes.STRING
    },
    language: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'share_logs',
    timestamps: true
  });

  ShareLog.associate = (models) => {
    ShareLog.belongsTo(models.User, { foreignKey: 'user_id' });
    ShareLog.belongsTo(models.Content, { foreignKey: 'content_id' });
    ShareLog.belongsTo(models.File, { foreignKey: 'file_id' });
    ShareLog.belongsTo(models.Contact, { foreignKey: 'contact_id' });
  };

  return ShareLog;
}; 