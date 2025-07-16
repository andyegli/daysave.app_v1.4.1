const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContentGroup = sequelize.define('ContentGroup', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'content_groups',
    timestamps: true
  });

  ContentGroup.associate = (models) => {
    ContentGroup.belongsTo(models.User, { foreignKey: 'user_id' });
    ContentGroup.hasMany(models.ContentGroupMember, { foreignKey: 'group_id' });
  };

  return ContentGroup;
}; 