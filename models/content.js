const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Content = sequelize.define('Content', {
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
    social_account_id: {
      type: DataTypes.CHAR(36),
      references: {
        model: 'social_accounts',
        key: 'id'
      }
    },
    url: {
      type: DataTypes.STRING
    },
    metadata: {
      type: DataTypes.JSON
    },
    transcription: {
      type: DataTypes.TEXT
    },
    summary: {
      type: DataTypes.TEXT
    },
    sentiment: {
      type: DataTypes.JSON
    },
    auto_tags: {
      type: DataTypes.JSON
    },
    user_tags: {
      type: DataTypes.JSON
    },
    user_comments: {
      type: DataTypes.TEXT
    },
    category: {
      type: DataTypes.STRING
    },
    location: {
      type: DataTypes.JSON
    }
  }, {
    tableName: 'content',
    timestamps: true
  });
  return Content;
}; 