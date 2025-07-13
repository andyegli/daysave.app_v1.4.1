const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
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
    filename: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
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
    tableName: 'files',
    timestamps: true
  });

  File.associate = (models) => {
    File.belongsTo(models.User, { foreignKey: 'user_id' });
    File.hasMany(models.ShareLog, { foreignKey: 'file_id' });
    
    // Multimedia analysis associations
    File.hasMany(models.Thumbnail, { foreignKey: 'file_id', as: 'thumbnails' });
    File.hasMany(models.OCRCaption, { foreignKey: 'file_id', as: 'ocrCaptions' });
    File.hasOne(models.VideoAnalysis, { foreignKey: 'file_id', as: 'videoAnalysis' });
  };

  return File;
}; 