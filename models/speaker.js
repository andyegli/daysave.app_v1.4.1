const { v4: uuidv4 } = require('uuid');

/**
 * Speaker Model
 * 
 * Stores speaker identification data and voice print information for multimedia analysis.
 * This model enables speaker recognition across different audio/video content by maintaining
 * voice fingerprints and speaker characteristics.
 * 
 * Features:
 * - Voice fingerprint storage for speaker identification
 * - Speaker profile management with characteristics
 * - User-specific speaker databases
 * - Voice print similarity matching
 * - Speaker metadata and statistics
 * 
 * @param {Object} sequelize - Sequelize instance
 * @param {Object} DataTypes - Sequelize data types
 * @returns {Object} Speaker model
 */
module.exports = (sequelize, DataTypes) => {
  const Speaker = sequelize.define('Speaker', {
    /**
     * Primary Key - UUID
     * Unique identifier for each speaker record
     */
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false,
      comment: 'Unique UUID identifier for the speaker'
    },

    /**
     * User Association
     * Links speaker to the user who owns this speaker identification
     */
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'UUID of the user who owns this speaker identification'
    },

    /**
     * Audio Analysis Association
     * Links speaker to the specific audio analysis that identified this speaker
     */
    audio_analysis_id: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'audio_analysis',
        key: 'id'
      },
      comment: 'UUID of the audio analysis record that identified this speaker'
    },

    /**
     * Speaker Tag
     * System-generated unique identifier for the speaker within analysis results
     * Format: "Speaker_[timestamp]_[name]" (e.g., "Speaker_1751830102639_Mike")
     */
    speaker_tag: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'System-generated unique speaker tag used in analysis results'
    },

    /**
     * Speaker Name
     * Human-readable name for the speaker, can be user-assigned or AI-generated
     */
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Human-readable name for the speaker (user-assigned or AI-generated)'
    },

    /**
     * Voice Fingerprint
     * JSON object containing voice characteristics for speaker identification
     * Structure: {
     *   pitch: "low|medium|high",
     *   tempo: "slow|normal|fast", 
     *   clarity: "unclear|clear|very_clear",
     *   volume: "quiet|normal|loud",
     *   wordsPerMinute: number,
     *   avgWordLength: number,
     *   vocabularyDiversity: number,
     *   formality: "casual|formal|technical",
     *   pace: "rushed|normal|detailed"
     * }
     */
    voice_fingerprint: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Voice characteristics fingerprint for speaker identification matching'
    },

    /**
     * Voice Characteristics
     * Technical audio characteristics extracted from voice analysis
     * Structure: {
     *   duration: number,
     *   sampleRate: number,
     *   channels: number,
     *   bitRate: number,
     *   estimatedPitch: "low|medium|high",
     *   estimatedTempo: "slow|normal|fast",
     *   estimatedClarity: "unclear|clear|very_clear",
     *   estimatedVolume: "quiet|normal|loud"
     * }
     */
    voice_characteristics: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Technical audio characteristics extracted from voice analysis'
    },

    /**
     * Speaking Style Analysis
     * Detailed analysis of speaking patterns and style
     * Structure: {
     *   overallStyle: "casual|formal|technical",
     *   pace: "rushed|normal|detailed",
     *   formality: "simple|moderate|complex",
     *   vocabularyDiversity: number,
     *   averageWordLength: number,
     *   averageSentenceLength: number,
     *   wordCount: number,
     *   sentenceCount: number
     * }
     */
    speaking_style: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Analysis of speaking patterns, style, and linguistic characteristics'
    },

    /**
     * Speaker Profile
     * Comprehensive profile information including usage statistics
     * Structure: {
     *   speakerTag: string,
     *   name: string,
     *   wordCount: number,
     *   speakingTime: number,
     *   wordsPerMinute: number,
     *   averageWordLength: number,
     *   voiceCharacteristics: object,
     *   firstDetected: ISO_date,
     *   lastDetected: ISO_date,
     *   totalAppearances: number,
     *   confidenceScore: number
     * }
     */
    profile_data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Comprehensive speaker profile with usage statistics and metadata'
    },

    /**
     * Confidence Score
     * Average confidence score for speaker identification (0.0 to 1.0)
     * Higher scores indicate more reliable speaker identification
     */
    confidence_score: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0.00,
        max: 1.00
      },
      comment: 'Average confidence score for speaker identification (0.0 to 1.0)'
    },

    /**
     * Total Appearances
     * Count of how many times this speaker has been detected across all content
     */
    total_appearances: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Total number of times this speaker has been detected across all content'
    },

    /**
     * First Detection Date
     * When this speaker was first identified in the system
     */
    first_detected: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when this speaker was first identified'
    },

    /**
     * Last Detection Date
     * When this speaker was most recently identified
     */
    last_detected: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Timestamp when this speaker was most recently identified'
    },

    /**
     * Status
     * Current status of the speaker record
     * - active: Speaker is actively being used for identification
     * - inactive: Speaker is not being used for new identifications
     * - merged: Speaker has been merged with another speaker record
     */
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'merged'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Current status of the speaker record (active, inactive, merged)'
    },

    /**
     * Notes
     * User-provided notes about the speaker
     */
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User-provided notes and additional information about the speaker'
    }
  }, {
    tableName: 'speakers',
    timestamps: true,
    comment: 'Stores speaker identification data and voice prints for multimedia analysis',
    
    indexes: [
      {
        name: 'idx_speakers_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_speakers_speaker_tag',
        fields: ['speaker_tag'],
        unique: true
      },
      {
        name: 'idx_speakers_status',
        fields: ['status']
      },
      {
        name: 'idx_speakers_confidence',
        fields: ['confidence_score']
      }
    ]
  });

  /**
   * Model Associations
   * Defines relationships between Speaker and other models
   */
  Speaker.associate = (models) => {
    // Speaker belongs to a User
    Speaker.belongsTo(models.User, { 
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    // Speaker belongs to an AudioAnalysis
    Speaker.belongsTo(models.AudioAnalysis, { 
      foreignKey: 'audio_analysis_id',
      as: 'audioAnalysis',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * Instance Methods
   */

  /**
   * Calculate similarity between this speaker and another voice fingerprint
   * @param {Object} otherFingerprint - Voice fingerprint to compare against
   * @returns {number} Similarity score between 0 and 1
   */
  Speaker.prototype.calculateSimilarity = function(otherFingerprint) {
    const fingerprint1 = this.voice_fingerprint;
    const fingerprint2 = otherFingerprint;
    
    if (!fingerprint1 || !fingerprint2) return 0;
    
    // Weighted similarity calculation
    const weights = {
      pitch: 0.25,
      tempo: 0.20,
      clarity: 0.15,
      volume: 0.10,
      wordsPerMinute: 0.10,
      avgWordLength: 0.05,
      vocabularyDiversity: 0.10,
      formality: 0.05
    };
    
    let totalSimilarity = 0;
    let totalWeight = 0;
    
    for (const [key, weight] of Object.entries(weights)) {
      if (fingerprint1[key] && fingerprint2[key]) {
        const similarity = fingerprint1[key] === fingerprint2[key] ? 1 : 0;
        totalSimilarity += similarity * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? totalSimilarity / totalWeight : 0;
  };

  /**
   * Update speaker statistics after new detection
   * @param {Object} newDetection - New detection data
   */
  Speaker.prototype.updateStatistics = function(newDetection) {
    this.total_appearances += 1;
    this.last_detected = new Date();
    
    if (newDetection.confidence) {
      // Update confidence score as running average
      const currentConfidence = this.confidence_score || 0;
      this.confidence_score = (currentConfidence + newDetection.confidence) / 2;
    }
    
    // Update profile data if provided
    if (newDetection.profileData) {
      this.profile_data = {
        ...this.profile_data,
        ...newDetection.profileData,
        totalAppearances: this.total_appearances,
        lastDetected: this.last_detected
      };
    }
  };

  /**
   * Class Methods
   */

  /**
   * Find speakers similar to a given voice fingerprint
   * @param {string} userId - User ID to search within
   * @param {Object} voiceFingerprint - Voice fingerprint to match
   * @param {number} threshold - Minimum similarity threshold (default: 0.7)
   * @returns {Promise<Array>} Array of matching speakers with similarity scores
   */
  Speaker.findSimilarSpeakers = async function(userId, voiceFingerprint, threshold = 0.7) {
    const speakers = await this.findAll({
      where: {
        user_id: userId,
        status: 'active'
      }
    });
    
    const matches = [];
    
    for (const speaker of speakers) {
      const similarity = speaker.calculateSimilarity(voiceFingerprint);
      if (similarity >= threshold) {
        matches.push({
          speaker,
          similarity
        });
      }
    }
    
    // Sort by similarity score (highest first)
    return matches.sort((a, b) => b.similarity - a.similarity);
  };

  /**
   * Get speaker statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Speaker statistics
   */
  Speaker.getUserSpeakerStats = async function(userId) {
    const speakers = await this.findAll({
      where: { user_id: userId }
    });
    
    return {
      totalSpeakers: speakers.length,
      activeSpeakers: speakers.filter(s => s.status === 'active').length,
      totalAppearances: speakers.reduce((sum, s) => sum + s.total_appearances, 0),
      averageConfidence: speakers.reduce((sum, s) => sum + (s.confidence_score || 0), 0) / speakers.length
    };
  };

  return Speaker;
}; 