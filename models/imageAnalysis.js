const { v4: uuidv4 } = require('uuid');

/**
 * Image Analysis Model
 * 
 * Stores comprehensive image analysis results including object detection,
 * OCR text extraction, AI-generated descriptions, and quality assessment.
 * This model provides detailed insights into image content and visual elements.
 * 
 * Features:
 * - Object detection and recognition with confidence scoring
 * - OCR text extraction with positioning and accuracy
 * - AI-generated descriptions and content categorization
 * - Image quality assessment and technical metadata
 * - Color analysis and visual characteristics
 * - Face detection and analysis capabilities
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} ImageAnalysis model
 */
module.exports = (sequelize, DataTypes) => {
  const ImageAnalysis = sequelize.define('ImageAnalysis', {
    /**
     * Primary Key - UUID
     * Unique identifier for each image analysis record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the image analysis'
    },

    /**
     * User Association
     * Links image analysis to the user who owns the content
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who owns the content this analysis belongs to'
    },

    /**
     * Content Association
     * Links image analysis to content record (for URL-based content)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      comment: 'UUID of the content record this analysis belongs to (nullable for file-based content)'
    },

    /**
     * File Association
     * Links image analysis to file record (for uploaded files)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      comment: 'UUID of the file record this analysis belongs to (nullable for URL-based content)'
    },

    /**
     * Processing Job Association
     * Links image analysis to the processing job that generated it
     */
    processing_job_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'processing_jobs',
        key: 'id'
      },
      comment: 'UUID of the processing job that generated this analysis'
    },

    /**
     * Image Metadata
     * Technical metadata about the image file
     * Structure: {
     *   format: string,
     *   dimensions: { width: number, height: number },
     *   fileSize: number,
     *   colorSpace: string,
     *   bitDepth: number,
     *   hasTransparency: boolean,
     *   dpi: number,
     *   compression: string,
     *   exifData: object
     * }
     */
    image_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Technical metadata about the image file'
    },

    /**
     * Object Detection Results
     * Objects detected in the image with confidence and positioning
     * Structure: {
     *   totalObjects: number,
     *   objects: [
     *     {
     *       id: string,
     *       name: string,
     *       category: string,
     *       confidence: number,
     *       boundingBox: { x: number, y: number, width: number, height: number },
     *       attributes: object,
     *       description: string
     *     }
     *   ],
     *   categories: object,
     *   dominantObjects: array,
     *   sceneType: string
     * }
     */
    object_detection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Objects detected in the image with confidence and positioning'
    },

    /**
     * OCR Text Results
     * Text extracted from the image using OCR
     * Structure: {
     *   fullText: string,
     *   blocks: [
     *     {
     *       text: string,
     *       confidence: number,
     *       boundingBox: object,
     *       language: string,
     *       textType: string
     *     }
     *   ],
     *   statistics: {
     *     totalCharacters: number,
     *     totalWords: number,
     *     averageConfidence: number,
     *     languages: array
     *   },
     *   layout: object
     * }
     */
    ocr_results: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Text extracted from the image using OCR'
    },

    /**
     * AI Description
     * AI-generated description and analysis of image content
     * Structure: {
     *   description: string,
     *   confidence: number,
     *   tags: array,
     *   categories: array,
     *   themes: array,
     *   mood: string,
     *   style: string,
     *   composition: object,
     *   visualElements: object
     * }
     */
    ai_description: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'AI-generated description and analysis of image content'
    },

    /**
     * Face Detection
     * Face detection and analysis results
     * Structure: {
     *   totalFaces: number,
     *   faces: [
     *     {
     *       id: string,
     *       confidence: number,
     *       boundingBox: object,
     *       landmarks: object,
     *       emotions: object,
     *       age: object,
     *       gender: object,
     *       attributes: object
     *     }
     *   ],
     *   groupAnalysis: object
     * }
     */
    face_detection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Face detection and analysis results'
    },

    /**
     * Color Analysis
     * Color palette and visual characteristics analysis
     * Structure: {
     *   dominantColors: array,
     *   colorPalette: array,
     *   colorHarmony: string,
     *   brightness: number,
     *   contrast: number,
     *   saturation: number,
     *   temperature: string,
     *   colorfulness: number,
     *   histogram: object
     * }
     */
    color_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Color palette and visual characteristics analysis'
    },

    /**
     * Quality Assessment
     * Image quality metrics and assessment
     * Structure: {
     *   overallQuality: string,
     *   qualityScore: number,
     *   sharpness: number,
     *   blur: number,
     *   noise: number,
     *   exposure: object,
     *   focus: object,
     *   artifacts: array,
     *   issues: array,
     *   recommendations: array
     * }
     */
    quality_assessment: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Image quality metrics and assessment'
    },

    /**
     * Label Detection
     * General labels and scene classification
     * Structure: {
     *   labels: [
     *     {
     *       name: string,
     *       confidence: number,
     *       category: string
     *     }
     *   ],
     *   sceneClassification: string,
     *   contentType: string,
     *   safeSearch: object,
     *   webEntities: array
     * }
     */
    label_detection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'General labels and scene classification'
    },

    /**
     * Content Analysis
     * High-level content analysis and categorization
     * Structure: {
     *   contentType: string,
     *   genre: string,
     *   context: string,
     *   setting: string,
     *   activity: string,
     *   timeOfDay: string,
     *   season: string,
     *   indoor: boolean,
     *   artificialContent: boolean,
     *   professionalPhoto: boolean
     * }
     */
    content_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'High-level content analysis and categorization'
    },

    /**
     * Processing Statistics
     * Statistics about the analysis processing
     * Structure: {
     *   processingTime: number,
     *   processingSpeed: number,
     *   memoryUsage: number,
     *   apiCalls: number,
     *   tokensUsed: number,
     *   estimatedCost: number,
     *   pluginsUsed: array,
     *   errors: array,
     *   warnings: array
     * }
     */
    processing_stats: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Statistics about the analysis processing'
    },

    /**
     * Analysis Method
     * Method used for image analysis
     */
    analysis_method: {
      type: DataTypes.ENUM('google_vision', 'openai_vision', 'hybrid', 'local'),
      allowNull: false,
      defaultValue: 'hybrid',
      comment: 'Method used for image analysis'
    },

    /**
     * Analysis Status
     * Current status of the analysis
     */
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the image analysis'
    },

    /**
     * Error Message
     * Error message if analysis failed
     */
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if analysis failed'
    },

    /**
     * Progress Percentage
     * Current progress of the analysis (0-100)
     */
    progress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      },
      comment: 'Current progress of the analysis (0-100)'
    },

    /**
     * Started At
     * When the analysis was started
     */
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the analysis was started'
    },

    /**
     * Completed At
     * When the analysis was completed
     */
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the analysis was completed'
    },

    /**
     * Analysis Version
     * Version of the analysis algorithm/system used
     */
    analysis_version: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Version of the analysis algorithm/system used'
    }
  }, {
    tableName: 'image_analysis',
    timestamps: true,
    comment: 'Stores comprehensive image analysis results and metadata',
    
    indexes: [
      {
        name: 'idx_image_analysis_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_image_analysis_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_image_analysis_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_image_analysis_status',
        fields: ['status']
      },
      {
        name: 'idx_image_analysis_method',
        fields: ['analysis_method']
      },
      {
        name: 'idx_image_analysis_progress',
        fields: ['progress']
      },
      {
        name: 'idx_image_analysis_completed',
        fields: ['completed_at']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between ImageAnalysis and other models
   */
  ImageAnalysis.associate = (models) => {
    // ImageAnalysis belongs to a User
    ImageAnalysis.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ImageAnalysis belongs to Content (nullable)
    ImageAnalysis.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ImageAnalysis belongs to File (nullable)
    ImageAnalysis.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // ImageAnalysis belongs to ProcessingJob (nullable)
    ImageAnalysis.belongsTo(models.ProcessingJob, { 
      foreignKey: 'processing_job_id',
      as: 'processingJob',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // ImageAnalysis has many Thumbnails
    ImageAnalysis.hasMany(models.Thumbnail, { 
      foreignKey: 'image_analysis_id',
      as: 'thumbnails',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Hooks
   */
  ImageAnalysis.addHook('beforeSave', (analysis) => {
    // Update completed_at when status changes to ready
    if (analysis.status === 'ready' && !analysis.completed_at) {
      analysis.completed_at = new Date();
      analysis.progress = 100;
    }
    
    // Set started_at if not set and status is processing
    if (analysis.status === 'processing' && !analysis.started_at) {
      analysis.started_at = new Date();
    }
  });

  return ImageAnalysis;
}; 