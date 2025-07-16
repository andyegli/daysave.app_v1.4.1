/**
 * AudioProcessor Service
 * 
 * Handles audio-specific processing operations including transcription,
 * speaker diarization, voice print analysis, and sentiment analysis.
 * Extends BaseMediaProcessor for standardized interface compliance.
 * 
 * Features:
 * - Audio transcription using Google Speech-to-Text and OpenAI Whisper
 * - Speaker diarization and identification
 * - Voice print recognition and analysis
 * - Audio quality assessment and enhancement
 * - Sentiment analysis of transcribed content
 * - Audio metadata extraction and analysis
 * 
 * @author DaySave Integration Team
 * @version 2.0.0
 */

const speech = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { Speaker } = require('../../models');

// Base processor and related services
const BaseMediaProcessor = require('./BaseMediaProcessor');
const VoicePrintDatabase = require('./VoicePrintDatabase');

/**
 * AudioProcessor Class
 * 
 * Extends BaseMediaProcessor to handle audio-specific processing operations
 */
class AudioProcessor extends BaseMediaProcessor {
  /**
   * Initialize the AudioProcessor service
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    // Call parent constructor
    super(options);
    
    // Audio-specific configuration
    this.config = {
      ...this.config, // Inherit base config
      supportedAudioFormats: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma'],
      transcriptionOptions: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableSpeakerDiarization: true,
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long',
        maxSpeakers: 10
      },
      voicePrintOptions: {
        segmentLength: 30, // seconds
        overlapLength: 5, // seconds
        confidenceThreshold: 0.7,
        enableIdentification: true
      },
      audioQualityOptions: {
        minSampleRate: 8000,
        preferredSampleRate: 16000,
        minBitRate: 64000,
        preferredBitRate: 128000
      }
    };
    
    // Initialize audio-specific services
    this.initialize(options);
  }

  /**
   * Initialize processor-specific clients and services
   * 
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    try {
      // Initialize Google Speech client for transcription
      await this.initializeSpeechClient(options);
      
      // Initialize voice print database
      this.voicePrintDB = new VoicePrintDatabase({
        enableLogging: this.enableLogging
      });
      
      if (this.enableLogging) {
        console.log('🎤 AudioProcessor initialization completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ AudioProcessor initialization failed:', error);
      }
      throw error;
    }
  }

  /**
   * Process audio content
   * 
   * @param {string} userId - User ID
   * @param {string} filePath - Path to the audio file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async process(userId, filePath, options = {}) {
    const results = this.initializeResults(userId, filePath, 'audio');
    
    try {
      // Validate audio file
      await this.validate(filePath, 'audio');
      
      this.updateProgress(10, 'Starting audio processing');
      
      // Extract audio metadata
      const metadata = await this.getAudioMetadata(filePath);
      results.metadata.audio = metadata;
      this.updateProgress(20, 'Audio metadata extracted');

      // Transcribe audio (if enabled)
      if (options.enableTranscription) {
        try {
          const transcription = await this.transcribeAudio(filePath, options.transcriptionOptions || this.config.transcriptionOptions);
          results.results.transcription = transcription;
          this.updateProgress(50, 'Audio transcription completed');
        } catch (error) {
          this.addWarning(results, 'Failed to transcribe audio', 'transcription');
        }
      }

      // Analyze speakers (if enabled and transcription available)
      if (options.enableSpeakerDiarization && results.results.transcription) {
        try {
          const speakers = await this.analyzeSpeakers(userId, filePath, results.results.transcription, options);
          results.results.speakers = speakers;
          this.updateProgress(70, 'Speaker analysis completed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze speakers', 'speaker_analysis');
        }
      }

      // Voice print analysis (if enabled)
      if (options.enableVoicePrintRecognition) {
        try {
          const voicePrints = await this.analyzeVoicePrints(userId, filePath, options.voicePrintOptions || this.config.voicePrintOptions);
          results.results.voicePrints = voicePrints;
          this.updateProgress(80, 'Voice print analysis completed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze voice prints', 'voice_print_analysis');
        }
      }

      // Analyze audio quality (if enabled)
      if (options.enableQualityAnalysis) {
        try {
          const qualityAnalysis = await this.analyzeAudioQuality(filePath);
          results.results.qualityAnalysis = qualityAnalysis;
          this.updateProgress(85, 'Audio quality analyzed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze audio quality', 'quality_analysis');
        }
      }

      // Generate sentiment analysis (if transcription available)
      if (options.enableSentimentAnalysis && results.results.transcription) {
        try {
          const sentiment = await this.analyzeSentiment(results.results.transcription);
          results.results.sentiment = sentiment;
          this.updateProgress(90, 'Sentiment analysis completed');
        } catch (error) {
          this.addWarning(results, 'Failed to analyze sentiment', 'sentiment_analysis');
        }
      }

      this.updateProgress(100, 'Audio processing completed');
      return this.finalizeResults(results);

    } catch (error) {
      this.addError(results, error, 'audio_processing');
      return this.finalizeResults(results);
    }
  }

  /**
   * Validate audio file
   * 
   * @param {string} filePath - Path to the audio file
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<boolean>} Validation result
   */
  async validate(filePath, fileType) {
    try {
      // Basic file validation from parent
      this.validateFile(filePath);
      
      // Audio-specific validation
      const extension = path.extname(filePath).toLowerCase();
      if (!this.config.supportedAudioFormats.includes(extension)) {
        throw new Error(`Unsupported audio format: ${extension}`);
      }
      
      // Check if file can be read by ffmpeg
      try {
        await this.getAudioMetadata(filePath);
      } catch (error) {
        throw new Error(`Invalid or corrupted audio file: ${error.message}`);
      }
      
      if (this.enableLogging) {
        this.log(`Audio file validation passed: ${path.basename(filePath)}`);
      }
      
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`❌ Audio validation failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Cleanup processor resources
   * 
   * @param {string} userId - User ID (optional, for user-specific cleanup)
   * @returns {Promise<void>}
   */
  async cleanup(userId = null) {
    try {
      // Clean up temporary audio files
      const tempPattern = path.join(this.config.tempDir, 'audioprocessor_*');
      const transcriptionPattern = path.join(this.config.tempDir, 'transcription_*');
      const voicePrintPattern = path.join(this.config.tempDir, 'voiceprint_*');
      
      // Clean up voice print database if available
      if (this.voicePrintDB && userId) {
        await this.voicePrintDB.cleanup(userId);
      }
      
      if (this.enableLogging) {
        this.log('Audio processor cleanup completed');
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Audio processor cleanup failed:', error);
      }
    }
  }

  /**
   * Get supported file types
   * 
   * @returns {Array<string>} Array of supported file extensions
   */
  getSupportedTypes() {
    return this.config.supportedAudioFormats;
  }

  /**
   * Get processor capabilities
   * 
   * @returns {Object} Processor capabilities and features
   */
  getCapabilities() {
    return {
      processorType: 'audio',
      supportedFormats: this.config.supportedAudioFormats,
      features: {
        transcription: !!this.speechClient || !!this.openai,
        speakerDiarization: !!this.speechClient,
        voicePrintRecognition: !!this.voicePrintDB,
        sentimentAnalysis: !!this.openai,
        qualityAnalysis: true,
        metadataExtraction: true,
        formatConversion: true,
        noiseReduction: false // TODO: Implement
      },
      transcriptionProviders: [
        ...(this.speechClient ? ['google'] : []),
        ...(this.openai ? ['openai'] : [])
      ],
      limits: {
        maxFileSize: this.config.maxFileSize,
        maxDuration: 14400, // 4 hours
        maxSpeakers: this.config.transcriptionOptions.maxSpeakers
      },
      outputFormats: {
        transcription: ['text', 'json', 'srt'],
        audio: ['wav', 'mp3', 'm4a'],
        voicePrints: ['json']
      }
    };
  }

  /**
   * Initialize Google Speech client for transcription
   * @param {Object} options - Configuration options
   */
  async initializeSpeechClient(options) {
    try {
      if (options.googleCredentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (options.googleCredentials) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = options.googleCredentials;
        }
        
        this.speechClient = new speech.SpeechClient();
        
        if (this.enableLogging) {
          this.log('Google Speech client initialized');
        }
      } else if (options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY) {
        this.googleApiKey = options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY;
        
        if (this.enableLogging) {
          this.log('Google Speech API key configured');
        }
      } else {
        if (this.enableLogging) {
          this.log('No Google Speech credentials - will use OpenAI fallback if available');
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize Google Speech client: ${error.message}`);
    }
  }

  /**
   * Transcribe audio using Google Speech-to-Text with OpenAI Whisper fallback
   * 
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcription text
   */
  async transcribeAudio(audioPath, options = {}) {
    return this.executeWithRetry(async () => {
      // Try Google Speech-to-Text first
      if (this.speechClient) {
        try {
          return await this.transcribeWithGoogle(audioPath, options);
        } catch (error) {
          if (this.enableLogging) {
            console.warn('⚠️ Google transcription failed, trying OpenAI fallback:', error.message);
          }
        }
      }
      
      // Fallback to OpenAI Whisper
      if (this.openai) {
        return await this.transcribeWithOpenAI(audioPath, options);
      }
      
      throw new Error('No transcription services available');
    }, 'audio transcription');
  }

  /**
   * Transcribe audio using Google Speech-to-Text
   * 
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcription text
   */
  async transcribeWithGoogle(audioPath, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Starting Google Speech-to-Text transcription');
      }

      // Read audio file
      const audioBytes = fs.readFileSync(audioPath).toString('base64');

      // Configure request
      const request = {
        audio: {
          content: audioBytes,
        },
        config: {
          ...this.config.transcriptionOptions,
          ...options
        },
      };

      // Perform transcription
      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        if (this.enableLogging) {
          this.log('No transcription results found');
        }
        return '';
      }

      // Extract transcription text
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      if (this.enableLogging) {
        this.log(`Google transcription completed: ${transcription.length} chars, ${transcription.split(' ').length} words`);
      }

      return transcription;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Google transcription failed:', error);
      }
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * 
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcription text
   */
  async transcribeWithOpenAI(audioPath, options = {}) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      if (this.enableLogging) {
        this.log('Starting OpenAI Whisper transcription');
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language: options.languageCode ? options.languageCode.substring(0, 2) : 'en',
        response_format: 'text'
      });

      if (this.enableLogging) {
        this.log(`OpenAI transcription completed: ${transcription.length} chars`);
      }

      return transcription;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ OpenAI transcription failed:', error);
      }
      throw error;
    }
  }

  /**
   * Analyze speakers in audio content
   * 
   * @param {string} userId - User ID
   * @param {string} audioPath - Path to audio file
   * @param {string} transcription - Transcription text
   * @param {Object} options - Analysis options
   * @returns {Promise<Array>} Array of speaker information
   */
  async analyzeSpeakers(userId, audioPath, transcription, options = {}) {
    try {
      if (this.enableLogging) {
        this.log('Analyzing speakers and voice patterns');
      }

      // Estimate speaker count from transcription content
      const estimatedSpeakerCount = this.estimateSpeakerCount(transcription);
      
      // Create speaker records
      const speakers = [];
      for (let i = 0; i < estimatedSpeakerCount; i++) {
        const speaker = await Speaker.create({
          id: uuidv4(),
          user_id: userId,
          name: `Speaker ${i + 1}`,
          voice_characteristics: JSON.stringify({
            estimated: true,
            confidence: 0.6,
            segmentLength: Math.floor(transcription.length / estimatedSpeakerCount)
          }),
          recognition_confidence: 0.6,
          total_speaking_time: Math.floor(transcription.split(' ').length / estimatedSpeakerCount),
          word_count: Math.floor(transcription.split(' ').length / estimatedSpeakerCount),
          created_at: new Date()
        });
        
        speakers.push(speaker);
      }

      if (this.enableLogging) {
        this.log(`Speaker analysis completed: found ${speakers.length} speakers`);
      }

      return speakers;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Speaker analysis failed:', error);
      }
      throw error;
    }
  }

  /**
   * Analyze voice prints in audio content
   * 
   * @param {string} userId - User ID
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Voice print options
   * @returns {Promise<Object>} Voice print analysis results
   */
  async analyzeVoicePrints(userId, audioPath, options = {}) {
    try {
      if (!this.voicePrintDB) {
        throw new Error('Voice print database not initialized');
      }

      if (this.enableLogging) {
        this.log('Analyzing voice prints');
      }

      // Use voice print database for analysis
      const voicePrintResults = await this.voicePrintDB.analyzeAudio(audioPath, {
        userId,
        ...options
      });

      if (this.enableLogging) {
        this.log(`Voice print analysis completed: ${voicePrintResults.voicePrints?.length || 0} prints identified`);
      }

      return voicePrintResults;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Voice print analysis failed:', error);
      }
      throw error;
    }
  }

  /**
   * Analyze audio quality
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Quality analysis result
   */
  async analyzeAudioQuality(audioPath) {
    try {
      const metadata = await this.getAudioMetadata(audioPath);
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
      
      if (!audioStream) {
        throw new Error('No audio stream found');
      }
      
      return {
        sampleRate: parseInt(audioStream.sample_rate) || 0,
        bitRate: parseInt(audioStream.bit_rate) || 0,
        channels: parseInt(audioStream.channels) || 0,
        codec: audioStream.codec_name,
        duration: parseFloat(metadata.format.duration),
        fileSize: parseInt(metadata.format.size),
        quality: this.getAudioQualityRating(audioStream),
        overallScore: this.calculateAudioQualityScore(audioStream, metadata.format)
      };
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Audio quality analysis failed:', error);
      }
      throw error;
    }
  }

  /**
   * Get audio metadata using FFprobe
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Audio metadata
   */
  async getAudioMetadata(audioPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Analyze sentiment of transcribed text
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis result
   */
  async analyzeSentiment(text) {
    try {
      if (!this.openai || !text || text.length < 10) {
        return null;
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the following text. Respond with a JSON object containing sentiment (positive/negative/neutral), confidence (0-1), and key_emotions (array of emotions detected).'
          },
          {
            role: 'user',
            content: text.substring(0, 2000) // Limit text length
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Sentiment analysis failed:', error);
      }
      return null;
    }
  }

  /**
   * Estimate speaker count based on transcription content
   * @param {string} transcription - Transcription text
   * @returns {number} Estimated number of speakers
   */
  estimateSpeakerCount(transcription) {
    if (!transcription || transcription.length < 50) {
      return 1;
    }

    const text = transcription.toLowerCase();
    
    // Simple heuristics for speaker estimation
    const questionMarks = (text.match(/\?/g) || []).length;
    const dialogueIndicators = (text.match(/\b(you|i|we|they|he|she)\b/g) || []).length;
    
    // Look for speaker transition indicators
    const speakerTransitions = (text.match(/\b(but|however|meanwhile|then|next|after that)\b/g) || []).length;
    
    // Calculate estimated speakers
    let estimatedSpeakers = 1;
    
    // If many questions, likely conversation
    if (questionMarks > 3) {
      estimatedSpeakers = 2; // Likely conversation
    }
    
    // If many dialogue indicators, multiple speakers
    if (dialogueIndicators > 10) {
      estimatedSpeakers = Math.min(3, Math.ceil(dialogueIndicators / 5));
    }
    
    // Speaker transitions suggest multiple speakers
    if (speakerTransitions > 5) {
      estimatedSpeakers = Math.min(4, Math.ceil(speakerTransitions / 3));
    }
    
    // For longer content, assume more speakers
    if (transcription.length > 2000) {
      estimatedSpeakers = Math.min(estimatedSpeakers + 1, 3);
    }
    
    return Math.max(1, estimatedSpeakers);
  }

  /**
   * Get audio quality rating
   * @param {Object} audioStream - Audio stream metadata
   * @returns {string} Quality rating
   */
  getAudioQualityRating(audioStream) {
    const sampleRate = parseInt(audioStream.sample_rate) || 0;
    const bitRate = parseInt(audioStream.bit_rate) || 0;
    
    if (sampleRate >= 48000 && bitRate >= 256000) return 'Excellent';
    if (sampleRate >= 44100 && bitRate >= 192000) return 'High';
    if (sampleRate >= 22050 && bitRate >= 128000) return 'Good';
    if (sampleRate >= 16000 && bitRate >= 64000) return 'Fair';
    return 'Poor';
  }

  /**
   * Calculate overall audio quality score
   * @param {Object} audioStream - Audio stream metadata
   * @param {Object} format - Format metadata
   * @returns {number} Quality score (0-100)
   */
  calculateAudioQualityScore(audioStream, format) {
    let score = 0;
    
    // Sample rate score (40%)
    const sampleRate = parseInt(audioStream.sample_rate) || 0;
    if (sampleRate >= 48000) score += 40;
    else if (sampleRate >= 44100) score += 35;
    else if (sampleRate >= 22050) score += 25;
    else if (sampleRate >= 16000) score += 15;
    else score += 5;
    
    // Bit rate score (40%)
    const bitRate = parseInt(audioStream.bit_rate) || 0;
    if (bitRate >= 320000) score += 40;
    else if (bitRate >= 256000) score += 35;
    else if (bitRate >= 192000) score += 30;
    else if (bitRate >= 128000) score += 25;
    else if (bitRate >= 64000) score += 15;
    else score += 5;
    
    // Channels score (10%)
    const channels = parseInt(audioStream.channels) || 0;
    if (channels >= 2) score += 10;
    else score += 5;
    
    // Codec score (10%)
    if (['flac', 'alac'].includes(audioStream.codec_name)) {
      score += 10; // Lossless
    } else if (['mp3', 'aac', 'm4a'].includes(audioStream.codec_name)) {
      score += 8; // High quality lossy
    } else {
      score += 5; // Other codecs
    }
    
    return Math.min(100, score);
  }
}

module.exports = AudioProcessor; 