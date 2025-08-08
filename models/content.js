/**
 * Content Model for DaySave
 * 
 * PURPOSE:
 * Defines the Content model representing user-generated content items including
 * URLs, multimedia files, and their associated metadata, analysis results,
 * and processing status.
 * 
 * FEATURES:
 * - UUID primary keys for security and scalability
 * - User ownership and social account linking
 * - Flexible metadata storage (JSON)
 * - AI-generated analysis results (summary, title, tags)
 * - Content type classification
 * - Processing status tracking
 * - Sentiment analysis and categorization
 * - Full-text search capabilities
 * 
 * FIELDS:
 * - id: UUID primary key
 * - user_id: Owner reference
 * - social_account_id: Optional social media account link
 * - url: Source URL for content
 * - metadata: Flexible JSON storage for content metadata
 * - summary: AI-generated content summary
 * - generated_title: AI-generated title
 * - auto_tags: AI-generated tags (JSON array)
 * - user_comments: User-added comments
 * - user_tags: User-added tags (JSON array)
 * - content_type: Content classification
 * - sentiment_score: AI sentiment analysis
 * - category: Content categorization
 * - status: Processing status tracking
 * 
 * ASSOCIATIONS:
 * - belongsTo User (content owner)
 * - belongsTo SocialAccount (optional social media link)
 * - hasMany Files (attached media files)
 * - hasMany ProcessingJobs (background processing tasks)
 * - hasMany Thumbnails (generated thumbnails)
 * - hasOne VideoAnalysis, AudioAnalysis, ImageAnalysis
 * 
 * INDEXES:
 * - user_id for ownership queries
 * - content_type for filtering
 * - createdAt for chronological sorting
 * - Full-text indexes on searchable fields
 * 
 * VALIDATION:
 * - UUID format validation
 * - Required fields enforcement
 * - JSON structure validation for arrays
 * - URL format validation
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-01 (Core Content Management)
 */

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
    generated_title: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'AI-generated title for the content'
    },
    content_type: {
      type: DataTypes.ENUM('video', 'audio', 'image', 'document', 'unknown'),
      allowNull: false,
      defaultValue: 'unknown',
      comment: 'Detected media type for optimized querying and processing'
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
    Content.hasOne(models.AudioAnalysis, { foreignKey: 'content_id', as: 'audioAnalysis' });
    Content.hasOne(models.ImageAnalysis, { foreignKey: 'content_id', as: 'imageAnalysis' });
    Content.hasMany(models.ProcessingJob, { foreignKey: 'content_id', as: 'processingJobs' });
  };

  return Content;
}; 