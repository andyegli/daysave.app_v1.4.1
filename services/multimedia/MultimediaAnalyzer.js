/**
 * MultimediaAnalyzer Service
 * 
 * Main service for comprehensive multimedia content analysis including object detection,
 * transcription, sentiment analysis, thumbnail generation, and speaker recognition.
 * This service integrates with DaySave database models for persistent storage.
 * 
 * Features:
 * - Video/audio transcription with speaker diarization
 * - Object detection and image analysis
 * - Sentiment analysis and content categorization
 * - Thumbnail and key moment generation
 * - OCR text extraction from video frames
 * - Speaker identification and voice print analysis
 * - URL-based content analysis from streaming platforms
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const { OpenAI } = require('openai');
const vision = require('@google-cloud/vision');
const speech = require('@google-cloud/speech');
const ffmpeg = require('fluent-ffmpeg');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// DaySave models
const { Content, File, Speaker, Thumbnail, OCRCaption, VideoAnalysis } = require('../../models');

// Multimedia services
const VoicePrintDatabase = require('./VoicePrintDatabase');

/**
 * MultimediaAnalyzer Class
 * 
 * Handles all multimedia analysis operations with integration to DaySave database
 */
class MultimediaAnalyzer {
  /**
   * Initialize the MultimediaAnalyzer service
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.openaiApiKey - OpenAI API key
   * @param {string} options.googleApiKey - Google Cloud API key
   * @param {string} options.googleCredentials - Path to Google Cloud credentials
   * @param {boolean} options.enableLogging - Enable detailed logging (default: true)
   */
  constructor(options = {}) {
    this.enableLogging = options.enableLogging !== false;
    
    // Initialize OpenAI client
    if (options.openaiApiKey || process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY
      });
    }
    
    // Initialize Google Cloud clients
    this.initializeGoogleClients(options);
    
    // Initialize voice print database
    this.voicePrintDB = new VoicePrintDatabase({
      enableLogging: this.enableLogging
    });
    
    // Configuration
    this.config = {
      uploadDir: 'uploads',
      thumbnailDir: 'uploads/thumbnails',
      tempDir: 'uploads/temp',
      maxFileSize: 500 * 1024 * 1024, // 500MB
      supportedVideoFormats: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'],
      supportedAudioFormats: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'],
      supportedImageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
    };
    
    // Ensure directories exist
    this.ensureDirectories();
    
    if (this.enableLogging) {
      console.log('🎬 MultimediaAnalyzer service initialized');
    }
  }

  /**
   * Initialize Google Cloud clients
   * @param {Object} options - Configuration options
   */
  initializeGoogleClients(options) {
    try {
      // Set up Google Cloud credentials
      if (options.googleCredentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (options.googleCredentials) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = options.googleCredentials;
        }
        
        this.visionClient = new vision.ImageAnnotatorClient();
        this.speechClient = new speech.SpeechClient();
        
        if (this.enableLogging) {
          console.log('✅ Google Cloud clients initialized with service account');
        }
      } else if (options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY) {
        this.googleApiKey = options.googleApiKey || process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_KEY;
        
        if (this.enableLogging) {
          console.log('✅ Google Cloud API key configured');
        }
      } else {
        if (this.enableLogging) {
          console.log('⚠️ No Google Cloud credentials found - some features will be limited');
        }
      }
    } catch (error) {
      console.error('❌ Error initializing Google Cloud clients:', error);
    }
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    const dirs = [
      this.config.uploadDir,
      this.config.thumbnailDir,
      this.config.tempDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Analyze multimedia content comprehensively
   * 
   * @param {string} userId - User ID
   * @param {string} filePath - Path to the multimedia file
   * @param {string} fileType - MIME type of the file
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis results
   */
  async analyzeMultimedia(userId, filePath, fileType, options = {}) {
    try {
      if (!userId || !filePath || !fileType) {
        throw new Error('User ID, file path, and file type are required');
      }

      if (this.enableLogging) {
        console.log('🚀 Starting multimedia analysis:', {
          userId,
          filePath: path.basename(filePath),
          fileType
        });
      }

      // Default analysis options
      const analysisOptions = {
        enableObjectDetection: true,
        enableTranscription: true,
        enableVideoAnalysis: true,
        enableSummarization: true,
        enableSentimentAnalysis: true,
        enableSpeakerDiarization: true,
        enableVoicePrintRecognition: true,
        enableThumbnailGeneration: true,
        enableOCRExtraction: true,
        transcriptionProvider: 'google',
        objectDetectionMode: 'enhanced',
        thumbnailOptions: {
          imageSizes: [150, 300, 500],
          thumbnailSize: 300,
          keyMomentsCount: 5,
          keyMomentsSize: 200
        },
        ocrOptions: {
          frameInterval: 2,
          maxFrames: 30,
          confidenceThreshold: 0.5,
          filterShortText: true
        },
        ...options
      };

      // Initialize results object
      let results = {
        userId,
        filePath,
        fileType,
        objects: [],
        transcription: '',
        speakers: [],
        summary: '',
        sentiment: null,
        entities: null,
        thumbnails: null,
        ocrCaptions: null,
        videoAnalysis: null,
        metadata: {},
        warnings: [],
        processingTime: 0,
        analysisId: uuidv4()
      };

      const startTime = Date.now();

      // Determine file category
      const fileCategory = this.getFileCategory(fileType);
      results.metadata.fileCategory = fileCategory;

      // Process based on file type
      switch (fileCategory) {
        case 'video':
          results = await this.analyzeVideo(userId, filePath, results, analysisOptions);
          break;
        case 'audio':
          results = await this.analyzeAudio(userId, filePath, results, analysisOptions);
          break;
        case 'image':
          results = await this.analyzeImage(userId, filePath, results, analysisOptions);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Generate content summary and categorization
      if (analysisOptions.enableSummarization && results.transcription) {
        results.summary = await this.generateSummary(results.transcription);
      }

      // Perform sentiment analysis
      if (analysisOptions.enableSentimentAnalysis && results.transcription) {
        results.sentiment = await this.analyzeSentiment(results.transcription);
      }

      // Generate tags and category
      results.tags = await this.generateTags(results);
      results.category = await this.generateCategory(results);

      // Calculate processing time
      results.processingTime = Date.now() - startTime;

      if (this.enableLogging) {
        console.log('✅ Multimedia analysis completed:', {
          analysisId: results.analysisId,
          processingTime: `${results.processingTime}ms`,
          hasTranscription: !!results.transcription,
          objectsDetected: results.objects.length,
          speakersFound: results.speakers.length
        });
      }

      return results;
    } catch (error) {
      console.error('❌ Multimedia analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze content from URL (enhanced to support actual multimedia processing)
   * 
   * @param {string} url - Content URL to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeContent(url, options = {}) {
    const startTime = Date.now();
    const { user_id, content_id } = options;
    
    // Enhanced logging for analysis start
    if (user_id && content_id) {
      const logger = require('../../config/logger');
      logger.multimedia.start(user_id, content_id, url, {
        transcription: options.transcription,
        sentiment: options.sentiment,
        summarization: options.enableSummarization,
        thumbnails: options.thumbnails,
        speakers: options.speaker_identification
      });
    }
    
    // Initialize results object
    let results = {
      url,
      platform: null,
      metadata: {},
      transcription: '',
      speakers: [],
      summary: '',
      sentiment: null,
      thumbnails: [],
      auto_tags: [],
      user_tags: [],
      category: null,
      processing_time: 0,
      status: 'pending',
      analysisId: uuidv4()
    };

    // Analysis options with defaults
    const analysisOptions = {
      transcription: true,
      sentiment: true,
      thumbnails: true,
      ocr: true,
      speaker_identification: true,
      enableSummarization: true,
      enableSentimentAnalysis: true,
      ...options
    };

    try {
      if (this.enableLogging) {
        console.log('🎬 Processing multimedia URL for real transcription:', url);
      }
      
      // Log progress
      if (user_id && content_id) {
        const logger = require('../../config/logger');
        logger.multimedia.progress(user_id, content_id, 'url_validation', 10);
      }

      // Extract metadata from URL
      results.metadata = await this.extractUrlMetadata(url);
      results.platform = results.metadata.platform;
      
      // Check if this is a multimedia URL that we can process
      if (this.isMultimediaUrl(url)) {
        if (this.enableLogging) {
          console.log('🎬 Processing multimedia URL for real transcription:', url);
        }
        
        // Log progress
        if (user_id && content_id) {
          const logger = require('../../config/logger');
          logger.multimedia.progress(user_id, content_id, 'multimedia_detected', 20, {
            platform: results.platform,
            isMultimedia: true
          });
        }
        
        // Add platform-specific auto-tags
        if (results.platform) {
          results.auto_tags.push(results.platform.toLowerCase());
        }
        
        // Add content type tags
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          results.auto_tags.push('video', 'youtube');
        } else if (url.includes('soundcloud.com') || url.includes('spotify.com')) {
          results.auto_tags.push('audio', 'music');
        } else if (url.includes('instagram.com')) {
          results.auto_tags.push('social', 'visual');
        }
        
        // For YouTube URLs, attempt to get actual transcription
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && analysisOptions.transcription) {
          try {
            // Log transcription start
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'transcription_start', 30, {
                provider: 'youtube_yt-dlp'
              });
            }
            
            // Try to get YouTube transcription via yt-dlp or similar
            const transcriptionResult = await this.getYouTubeTranscription(url);
            
            if (transcriptionResult && transcriptionResult.text) {
              results.transcription = transcriptionResult.text;
              const wordCount = transcriptionResult.text.split(' ').length;
              
              // Log transcription success
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.transcription(user_id, content_id, 'youtube_yt-dlp', wordCount);
                logger.multimedia.progress(user_id, content_id, 'transcription_complete', 50, {
                  wordCount,
                  transcriptionLength: transcriptionResult.text.length
                });
              }
              
              // Generate summary if transcription was successful
              if (analysisOptions.enableSummarization && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateSummary(results.transcription);
                
                if (results.summary && user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.summary(user_id, content_id, results.summary.length, results.transcription.length);
                }
              }
              
              // Perform sentiment analysis
              if (analysisOptions.enableSentimentAnalysis && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'sentiment_analysis', 70);
                }
                
                results.sentiment = await this.analyzeSentiment(results.transcription);
              }
              
              // Simulate speaker identification based on transcription
              if (analysisOptions.speaker_identification && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'speaker_identification', 80);
                }
                
                // Simple speaker estimation based on content patterns
                const speakerCount = this.estimateSpeakerCount(results.transcription);
                results.speakers = Array.from({ length: speakerCount }, (_, i) => ({
                  id: uuidv4(),
                  name: `Speaker ${i + 1}`,
                  confidence: 0.8,
                  segments: []
                }));
              }
              
              if (this.enableLogging) {
                console.log('✅ Real transcription completed:', {
                  wordCount: results.transcription.split(' ').length,
                  speakerCount: results.speakers.length
                });
              }
            } else {
              // Fallback to placeholder if transcription failed
              results.transcription = 'Transcription could not be processed for this content.';
              if (this.enableLogging) {
                console.log('⚠️ Transcription failed, using fallback message');
              }
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'transcription_fallback', 40, {
                  reason: 'no_transcription_result'
                });
              }
            }
          } catch (transcriptionError) {
            console.error('❌ YouTube transcription failed:', transcriptionError);
            results.transcription = 'Transcription processing failed for this content.';
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, transcriptionError, {
                step: 'transcription',
                url
              });
            }
          }
        } else if (this.isLocalImageFile(url) && analysisOptions.transcription) {
          // Handle local image file analysis - generate description instead of transcription
          try {
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'image_analysis_start', 30, {
                provider: 'google_vision_ai'
              });
            }
            
            // Analyze the local image file directly
            const imageAnalysisResult = await this.analyzeImage(user_id, url, results, {
              enableObjectDetection: true,
              enableImageDescription: true,
              enableOCRExtraction: true
            });
            
            if (imageAnalysisResult && imageAnalysisResult.description) {
              // Use image description as "transcription" for images
              results.transcription = imageAnalysisResult.description;
              results.auto_tags.push('image', 'visual', 'photo');
              
              // Add image-specific metadata
              results.metadata.imageAnalysis = {
                objectsDetected: imageAnalysisResult.objects?.length || 0,
                hasText: imageAnalysisResult.text?.length > 0,
                confidence: imageAnalysisResult.confidence || 0,
                analysis_provider: 'google_vision_ai'
              };
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'image_analysis_complete', 70, {
                  description_length: results.transcription.length,
                  objects_detected: imageAnalysisResult.objects?.length || 0
                });
              }
            } else {
              results.transcription = 'Image analysis could not generate a description for this content.';
              results.auto_tags.push('image', 'analysis_partial');
            }
            
          } catch (error) {
            console.error('❌ Image analysis failed:', error);
            results.transcription = 'Image analysis failed for this content.';
            results.auto_tags.push('unknown', 'image', 'analysis_error');
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, error, {
                step: 'image_analysis',
                url
              });
            }
          }
        } else if (this.isImageUrl(url) && analysisOptions.transcription) {
          // Handle image analysis - generate description instead of transcription
          try {
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'image_analysis_start', 30, {
                provider: 'google_vision_ai'
              });
            }
            
            // Download and analyze the image
            const imageAnalysisResult = await this.analyzeImageFromUrl(url, {
              user_id,
              content_id,
              enableObjectDetection: true,
              enableImageDescription: true,
              enableOCRExtraction: true
            });
            
            if (imageAnalysisResult && imageAnalysisResult.description) {
              // Use image description as "transcription" for images
              results.transcription = imageAnalysisResult.description;
              results.auto_tags.push('image', 'visual', 'photo');
              
              // Add image-specific metadata
              results.metadata.imageAnalysis = {
                objectsDetected: imageAnalysisResult.objects?.length || 0,
                textDetected: imageAnalysisResult.hasText || false,
                confidence: imageAnalysisResult.confidence || 0.8,
                analysisProvider: 'Google Vision AI + OpenAI GPT-4'
              };
              
              const wordCount = imageAnalysisResult.description.split(' ').length;
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.transcription(user_id, content_id, 'image_description', wordCount);
                logger.multimedia.progress(user_id, content_id, 'image_description_complete', 50, {
                  wordCount,
                  descriptionLength: imageAnalysisResult.description.length
                });
              }
              
              // Generate summary from image description
              if (analysisOptions.enableSummarization && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateSummary(results.transcription);
                
                if (results.summary && user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.summary(user_id, content_id, results.summary.length, results.transcription.length);
                }
              }
              
              // Perform sentiment analysis on image description
              if (analysisOptions.enableSentimentAnalysis && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'sentiment_analysis', 70);
                }
                
                results.sentiment = await this.analyzeSentiment(results.transcription);
              }
              
              if (this.enableLogging) {
                console.log('✅ Image analysis completed:', {
                  wordCount: results.transcription.split(' ').length,
                  objectsDetected: imageAnalysisResult.objects?.length || 0,
                  hasText: imageAnalysisResult.hasText || false
                });
              }
            } else {
              // Fallback if image analysis failed
              results.transcription = 'Image description could not be generated for this content.';
              results.auto_tags.push('image', 'analysis_failed');
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'image_analysis_fallback', 40, {
                  reason: 'no_description_result'
                });
              }
            }
          } catch (imageError) {
            console.error('❌ Image analysis failed:', imageError);
            results.transcription = 'Image analysis failed for this content.';
            results.auto_tags.push('image', 'analysis_error');
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, imageError, {
                step: 'image_analysis',
                url
              });
            }
          }
        } else {
          // For non-YouTube, non-image URLs or when transcription is disabled
          results.transcription = 'Transcription not available for this content type.';
          
          if (user_id && content_id) {
            const logger = require('../../config/logger');
            logger.multimedia.progress(user_id, content_id, 'transcription_skipped', 50, {
              reason: 'non_youtube_non_image_url_or_disabled'
            });
          }
        }
        
        // Generate tags and category based on available data
        if (user_id && content_id) {
          const logger = require('../../config/logger');
          logger.multimedia.progress(user_id, content_id, 'generating_metadata', 90);
        }
        
        results.tags = await this.generateTags(results);
        results.category = await this.generateCategory(results);
      } else {
        // For non-multimedia URLs, provide basic metadata only
        results.transcription = 'Content type does not support transcription.';
        
        if (user_id && content_id) {
          const logger = require('../../config/logger');
          logger.multimedia.progress(user_id, content_id, 'non_multimedia_detected', 100, {
            isMultimedia: false,
            reason: 'url_pattern_not_matched'
          });
        }
      }
      
      results.status = 'completed';
      results.processingTime = Date.now() - startTime;
      
      // Log successful completion
      if (user_id && content_id) {
        const logger = require('../../config/logger');
        logger.multimedia.success(user_id, content_id, results);
      }
      
      if (this.enableLogging) {
        console.log('✅ Content analysis completed:', {
          url,
          status: results.status,
          hasTranscription: !!results.transcription && results.transcription.length > 50,
          processingTime: `${results.processingTime}ms`
        });
      }
      
      return results;
    } catch (error) {
      console.error('❌ Content analysis failed:', error);
      results.status = 'failed';
      results.transcription = 'Analysis failed for this content.';
      results.processingTime = Date.now() - startTime;
      
      // Log error
      if (user_id && content_id) {
        const logger = require('../../config/logger');
        logger.multimedia.error(user_id, content_id, error, {
          url,
          processingTime: results.processingTime
        });
      }
      
      throw error;
    }
  }

  /**
   * Analyze video content
   * 
   * @param {string} userId - User ID
   * @param {string} videoPath - Path to video file
   * @param {Object} results - Results object to populate
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Updated results
   */
  async analyzeVideo(userId, videoPath, results, options) {
    try {
      if (this.enableLogging) {
        console.log('🎬 Analyzing video content');
      }

      // Create video analysis record
      const videoAnalysis = await VideoAnalysis.create({
        id: uuidv4(),
        user_id: userId,
        duration: 0,
        status: 'processing',
        analysis_method: 'ffmpeg',
        analysis_options: options,
        started_at: new Date(),
        progress: 0
      });

      results.videoAnalysis = videoAnalysis;

      // Extract video metadata
      const metadata = await this.getVideoMetadata(videoPath);
      results.metadata.video = metadata;

      // Update video analysis with metadata
      await videoAnalysis.update({
        duration: metadata.format.duration,
        frame_count: metadata.streams[0]?.nb_frames,
        frame_rate: eval(metadata.streams[0]?.r_frame_rate || '0'),
        resolution: {
          width: metadata.streams[0]?.width,
          height: metadata.streams[0]?.height
        },
        video_codec: metadata.streams[0]?.codec_name,
        file_size: metadata.format.size,
        container_format: metadata.format.format_name,
        progress: 20
      });

      // Extract audio for transcription
      if (options.enableTranscription) {
        const audioPath = await this.extractAudioFromVideo(videoPath);
        results.transcription = await this.transcribeAudio(audioPath, options);
        
        // Speaker diarization and voice print analysis
        if (options.enableSpeakerDiarization) {
          results.speakers = await this.analyzeSpeakers(userId, audioPath, results.transcription);
        }
        
        // Clean up temporary audio file
        if (fs.existsSync(audioPath)) {
          fs.unlinkSync(audioPath);
        }
      }

      // Extract frame for object detection
      if (options.enableObjectDetection) {
        const framePath = await this.extractVideoFrame(videoPath);
        results.objects = await this.detectObjects(framePath);
        
        // Clean up temporary frame
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
        }
      }

      // Generate thumbnails
      if (options.enableThumbnailGeneration) {
        results.thumbnails = await this.generateVideoThumbnails(
          userId,
          videoPath,
          options.thumbnailOptions
        );
      }

      // Extract OCR captions
      if (options.enableOCRExtraction) {
        results.ocrCaptions = await this.extractOCRCaptions(
          userId,
          videoPath,
          options.ocrOptions
        );
      }

      // Update video analysis completion
      await videoAnalysis.update({
        status: 'ready',
        progress: 100,
        completed_at: new Date(),
        objects_detected: {
          totalObjects: results.objects.length,
          uniqueObjects: [...new Set(results.objects.map(o => o.name))].length
        }
      });

      return results;
    } catch (error) {
      console.error('❌ Video analysis failed:', error);
      
      if (results.videoAnalysis) {
        await results.videoAnalysis.update({
          status: 'failed',
          error_message: error.message,
          progress: 0
        });
      }
      
      throw error;
    }
  }

  /**
   * Analyze audio content
   * 
   * @param {string} userId - User ID
   * @param {string} audioPath - Path to audio file
   * @param {Object} results - Results object to populate
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Updated results
   */
  async analyzeAudio(userId, audioPath, results, options) {
    try {
      if (this.enableLogging) {
        console.log('🎵 Analyzing audio content');
      }

      // Get audio metadata
      const metadata = await this.getAudioMetadata(audioPath);
      results.metadata.audio = metadata;

      // Transcribe audio
      if (options.enableTranscription) {
        results.transcription = await this.transcribeAudio(audioPath, options);
        
        // Speaker diarization and voice print analysis
        if (options.enableSpeakerDiarization) {
          results.speakers = await this.analyzeSpeakers(userId, audioPath, results.transcription);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Audio analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze image content with comprehensive fallback
   * @param {string} userId - User ID
   * @param {string} imagePath - Path to image file
   * @param {Object} results - Results object to populate
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeImage(userId, imagePath, results, options) {
    try {
      if (this.enableLogging) {
        console.log('🖼️ Analyzing image content');
      }

      // Object detection (with ChatGPT fallback)
      if (options.enableObjectDetection) {
        results.objects = await this.detectObjects(imagePath);
        
        if (this.enableLogging) {
          console.log(`🔍 Found ${results.objects.length} objects using ${results.objects[0]?.provider || 'unknown'} provider`);
        }
      }

      // OCR text extraction (with ChatGPT fallback)
      if (options.enableOCRExtraction) {
        results.ocrText = await this.extractImageText(userId, imagePath);
        
        if (results.ocrText && this.enableLogging) {
          console.log(`📝 Extracted ${results.ocrText.length} characters of text`);
        }
      }

      // Generate comprehensive image description using ChatGPT
      if (this.openai) {
        try {
          const descriptionResult = await this.generateImageDescriptionFromPath(imagePath, {
            objects: results.objects,
            text: results.ocrText
          });
          
          if (descriptionResult && descriptionResult.description) {
            results.description = descriptionResult.description;
            results.transcription = descriptionResult.description; // For consistency with other content types
            
            // Generate sentiment analysis from description
            if (descriptionResult.description.length > 10) {
              results.sentiment = await this.analyzeSentiment(descriptionResult.description);
            }
            
            if (this.enableLogging) {
              console.log(`📖 Generated image description (${results.description.length} chars)`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to generate image description:', error);
        }
      }

      // Generate thumbnails
      if (options.enableThumbnailGeneration) {
        results.thumbnails = await this.generateImageThumbnails(
          userId,
          imagePath,
          options.thumbnailOptions
        );
      }

      // Generate tags based on all available information
      if (this.openai) {
        try {
          results.tags = await this.generateTags({
            objects: results.objects,
            description: results.description,
            ocrText: results.ocrText,
            type: 'image'
          });
          
          if (this.enableLogging) {
            console.log(`🏷️ Generated ${results.tags?.length || 0} tags`);
          }
        } catch (error) {
          console.error('❌ Failed to generate tags:', error);
        }
      }

      // Generate category
      if (this.openai) {
        try {
          results.category = await this.generateCategory({
            objects: results.objects,
            description: results.description,
            ocrText: results.ocrText,
            type: 'image'
          });
          
          if (this.enableLogging) {
            console.log(`📁 Generated category: ${results.category}`);
          }
        } catch (error) {
          console.error('❌ Failed to generate category:', error);
        }
      }

      // Ensure we have some basic analysis even if APIs fail
      if (!results.description && !results.transcription) {
        results.transcription = this.generateBasicImageDescription(imagePath, results.objects);
        results.description = results.transcription;
      }

      return results;
    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate basic image description as last resort
   * @param {string} imagePath - Path to image file
   * @param {Array} objects - Detected objects
   * @returns {string} Basic description
   */
  generateBasicImageDescription(imagePath, objects = []) {
    const path = require('path');
    const filename = path.basename(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    
    let description = `Image file: ${filename}`;
    
    // Add file type info
    const fileTypes = {
      '.jpg': 'JPEG image',
      '.jpeg': 'JPEG image', 
      '.png': 'PNG image',
      '.gif': 'GIF image',
      '.bmp': 'BMP image',
      '.webp': 'WebP image'
    };
    
    if (fileTypes[ext]) {
      description += ` (${fileTypes[ext]})`;
    }
    
    // Add object information if available
    if (objects && objects.length > 0) {
      const objectNames = objects.map(obj => obj.name).join(', ');
      description += `. Detected objects: ${objectNames}`;
    }
    
    return description;
  }

  /**
   * Transcribe audio using Google Speech-to-Text
   * 
   * @param {string} audioPath - Path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<string>} Transcription text
   */
  async transcribeAudio(audioPath, options = {}) {
    try {
      if (!this.speechClient && !this.googleApiKey) {
        throw new Error('Google Speech client not initialized');
      }

      if (this.enableLogging) {
        console.log('🎤 Starting audio transcription');
      }

      // Read audio file
      const audioBytes = fs.readFileSync(audioPath).toString('base64');

      // Configure request
      const request = {
        audio: {
          content: audioBytes,
        },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          enableSpeakerDiarization: options.enableSpeakerDiarization || false,
          diarizationSpeakerCount: options.maxSpeakers || 2,
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          model: 'latest_long'
        },
      };

      // Perform transcription
      const [response] = await this.speechClient.recognize(request);
      
      if (!response.results || response.results.length === 0) {
        if (this.enableLogging) {
          console.log('⚠️ No transcription results found');
        }
        return '';
      }

      // Extract transcription text
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');

      if (this.enableLogging) {
        console.log('✅ Audio transcription completed:', {
          length: transcription.length,
          wordCount: transcription.split(' ').length
        });
      }

      return transcription;
    } catch (error) {
      console.error('❌ Audio transcription failed:', error);
      
      // Fallback to OpenAI Whisper if available
      if (this.openai) {
        return await this.transcribeAudioWithWhisper(audioPath);
      }
      
      throw error;
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * 
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<string>} Transcription text
   */
  async transcribeAudioWithWhisper(audioPath) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      if (this.enableLogging) {
        console.log('🎤 Using OpenAI Whisper for transcription');
      }

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      });

      return transcription;
    } catch (error) {
      console.error('❌ Whisper transcription failed:', error);
      throw error;
    }
  }

  /**
   * Analyze speakers in audio content
   * 
   * @param {string} userId - User ID
   * @param {string} audioPath - Path to audio file
   * @param {string} transcription - Transcription text
   * @returns {Promise<Array>} Array of speaker information
   */
  async analyzeSpeakers(userId, audioPath, transcription) {
    try {
      if (this.enableLogging) {
        console.log('👥 Analyzing speakers and voice prints');
      }

      // For now, return basic speaker analysis
      // This would be expanded with actual speaker diarization
      const speakers = [{
        id: uuidv4(),
        name: 'Speaker 1',
        wordCount: transcription.split(' ').length,
        confidence: 0.8,
        segments: [{
          start: 0,
          end: transcription.length,
          text: transcription
        }]
      }];

      return speakers;
    } catch (error) {
      console.error('❌ Speaker analysis failed:', error);
      return [];
    }
  }

  /**
   * Detect objects in image using Google Vision API or OpenAI Vision as fallback
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjects(imagePath) {
    try {
      // Try Google Vision API first
      if (this.visionClient && this.googleApiKey) {
        if (this.enableLogging) {
          console.log('🔍 Detecting objects using Google Vision API');
        }

        const [result] = await this.visionClient.objectLocalization(imagePath);
        const objects = result.localizedObjectAnnotations || [];

        return objects.map(object => ({
          name: object.name,
          confidence: object.score,
          boundingBox: object.boundingPoly.normalizedVertices,
          provider: 'google'
        }));
      }

      // Fallback to OpenAI Vision
      if (this.openai) {
        if (this.enableLogging) {
          console.log('🔍 Falling back to OpenAI Vision for object detection');
        }
        return await this.detectObjectsWithOpenAI(imagePath);
      }

      // No API available
      if (this.enableLogging) {
        console.log('⚠️ No vision API available, skipping object detection');
      }
      return [];

    } catch (error) {
      console.error('❌ Object detection failed:', error);
      
      // Try OpenAI fallback if Google Vision failed
      if (this.openai && !error.message.includes('OpenAI')) {
        if (this.enableLogging) {
          console.log('🔄 Trying OpenAI Vision as fallback after Google Vision error');
        }
        try {
          return await this.detectObjectsWithOpenAI(imagePath);
        } catch (fallbackError) {
          console.error('❌ OpenAI Vision fallback also failed:', fallbackError);
        }
      }
      
      return [];
    }
  }

  /**
   * Detect objects using OpenAI Vision API
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjectsWithOpenAI(imagePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Read image file and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Use the vision-enabled model
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and identify all objects, people, animals, and things you can see. 
                
For each object, provide:
- name: Clear, concise name
- confidence: Your confidence level (0.0-1.0)
- description: Brief description

Return your response as a JSON array in this exact format:
[
  {"name": "object_name", "confidence": 0.95, "description": "brief description"},
  {"name": "another_object", "confidence": 0.87, "description": "brief description"}
]

Only return the JSON array, no other text.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      
      try {
        // Clean up markdown code blocks if present
        let cleanContent = content;
        if (content.includes('```json') || content.includes('```')) {
          cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }
        
        const objects = JSON.parse(cleanContent);
        return objects.map(obj => ({
          name: obj.name,
          confidence: obj.confidence,
          description: obj.description,
          provider: 'openai'
        }));
      } catch (parseError) {
        console.error('Error parsing OpenAI Vision response:', parseError);
        
        // Extract objects from natural language response as fallback
        return this.parseObjectsFromText(content);
      }
      
    } catch (error) {
      console.error('❌ OpenAI Vision object detection failed:', error);
      throw error;
    }
  }

  /**
   * Parse objects from natural language text as last resort
   * @param {string} text - Natural language description
   * @returns {Array} Array of detected objects
   */
  parseObjectsFromText(text) {
    // Simple extraction of likely objects from text
    const commonObjects = [
      'person', 'people', 'man', 'woman', 'child', 'face', 'hand',
      'car', 'vehicle', 'truck', 'bus', 'bicycle', 'motorcycle',
      'building', 'house', 'tree', 'flower', 'plant', 'sky', 'cloud',
      'table', 'chair', 'book', 'phone', 'computer', 'laptop',
      'food', 'drink', 'bottle', 'glass', 'plate', 'cup',
      'dog', 'cat', 'bird', 'animal', 'sign', 'text', 'logo'
    ];
    
    const foundObjects = [];
    const lowerText = text.toLowerCase();
    
    commonObjects.forEach(obj => {
      if (lowerText.includes(obj)) {
        foundObjects.push({
          name: obj,
          confidence: 0.7,
          description: `Detected "${obj}" in image analysis`,
          provider: 'openai_text'
        });
      }
    });
    
    return foundObjects;
  }

  /**
   * Get MIME type from file path
   * @param {string} filePath - Path to file
   * @returns {string} MIME type
   */
  getMimeTypeFromPath(filePath) {
    const path = require('path');
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.webp': 'image/webp'
    };
    
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Extract text from image using OpenAI Vision as fallback
   * @param {string} userId - User ID
   * @param {string} imagePath - Path to image file
   * @returns {Promise<string>} Extracted text
   */
  async extractImageText(userId, imagePath) {
    try {
      // Try Google Vision first (if available)
      if (this.visionClient && this.googleApiKey) {
        if (this.enableLogging) {
          console.log('🔍 Extracting text using Google Vision OCR');
        }
        
        const [result] = await this.visionClient.textDetection(imagePath);
        const detections = result.textAnnotations;
        
        if (detections && detections.length > 0) {
          return detections[0].description || '';
        }
      }

      // Fallback to OpenAI Vision
      if (this.openai) {
        if (this.enableLogging) {
          console.log('🔄 Falling back to OpenAI Vision for text extraction');
        }
        return await this.extractTextWithOpenAI(imagePath);
      }

      if (this.enableLogging) {
        console.log('⚠️ No vision API available for text extraction');
      }
      return '';

    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      
      // Try OpenAI fallback if Google Vision failed
      if (this.openai && !error.message.includes('OpenAI')) {
        try {
          return await this.extractTextWithOpenAI(imagePath);
        } catch (fallbackError) {
          console.error('❌ OpenAI text extraction fallback failed:', fallbackError);
        }
      }
      
      return '';
    }
  }

  /**
   * Extract text using OpenAI Vision API
   * @param {string} imagePath - Path to image file
   * @returns {Promise<string>} Extracted text
   */
  async extractTextWithOpenAI(imagePath) {
    try {
      const fs = require('fs');
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeTypeFromPath(imagePath);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract all text visible in this image. Include:
- Signs, labels, and captions
- Handwritten and printed text
- Text in different languages
- Numbers and symbols

Return only the extracted text, preserving line breaks and formatting where possible. If no text is found, return an empty string.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      return response.choices[0].message.content || '';
      
    } catch (error) {
      console.error('❌ OpenAI text extraction failed:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Get file category based on MIME type
   * @param {string} mimeType - MIME type
   * @returns {string} File category
   */
  getFileCategory(mimeType) {
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('image/')) return 'image';
    return 'unknown';
  }

  /**
   * Extract audio from video file
   * @param {string} videoPath - Path to video file
   * @returns {Promise<string>} Path to extracted audio file
   */
  async extractAudioFromVideo(videoPath) {
    return new Promise((resolve, reject) => {
      const audioPath = path.join(this.config.tempDir, `audio_${Date.now()}.wav`);
      
      ffmpeg(videoPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .output(audioPath)
        .on('end', () => resolve(audioPath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Extract frame from video
   * @param {string} videoPath - Path to video file
   * @param {string} timestamp - Timestamp to extract (default: 00:00:01)
   * @returns {Promise<string>} Path to extracted frame
   */
  async extractVideoFrame(videoPath, timestamp = '00:00:01') {
    return new Promise((resolve, reject) => {
      const framePath = path.join(this.config.tempDir, `frame_${Date.now()}.jpg`);
      
      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .output(framePath)
        .on('end', () => resolve(framePath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Get video metadata
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });
  }

  /**
   * Get audio metadata
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
   * Generate summary using OpenAI
   * @param {string} text - Text to summarize
   * @returns {Promise<string>} Summary text
   */
  async generateSummary(text) {
    try {
      if (!this.openai || !text) return '';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of multimedia content.'
          },
          {
            role: 'user',
            content: `Please create a concise summary of the following content:\n\n${text}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Summary generation failed:', error);
      return '';
    }
  }

  /**
   * Analyze sentiment using OpenAI
   * @param {string} text - Text to analyze
   * @returns {Promise<Object>} Sentiment analysis
   */
  async analyzeSentiment(text) {
    try {
      if (!this.openai || !text) return null;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a sentiment analysis expert. Analyze the sentiment and return a JSON object with sentiment (positive/negative/neutral), confidence (0-1), and emotions array.'
          },
          {
            role: 'user',
            content: `Analyze the sentiment of this content:\n\n${text}`
          }
        ],
        max_tokens: 150,
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('❌ Sentiment analysis failed:', error);
      return null;
    }
  }

  /**
   * Generate tags based on analysis results
   * 
   * @param {Object} results - Analysis results
   * @returns {Promise<Array>} Array of generated tags
   */
  async generateTags(results) {
    const tags = [...(results.auto_tags || [])];
    
    // Add tags based on transcription content
    if (results.transcription && results.transcription.length > 50) {
      const text = results.transcription.toLowerCase();
      
      // Topic-based tags
      if (text.includes('music') || text.includes('song') || text.includes('melody')) {
        tags.push('music');
      }
      if (text.includes('education') || text.includes('learn') || text.includes('tutorial')) {
        tags.push('educational');
      }
      if (text.includes('news') || text.includes('report') || text.includes('breaking')) {
        tags.push('news');
      }
      if (text.includes('game') || text.includes('gaming') || text.includes('play')) {
        tags.push('gaming');
      }
      if (text.includes('review') || text.includes('opinion') || text.includes('rating')) {
        tags.push('review');
      }
      if (text.includes('interview') || text.includes('conversation') || text.includes('discussion')) {
        tags.push('interview');
      }
    }
    
    // Add sentiment-based tags
    if (results.sentiment) {
      if (results.sentiment.sentiment === 'positive') {
        tags.push('positive');
      } else if (results.sentiment.sentiment === 'negative') {
        tags.push('negative');
      }
    }
    
    // Add speaker-based tags
    if (results.speakers && results.speakers.length > 1) {
      tags.push('conversation', 'multiple-speakers');
    } else if (results.speakers && results.speakers.length === 1) {
      tags.push('monologue', 'single-speaker');
    }
    
    // Remove duplicates and return
    return [...new Set(tags)];
  }

  /**
   * Generate category based on analysis results
   * 
   * @param {Object} results - Analysis results
   * @returns {Promise<string>} Generated category
   */
  async generateCategory(results) {
    // Default category
    let category = 'general';
    
    // Category based on platform
    if (results.platform === 'youtube') {
      category = 'video';
    } else if (results.platform === 'soundcloud' || results.platform === 'spotify') {
      category = 'audio';
    } else if (results.platform === 'instagram') {
      category = 'social';
    }
    
    // Refine category based on content
    if (results.transcription && results.transcription.length > 50) {
      const text = results.transcription.toLowerCase();
      
      if (text.includes('music') || text.includes('song')) {
        category = 'music';
      } else if (text.includes('education') || text.includes('tutorial') || text.includes('learn')) {
        category = 'educational';
      } else if (text.includes('news') || text.includes('report')) {
        category = 'news';
      } else if (text.includes('game') || text.includes('gaming')) {
        category = 'gaming';
      } else if (text.includes('review') || text.includes('opinion')) {
        category = 'review';
      } else if (text.includes('interview') || text.includes('conversation')) {
        category = 'interview';
      }
    }
    
    return category;
  }

  // Placeholder methods for features to be implemented
  async generateVideoThumbnails(userId, videoPath, options) {
    // TODO: Implement video thumbnail generation
    return null;
  }

  async generateImageThumbnails(userId, imagePath, options) {
    // TODO: Implement image thumbnail generation
    return null;
  }

  async extractOCRCaptions(userId, videoPath, options) {
    // TODO: Implement OCR caption extraction
    return null;
  }

  async extractImageText(userId, imagePath) {
    // TODO: Implement image text extraction
    return null;
  }

  /**
   * Get YouTube transcription using yt-dlp or YouTube API
   * 
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} Transcription result
   */
  async getYouTubeTranscription(url) {
    try {
      // Extract video ID from URL
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Could not extract video ID from URL');
      }
      
      if (this.enableLogging) {
        console.log('🎬 Attempting to get YouTube transcription for video:', videoId);
      }
      
      // Try to get transcription using yt-dlp
      const transcriptionResult = await this.extractYouTubeTranscriptionWithYtDlp(url);
      
      if (transcriptionResult && transcriptionResult.text && transcriptionResult.text.length > 50) {
        if (this.enableLogging) {
          console.log('✅ Successfully extracted YouTube transcription:', {
            length: transcriptionResult.text.length,
            wordCount: transcriptionResult.text.split(' ').length
          });
        }
        return transcriptionResult;
      }
      
      // Fallback: Try to download and transcribe audio
      if (this.enableLogging) {
        console.log('🔄 No captions found, attempting audio transcription...');
      }
      
      const audioTranscription = await this.downloadAndTranscribeYouTubeAudio(url);
      
      if (audioTranscription && audioTranscription.text) {
        return audioTranscription;
      }
      
      // Final fallback
      throw new Error('No transcription method succeeded');
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ YouTube transcription failed:', error);
      }
      
      // Return a more informative error message
      return {
        text: `Transcription extraction failed for this YouTube video. Error: ${error.message}`,
        confidence: 0.0,
        language: 'en',
        source: 'error-fallback'
      };
    }
  }

  /**
   * Extract YouTube captions using yt-dlp
   * 
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} Transcription result
   */
  async extractYouTubeTranscriptionWithYtDlp(url) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      try {
        const timestamp = Date.now();
        const outputDir = path.join(__dirname, '../../uploads');
        const outputPath = path.join(outputDir, `captions_${timestamp}`);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Try to extract auto-generated captions first, then manual captions
        // Add --no-check-certificates to fix SSL certificate issues
        const command = `yt-dlp --no-check-certificates --write-auto-sub --write-sub --sub-lang en --sub-format vtt --skip-download -o "${outputPath}" "${url}"`;
        
        if (this.enableLogging) {
          console.log('🎬 Executing yt-dlp caption extraction:', command);
        }
        
        exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          try {
            if (error) {
              if (this.enableLogging) {
                console.log('⚠️ yt-dlp caption extraction failed:', error.message);
              }
              reject(error);
              return;
            }
            
            // Look for generated caption files
            const files = fs.readdirSync(outputDir).filter(file => 
              file.startsWith(`captions_${timestamp}`) && file.endsWith('.vtt')
            );
            
            if (files.length === 0) {
              reject(new Error('No caption files found'));
              return;
            }
            
            // Read the first caption file found
            const captionFile = path.join(outputDir, files[0]);
            const captionContent = fs.readFileSync(captionFile, 'utf8');
            
            // Parse VTT content to extract text
            const transcriptionText = this.parseVttToText(captionContent);
            
            // Clean up caption file
            fs.unlinkSync(captionFile);
            
            if (transcriptionText && transcriptionText.length > 10) {
              resolve({
                text: transcriptionText,
                confidence: 0.9,
                language: 'en',
                source: 'youtube-captions'
              });
            } else {
              reject(new Error('No meaningful transcription extracted from captions'));
            }
            
          } catch (parseError) {
            if (this.enableLogging) {
              console.error('❌ Error parsing caption file:', parseError);
            }
            reject(parseError);
          }
        });
        
      } catch (setupError) {
        reject(setupError);
      }
    });
  }

  /**
   * Download YouTube audio and transcribe it
   * 
   * @param {string} url - YouTube URL
   * @returns {Promise<Object>} Transcription result
   */
  async downloadAndTranscribeYouTubeAudio(url) {
    const { exec } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    
    return new Promise((resolve, reject) => {
      try {
        const timestamp = Date.now();
        const outputDir = path.join(__dirname, '../../uploads');
        const outputPath = path.join(outputDir, `youtube_audio_${timestamp}.%(ext)s`);
        
        // Ensure uploads directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Download audio only
        // Add --no-check-certificates to fix SSL certificate issues
        const command = `yt-dlp --no-check-certificates -f "bestaudio[ext=m4a]/bestaudio/best" -o "${outputPath}" "${url}"`;
        
        if (this.enableLogging) {
          console.log('🎵 Downloading YouTube audio for transcription:', command);
        }
        
        exec(command, { maxBuffer: 50 * 1024 * 1024 }, async (error, stdout, stderr) => {
          try {
            if (error) {
              if (this.enableLogging) {
                console.log('❌ YouTube audio download failed:', error.message);
              }
              reject(error);
              return;
            }
            
            // Find the downloaded audio file
            const files = fs.readdirSync(outputDir).filter(file => 
              file.startsWith(`youtube_audio_${timestamp}`) && 
              (file.endsWith('.m4a') || file.endsWith('.mp3') || file.endsWith('.wav'))
            );
            
            if (files.length === 0) {
              reject(new Error('No audio file downloaded'));
              return;
            }
            
            const audioFile = path.join(outputDir, files[0]);
            
            // Transcribe the audio file
            let transcriptionText = '';
            try {
              if (this.openai) {
                transcriptionText = await this.transcribeAudioOpenAI(audioFile);
              } else if (this.speechClient) {
                transcriptionText = await this.transcribeAudioGoogle(audioFile);
              } else {
                throw new Error('No transcription service available');
              }
            } catch (transcriptionError) {
              if (this.enableLogging) {
                console.error('❌ Audio transcription failed:', transcriptionError);
              }
              throw transcriptionError;
            } finally {
              // Clean up audio file
              if (fs.existsSync(audioFile)) {
                fs.unlinkSync(audioFile);
              }
            }
            
            if (transcriptionText && transcriptionText.length > 10) {
              resolve({
                text: transcriptionText,
                confidence: 0.8,
                language: 'en',
                source: 'youtube-audio-transcription'
              });
            } else {
              reject(new Error('No meaningful transcription from audio'));
            }
            
          } catch (processError) {
            reject(processError);
          }
        });
        
      } catch (setupError) {
        reject(setupError);
      }
    });
  }

  /**
   * Parse VTT caption content to extract plain text
   * 
   * @param {string} vttContent - VTT file content
   * @returns {string} Plain text transcription
   */
  parseVttToText(vttContent) {
    try {
      // Split by lines and filter out VTT headers, timestamps, and metadata
      const lines = vttContent.split('\n');
      const textLines = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines, VTT headers, and timestamp lines
        if (!line || 
            line.startsWith('WEBVTT') || 
            line.startsWith('NOTE') ||
            line.includes('-->') ||
            /^\d+$/.test(line)) {
          continue;
        }
        
        // Remove VTT markup tags like <c>, <i>, etc.
        const cleanLine = line.replace(/<[^>]*>/g, '').trim();
        
        if (cleanLine && cleanLine.length > 0) {
          textLines.push(cleanLine);
        }
      }
      
      // Join all text lines and clean up
      const fullText = textLines.join(' ')
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();
      
      return fullText;
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Error parsing VTT content:', error);
      }
      return '';
    }
  }

  /**
   * Extract YouTube video ID from URL
   * 
   * @param {string} url - YouTube URL
   * @returns {string|null} Video ID or null if not found
   */
  extractYouTubeVideoId(url) {
    try {
      // Updated regex to handle YouTube Shorts URLs as well as regular YouTube URLs
      const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimate speaker count based on transcription content
   * 
   * @param {string} transcription - Transcription text
   * @returns {number} Estimated number of speakers
   */
  estimateSpeakerCount(transcription) {
    if (!transcription || transcription.length < 50) {
      return 1;
    }
    
    // Simple heuristics for speaker estimation
    const text = transcription.toLowerCase();
    
    // Look for conversation patterns
    const questionMarks = (text.match(/\?/g) || []).length;
    const exclamations = (text.match(/!/g) || []).length;
    const dialogueIndicators = (text.match(/\b(said|asked|replied|answered|responded)\b/g) || []).length;
    
    // Look for speaker transition indicators
    const speakerTransitions = (text.match(/\b(but|however|meanwhile|then|next|after that)\b/g) || []).length;
    
    // Estimate based on content patterns
    let estimatedSpeakers = 1;
    
    if (questionMarks > 2 && exclamations > 1) {
      estimatedSpeakers = 2; // Likely conversation
    }
    
    if (dialogueIndicators > 3) {
      estimatedSpeakers = Math.min(3, Math.ceil(dialogueIndicators / 2));
    }
    
    if (speakerTransitions > 5) {
      estimatedSpeakers = Math.min(4, Math.ceil(speakerTransitions / 3));
    }
    
    // For longer content, assume more speakers
    if (transcription.length > 1000) {
      estimatedSpeakers = Math.min(estimatedSpeakers + 1, 3);
    }
    
    return Math.max(1, estimatedSpeakers);
  }

  /**
   * Extract metadata from URL
   * 
   * @param {string} url - URL to extract metadata from
   * @returns {Promise<Object>} Metadata object
   */
  async extractUrlMetadata(url) {
    try {
      const metadata = {
        url,
        platform: this.detectPlatform(url),
        title: null,
        description: null,
        duration: null,
        thumbnail: null,
        extractedAt: new Date().toISOString()
      };
      
      // For YouTube URLs, try to extract basic info
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = this.extractYouTubeVideoId(url);
        if (videoId) {
          metadata.videoId = videoId;
          metadata.title = `YouTube Video ${videoId}`;
          metadata.description = 'YouTube video content';
          metadata.thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
      
      return metadata;
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Metadata extraction failed:', error);
      }
      return {
        url,
        platform: 'unknown',
        title: 'Unknown Content',
        description: 'Content metadata could not be extracted',
        extractedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Detect platform from URL
   * 
   * @param {string} url - URL to analyze
   * @returns {string} Platform name
   */
  detectPlatform(url) {
    if (!url) return 'unknown';
    
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      return 'youtube';
    } else if (urlLower.includes('instagram.com')) {
      return 'instagram';
    } else if (urlLower.includes('tiktok.com')) {
      return 'tiktok';
    } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
      return 'twitter';
    } else if (urlLower.includes('facebook.com')) {
      return 'facebook';
    } else if (urlLower.includes('vimeo.com')) {
      return 'vimeo';
    } else if (urlLower.includes('twitch.tv')) {
      return 'twitch';
    } else if (urlLower.includes('soundcloud.com')) {
      return 'soundcloud';
    } else if (urlLower.includes('spotify.com')) {
      return 'spotify';
    } else {
      return 'unknown';
    }
  }

  /**
   * Check if URL is multimedia content
   * @param {string} url - URL to check
   * @returns {boolean} True if multimedia URL
   */
  isMultimediaUrl(url) {
    const multimediaPatterns = [
      // Video platforms
      /youtube\.com\/watch/i,
      /youtube\.com\/shorts/i,
      /youtu\.be\//i,
      /vimeo\.com\//i,
      /dailymotion\.com\//i,
      /twitch\.tv\//i,
      /tiktok\.com\//i,
      /instagram\.com\/p\//i,
      /instagram\.com\/reel\//i,
      /facebook\.com\/watch/i,
      /facebook\.com\/share\/v\//i,
      /facebook\.com\/share\/p\//i,
      /facebook\.com\/video\//i,
      /facebook\.com\/.*\/videos\//i,
      /facebook\.com\/.*\/posts\//i,
      /facebook\.com\/.*\/photos\//i,
      /m\.facebook\.com\/watch/i,
      /m\.facebook\.com\/video\//i,
      /fb\.com\//i,
      /twitter\.com\/.*\/status/i,
      /x\.com\/.*\/status/i,
      
      // Audio platforms
      /soundcloud\.com\//i,
      /spotify\.com\//i,
      /anchor\.fm\//i,
      
      // Direct files
      /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i,
      /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
      /\.(jpg|jpeg|png|gif|bmp|webp)(\?|$)/i
    ];
    
    return multimediaPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if URL points to an image
   * 
   * @param {string} url - URL to check
   * @returns {boolean} - True if URL likely points to an image
   */
  isImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // If it's a local file path (absolute path), don't treat it as a URL
    if (url.startsWith('/') && !url.startsWith('//')) {
      return false; // Local file path, not a URL
    }
    
    const imagePatterns = [
      // Direct image file extensions
      /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif)(\?|$)/i,
      
      // Image hosting and sharing platforms
      /imgur\.com\//i,
      /flickr\.com\//i,
      /pinterest\.com\/pin\//i,
      /unsplash\.com\//i,
      /pixabay\.com\//i,
      /pexels\.com\//i,
      /shutterstock\.com\//i,
      /gettyimages\.com\//i,
      /istockphoto\.com\//i,
      
      // Social media image patterns
      /instagram\.com\/p\//i,
      /twitter\.com\/.*\/photo/i,
      /x\.com\/.*\/photo/i,
      /facebook\.com\/photo/i
    ];
    
    return imagePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if a path is a local image file
   * @param {string} path - The path to check
   * @returns {boolean} True if it's a local image file path
   */
  isLocalImageFile(path) {
    if (!path || typeof path !== 'string') return false;
    
    // Check if it's a local file path (absolute path starting with /)
    if (path.startsWith('/') && !path.startsWith('//')) {
      // Check if it has an image extension
      const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|tif)$/i;
      return imageExtensions.test(path);
    }
    
    return false;
  }

  /**
   * Analyze image from URL
   * Downloads image and performs comprehensive analysis including description generation
   * 
   * @param {string} url - Image URL to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} - Image analysis results
   */
  async analyzeImageFromUrl(url, options = {}) {
    try {
      if (this.enableLogging) {
        console.log('🖼️ Starting image analysis from URL:', url);
      }
      
      // Download image to temporary file
      const tempImagePath = await this.downloadImageFromUrl(url);
      
      let analysisResult = {
        url,
        description: '',
        objects: [],
        hasText: false,
        confidence: 0,
        metadata: {}
      };
      
      try {
        // Perform object detection and enhanced analysis
        if (options.enableObjectDetection) {
          const objectResults = await this.detectObjectsEnhanced(tempImagePath);
          analysisResult.objects = objectResults.objects || [];
          analysisResult.hasText = !!(objectResults.text && objectResults.text.length > 0);
          analysisResult.metadata.objectAnalysis = objectResults;
        }
        
        // Generate detailed image description
        if (options.enableImageDescription) {
          const descriptionResult = await this.generateImageDescriptionFromPath(
            tempImagePath, 
            analysisResult.metadata.objectAnalysis
          );
          analysisResult.description = descriptionResult.description;
          analysisResult.confidence = descriptionResult.confidence;
        }
        
        if (this.enableLogging) {
          console.log('✅ Image analysis completed:', {
            url,
            descriptionLength: analysisResult.description.length,
            objectsDetected: analysisResult.objects.length,
            hasText: analysisResult.hasText
          });
        }
        
      } finally {
        // Clean up temporary file
        const fs = require('fs');
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }
      
      return analysisResult;
      
    } catch (error) {
      console.error('❌ Image analysis from URL failed:', error);
      throw error;
    }
  }

  /**
   * Download image from URL to temporary file
   * 
   * @param {string} url - Image URL to download
   * @returns {Promise<string>} - Path to downloaded image file
   */
  async downloadImageFromUrl(url) {
    const https = require('https');
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    const { v4: uuidv4 } = require('uuid');
    
    return new Promise((resolve, reject) => {
      const tempFileName = `temp_image_${uuidv4()}.jpg`;
      const tempFilePath = path.join(this.config.tempDir, tempFileName);
      
      // Ensure temp directory exists
      if (!fs.existsSync(this.config.tempDir)) {
        fs.mkdirSync(this.config.tempDir, { recursive: true });
      }
      
      const client = url.startsWith('https') ? https : http;
      
      const request = client.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(tempFilePath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve(tempFilePath);
        });
        
        fileStream.on('error', (error) => {
          fs.unlink(tempFilePath, () => {}); // Clean up on error
          reject(error);
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.setTimeout(30000, () => {
        request.abort();
        reject(new Error('Image download timeout'));
      });
    });
  }

  /**
   * Generate detailed image description from file path
   * Uses the existing generateImageDescription logic adapted for the service
   * 
   * @param {string} imagePath - Path to image file
   * @param {Object} objectResults - Object detection results
   * @returns {Promise<Object>} - Image description result
   */
  async generateImageDescriptionFromPath(imagePath, objectResults) {
    try {
      if (!this.openai) {
        return {
          description: 'Image description generation not available (OpenAI API not configured).',
          confidence: 0.5,
          provider: 'Error'
        };
      }
      
      // Prepare context from object detection results
      let context = '';
      
      if (objectResults && objectResults.objects && objectResults.objects.length > 0) {
        const objectList = objectResults.objects
          .map(obj => `${obj.name} (${(obj.confidence * 100).toFixed(1)}% confidence)`)
          .join(', ');
        context += `Detected objects: ${objectList}\n`;
      }
      
      if (objectResults && objectResults.labels && objectResults.labels.length > 0) {
        const labelList = objectResults.labels
          .map(label => `${label.description} (${(label.confidence * 100).toFixed(1)}% confidence)`)
          .join(', ');
        context += `Detected labels: ${labelList}\n`;
      }
      
      if (objectResults && objectResults.text) {
        context += `Text found in image: "${objectResults.text}"\n`;
      }
      
      // Create prompt for detailed description
      const prompt = `Analyze this image and provide a detailed, natural description of what you see. 

Context from AI analysis:
${context}

Please provide a comprehensive description that includes:
1. What objects, people, or scenes are visible
2. The setting, environment, or background
3. Any text, signs, or written content
4. The overall mood, style, or atmosphere
5. Colors, lighting, and visual composition
6. Any notable details or interesting elements

Write the description in a natural, engaging way that someone would use to describe the image to another person. Be specific and descriptive, but avoid being overly technical.

Respond with just the description, no additional formatting or labels.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert image analyst. Provide detailed, natural descriptions of images based on AI analysis results.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const description = response.choices[0].message.content.trim();
      
      return {
        description: description,
        confidence: objectResults ? 
          (objectResults.objects?.reduce((sum, obj) => sum + obj.confidence, 0) / Math.max(objectResults.objects?.length || 1, 1)) : 0.8,
        provider: 'AI Image Description (OpenAI GPT-4)',
        analysisContext: {
          objectsDetected: objectResults?.objects?.length || 0,
          labelsDetected: objectResults?.labels?.length || 0,
          textDetected: objectResults?.text ? true : false
        }
      };
      
    } catch (error) {
      console.error('❌ Image description generation error:', error);
      return {
        description: 'Unable to generate detailed description due to an error.',
        confidence: 0.5,
        provider: 'Error',
        analysisContext: {
          objectsDetected: 0,
          labelsDetected: 0,
          textDetected: false
        }
      };
    }
  }

  /**
   * Enhanced object detection for images
   * Uses Google Vision API to detect objects, labels, and text
   * 
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} - Enhanced detection results
   */
  async detectObjectsEnhanced(imagePath) {
    try {
      if (!this.visionClient) {
        // Fallback to basic object detection if Vision client not available
        return await this.detectObjects(imagePath);
      }

      const [objectResult, labelResult, textResult] = await Promise.all([
        this.visionClient.objectLocalization(imagePath),
        this.visionClient.labelDetection(imagePath),
        this.visionClient.textDetection(imagePath)
      ]);

      const objects = objectResult[0].localizedObjectAnnotations || [];
      const labels = labelResult[0].labelAnnotations || [];
      const textAnnotations = textResult[0].textAnnotations || [];

      // Extract full text if available
      const fullText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

      return {
        objects: objects.map(obj => ({
          name: obj.name,
          confidence: obj.score,
          boundingBox: obj.boundingPoly
        })),
        labels: labels.map(label => ({
          description: label.description,
          confidence: label.score
        })),
        text: fullText,
        textAnnotations: textAnnotations.slice(1), // Skip the first one which is the full text
        averageConfidence: objects.length > 0 ? 
          objects.reduce((sum, obj) => sum + obj.score, 0) / objects.length : 0
      };

    } catch (error) {
      console.error('❌ Enhanced object detection failed:', error);
      // Fallback to basic detection
      return await this.detectObjects(imagePath);
    }
  }

  /**
   * Update content record with analysis results
   * @param {string} contentId - Content ID
   * @param {Object} results - Analysis results
   */
  async updateContentRecord(contentId, results) {
    try {
      const updateData = {};
      
      // Update metadata
      if (results.metadata) {
        updateData.metadata = results.metadata;
      }
      
      // Update transcription
      if (results.transcription) {
        updateData.transcription = results.transcription;
      }
      
      // Update summary
      if (results.summary) {
        updateData.summary = results.summary;
      }
      
      // Update sentiment
      if (results.sentiment) {
        updateData.sentiment = results.sentiment;
      }
      
      // Update auto tags
      if (results.auto_tags && results.auto_tags.length > 0) {
        updateData.auto_tags = results.auto_tags;
      }
      
      // Update content record
      await Content.update(updateData, {
        where: { id: contentId }
      });
      
      if (this.enableLogging) {
        console.log('✅ Content record updated:', contentId);
      }
      
    } catch (error) {
      console.error('❌ Failed to update content record:', error);
    }
  }
}

module.exports = MultimediaAnalyzer; 