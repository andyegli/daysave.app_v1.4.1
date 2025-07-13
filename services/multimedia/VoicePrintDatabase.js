/**
 * VoicePrintDatabase Service
 * 
 * Manages speaker identification and voice print recognition for multimedia analysis.
 * This service handles voice fingerprint storage, similarity matching, and speaker
 * profile management using the DaySave database models.
 * 
 * Features:
 * - Voice fingerprint generation and storage
 * - Speaker similarity matching and identification
 * - Database-backed speaker profile management
 * - Voice characteristics analysis and comparison
 * - Speaker statistics and usage tracking
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const { Speaker } = require('../../models');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * VoicePrintDatabase Class
 * 
 * Handles all voice print and speaker identification operations
 * using the DaySave database models for persistent storage.
 */
class VoicePrintDatabase {
  /**
   * Initialize the VoicePrintDatabase service
   * 
   * @param {Object} options - Configuration options
   * @param {number} options.similarityThreshold - Minimum similarity threshold for speaker matching (default: 0.7)
   * @param {boolean} options.enableLogging - Enable detailed logging (default: true)
   */
  constructor(options = {}) {
    this.similarityThreshold = options.similarityThreshold || 0.7;
    this.enableLogging = options.enableLogging !== false;
    
    if (this.enableLogging) {
      console.log('🎙️ VoicePrintDatabase service initialized');
    }
  }

  /**
   * Generate a voice fingerprint from voice characteristics and speaking style
   * 
   * @param {Object} characteristics - Voice characteristics object
   * @param {Object} speakingStyle - Speaking style analysis object
   * @returns {Object} Voice fingerprint with hash for comparison
   */
  generateVoiceFingerprint(characteristics, speakingStyle) {
    try {
      if (!characteristics || !speakingStyle) {
        throw new Error('Both characteristics and speaking style are required for fingerprint generation');
      }

      // Extract key characteristics for fingerprint
      const fingerprint = {
        // Voice characteristics
        pitch: this.categorizePitch(characteristics.estimatedPitch),
        tempo: this.categorizeTempo(characteristics.estimatedTempo),
        clarity: this.categorizeClarity(characteristics.estimatedClarity),
        volume: this.categorizeVolume(characteristics.estimatedVolume),
        
        // Speaking style metrics
        wordsPerMinute: Math.round(speakingStyle.wordCount / (characteristics.duration / 60)),
        avgWordLength: speakingStyle.averageWordLength || 0,
        vocabularyDiversity: speakingStyle.vocabularyDiversity || 0,
        formality: speakingStyle.formality || 'simple',
        pace: speakingStyle.pace || 'normal',
        
        // Additional metrics
        sentenceComplexity: speakingStyle.averageSentenceLength || 0,
        speakingConfidence: this.calculateSpeakingConfidence(characteristics, speakingStyle)
      };

      // Generate hash for quick comparison
      fingerprint.hash = this.hashFingerprint(fingerprint);
      
      if (this.enableLogging) {
        console.log('🔍 Generated voice fingerprint:', {
          pitch: fingerprint.pitch,
          tempo: fingerprint.tempo,
          wordsPerMinute: fingerprint.wordsPerMinute,
          hash: fingerprint.hash.substring(0, 8) + '...'
        });
      }

      return fingerprint;
    } catch (error) {
      console.error('❌ Error generating voice fingerprint:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two voice fingerprints
   * 
   * @param {Object} fingerprint1 - First voice fingerprint
   * @param {Object} fingerprint2 - Second voice fingerprint
   * @returns {number} Similarity score between 0 and 1
   */
  calculateSimilarity(fingerprint1, fingerprint2) {
    try {
      if (!fingerprint1 || !fingerprint2) {
        return 0;
      }

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

      // Calculate weighted similarity for each characteristic
      for (const [key, weight] of Object.entries(weights)) {
        if (fingerprint1[key] !== undefined && fingerprint2[key] !== undefined) {
          let similarity = 0;
          
          if (typeof fingerprint1[key] === 'string') {
            // Exact match for categorical values
            similarity = fingerprint1[key] === fingerprint2[key] ? 1 : 0;
          } else if (typeof fingerprint1[key] === 'number') {
            // Normalized similarity for numerical values
            const diff = Math.abs(fingerprint1[key] - fingerprint2[key]);
            const maxDiff = Math.max(fingerprint1[key], fingerprint2[key], 1);
            similarity = Math.max(0, 1 - (diff / maxDiff));
          }
          
          totalSimilarity += similarity * weight;
          totalWeight += weight;
        }
      }

      const finalSimilarity = totalWeight > 0 ? totalSimilarity / totalWeight : 0;
      
      if (this.enableLogging && finalSimilarity > 0.5) {
        console.log('🔍 Voice similarity calculated:', {
          similarity: finalSimilarity.toFixed(3),
          threshold: this.similarityThreshold,
          match: finalSimilarity >= this.similarityThreshold
        });
      }

      return finalSimilarity;
    } catch (error) {
      console.error('❌ Error calculating similarity:', error);
      return 0;
    }
  }

  /**
   * Find matching speaker in database based on voice fingerprint
   * 
   * @param {string} userId - User ID to search within
   * @param {Object} voiceFingerprint - Voice fingerprint to match
   * @returns {Promise<Object|null>} Best matching speaker or null if none found
   */
  async findMatchingSpeaker(userId, voiceFingerprint) {
    try {
      if (!userId || !voiceFingerprint) {
        throw new Error('User ID and voice fingerprint are required');
      }

      // Get all active speakers for the user
      const speakers = await Speaker.findAll({
        where: {
          user_id: userId,
          status: 'active'
        },
        order: [['confidence_score', 'DESC'], ['total_appearances', 'DESC']]
      });

      if (speakers.length === 0) {
        if (this.enableLogging) {
          console.log('🔍 No existing speakers found for user:', userId);
        }
        return null;
      }

      let bestMatch = null;
      let bestSimilarity = 0;

      // Calculate similarity with each speaker
      for (const speaker of speakers) {
        const similarity = this.calculateSimilarity(
          voiceFingerprint,
          speaker.voice_fingerprint
        );

        if (similarity > bestSimilarity && similarity >= this.similarityThreshold) {
          bestMatch = speaker;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch) {
        if (this.enableLogging) {
          console.log('✅ Found matching speaker:', {
            speakerTag: bestMatch.speaker_tag,
            name: bestMatch.name,
            similarity: bestSimilarity.toFixed(3),
            appearances: bestMatch.total_appearances
          });
        }

        return {
          speaker: bestMatch,
          similarity: bestSimilarity
        };
      }

      if (this.enableLogging) {
        console.log('🔍 No matching speaker found above threshold:', this.similarityThreshold);
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding matching speaker:', error);
      throw error;
    }
  }

  /**
   * Add or update a speaker in the database
   * 
   * @param {string} userId - User ID
   * @param {string} speakerTag - Unique speaker tag
   * @param {Object} voiceFingerprint - Voice fingerprint data
   * @param {Object} profile - Speaker profile information
   * @param {Object} characteristics - Voice characteristics
   * @param {Object} speakingStyle - Speaking style analysis
   * @returns {Promise<Object>} Created or updated speaker record
   */
  async addSpeaker(userId, speakerTag, voiceFingerprint, profile, characteristics, speakingStyle) {
    try {
      if (!userId || !speakerTag || !voiceFingerprint) {
        throw new Error('User ID, speaker tag, and voice fingerprint are required');
      }

      // Check if speaker already exists
      let speaker = await Speaker.findOne({
        where: {
          user_id: userId,
          speaker_tag: speakerTag
        }
      });

      const speakerData = {
        user_id: userId,
        speaker_tag: speakerTag,
        name: profile?.name || this.generateSpeakerName(speakerTag),
        voice_fingerprint: voiceFingerprint,
        voice_characteristics: characteristics,
        speaking_style: speakingStyle,
        profile_data: profile,
        confidence_score: profile?.confidenceScore || 0.8,
        status: 'active'
      };

      if (speaker) {
        // Update existing speaker
        await speaker.update({
          ...speakerData,
          total_appearances: speaker.total_appearances + 1,
          last_detected: new Date()
        });

        if (this.enableLogging) {
          console.log('🔄 Updated existing speaker:', {
            speakerTag: speaker.speaker_tag,
            name: speaker.name,
            appearances: speaker.total_appearances
          });
        }
      } else {
        // Create new speaker
        speaker = await Speaker.create({
          id: uuidv4(),
          ...speakerData,
          total_appearances: 1,
          first_detected: new Date(),
          last_detected: new Date()
        });

        if (this.enableLogging) {
          console.log('✅ Created new speaker:', {
            id: speaker.id,
            speakerTag: speaker.speaker_tag,
            name: speaker.name
          });
        }
      }

      return speaker;
    } catch (error) {
      console.error('❌ Error adding speaker:', error);
      throw error;
    }
  }

  /**
   * Get speaker statistics for a user
   * 
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Speaker statistics
   */
  async getSpeakerStats(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const speakers = await Speaker.findAll({
        where: { user_id: userId }
      });

      const stats = {
        totalSpeakers: speakers.length,
        activeSpeakers: speakers.filter(s => s.status === 'active').length,
        inactiveSpeakers: speakers.filter(s => s.status === 'inactive').length,
        mergedSpeakers: speakers.filter(s => s.status === 'merged').length,
        totalAppearances: speakers.reduce((sum, s) => sum + s.total_appearances, 0),
        averageConfidence: speakers.length > 0 
          ? speakers.reduce((sum, s) => sum + (parseFloat(s.confidence_score) || 0), 0) / speakers.length 
          : 0,
        topSpeakers: speakers
          .sort((a, b) => b.total_appearances - a.total_appearances)
          .slice(0, 5)
          .map(s => ({
            id: s.id,
            name: s.name,
            speakerTag: s.speaker_tag,
            appearances: s.total_appearances,
            confidence: parseFloat(s.confidence_score) || 0
          }))
      };

      if (this.enableLogging) {
        console.log('📊 Speaker statistics:', {
          totalSpeakers: stats.totalSpeakers,
          activeSpeakers: stats.activeSpeakers,
          totalAppearances: stats.totalAppearances
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting speaker stats:', error);
      throw error;
    }
  }

  /**
   * Search speakers by criteria
   * 
   * @param {string} userId - User ID
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of matching speakers
   */
  async searchSpeakers(userId, criteria = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const where = { user_id: userId };
      
      // Apply search criteria
      if (criteria.name) {
        where.name = { [require('sequelize').Op.like]: `%${criteria.name}%` };
      }
      
      if (criteria.status) {
        where.status = criteria.status;
      }
      
      if (criteria.minAppearances) {
        where.total_appearances = { [require('sequelize').Op.gte]: criteria.minAppearances };
      }
      
      if (criteria.minConfidence) {
        where.confidence_score = { [require('sequelize').Op.gte]: criteria.minConfidence };
      }

      const speakers = await Speaker.findAll({
        where,
        order: [['total_appearances', 'DESC'], ['confidence_score', 'DESC']],
        limit: criteria.limit || 50
      });

      if (this.enableLogging) {
        console.log('🔍 Speaker search results:', {
          criteria,
          resultCount: speakers.length
        });
      }

      return speakers;
    } catch (error) {
      console.error('❌ Error searching speakers:', error);
      throw error;
    }
  }

  /**
   * Import speakers from voice_prints.json data
   * 
   * @param {string} userId - User ID
   * @param {Object} voicePrintsData - Voice prints data from JSON
   * @returns {Promise<Array>} Array of imported speakers
   */
  async importVoicePrints(userId, voicePrintsData) {
    try {
      if (!userId || !voicePrintsData || !voicePrintsData.speakers) {
        throw new Error('User ID and voice prints data are required');
      }

      const importedSpeakers = [];
      const speakersData = voicePrintsData.speakers;

      if (this.enableLogging) {
        console.log('📥 Importing voice prints:', {
          userId,
          speakerCount: Object.keys(speakersData).length
        });
      }

      for (const [speakerTag, speakerData] of Object.entries(speakersData)) {
        try {
          // Check if speaker already exists
          const existingSpeaker = await Speaker.findOne({
            where: {
              user_id: userId,
              speaker_tag: speakerTag
            }
          });

          if (existingSpeaker) {
            if (this.enableLogging) {
              console.log('⚠️ Speaker already exists, skipping:', speakerTag);
            }
            continue;
          }

          // Create new speaker from imported data
          const speaker = await Speaker.create({
            id: uuidv4(),
            user_id: userId,
            speaker_tag: speakerTag,
            name: speakerData.profile?.name || this.generateSpeakerName(speakerTag),
            voice_fingerprint: speakerData.fingerprint,
            voice_characteristics: speakerData.characteristics,
            speaking_style: speakerData.speakingStyle,
            profile_data: speakerData.profile,
            confidence_score: speakerData.profile?.confidenceScore || 0.8,
            total_appearances: speakerData.profile?.totalAppearances || 1,
            first_detected: new Date(),
            last_detected: new Date(),
            status: 'active'
          });

          importedSpeakers.push(speaker);

          if (this.enableLogging) {
            console.log('✅ Imported speaker:', {
              speakerTag: speaker.speaker_tag,
              name: speaker.name
            });
          }
        } catch (speakerError) {
          console.error('❌ Error importing speaker:', speakerTag, speakerError);
        }
      }

      if (this.enableLogging) {
        console.log('📥 Voice prints import completed:', {
          imported: importedSpeakers.length,
          total: Object.keys(speakersData).length
        });
      }

      return importedSpeakers;
    } catch (error) {
      console.error('❌ Error importing voice prints:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Categorize pitch value
   * @param {string} pitch - Pitch value
   * @returns {string} Categorized pitch
   */
  categorizePitch(pitch) {
    const pitchMap = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high'
    };
    return pitchMap[pitch] || 'medium';
  }

  /**
   * Categorize tempo value
   * @param {string} tempo - Tempo value
   * @returns {string} Categorized tempo
   */
  categorizeTempo(tempo) {
    const tempoMap = {
      'slow': 'slow',
      'normal': 'normal',
      'fast': 'fast'
    };
    return tempoMap[tempo] || 'normal';
  }

  /**
   * Categorize clarity value
   * @param {string} clarity - Clarity value
   * @returns {string} Categorized clarity
   */
  categorizeClarity(clarity) {
    const clarityMap = {
      'unclear': 'unclear',
      'clear': 'clear',
      'very_clear': 'very_clear'
    };
    return clarityMap[clarity] || 'clear';
  }

  /**
   * Categorize volume value
   * @param {string} volume - Volume value
   * @returns {string} Categorized volume
   */
  categorizeVolume(volume) {
    const volumeMap = {
      'quiet': 'quiet',
      'normal': 'normal',
      'loud': 'loud'
    };
    return volumeMap[volume] || 'normal';
  }

  /**
   * Calculate speaking confidence based on characteristics
   * @param {Object} characteristics - Voice characteristics
   * @param {Object} speakingStyle - Speaking style
   * @returns {number} Speaking confidence score
   */
  calculateSpeakingConfidence(characteristics, speakingStyle) {
    let confidence = 0.5; // Base confidence
    
    // Adjust based on clarity
    if (characteristics.estimatedClarity === 'very_clear') confidence += 0.2;
    else if (characteristics.estimatedClarity === 'clear') confidence += 0.1;
    
    // Adjust based on speaking style consistency
    if (speakingStyle.vocabularyDiversity > 0.1) confidence += 0.1;
    if (speakingStyle.averageWordLength > 3) confidence += 0.1;
    
    // Adjust based on audio quality
    if (characteristics.sampleRate >= 16000) confidence += 0.1;
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Generate hash for voice fingerprint
   * @param {Object} fingerprint - Voice fingerprint
   * @returns {string} Hash string
   */
  hashFingerprint(fingerprint) {
    const fingerprintString = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * Generate speaker name from speaker tag
   * @param {string} speakerTag - Speaker tag
   * @returns {string} Generated name
   */
  generateSpeakerName(speakerTag) {
    // Extract name from speaker tag or generate generic name
    const match = speakerTag.match(/Speaker_\d+_(.+)/);
    if (match && match[1] && match[1] !== 'unknown') {
      return match[1];
    }
    
    // Generate generic name based on tag
    const tagNumber = speakerTag.match(/Speaker_(\d+)/);
    if (tagNumber) {
      return `Speaker ${tagNumber[1].slice(-3)}`;
    }
    
    return 'Unknown Speaker';
  }
}

module.exports = VoicePrintDatabase; 