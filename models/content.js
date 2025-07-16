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
      type: DataTypes.TEXT('long')
    },
    summary: {
      type: DataTypes.TEXT('long')
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
      type: DataTypes.TEXT('long')
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

  Content.associate = (models) => {
    Content.belongsTo(models.User, { foreignKey: 'user_id' });
    Content.belongsTo(models.SocialAccount, { foreignKey: 'social_account_id' });
    Content.hasMany(models.ContentGroupMember, { foreignKey: 'content_id' });
    Content.hasMany(models.ContentRelation, { as: 'Content1', foreignKey: 'content_id_1' });
    Content.hasMany(models.ContentRelation, { as: 'Content2', foreignKey: 'content_id_2' });
    Content.hasMany(models.ShareLog, { foreignKey: 'content_id' });
    
    // Multimedia analysis associations
    Content.hasMany(models.Thumbnail, { foreignKey: 'content_id', as: 'thumbnails' });
    Content.hasMany(models.OCRCaption, { foreignKey: 'content_id', as: 'ocrCaptions' });
    Content.hasOne(models.VideoAnalysis, { foreignKey: 'content_id', as: 'videoAnalysis' });
  };

  return Content;
}; 