const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContentRelation = sequelize.define('ContentRelation', {
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
    content_id_1: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'content',
        key: 'id'
      }
    },
    content_id_2: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'content',
        key: 'id'
      }
    },
    relation_type: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'content_relations',
    timestamps: true
  });

  ContentRelation.associate = (models) => {
    ContentRelation.belongsTo(models.User, { foreignKey: 'user_id' });
    ContentRelation.belongsTo(models.Content, { as: 'Content1', foreignKey: 'content_id_1' });
    ContentRelation.belongsTo(models.Content, { as: 'Content2', foreignKey: 'content_id_2' });
  };

  return ContentRelation;
}; 