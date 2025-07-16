const { v4: uuidv4 } = require('uuid');

/**
 * Face Model
 * 
 * Stores face recognition data including face encodings, identified names,
 * and metadata for comprehensive face recognition and identification.
 * 
 * Features:
 * - Face encoding/embedding storage for recognition
 * - AI-generated name suggestions and user confirmations
 * - Face metadata (age, gender, emotions, confidence)
 * - Learning system for user corrections and improvements
 * - Face grouping and relationship tracking
 * - Privacy controls and face anonymization options
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} Face model
 */
module.exports = (sequelize, DataTypes) => {
  const Face = sequelize.define('Face', {
    /**
     * Primary key UUID
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      comment: 'Unique identifier for face record'
    },

    /**
     * User ID - Owner of the content containing this face
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'User who owns the content containing this face'
    },

    /**
     * Content ID - Link to content containing this face (optional)
     */
    content_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'content',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Content where this face was detected'
    },

    /**
     * File ID - Link to file containing this face (optional)
     */
    file_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'files',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'File where this face was detected'
    },

    /**
     * Image Analysis ID - Link to image analysis record
     */
    image_analysis_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'image_analysis',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Image analysis record containing this face'
    },

    /**
     * Video Analysis ID - Link to video analysis record
     */
    video_analysis_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'video_analysis',
        key: 'id'
      },
      onDelete: 'CASCADE',
      comment: 'Video analysis record containing this face (for video frames)'
    },

    /**
     * Face Name - Identified or user-provided name
     */
    face_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Identified name of the person (AI-suggested or user-confirmed)'
    },

    /**
     * AI Suggested Name - Name suggested by AI analysis
     */
    ai_suggested_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Name suggested by AI analysis before user confirmation'
    },

    /**
     * Name Confidence - Confidence in face identification
     */
    name_confidence: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0
      },
      comment: 'Confidence score for face name identification (0.0-1.0)'
    },

    /**
     * Name Source - Source of the face name identification
     */
    name_source: {
      type: DataTypes.ENUM('ai_suggestion', 'user_input', 'face_recognition', 'metadata_extraction'),
      allowNull: true,
      defaultValue: 'ai_suggestion',
      comment: 'Source of face name identification'
    },

    /**
     * User Confirmed - Whether the name has been confirmed by user
     */
    user_confirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the face name has been confirmed by the user'
    },

    /**
     * Face Encoding - Face embedding for recognition
     * Stores 128-dimensional face encoding vector as JSON array
     */
    face_encoding: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Face encoding/embedding vector for recognition (128-dimensional array)'
    },

    /**
     * Detection Metadata - Face detection details
     * Structure: {
     *   confidence: number,
     *   boundingBox: object,
     *   landmarks: object,
     *   emotions: object,
     *   age: object,
     *   gender: object,
     *   quality: object
     * }
     */
    detection_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Face detection metadata including bounding box, landmarks, emotions, age, gender'
    },

    /**
     * Face Group ID - For grouping similar faces across content
     */
    face_group_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      comment: 'ID for grouping similar faces of the same person'
    },

    /**
     * Recognition Score - Score for face recognition matching
     */
    recognition_score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 1.0
      },
      comment: 'Face recognition matching score when compared to known faces'
    },

    /**
     * Is Primary Face - Whether this is the primary/best instance of this person
     */
    is_primary_face: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether this is the primary/best quality instance of this person'
    },

    /**
     * Privacy Settings - Face privacy and anonymization settings
     * Structure: {
     *   anonymize: boolean,
     *   blur_level: number,
     *   hide_name: boolean,
     *   sharing_allowed: boolean
     * }
     */
    privacy_settings: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        anonymize: false,
        blur_level: 0,
        hide_name: false,
        sharing_allowed: true
      },
      comment: 'Privacy settings for face display and sharing'
    },

    /**
     * Learning Data - Data for improving face recognition
     * Structure: {
     *   user_corrections: array,
     *   confidence_history: array,
     *   recognition_attempts: array,
     *   feedback_scores: array
     * }
     */
    learning_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Learning data for improving face recognition accuracy'
    },

    /**
     * Processing Status - Status of face processing
     */
    processing_status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'skipped'),
      defaultValue: 'pending',
      comment: 'Status of face recognition processing'
    },

    /**
     * Error Message - Error details if processing failed
     */
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if face processing failed'
    },

    /**
     * Timestamps
     */
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record creation timestamp'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Record last update timestamp'
    }
  }, {
    tableName: 'faces',
    timestamps: true,
    
    indexes: [
      {
        name: 'idx_faces_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_faces_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_faces_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_faces_name',
        fields: ['face_name']
      },
      {
        name: 'idx_faces_group_id',
        fields: ['face_group_id']
      },
      {
        name: 'idx_faces_user_confirmed',
        fields: ['user_confirmed']
      },
      {
        name: 'idx_faces_name_confidence',
        fields: ['name_confidence']
      },
      {
        name: 'idx_faces_processing_status',
        fields: ['processing_status']
      }
    ],

    comment: 'Face recognition and identification data with AI name suggestions and user confirmations'
  });

  // Define associations
  Face.associate = function(models) {
    // Face belongs to User
    Face.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'User'
    });

    // Face belongs to Content (optional)
    Face.belongsTo(models.Content, {
      foreignKey: 'content_id',
      as: 'Content'
    });

    // Face belongs to File (optional)
    Face.belongsTo(models.File, {
      foreignKey: 'file_id',
      as: 'File'
    });

    // Face belongs to ImageAnalysis (optional)
    Face.belongsTo(models.ImageAnalysis, {
      foreignKey: 'image_analysis_id',
      as: 'ImageAnalysis'
    });

    // Face belongs to VideoAnalysis (optional)
    Face.belongsTo(models.VideoAnalysis, {
      foreignKey: 'video_analysis_id',
      as: 'VideoAnalysis'
    });
  };

  return Face;
}; 