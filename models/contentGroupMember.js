const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContentGroupMember = sequelize.define('ContentGroupMember', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'content',
        key: 'id'
      }
    },
    group_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'content_groups',
        key: 'id'
      }
    }
  }, {
    tableName: 'content_group_members',
    timestamps: true
  });

  ContentGroupMember.associate = (models) => {
    ContentGroupMember.belongsTo(models.Content, { foreignKey: 'content_id' });
    ContentGroupMember.belongsTo(models.ContentGroup, { foreignKey: 'group_id' });
  };

  return ContentGroupMember;
}; 