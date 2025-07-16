const { v4: uuidv4 } = require('uuid');

/**
 * Audio Analysis Model
 * 
 * Stores comprehensive audio analysis results including transcription,
 * speaker diarization, sentiment analysis, and voice print matching.
 * This model provides detailed insights into audio content structure and speech analysis.
 * 
 * Features:
 * - Audio transcription with timestamp accuracy
 * - Speaker identification and diarization
 * - Voice print matching and speaker recognition
 * - Sentiment analysis and emotional detection
 * - Audio quality assessment and technical metadata
 * - Multi-language support and confidence scoring
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} AudioAnalysis model
 */
module.exports = (sequelize, DataTypes) => {
  const AudioAnalysis = sequelize.define('AudioAnalysis', {
    /**
     * Primary Key - UUID
     * Unique identifier for each audio analysis record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the audio analysis'
    },

    /**
     * User Association
     * Links audio analysis to the user who owns the content
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
     * Links audio analysis to content record (for URL-based content)
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
     * Links audio analysis to file record (for uploaded files)
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
     * Links audio analysis to the processing job that generated it
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
     * Audio Duration
     * Total duration of the audio in seconds
     */
    duration: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: false,
      comment: 'Total duration of the audio in seconds'
    },

    /**
     * Audio Metadata
     * Technical metadata about the audio file
     * Structure: {
     *   format: string,
     *   codec: string,
     *   bitrate: number,
     *   sampleRate: number,
     *   channels: number,
     *   channelLayout: string,
     *   fileSize: number
     * }
     */
    audio_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Technical metadata about the audio file'
    },

    /**
     * Transcription Results
     * Complete transcription with segments and timing
     * Structure: {
     *   fullText: string,
     *   language: string,
     *   segments: [
     *     {
     *       text: string,
     *       startTime: number,
     *       endTime: number,
     *       confidence: number,
     *       speakerId: string,
     *       words: [{ word: string, startTime: number, endTime: number, confidence: number }]
     *     }
     *   ],
     *   statistics: {
     *     totalWords: number,
     *     averageConfidence: number,
     *     wordCount: object,
     *     speechRate: number
     *   }
     * }
     */
    transcription_results: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Complete transcription with segments and timing'
    },

    /**
     * Speaker Analysis
     * Speaker diarization and identification results
     * Structure: {
     *   totalSpeakers: number,
     *   speakers: [
     *     {
     *       id: string,
     *       name: string,
     *       confidence: number,
     *       voicePrintId: string,
     *       gender: string,
     *       ageEstimate: string,
     *       segments: [{ startTime: number, endTime: number, duration: number }],
     *       totalDuration: number,
     *       averageConfidence: number,
     *       characteristics: object
     *     }
     *   ],
     *   speakerTransitions: number,
     *   averageSegmentLength: number
     * }
     */
    speaker_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Speaker diarization and identification results'
    },

    /**
     * Voice Print Data
     * Voice print matching and biometric analysis
     * Structure: {
     *   voicePrints: [
     *     {
     *       speakerId: string,
     *       voicePrintId: string,
     *       matchConfidence: number,
     *       matchedName: string,
     *       biometricFeatures: object,
     *       enrollmentStatus: string
     *     }
     *   ],
     *   newVoicePrints: [
     *     {
     *       speakerId: string,
     *       features: object,
     *       quality: number,
     *       enrollmentRecommended: boolean
     *     }
     *   ]
     * }
     */
    voice_print_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Voice print matching and biometric analysis'
    },

    /**
     * Sentiment Analysis
     * Emotional analysis of spoken content
     * Structure: {
     *   overall: string,
     *   score: number,
     *   confidence: number,
     *   emotions: object,
     *   segments: [
     *     {
     *       startTime: number,
     *       endTime: number,
     *       sentiment: string,
     *       score: number,
     *       confidence: number,
     *       emotions: object,
     *       speakerId: string
     *     }
     *   ],
     *   breakdown: {
     *     positive: number,
     *     negative: number,
     *     neutral: number
     *   },
     *   trends: array
     * }
     */
    sentiment_analysis: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Emotional analysis of spoken content'
    },

    /**
     * Quality Assessment
     * Audio quality metrics and assessment
     * Structure: {
     *   overallQuality: string,
     *   qualityScore: number,
     *   audioClarity: number,
     *   backgroundNoise: number,
     *   speechClarity: number,
     *   volumeConsistency: number,
     *   frequencyResponse: object,
     *   dynamicRange: number,
     *   clipping: boolean,
     *   issues: array,
     *   recommendations: array
     * }
     */
    quality_assessment: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Audio quality metrics and assessment'
    },

    /**
     * Language Detection
     * Language identification and multilingual analysis
     * Structure: {
     *   primaryLanguage: string,
     *   confidence: number,
     *   detectedLanguages: [
     *     {
     *       language: string,
     *       confidence: number,
     *       segments: array
     *     }
     *   ],
     *   isMultilingual: boolean,
     *   languageTransitions: array
     * }
     */
    language_detection: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Language identification and multilingual analysis'
    },

    /**
     * Content Analysis
     * High-level content analysis and categorization
     * Structure: {
     *   contentType: string,
     *   topics: array,
     *   keywords: array,
     *   entities: array,
     *   conversationType: string,
     *   formality: string,
     *   pace: string,
     *   interruptions: number,
     *   silencePeriods: array,
     *   musicDetection: object
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
     * Method used for audio analysis
     */
    analysis_method: {
      type: DataTypes.ENUM('google_cloud', 'openai_whisper', 'hybrid', 'local'),
      allowNull: false,
      defaultValue: 'hybrid',
      comment: 'Method used for audio analysis'
    },

    /**
     * Analysis Status
     * Current status of the analysis
     */
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'Current status of the audio analysis'
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
    tableName: 'audio_analysis',
    timestamps: true,
    comment: 'Stores comprehensive audio analysis results and metadata',
    
    indexes: [
      {
        name: 'idx_audio_analysis_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_audio_analysis_content_id',
        fields: ['content_id']
      },
      {
        name: 'idx_audio_analysis_file_id',
        fields: ['file_id']
      },
      {
        name: 'idx_audio_analysis_status',
        fields: ['status']
      },
      {
        name: 'idx_audio_analysis_duration',
        fields: ['duration']
      },
      {
        name: 'idx_audio_analysis_method',
        fields: ['analysis_method']
      },
      {
        name: 'idx_audio_analysis_progress',
        fields: ['progress']
      },
      {
        name: 'idx_audio_analysis_completed',
        fields: ['completed_at']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between AudioAnalysis and other models
   */
  AudioAnalysis.associate = (models) => {
    // AudioAnalysis belongs to a User
    AudioAnalysis.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // AudioAnalysis belongs to Content (nullable)
    AudioAnalysis.belongsTo(models.Content, { 
      foreignKey: 'content_id',
      as: 'content',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // AudioAnalysis belongs to File (nullable)
    AudioAnalysis.belongsTo(models.File, { 
      foreignKey: 'file_id',
      as: 'file',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // AudioAnalysis belongs to ProcessingJob (nullable)
    AudioAnalysis.belongsTo(models.ProcessingJob, { 
      foreignKey: 'processing_job_id',
      as: 'processingJob',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // AudioAnalysis has many Speakers
    AudioAnalysis.hasMany(models.Speaker, { 
      foreignKey: 'audio_analysis_id',
      as: 'speakers',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Hooks
   */
  AudioAnalysis.addHook('beforeSave', (analysis) => {
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

  return AudioAnalysis;
}; 