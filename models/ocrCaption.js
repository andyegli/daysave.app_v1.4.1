const { v4: uuidv4 } = require('uuid');

/**
 * OCR Caption Model
 * 
 * Stores text extracted from video frames using Optical Character Recognition (OCR).
 * This model enables timestamp-based text extraction from videos, allowing users to
 * search and navigate video content based on visible text.
 * 
 * Features:
 * - Frame-by-frame text extraction with timestamps
 * - Text confidence scoring and filtering
 * - Coordinate-based text positioning
 * - Multi-language text recognition
 * - Searchable text content with video navigation
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} OCRCaption model
 */
module.exports = (sequelize, DataTypes) => {
  const OCRCaption = sequelize.define('OCRCaption', {
    /**
     * Primary Key - UUID
     * Unique identifier for each OCR caption record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the OCR caption'
    },

    /**
     * User Association
     * Links OCR caption to the user who owns the content
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who owns the content this OCR caption belongs to'
    },

    /**
     * Content Association
     * Links OCR caption to content record (for URL-based content)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'UUID of the content record this OCR caption belongs to (nullable for file-based content)'
    },

    /**
     * File Association
     * Links OCR caption to file record (for uploaded files)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'UUID of the file record this OCR caption belongs to (nullable for URL-based content)'
    },

    /**
     * Timestamp
     * Video timestamp where this text was extracted
     * Format: "HH:MM:SS.mmm" (e.g., "00:01:30.500")
     */
    timestamp: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Video timestamp where text was extracted (HH:MM:SS.mmm format)'
    },

    /**
     * Timestamp Seconds
     * Timestamp in seconds for easier querying and sorting
     */
    timestamp_seconds: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Video timestamp in seconds for easier querying and sorting'
    },

    /**
     * Frame Index
     * Sequential frame number in the video where text was extracted
     */
    frame_index: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Sequential frame number in the video where text was extracted'
    },

    /**
     * Extracted Text
     * The actual text content extracted from the video frame
     */
    text: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
      comment: 'The actual text content extracted from the video frame'
    },

    /**
     * Confidence Score
     * OCR confidence score for the extracted text (0.0 to 1.0)
     * Higher scores indicate more reliable text recognition
     */
    confidence: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      validate: {
        min: 0.0000,
        max: 1.0000
      },
      comment: 'OCR confidence score for the extracted text (0.0 to 1.0)'
    },

    /**
     * Bounding Box Coordinates
     * Coordinates of the text within the video frame
     * Structure: {
     *   x: number,        // X coordinate of top-left corner
     *   y: number,        // Y coordinate of top-left corner
     *   width: number,    // Width of the text bounding box
     *   height: number,   // Height of the text bounding box
     *   x2: number,       // X coordinate of bottom-right corner
     *   y2: number        // Y coordinate of bottom-right corner
     * }
     */
    coordinates: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Bounding box coordinates of the text within the video frame'
    },

    /**
     * Text Properties
     * Additional properties of the detected text
     * Structure: {
     *   fontSize: number,
     *   fontFamily: string,
     *   color: string,
     *   backgroundColor: string,
     *   bold: boolean,
     *   italic: boolean,
     *   underline: boolean,
     *   alignment: string,
     *   direction: string,
     *   language: string
     * }
     */
    text_properties: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional properties of the detected text (font, color, style, etc.)'
    },

    /**
     * Language
     * Detected or specified language of the text
     * ISO 639-1 language codes (e.g., "en", "es", "fr", "de")
     */
    language: {
      type: DataTypes.STRING(5),
      allowNull: true,
      comment: 'Detected or specified language of the text (ISO 639-1 codes)'
    },

    /**
     * Text Category
     * Categorization of the text content
     * - title: Title or heading text
     * - subtitle: Subtitle or caption text
     * - body: Body text content
     * - ui: User interface text
     * - watermark: Watermark or logo text
     * - credits: Credits or attribution text
     * - other: Other text content
     */
    text_category: {
      type: DataTypes.ENUM('title', 'subtitle', 'body', 'ui', 'watermark', 'credits', 'other'),
      allowNull: false,
      defaultValue: 'other',
      comment: 'Categorization of the text content type'
    },

    /**
     * Word Count
     * Number of words in the extracted text
     */
    word_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of words in the extracted text'
    },

    /**
     * Character Count
     * Number of characters in the extracted text
     */
    character_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of characters in the extracted text'
    },

    /**
     * Processing Method
     * OCR method/engine used for text extraction
     * - google_vision: Google Cloud Vision API
     * - tesseract: Tesseract OCR engine
     * - azure_cognitive: Azure Cognitive Services
     * - aws_textract: AWS Textract
     * - custom: Custom OCR implementation
     */
    processing_method: {
      type: DataTypes.ENUM('google_vision', 'tesseract', 'azure_cognitive', 'aws_textract', 'custom'),
      allowNull: false,
      defaultValue: 'google_vision',
      comment: 'OCR method/engine used for text extraction'
    },

    /**
     * Processing Metadata
     * Additional metadata about the OCR processing
     * Structure: {
     *   processingTime: number,      // Time taken for OCR processing (ms)
     *   imageResolution: object,     // Original image resolution
     *   preprocessingSteps: array,   // Image preprocessing steps applied
     *   alternativeTexts: array,     // Alternative text interpretations
     *   rawResponse: object,         // Raw OCR API response
     *   errorLog: array             // Any errors encountered during processing
     * }
     */
    processing_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata about the OCR processing'
    },

    /**
     * Status
     * Current status of the OCR caption
     * - processing: OCR is being processed
     * - ready: OCR caption is ready for use
     * - failed: OCR processing failed
     * - filtered: Text was filtered out due to low confidence or other criteria
     * - verified: Text has been manually verified by user
     */
    status: {
      type: DataTypes.ENUM('processing', 'ready', 'failed', 'filtered', 'verified'),
      allowNull: false,
      defaultValue: 'processing',
      comment: 'Current status of the OCR caption'
    },

    /**
     * Error Message
     * Error message if OCR processing failed
     */
    error_message: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Error message if OCR processing failed'
    },

    /**
     * Filtered Reason
     * Reason why text was filtered out (if status is 'filtered')
     */
    filtered_reason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason why text was filtered out (low confidence, too short, etc.)'
    },

    /**
     * User Verified
     * Whether the text has been manually verified by the user
     */
    user_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the text has been manually verified by the user'
    },

    /**
     * Original Text
     * Original text before any user corrections
     */
    original_text: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Original text before any user corrections'
    },

    /**
     * Search Vector
     * Full-text search vector for efficient text searching
     */
    search_vector: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Full-text search vector for efficient text searching'
    }
  }, {
    tableName: 'ocr_captions',
    timestamps: true,
    comment: 'Stores text extracted from video frames using OCR',
    
    indexes: [
      {
        name: 'idx_ocr_captions_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_ocr_captions_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_ocr_captions_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_ocr_captions_timestamp',
        fields: ['timestamp_seconds']
      },
      {
        name: 'idx_ocr_captions_confidence',
        fields: ['confidence']
      },
      {
        name: 'idx_ocr_captions_status',
        fields: ['status']
      },
      {
        name: 'idx_ocr_captions_category',
        fields: ['text_category']
      },
      {
        name: 'idx_ocr_captions_language',
        fields: ['language']
      },
      {
        name: 'idx_ocr_captions_frame',
        fields: ['frame_index']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between OCRCaption and other models
   */
  OCRCaption.associate = (models) => {
    // OCRCaption belongs to a User
    OCRCaption.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // OCRCaption belongs to Content (nullable)
    OCRCaption.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // OCRCaption belongs to File (nullable)
    OCRCaption.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Hooks
   */
  OCRCaption.addHook('beforeSave', (caption) => {
    // Update word and character counts
    if (caption.text) {
      caption.word_count = caption.text.split(/\s+/).filter(word => word.length > 0).length;
      caption.character_count = caption.text.length;
      
      // Update search vector (simplified - in production, use proper full-text search)
      caption.search_vector = caption.text.toLowerCase();
    }
  });

  /**
   * Instance Methods
   */

  /**
   * Get formatted timestamp for display
   * @returns {string} Formatted timestamp (HH:MM:SS)
   */
  OCRCaption.prototype.getFormattedTimestamp = function() {
    return this.timestamp.split('.')[0]; // Remove milliseconds for display
  };

  /**
   * Check if text meets confidence threshold
   * @param {number} threshold - Minimum confidence threshold (default: 0.5)
   * @returns {boolean} True if confidence meets threshold
   */
  OCRCaption.prototype.meetsConfidenceThreshold = function(threshold = 0.5) {
    return this.confidence >= threshold;
  };

  /**
   * Get text with highlighting for search terms
   * @param {string} searchTerm - Term to highlight
   * @returns {string} Text with highlighted search terms
   */
  OCRCaption.prototype.getHighlightedText = function(searchTerm) {
    if (!searchTerm) return this.text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return this.text.replace(regex, '<mark>$1</mark>');
  };

  /**
   * Update text with user correction
   * @param {string} newText - Corrected text
   */
  OCRCaption.prototype.updateWithCorrection = function(newText) {
    if (!this.original_text) {
      this.original_text = this.text;
    }
    this.text = newText;
    this.user_verified = true;
    this.status = 'verified';
  };

  /**
   * Class Methods
   */

  /**
   * Get OCR captions for content with pagination
   * @param {string} contentId - Content ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated OCR captions
   */
  OCRCaption.getByContent = async function(contentId, options = {}) {
    const {
      page = 1,
      limit = 50,
      minConfidence = 0.5,
      category = null,
      language = null,
      status = 'ready'
    } = options;

    const where = {
      content_id: contentId,
      status: status,
      confidence: { [sequelize.Sequelize.Op.gte]: minConfidence }
    };

    if (category) where.text_category = category;
    if (language) where.language = language;

    const { count, rows } = await this.findAndCountAll({
      where,
      order: [['timestamp_seconds', 'ASC']],
      limit,
      offset: (page - 1) * limit
    });

    return {
      captions: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  };

  /**
   * Search OCR captions by text
   * @param {string} userId - User ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching OCR captions
   */
  OCRCaption.searchText = async function(userId, searchTerm, options = {}) {
    const {
      minConfidence = 0.5,
      contentId = null,
      fileId = null,
      limit = 100
    } = options;

    const where = {
      user_id: userId,
      status: 'ready',
      confidence: { [sequelize.Sequelize.Op.gte]: minConfidence },
      text: { [sequelize.Sequelize.Op.like]: `%${searchTerm}%` }
    };

    if (contentId) where.content_id = contentId;
    if (fileId) where.file_id = fileId;

    return await this.findAll({
      where,
      order: [['timestamp_seconds', 'ASC']],
      limit,
      include: [
        { model: sequelize.models.Content, as: 'content' },
        { model: sequelize.models.File, as: 'file' }
      ]
    });
  };

  /**
   * Get OCR statistics for content or file
   * @param {string} contentId - Content ID (optional)
   * @param {string} fileId - File ID (optional)
   * @returns {Promise<Object>} OCR statistics
   */
  OCRCaption.getStats = async function(contentId = null, fileId = null) {
    const where = { status: 'ready' };
    if (contentId) where.content_id = contentId;
    if (fileId) where.file_id = fileId;

    const captions = await this.findAll({ where });

    const totalWords = captions.reduce((sum, c) => sum + c.word_count, 0);
    const totalCharacters = captions.reduce((sum, c) => sum + c.character_count, 0);
    const avgConfidence = captions.reduce((sum, c) => sum + parseFloat(c.confidence), 0) / captions.length;

    const byCategory = {};
    const byLanguage = {};

    captions.forEach(caption => {
      byCategory[caption.text_category] = (byCategory[caption.text_category] || 0) + 1;
      if (caption.language) {
        byLanguage[caption.language] = (byLanguage[caption.language] || 0) + 1;
      }
    });

    return {
      totalCaptions: captions.length,
      totalWords,
      totalCharacters,
      averageConfidence: avgConfidence || 0,
      byCategory,
      byLanguage,
      duration: captions.length > 0 ? Math.max(...captions.map(c => c.timestamp_seconds)) : 0
    };
  };

  /**
   * Clean up low-confidence captions
   * @param {number} threshold - Confidence threshold below which to remove captions
   * @returns {Promise<number>} Number of captions removed
   */
  OCRCaption.cleanupLowConfidence = async function(threshold = 0.3) {
    const result = await this.destroy({
      where: {
        confidence: { [sequelize.Sequelize.Op.lt]: threshold },
        status: 'ready'
      }
    });

    return result;
  };

  /**
   * Get timeline of text appearances
   * @param {string} contentId - Content ID
   * @param {number} intervalSeconds - Interval for grouping (default: 10)
   * @returns {Promise<Array>} Timeline data
   */
  OCRCaption.getTimeline = async function(contentId, intervalSeconds = 10) {
    const captions = await this.findAll({
      where: { content_id: contentId, status: 'ready' },
      order: [['timestamp_seconds', 'ASC']]
    });

    const timeline = [];
    let currentInterval = 0;
    let currentGroup = [];

    for (const caption of captions) {
      const interval = Math.floor(caption.timestamp_seconds / intervalSeconds);
      
      if (interval !== currentInterval) {
        if (currentGroup.length > 0) {
          timeline.push({
            startTime: currentInterval * intervalSeconds,
            endTime: (currentInterval + 1) * intervalSeconds,
            captions: currentGroup
          });
        }
        currentInterval = interval;
        currentGroup = [];
      }
      
      currentGroup.push(caption);
    }

    // Add final group
    if (currentGroup.length > 0) {
      timeline.push({
        startTime: currentInterval * intervalSeconds,
        endTime: (currentInterval + 1) * intervalSeconds,
        captions: currentGroup
      });
    }

    return timeline;
  };

  return OCRCaption;
}; 