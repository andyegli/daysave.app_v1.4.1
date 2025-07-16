const { v4: uuidv4 } = require('uuid');

/**
 * Thumbnail Model
 * 
 * Stores thumbnail images and key moments generated from multimedia content.
 * This model manages thumbnail generation for videos, images, and key moment extraction
 * for enhanced user experience and content preview.
 * 
 * Features:
 * - Multiple thumbnail sizes and formats
 * - Video key moments extraction
 * - Image thumbnail generation
 * - Metadata storage for thumbnail properties
 * - File path management and cleanup
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} Thumbnail model
 */
module.exports = (sequelize, DataTypes) => {
  const Thumbnail = sequelize.define('Thumbnail', {
    /**
     * Primary Key - UUID
     * Unique identifier for each thumbnail record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the thumbnail'
    },

    /**
     * User Association
     * Links thumbnail to the user who owns the content
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who owns the content this thumbnail belongs to'
    },

    /**
     * Content Association
     * Links thumbnail to content record (for URL-based content)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'UUID of the content record this thumbnail belongs to (nullable for file-based content)'
    },

    /**
     * File Association
     * Links thumbnail to file record (for uploaded files)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'UUID of the file record this thumbnail belongs to (nullable for URL-based content)'
    },

    /**
     * Thumbnail Type
     * Specifies the type of thumbnail generated
     * - main: Primary thumbnail (usually first frame or image resize)
     * - key_moment: Key moment extracted from video
     * - preview: Preview thumbnail for hover effects
     * - grid: Grid-style thumbnail for listings
     * - custom: User-defined custom thumbnail
     */
    thumbnail_type: {
      type: DataTypes.ENUM('main', 'key_moment', 'preview', 'grid', 'custom'),
      allowNull: false,
      defaultValue: 'main',
      comment: 'Type of thumbnail (main, key_moment, preview, grid, custom)'
    },

    /**
     * File Path
     * Relative path to the thumbnail file from the application root
     * Example: "uploads/thumbnails/video123_thumb_main.jpg"
     */
    file_path: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Relative path to the thumbnail file from application root'
    },

    /**
     * File Name
     * Original filename of the thumbnail
     */
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Filename of the thumbnail image'
    },

    /**
     * File Size
     * Size of the thumbnail file in bytes
     */
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Size of the thumbnail file in bytes'
    },

    /**
     * MIME Type
     * MIME type of the thumbnail file
     * Common values: image/jpeg, image/png, image/webp, image/gif
     */
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'image/jpeg',
      comment: 'MIME type of the thumbnail file'
    },

    /**
     * Width
     * Width of the thumbnail image in pixels
     */
    width: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Width of the thumbnail image in pixels'
    },

    /**
     * Height
     * Height of the thumbnail image in pixels
     */
    height: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Height of the thumbnail image in pixels'
    },

    /**
     * Timestamp
     * For video thumbnails, the timestamp in the video where this thumbnail was extracted
     * Format: "HH:MM:SS.mmm" (e.g., "00:01:30.500")
     */
    timestamp: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Video timestamp where thumbnail was extracted (HH:MM:SS.mmm format)'
    },

    /**
     * Timestamp Seconds
     * Timestamp in seconds for easier querying and sorting
     */
    timestamp_seconds: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
      comment: 'Video timestamp in seconds for easier querying and sorting'
    },

    /**
     * Key Moment Index
     * For key moment thumbnails, the index/order of this moment in the sequence
     */
    key_moment_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Index/order of this key moment in the sequence (for key_moment type)'
    },

    /**
     * Quality
     * Quality setting used for thumbnail generation
     * - low: Fast generation, smaller file size
     * - medium: Balanced quality and file size
     * - high: Best quality, larger file size
     */
    quality: {
      type: DataTypes.ENUM('low', 'medium', 'high'),
      allowNull: false,
      defaultValue: 'medium',
      comment: 'Quality setting used for thumbnail generation'
    },

    /**
     * Generation Method
     * Method used to generate the thumbnail
     * - ffmpeg: Generated using FFmpeg
     * - sharp: Generated using Sharp image processing
     * - imagemagick: Generated using ImageMagick
     * - canvas: Generated using HTML5 Canvas
     * - external: Generated by external service
     */
    generation_method: {
      type: DataTypes.ENUM('ffmpeg', 'sharp', 'imagemagick', 'canvas', 'external'),
      allowNull: true,
      comment: 'Method used to generate the thumbnail'
    },

    /**
     * Metadata
     * Additional metadata about the thumbnail generation and properties
     * Structure: {
     *   originalDimensions: { width: number, height: number },
     *   aspectRatio: number,
     *   generationTime: number, // milliseconds
     *   compressionRatio: number,
     *   colorProfile: string,
     *   frameRate: number, // for video thumbnails
     *   keyMomentScore: number, // relevance score for key moments
     *   extractionSettings: object,
     *   processingLog: array
     * }
     */
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about thumbnail generation and properties'
    },

    /**
     * Status
     * Current status of the thumbnail
     * - generating: Thumbnail is being generated
     * - ready: Thumbnail is ready for use
     * - failed: Thumbnail generation failed
     * - expired: Thumbnail has expired and needs regeneration
     */
    status: {
      type: DataTypes.ENUM('generating', 'ready', 'failed', 'expired'),
      allowNull: false,
      defaultValue: 'generating',
      comment: 'Current status of the thumbnail'
    },

    /**
     * Error Message
     * Error message if thumbnail generation failed
     */
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if thumbnail generation failed'
    },

    /**
     * Expiry Date
     * When this thumbnail expires and should be regenerated
     */
    expires_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this thumbnail expires and should be regenerated'
    },

    /**
     * Usage Count
     * Number of times this thumbnail has been accessed/viewed
     */
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times this thumbnail has been accessed/viewed'
    },

    /**
     * Last Accessed
     * When this thumbnail was last accessed
     */
    last_accessed: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When this thumbnail was last accessed'
    }
  }, {
    tableName: 'thumbnails',
    timestamps: true,
    comment: 'Stores thumbnail images and key moments generated from multimedia content',
    
    indexes: [
      {
        name: 'idx_thumbnails_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_thumbnails_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_thumbnails_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_thumbnails_type',
        fields: ['thumbnail_type']
      },
      {
        name: 'idx_thumbnails_status',
        fields: ['status']
      },
      {
        name: 'idx_thumbnails_timestamp',
        fields: ['timestamp_seconds']
      },
      {
        name: 'idx_thumbnails_key_moment',
        fields: ['key_moment_index']
      },
      {
        name: 'idx_thumbnails_expires',
        fields: ['expires_at']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between Thumbnail and other models
   */
  Thumbnail.associate = (models) => {
    // Thumbnail belongs to a User
    Thumbnail.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Thumbnail belongs to Content (nullable)
    Thumbnail.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Thumbnail belongs to File (nullable)
    Thumbnail.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Instance Methods
   */

  /**
   * Get the full URL path for accessing this thumbnail
   * @param {string} baseUrl - Base URL of the application
   * @returns {string} Full URL to the thumbnail
   */
  Thumbnail.prototype.getUrl = function(baseUrl = '') {
    return `${baseUrl}/${this.file_path}`;
  };

  /**
   * Check if thumbnail has expired
   * @returns {boolean} True if thumbnail has expired
   */
  Thumbnail.prototype.isExpired = function() {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  };

  /**
   * Update usage statistics
   */
  Thumbnail.prototype.recordAccess = function() {
    this.usage_count += 1;
    this.last_accessed = new Date();
  };

  /**
   * Get thumbnail dimensions as object
   * @returns {Object} {width, height} or null if not available
   */
  Thumbnail.prototype.getDimensions = function() {
    if (this.width && this.height) {
      return { width: this.width, height: this.height };
    }
    return null;
  };

  /**
   * Class Methods
   */

  /**
   * Get all thumbnails for a content item
   * @param {string} contentId - Content ID
   * @returns {Promise<Array>} Array of thumbnails
   */
  Thumbnail.getByContent = async function(contentId) {
    return await this.findAll({
      where: { content_id: contentId, status: 'ready' },
      order: [['key_moment_index', 'ASC'], ['timestamp_seconds', 'ASC'], ['createdAt', 'ASC']]
    });
  };

  /**
   * Get all thumbnails for a file
   * @param {string} fileId - File ID
   * @returns {Promise<Array>} Array of thumbnails
   */
  Thumbnail.getByFile = async function(fileId) {
    return await this.findAll({
      where: { file_id: fileId, status: 'ready' },
      order: [['key_moment_index', 'ASC'], ['timestamp_seconds', 'ASC'], ['createdAt', 'ASC']]
    });
  };

  /**
   * Get main thumbnail for content or file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @returns {Promise<Object>} Main thumbnail or null
   */
  Thumbnail.getMainThumbnail = async function(contentId = null, fileId = null) {
    const where = { 
      thumbnail_type: 'main', 
      status: 'ready' 
    };
    
    if (contentId) where.content_id = contentId;
    if (fileId) where.file_id = fileId;
    
    return await this.findOne({ where });
  };

  /**
   * Get key moments for content or file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @returns {Promise<Array>} Array of key moment thumbnails
   */
  Thumbnail.getKeyMoments = async function(contentId = null, fileId = null) {
    const where = { 
      thumbnail_type: 'key_moment', 
      status: 'ready' 
    };
    
    if (contentId) where.content_id = contentId;
    if (fileId) where.file_id = fileId;
    
    return await this.findAll({
      where,
      order: [['key_moment_index', 'ASC'], ['timestamp_seconds', 'ASC']]
    });
  };

  /**
   * Clean up expired thumbnails
   * @returns {Promise<number>} Number of thumbnails cleaned up
   */
  Thumbnail.cleanupExpired = async function() {
    const fs = require('fs');
    const path = require('path');
    
    const expiredThumbnails = await this.findAll({
      where: {
        expires_at: {
          [sequelize.Sequelize.Op.lt]: new Date()
        }
      }
    });
    
    let cleanedCount = 0;
    
    for (const thumbnail of expiredThumbnails) {
      try {
        // Delete physical file
        const fullPath = path.join(process.cwd(), thumbnail.file_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        
        // Delete database record
        await thumbnail.destroy();
        cleanedCount++;
      } catch (error) {
        console.error(`Failed to cleanup thumbnail ${thumbnail.id}:`, error);
      }
    }
    
    return cleanedCount;
  };

  /**
   * Get thumbnail statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Thumbnail statistics
   */
  Thumbnail.getUserStats = async function(userId) {
    const thumbnails = await this.findAll({
      where: { user_id: userId }
    });
    
    const totalSize = thumbnails.reduce((sum, t) => sum + (t.file_size || 0), 0);
    const byType = {};
    const byStatus = {};
    
    thumbnails.forEach(thumbnail => {
      byType[thumbnail.thumbnail_type] = (byType[thumbnail.thumbnail_type] || 0) + 1;
      byStatus[thumbnail.status] = (byStatus[thumbnail.status] || 0) + 1;
    });
    
    return {
      totalThumbnails: thumbnails.length,
      totalSize,
      byType,
      byStatus,
      averageSize: thumbnails.length > 0 ? totalSize / thumbnails.length : 0
    };
  };

  return Thumbnail;
}; 