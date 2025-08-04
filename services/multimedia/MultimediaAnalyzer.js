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

      // Generate comprehensive summary using visual + audio + OCR data
      if (analysisOptions.enableSummarization) {
        results.summary = await this.generateComprehensiveSummary(results);
      }

      // Perform sentiment analysis
      if (analysisOptions.enableSentimentAnalysis && results.transcription) {
        results.sentiment = await this.analyzeSentiment(results.transcription);
      }

      // Generate tags and category
      results.tags = await this.generateTags(results);
      results.category = await this.generateCategory(results);

      // Generate title based on summary/content (enhanced for all media types)
      if (this.openai && (results.summary || results.transcription)) {
        results.generatedTitle = await this.generateTitle(results);
      }

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
      enableObjectDetection: true,
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
        
        // Platform tags will be intelligently added later by the AI tag generation system
        // This ensures content-based tags take priority over generic platform terms
        
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
              
              // Generate comprehensive summary using visual + audio + OCR data
              if (analysisOptions.enableSummarization) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateComprehensiveSummary(results);
                
                if (results.summary && user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.summary(user_id, content_id, results.summary.length, results.transcription?.length || 0);
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
        }
        
        // For YouTube URLs, generate thumbnails
        if ((url.includes('youtube.com') || url.includes('youtu.be')) && analysisOptions.thumbnails) {
          try {
            // Log thumbnail generation start
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'thumbnail_generation_start', 60, {
                provider: 'youtube_direct'
              });
            }
            
            // Generate YouTube thumbnails
            const youtubeThumbnails = await this.generateYouTubeThumbnails(url, user_id, content_id);
            
            if (youtubeThumbnails && youtubeThumbnails.length > 0) {
              results.thumbnails = youtubeThumbnails;
              
              // Log thumbnail success
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'thumbnail_generation_complete', 70, {
                  thumbnailCount: youtubeThumbnails.length
                });
              }
              
              if (this.enableLogging) {
                console.log('✅ YouTube thumbnails generated:', {
                  count: youtubeThumbnails.length
                });
              }
            }
          } catch (thumbnailError) {
            console.error('❌ YouTube thumbnail generation failed:', thumbnailError);
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, thumbnailError, {
                step: 'thumbnail_generation',
                url
              });
            }
          }
        } else if (url.includes('instagram.com') && analysisOptions.transcription) {
          // For Instagram URLs, attempt to download and analyze content using yt-dlp
          try {
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'instagram_download_start', 30, {
                provider: 'yt-dlp'
              });
            }
            
            // Try to download Instagram content via yt-dlp
            const instagramResult = await this.getInstagramContent(url);
            
            if (instagramResult && instagramResult.success) {
              // Process downloaded content based on type
              if (instagramResult.type === 'video' && instagramResult.filePath) {
                // Extract audio and transcribe for videos
                const transcriptionResult = await this.transcribeVideoFile(instagramResult.filePath);
                if (transcriptionResult && transcriptionResult.text) {
                  results.transcription = transcriptionResult.text;
                  const wordCount = transcriptionResult.text.split(' ').length;
                  
                  if (user_id && content_id) {
                    const logger = require('../../config/logger');
                    logger.multimedia.transcription(user_id, content_id, 'instagram_video', wordCount);
                    logger.multimedia.progress(user_id, content_id, 'transcription_complete', 50, {
                      wordCount,
                      transcriptionLength: transcriptionResult.text.length
                    });
                  }
                }
                
                // Add video-specific tags
                results.auto_tags.push('video', 'reel');
              } else if (instagramResult.type === 'image' && instagramResult.filePath) {
                // Analyze downloaded image
                const imageAnalysisResult = await this.analyzeImage(user_id, instagramResult.filePath, results, {
                  enableObjectDetection: true,
                  enableImageDescription: true,
                  enableOCRExtraction: true
                });
                
                if (imageAnalysisResult && imageAnalysisResult.description) {
                  results.transcription = imageAnalysisResult.description;
                  results.auto_tags.push('image', 'post');
                  
                  if (user_id && content_id) {
                    const logger = require('../../config/logger');
                    logger.multimedia.progress(user_id, content_id, 'image_analysis_complete', 50, {
                      description_length: results.transcription.length,
                      objects_detected: imageAnalysisResult.objects?.length || 0
                    });
                  }
                }
              }
              
              // Generate summary and perform sentiment analysis if we have content
              if (analysisOptions.enableSummarization) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateComprehensiveSummary(results);
              }
              
              if (analysisOptions.enableSentimentAnalysis && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'sentiment_analysis', 70);
                }
                
                results.sentiment = await this.analyzeSentiment(results.transcription);
              }
              
              // Clean up downloaded file
              if (instagramResult.filePath && require('fs').existsSync(instagramResult.filePath)) {
                require('fs').unlinkSync(instagramResult.filePath);
              }
              
              if (this.enableLogging) {
                console.log('✅ Instagram content analysis completed:', {
                  type: instagramResult.type,
                  contentLength: results.transcription.length
                });
              }
            } else {
              // Fallback if download failed
              results.transcription = 'Instagram content could not be accessed. Content may be private or protected.';
              results.auto_tags.push('private', 'access_restricted');
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'instagram_access_failed', 40, {
                  reason: 'download_failed_or_private'
                });
              }
            }
          } catch (instagramError) {
            console.error('❌ Instagram content analysis failed:', instagramError);
            results.transcription = 'Instagram content analysis failed. This may be due to privacy settings or access restrictions.';
            results.auto_tags.push('analysis_failed', 'access_error');
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, instagramError, {
                step: 'instagram_analysis',
                url
              });
            }
          }
        } else if (url.includes('pinterest.com') && this.isImageUrl(url)) {
          // For Pinterest URLs, attempt to download and analyze image content using yt-dlp
          try {
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'pinterest_download_start', 30, {
                provider: 'yt-dlp'
              });
            }
            
            // Try to download Pinterest content via yt-dlp
            const pinterestResult = await this.getPinterestContent(url);
            
            if (pinterestResult && pinterestResult.success) {
              // Process downloaded image content
              if (pinterestResult.type === 'image' && pinterestResult.filePath) {
                // Analyze the downloaded Pinterest image
                const imageAnalysisResult = await this.analyzeImageFromUrl(pinterestResult.filePath, {
                  enableObjectDetection: true,
                  enableImageDescription: true,
                  enableOCRExtraction: true
                });
                
                if (imageAnalysisResult && imageAnalysisResult.description) {
                  results.transcription = imageAnalysisResult.description;
                  results.auto_tags.push('image', 'pinterest', 'visual_content');
                  
                  // Add object-based tags if detected
                  if (imageAnalysisResult.objects && imageAnalysisResult.objects.length > 0) {
                    const objectNames = imageAnalysisResult.objects.map(obj => obj.name.toLowerCase());
                    results.auto_tags.push(...objectNames.slice(0, 5)); // Limit to 5 object tags
                  }
                  
                  if (user_id && content_id) {
                    const logger = require('../../config/logger');
                    logger.multimedia.progress(user_id, content_id, 'pinterest_analysis_complete', 70, {
                      descriptionLength: imageAnalysisResult.description.length,
                      objectsDetected: imageAnalysisResult.objects ? imageAnalysisResult.objects.length : 0
                    });
                  }
                }
                
                // Clean up downloaded file
                if (pinterestResult.filePath && require('fs').existsSync(pinterestResult.filePath)) {
                  require('fs').unlinkSync(pinterestResult.filePath);
                }
                
                if (this.enableLogging) {
                  console.log('✅ Pinterest image analysis completed:', {
                    type: pinterestResult.type,
                    descriptionLength: results.transcription ? results.transcription.length : 0
                  });
                }
              }
            } else {
              // Fallback if download failed
              results.transcription = 'Pinterest content could not be accessed. Content may be private or protected.';
              results.auto_tags.push('private', 'access_restricted', 'pinterest');
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'pinterest_access_failed', 40, {
                  reason: 'download_failed_or_private'
                });
              }
            }
          } catch (pinterestError) {
            console.error('❌ Pinterest content analysis failed:', pinterestError);
            results.transcription = 'Pinterest content analysis failed. This may be due to privacy settings or access restrictions.';
            results.auto_tags.push('analysis_failed', 'access_error', 'pinterest');
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, pinterestError, {
                step: 'pinterest_analysis',
                url
              });
            }
          }
        } else if (url.includes('facebook.com') && analysisOptions.transcription) {
          // For Facebook URLs, attempt to download and analyze content using yt-dlp
          try {
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'facebook_download_start', 30, {
                provider: 'yt-dlp'
              });
            }
            
            // Try to download Facebook content via yt-dlp
            const facebookResult = await this.getFacebookContent(url);
            
            if (facebookResult && facebookResult.success) {
              // Process downloaded content based on type
              if (facebookResult.type === 'video' && facebookResult.filePath) {
                // Extract audio and transcribe for videos
                const transcriptionResult = await this.transcribeVideoFile(facebookResult.filePath);
                if (transcriptionResult && transcriptionResult.text) {
                  results.transcription = transcriptionResult.text;
                  const wordCount = transcriptionResult.text.split(' ').length;
                  
                  if (user_id && content_id) {
                    const logger = require('../../config/logger');
                    logger.multimedia.transcription(user_id, content_id, 'facebook_video', wordCount);
                    logger.multimedia.progress(user_id, content_id, 'transcription_complete', 50, {
                      wordCount,
                      transcriptionLength: transcriptionResult.text.length
                    });
                  }
                }
                
                // Add video-specific tags
                results.auto_tags.push('video', 'social_media');
                
                // Enhanced object, label, and text detection
                if (analysisOptions.enableObjectDetection && facebookResult.filePath) {
                  try {
                    if (user_id && content_id) {
                      const logger = require('../../config/logger');
                      logger.multimedia.progress(user_id, content_id, 'enhanced_detection_start', 35);
                    }
                    
                    console.log(`🔍 Extracting frame for enhanced detection from Facebook video: ${facebookResult.filePath}`);
                    const framePath = await this.extractVideoFrame(facebookResult.filePath);
                    
                    console.log(`🤖 Running enhanced detection (objects + labels + text) on frame: ${framePath}`);
                    
                    // Use enhanced detection with lower confidence threshold
                    const enhancedResults = await this.detectObjectsEnhanced(framePath);
                    
                    // Store comprehensive results
                    results.objects = enhancedResults.objects || [];
                    results.labels = enhancedResults.labels || [];
                    results.detectedText = enhancedResults.text || '';
                    results.textAnnotations = enhancedResults.textAnnotations || [];
                    
                    // Log detailed results
                    console.log(`🎯 Enhanced Detection Results for Facebook video:`);
                    console.log(`   📦 Objects: ${results.objects.length}`);
                    console.log(`   🏷️  Labels: ${results.labels.length}`);
                    console.log(`   📝 Text detected: ${results.detectedText.length > 0 ? 'Yes (' + results.detectedText.length + ' chars)' : 'No'}`);
                    
                    if (results.objects.length > 0) {
                      console.log(`🔍 Objects found:`, results.objects.map(obj => `${obj.name} (${(obj.confidence * 100).toFixed(1)}%)`).join(', '));
                    }
                    if (results.labels.length > 0) {
                      const topLabels = results.labels.slice(0, 8).map(label => `${label.description} (${(label.confidence * 100).toFixed(1)}%)`);
                      console.log(`🏷️ Top labels:`, topLabels.join(', '));
                    }
                    if (results.detectedText) {
                      console.log(`📝 Text content preview:`, results.detectedText.substring(0, 100) + (results.detectedText.length > 100 ? '...' : ''));
                    }
                    
                    // Clean up temporary frame
                    if (require('fs').existsSync(framePath)) {
                      require('fs').unlinkSync(framePath);
                    }
                    
                    if (user_id && content_id) {
                      const logger = require('../../config/logger');
                      logger.multimedia.progress(user_id, content_id, 'enhanced_detection_complete', 40, {
                        objectsDetected: results.objects ? results.objects.length : 0,
                        labelsDetected: results.labels ? results.labels.length : 0,
                        textDetected: results.detectedText ? results.detectedText.length : 0
                      });
                    }
                  } catch (objectDetectionError) {
                    console.error('❌ Enhanced detection failed for Facebook video:', objectDetectionError);
                    results.objects = []; // Ensure we have an empty array
                    results.labels = [];
                    results.detectedText = '';
                  }
                }
                
                // Generate thumbnails for Facebook video
                if (analysisOptions.thumbnails && facebookResult.filePath) {
                  try {
                    if (user_id && content_id) {
                      const logger = require('../../config/logger');
                      logger.multimedia.progress(user_id, content_id, 'thumbnail_generation', 45);
                    }
                    
                    console.log(`🖼️ Generating thumbnails for Facebook video: ${facebookResult.filePath}`);
                    const thumbnailResults = await this.generateVideoThumbnails(
                      user_id || 'unknown',
                      facebookResult.filePath,
                      {
                        contentId: content_id,
                        thumbnailSize: 300,
                        keyMomentsCount: 3,
                        keyMomentsSize: 200
                      }
                    );
                    
                    if (thumbnailResults && thumbnailResults.length > 0) {
                      results.thumbnails = thumbnailResults;
                      console.log(`✅ Generated ${thumbnailResults.length} thumbnails for Facebook video`);
                    }
                  } catch (thumbnailError) {
                    console.error('❌ Failed to generate thumbnails for Facebook video:', thumbnailError);
                  }
                }
              } else if (facebookResult.type === 'image' && facebookResult.filePath) {
                // Analyze downloaded image
                const imageAnalysisResult = await this.analyzeImage(user_id, facebookResult.filePath, results, {
                  enableObjectDetection: true,
                  enableImageDescription: true,
                  enableOCRExtraction: true
                });
                
                if (imageAnalysisResult && imageAnalysisResult.description) {
                  results.transcription = imageAnalysisResult.description;
                  results.auto_tags.push('image', 'post');
                  
                  if (user_id && content_id) {
                    const logger = require('../../config/logger');
                    logger.multimedia.progress(user_id, content_id, 'image_analysis_complete', 50, {
                      description_length: results.transcription.length,
                      objects_detected: imageAnalysisResult.objects?.length || 0
                    });
                  }
                }
                
                // Generate thumbnails for Facebook image
                if (analysisOptions.thumbnails && facebookResult.filePath) {
                  try {
                    console.log(`🖼️ Generating thumbnails for Facebook image: ${facebookResult.filePath}`);
                    const thumbnailResults = await this.generateImageThumbnails(
                      user_id || 'unknown',
                      facebookResult.filePath,
                      {
                        contentId: content_id,
                        sizes: [150, 300, 500],
                        quality: 'medium'
                      }
                    );
                    
                    if (thumbnailResults && thumbnailResults.length > 0) {
                      results.thumbnails = thumbnailResults;
                      console.log(`✅ Generated ${thumbnailResults.length} thumbnails for Facebook image`);
                    }
                  } catch (thumbnailError) {
                    console.error('❌ Failed to generate thumbnails for Facebook image:', thumbnailError);
                  }
                }
              }
              
              // Generate summary and perform sentiment analysis if we have content
              if (analysisOptions.enableSummarization) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateComprehensiveSummary(results);
              }
              
              if (analysisOptions.enableSentimentAnalysis && results.transcription) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'sentiment_analysis', 70);
                }
                
                results.sentiment = await this.analyzeSentiment(results.transcription);
              }
              
              // Clean up downloaded file
              if (facebookResult.filePath && require('fs').existsSync(facebookResult.filePath)) {
                require('fs').unlinkSync(facebookResult.filePath);
              }
              
              if (this.enableLogging) {
                console.log('✅ Facebook content analysis completed:', {
                  type: facebookResult.type,
                  contentLength: results.transcription.length
                });
              }
            } else {
              // Fallback if download failed
              results.transcription = 'Facebook content could not be accessed. Content may be private or protected.';
              results.auto_tags.push('private', 'access_restricted');
              
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'facebook_access_failed', 40, {
                  reason: 'download_failed_or_private'
                });
              }
            }
          } catch (facebookError) {
            console.error('❌ Facebook content analysis failed:', facebookError);
            results.transcription = 'Facebook content analysis failed. This may be due to privacy settings or access restrictions.';
            results.auto_tags.push('analysis_failed', 'access_error');
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.error(user_id, content_id, facebookError, {
                step: 'facebook_analysis',
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
              if (analysisOptions.enableSummarization) {
                if (user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
                }
                
                results.summary = await this.generateComprehensiveSummary(results);
                
                if (results.summary && user_id && content_id) {
                  const logger = require('../../config/logger');
                  logger.multimedia.summary(user_id, content_id, results.summary.length, results.transcription?.length || 0);
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

        // Generate title based on summary/content
        if (this.openai && (results.summary || results.transcription)) {
          results.generatedTitle = await this.generateTitle(results);
        }
      } else {
        // For non-multimedia URLs, perform comprehensive web content analysis
        if (user_id && content_id) {
          const logger = require('../../config/logger');
          logger.multimedia.progress(user_id, content_id, 'web_content_detected', 20, {
            isMultimedia: false,
            contentType: 'web_article'
          });
        }
        
        try {
          console.log('🌐 Processing web content with enhanced analysis...');
          
          // Extract web content using curl
          if (user_id && content_id) {
            const logger = require('../../config/logger');
            logger.multimedia.progress(user_id, content_id, 'web_extraction_start', 30);
          }
          
          const webContent = await this.extractWebContent(url);
          
          if (webContent && webContent.content && webContent.content.length > 100) {
            // Create comprehensive content for analysis
            const contentForAnalysis = [
              webContent.title ? `Title: ${webContent.title}` : '',
              webContent.description ? `Description: ${webContent.description}` : '',
              `Content: ${webContent.content}`
            ].filter(Boolean).join('\n\n');
            
            // Set transcription to extracted content for further processing
            results.transcription = contentForAnalysis;
            results.metadata.extractedTitle = webContent.title;
            results.metadata.extractedDescription = webContent.description;
            results.metadata.contentLength = webContent.fullLength;
            
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'web_extraction_complete', 40, {
                contentLength: webContent.fullLength,
                extractedTitle: !!webContent.title
              });
            }
            
            // Generate comprehensive summary
            if (analysisOptions.enableSummarization) {
              if (user_id && content_id) {
                const logger = require('../../config/logger');
                logger.multimedia.progress(user_id, content_id, 'summary_generation', 60);
              }
              
              const mockResults = {
                transcription: contentForAnalysis,
                objects: [],
                labels: [],
                detectedText: `${webContent.title || ''} ${webContent.description || ''}`.trim(),
                textAnnotations: []
              };
              
              results.summary = await this.generateComprehensiveSummary(mockResults);
            }
            
            // Generate AI tags and metadata
            if (user_id && content_id) {
              const logger = require('../../config/logger');
              logger.multimedia.progress(user_id, content_id, 'generating_metadata', 90);
            }
            
            // Generate AI tags
            results.auto_tags = await this.generateAITags({
              transcription: contentForAnalysis,
              summary: results.summary,
              objects: [],
              labels: [],
              detectedText: mockResults.detectedText
            });
            
            // Generate AI category  
            results.category = await this.generateAICategory({
              transcription: contentForAnalysis,
              summary: results.summary
            });
            
            // Generate AI title
            results.generated_title = await this.generateTitle({
              transcription: contentForAnalysis,
              summary: results.summary
            });
            
            console.log(`✅ Web content analysis completed: ${results.summary?.length || 0} char summary, ${results.auto_tags?.length || 0} tags`);
            
          } else {
            results.transcription = 'Unable to extract sufficient content from web page.';
            console.log('⚠️ Insufficient web content extracted for analysis');
          }
          
        } catch (webError) {
          console.error('❌ Web content analysis failed:', webError.message);
          results.transcription = 'Web content extraction failed.';
          
          if (user_id && content_id) {
            const logger = require('../../config/logger');
            logger.multimedia.progress(user_id, content_id, 'web_extraction_failed', 100, {
              error: webError.message
            });
          }
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

      // ✨ Generate sophisticated AI title for images (matching video approach)
      if (this.openai && (results.description || results.transcription)) {
        try {
          if (this.enableLogging) {
            console.log('🎯 Generating sophisticated AI title for image');
          }
          
          // Create context for title generation
          const titleContext = {
            summary: results.description || results.transcription,
            transcription: results.transcription || results.description,
            objects: results.objects,
            ocrText: results.ocrText,
            platform: 'image_upload',
            metadata: {
              fileCategory: 'image'
            }
          };
          
          results.generatedTitle = await this.generateTitle(titleContext);
          
          if (this.enableLogging) {
            console.log(`🎯 Generated sophisticated title: "${results.generatedTitle}"`);
          }
        } catch (titleError) {
          if (this.enableLogging) {
            console.error('❌ Image title generation failed:', titleError);
          }
          results.generatedTitle = this.getFallbackImageTitle(results);
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
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Array of detected objects
   */
  async detectObjects(imagePath, options = {}) {
    try {
      const confidenceThreshold = options.confidenceThreshold || 0.3; // Lower threshold for more detections
      
      // Try Google Vision API first
      if (this.visionClient && this.googleApiKey) {
        if (this.enableLogging) {
          console.log('🔍 Detecting objects using Google Vision API');
        }

        const [result] = await this.visionClient.objectLocalization(imagePath);
        const objects = result.localizedObjectAnnotations || [];

        // Apply confidence filtering
        const filteredObjects = objects
          .filter(object => object.score >= confidenceThreshold)
          .map(object => ({
            name: object.name,
            confidence: object.score,
            boundingBox: object.boundingPoly.normalizedVertices,
            provider: 'google'
          }));

        if (this.enableLogging) {
          console.log(`🔍 Google Vision: ${objects.length} raw objects, ${filteredObjects.length} above ${confidenceThreshold} confidence`);
        }

        return filteredObjects;
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
    
    // Document types
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/rtf',
      'application/rtf'
    ];
    
    if (documentTypes.includes(mimeType)) return 'document';
    
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
   * Generate comprehensive summary using visual + audio + OCR data
   * @param {Object} results - Complete analysis results with objects, labels, transcription, OCR, etc.
   * @returns {Promise<string>} Comprehensive summary text
   */
  async generateComprehensiveSummary(results) {
    try {
      if (!this.openai) return '';

      // Debug: Log the actual data structure being passed
      if (this.enableLogging) {
        console.log('🐛 DEBUG: generateComprehensiveSummary called with results structure:');
        console.log('   Results keys:', Object.keys(results || {}));
        console.log('   Objects available:', !!(results && results.objects));
        console.log('   Labels available:', !!(results && results.labels)); 
        console.log('   DetectedText available:', !!(results && results.detectedText));
        console.log('   Transcription available:', !!(results && results.transcription));
      }

      // Build comprehensive content context from all available data
      let contextData = '';
      let hasVisualData = false;
      let hasAudioData = false;
      let hasTextData = false;

      // Add visual context (objects and labels)
      if (results.objects && results.objects.length > 0) {
        const topObjects = results.objects.slice(0, 8).map(obj => `${obj.name} (${(obj.confidence * 100).toFixed(0)}%)`);
        contextData += `Visual Objects Detected: ${topObjects.join(', ')}\n`;
        hasVisualData = true;
      }

      if (results.labels && results.labels.length > 0) {
        const topLabels = results.labels.slice(0, 10).map(label => `${label.description} (${(label.confidence * 100).toFixed(0)}%)`);
        contextData += `Scene/Context Labels: ${topLabels.join(', ')}\n`;
        hasVisualData = true;
      }

      // Add detected text from OCR
      if (results.detectedText && results.detectedText.trim()) {
        const textPreview = results.detectedText.trim().substring(0, 300);
        contextData += `Text Visible in Content: "${textPreview}${results.detectedText.length > 300 ? '...' : ''}"\n`;
        hasTextData = true;
      }

      // Add audio transcription
      if (results.transcription && results.transcription.trim()) {
        const transcriptPreview = results.transcription.trim().substring(0, 500);
        contextData += `Audio/Speech Content: "${transcriptPreview}${results.transcription.length > 500 ? '...' : ''}"\n`;
        hasAudioData = true;
      }

      // If no content available, return empty
      if (!contextData.trim()) {
        if (this.enableLogging) {
          console.log('⚠️ No content available for comprehensive summary generation');
        }
        return '';
      }

      // Log what data we're using
      if (this.enableLogging) {
        console.log(`🤖 Generating comprehensive summary using:`, {
          hasVisualData,
          hasAudioData,
          hasTextData,
          objects: results.objects?.length || 0,
          labels: results.labels?.length || 0,
          detectedTextLength: results.detectedText?.length || 0,
          transcriptionLength: results.transcription?.length || 0
        });
      }

      const prompt = `Analyze this multimedia content and create a comprehensive summary that describes what the content is about.

MULTI-MODAL CONTENT DATA:
${contextData}

INSTRUCTIONS:
• Create a summary that describes the main subject, activity, or content theme
• Combine visual elements (objects/scenes) with any audio content for complete understanding
• Focus on what's actually happening or being shown/discussed
• If audio is minimal (like "thanks for watching"), prioritize visual content
• If no audio exists, create summary entirely from visual elements
• Be specific about activities, settings, objects, and context
• Keep summary concise but informative (max 250 words)

Create a summary that accurately describes what this content contains:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing multimedia content using both visual and audio information. Create accurate, descriptive summaries that capture the essence of what the content is about by combining all available data sources.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400, // Room for comprehensive summaries
        temperature: 0.3
      });

      const summary = response.choices[0].message.content.trim();
      
      if (this.enableLogging && summary) {
        console.log(`✅ Comprehensive summary generated: ${summary.length} chars (visual: ${hasVisualData}, audio: ${hasAudioData}, text: ${hasTextData})`);
      }

      return summary;
    } catch (error) {
      console.error('❌ Comprehensive summary generation failed:', error);
      
      // Fallback to basic summary if available
      if (results.transcription) {
        return await this.generateSummary(results.transcription);
      }
      
      return '';
    }
  }

  /**
   * Generate summary using OpenAI with rate limit handling (legacy method)
   * @param {string} text - Text to summarize
   * @returns {Promise<string>} Summary text
   */
  async generateSummary(text) {
    try {
      if (!this.openai || !text) return '';

      // Handle large transcriptions that might exceed token limits
      // Approximate: 1 token ≈ 4 characters for English text
      const estimatedTokens = Math.ceil(text.length / 4);
      const maxInputTokens = 8000; // Leave room for system prompt and response tokens
      
      let processedText = text;
      let truncated = false;
      
      if (estimatedTokens > maxInputTokens) {
        // Truncate text to fit within token limits
        const maxChars = maxInputTokens * 4;
        processedText = text.substring(0, maxChars);
        truncated = true;
        
        console.log(`⚠️ Transcription truncated for summary generation: ${text.length} → ${processedText.length} chars`);
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // More efficient model with higher rate limits
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that creates concise summaries of multimedia content. Focus on the main topics, key points, and important takeaways.'
          },
          {
            role: 'user',
            content: `Please create a comprehensive summary of the following content${truncated ? ' (note: this is a portion of a longer transcription)' : ''}:\n\n${processedText}`
          }
        ],
        max_tokens: 300, // Increased for better summaries
        temperature: 0.3
      });

      const summary = response.choices[0].message.content.trim();
      
      if (this.enableLogging && summary) {
        console.log(`✅ Summary generated: ${summary.length} chars${truncated ? ' (from truncated text)' : ''}`);
      }

      return summary;
    } catch (error) {
      console.error('❌ Summary generation failed:', error.message);
      
      // If it's a rate limit error, provide more specific logging
      if (error.code === 'rate_limit_exceeded') {
        console.error('🚫 Rate limit exceeded - consider upgrading OpenAI plan or reducing content length');
      }
      
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
   * Generate tags based on analysis results using AI-powered analysis
   * 
   * @param {Object} results - Analysis results
   * @returns {Promise<Array>} Array of generated tags
   */
  async generateTags(results) {
    console.log('🏷️ Starting AI-powered tag generation with results:', {
      hasSummary: !!results.summary,
      hasTranscription: !!results.transcription,
      summaryLength: results.summary ? results.summary.length : 0,
      transcriptionLength: results.transcription ? results.transcription.length : 0,
      platform: results.platform
    });

    // Start with AI-powered tags first (prioritize intelligent content analysis)
    let aiTags = [];
    let fallbackTags = [];
    
    // Try AI-powered tag generation first - this should be the primary source
    if (this.openai && (results.summary || results.transcription)) {
      try {
        aiTags = await this.generateAITags(results);
        if (aiTags && aiTags.length > 0) {
          console.log(`🤖 Generated ${aiTags.length} AI tags:`, aiTags);
        }
      } catch (error) {
        console.error('❌ AI tag generation failed, falling back to basic tags:', error);
      }
    }
    
    // Only add basic fallback tags if AI failed or no meaningful content available
    if (aiTags.length === 0) {
      console.log('⚠️ No AI tags generated, using fallback content analysis');
      
      // Enhanced content analysis fallback
      if (results.transcription && results.transcription.length > 50) {
        const text = results.transcription.toLowerCase();
        
        // Topic-based tags with enhanced detection
        if (text.includes('music') || text.includes('song') || text.includes('melody') || text.includes('audio')) {
          fallbackTags.push('music');
        }
        if (text.includes('education') || text.includes('learn') || text.includes('tutorial') || text.includes('how to')) {
          fallbackTags.push('educational');
        }
        if (text.includes('news') || text.includes('report') || text.includes('breaking')) {
          fallbackTags.push('news');
        }
        if (text.includes('game') || text.includes('gaming') || text.includes('play')) {
          fallbackTags.push('gaming');
        }
        if (text.includes('review') || text.includes('opinion') || text.includes('rating')) {
          fallbackTags.push('review');
        }
        if (text.includes('interview') || text.includes('conversation') || text.includes('discussion')) {
          fallbackTags.push('interview');
        }
        if (text.includes('funny') || text.includes('comedy') || text.includes('humor') || text.includes('laugh')) {
          fallbackTags.push('comedy', 'entertainment');
        }
        if (text.includes('sport') || text.includes('game') || text.includes('match') || text.includes('team')) {
          fallbackTags.push('sports');
        }
        if (text.includes('cooking') || text.includes('recipe') || text.includes('food')) {
          fallbackTags.push('cooking', 'food');
        }
        if (text.includes('technology') || text.includes('tech') || text.includes('software') || text.includes('programming')) {
          fallbackTags.push('technology');
        }
      }
      
      // Add sentiment-based tags
      if (results.sentiment) {
        if (results.sentiment.sentiment === 'positive' || results.sentiment.label === 'positive') {
          fallbackTags.push('positive');
        } else if (results.sentiment.sentiment === 'negative' || results.sentiment.label === 'negative') {
          fallbackTags.push('negative');
        }
      }
      
      // Add speaker-based tags
      if (results.speakers && results.speakers.length > 1) {
        fallbackTags.push('conversation', 'multiple-speakers');
      } else if (results.speakers && results.speakers.length === 1) {
        fallbackTags.push('monologue', 'single-speaker');
      }
    }
    
    // Combine AI tags with fallback tags (prioritize AI tags)
    const contentBasedTags = aiTags.length > 0 ? aiTags : fallbackTags;
    
    // Add minimal platform context tags only if we have meaningful content tags
    const platformTags = [];
    if (contentBasedTags.length > 0) {
      // Only add platform tag if it adds value and isn't redundant
      if (results.platform && !contentBasedTags.includes(results.platform.toLowerCase())) {
        platformTags.push(results.platform.toLowerCase());
      }
      
      // Add media type only if it's not obvious from content tags
      const hasMediaType = contentBasedTags.some(tag => 
        ['video', 'audio', 'image', 'visual', 'music'].includes(tag)
      );
      if (!hasMediaType) {
        if (results.metadata?.fileCategory === 'video') {
          platformTags.push('video');
        } else if (results.metadata?.fileCategory === 'audio') {
          platformTags.push('audio');
        } else if (results.metadata?.fileCategory === 'image') {
          platformTags.push('image');
        }
      }
    } else {
      // If we have no content tags, fall back to basic platform tags
      console.log('⚠️ No content-based tags available, using basic platform tags');
      const basicTags = [...(results.auto_tags || [])];
      
      if (results.platform) {
        basicTags.push(results.platform.toLowerCase());
      }
      
      // Add content type tags
      if (results.url && results.url.includes('youtube.com') || results.url && results.url.includes('youtu.be')) {
        basicTags.push('video', 'youtube');
      } else if (results.url && (results.url.includes('soundcloud.com') || results.url.includes('spotify.com'))) {
        basicTags.push('audio', 'music');
      } else if (results.url && results.url.includes('instagram.com')) {
        basicTags.push('social', 'visual');
      }
      
      platformTags.push(...basicTags);
    }
    
    // Combine all tags and remove duplicates
    const allTags = [...contentBasedTags, ...platformTags];
    const uniqueTags = [...new Set(allTags)].filter(tag => tag && tag.trim());
    
    console.log(`🏷️ Final tag generation result:`);
    console.log(`   🤖 AI-generated: ${aiTags.length} tags: [${aiTags.join(', ')}]`);
    console.log(`   🔄 Fallback: ${fallbackTags.length} tags: [${fallbackTags.join(', ')}]`);
    console.log(`   📱 Platform: ${platformTags.length} tags: [${platformTags.join(', ')}]`);
    console.log(`   ✅ Final: ${uniqueTags.length} tags: [${uniqueTags.join(', ')}]`);
    
    return uniqueTags;
  }

  /**
   * Generate content-based tags using OpenAI analysis
   * 
   * @param {Object} results - Analysis results containing summary/transcription
   * @returns {Promise<Array>} Array of AI-generated tags
   */
  async generateAITags(results) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      // Prepare comprehensive content for analysis with visual and audio context
      let contentToAnalyze = '';
      let visualContext = '';
      let audioContext = '';

      // Build visual context from object detection and labels
      if (results.objects && results.objects.length > 0) {
        const topObjects = results.objects.slice(0, 10).map(obj => `${obj.name} (${(obj.confidence * 100).toFixed(0)}%)`);
        visualContext += `Visual Objects Detected: ${topObjects.join(', ')}\n`;
      }

      if (results.labels && results.labels.length > 0) {
        const topLabels = results.labels.slice(0, 10).map(label => `${label.description} (${(label.confidence * 100).toFixed(0)}%)`);
        visualContext += `Visual Context/Scene: ${topLabels.join(', ')}\n`;
      }

      if (results.detectedText && results.detectedText.trim()) {
        const textPreview = results.detectedText.trim().substring(0, 200);
        visualContext += `Text in Image/Video: "${textPreview}${results.detectedText.length > 200 ? '...' : ''}"\n`;
      }

      // Build audio context
      if (results.summary && results.summary.trim()) {
        audioContext = `Content Summary: ${results.summary.trim()}`;
      } else if (results.transcription && results.transcription.trim() && results.transcription.length > 50) {
        // Use first 1500 characters to leave room for visual context
        const truncatedTranscription = results.transcription.trim().substring(0, 1500);
        audioContext = `Audio Transcription: ${truncatedTranscription}`;
      }

      // Combine all contexts
      contentToAnalyze = [visualContext, audioContext].filter(ctx => ctx.trim()).join('\n');

      if (!contentToAnalyze.trim()) {
        console.log('⚠️ No content available for AI tag generation');
        return [];
      }

      console.log(`🤖 Enhanced content analysis including:`, {
        hasVisualObjects: !!(results.objects && results.objects.length > 0),
        hasLabels: !!(results.labels && results.labels.length > 0),
        hasDetectedText: !!(results.detectedText && results.detectedText.length > 0),
        hasAudioContent: !!(audioContext),
        totalContentLength: contentToAnalyze.length
      });

      console.log(`🤖 Sending content to OpenAI for tag analysis (${contentToAnalyze.length} chars)`);

      const prompt = `Analyze this multimedia content using BOTH visual and audio information to generate 5-8 highly specific, descriptive tags that capture the actual content, NOT platform or generic media terms.

ENHANCED ANALYSIS APPROACH:
• Combine visual objects/scenes with audio content for deeper understanding
• Use detected objects and labels to understand the setting, activity, or context
• Cross-reference visual elements with spoken content for accurate categorization
• Consider the relationship between what's seen and what's heard

FOCUS ON:
• Specific topics, subjects, or themes (fitness, cooking, technology, education, etc.)
• Activities and actions (workout, tutorial, review, demonstration, interview)
• Objects and equipment present (gym equipment, kitchen tools, electronic devices)
• Setting and environment (gym, kitchen, office, outdoor, studio)
• Emotions, tone, and mood (motivational, relaxing, educational, entertaining)
• Target audience or expertise level (beginner, advanced, professional, casual)
• Specific brands, people, or entities mentioned in audio or visible in video

VISUAL CONTEXT EXAMPLES:
- If objects show "kettlebell" + "fitness model" → fitness/workout tags
- If labels show "food" + "kitchen" + transcription about recipes → cooking tags
- If text shows brand names + tech objects → product review tags

AVOID GENERIC TERMS:
❌ "video", "audio", "youtube", "social", "content", "media", "detection"
❌ Platform names unless specifically relevant to content topic
❌ Basic object names without context (just "person", "object", "item")

EXAMPLES OF ENHANCED TAGS:
✅ Visual: kettlebell + Audio: workout → ["kettlebell-training", "strength-fitness", "home-workout", "functional-training"]
✅ Visual: kitchen + Audio: recipe → ["cooking-tutorial", "healthy-recipes", "meal-preparation", "kitchen-skills"]
✅ Visual: smartphone + Audio: review → ["smartphone-review", "tech-comparison", "consumer-guide", "mobile-technology"]

Content Analysis Data:
${contentToAnalyze}

Return ONLY a JSON array of specific, contextual tags based on the combined visual and audio analysis. No explanations.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content analyst specializing in multimedia tagging. Generate specific, meaningful tags that describe the actual content themes, topics, and characteristics. Avoid generic platform or media type terms. Focus on what makes this content unique and searchable.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const responseText = response.choices[0].message.content.trim();
      console.log(`🤖 OpenAI tag response:`, responseText);
      
      // Parse the JSON response
      try {
        const tags = JSON.parse(responseText);
        if (Array.isArray(tags)) {
          // Filter and clean tags - be more strict about quality
          const cleanedTags = tags
            .filter(tag => tag && typeof tag === 'string' && tag.trim())
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => {
              // More strict filtering to ensure quality tags
              if (tag.length < 2 || tag.length > 30) return false;
              
              // Reject generic media terms
              const genericTerms = ['video', 'audio', 'youtube', 'instagram', 'social', 'media', 'content', 'digital', 'online'];
              if (genericTerms.some(generic => tag === generic)) return false;
              
              // Reject single letters or numbers
              if (/^[a-z0-9]$/.test(tag)) return false;
              
              return true;
            })
            .slice(0, 8); // Limit to 8 tags
          
          console.log(`✅ Generated ${cleanedTags.length} high-quality AI tags:`, cleanedTags);
          return cleanedTags;
        } else {
          console.log('⚠️ OpenAI returned non-array response');
          return [];
        }
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI tag response:', parseError.message);
        console.log('Raw response:', responseText);
        return [];
      }

    } catch (error) {
      console.error('❌ AI tag generation failed:', error.message);
      return [];
    }
  }

  /**
   * Generate content category using AI-powered analysis
   * 
   * @param {Object} results - Analysis results
   * @returns {Promise<string>} Generated category
   */
  async generateCategory(results) {
    console.log('📂 Starting AI-powered category generation with results:', {
      hasSummary: !!results.summary,
      hasTranscription: !!results.transcription,
      platform: results.platform
    });

    // Try AI-powered category generation first
    if (this.openai && (results.summary || results.transcription)) {
      try {
        const aiCategory = await this.generateAICategory(results);
        if (aiCategory && aiCategory.trim()) {
          console.log(`🤖 Generated AI category: "${aiCategory}"`);
          return aiCategory;
        }
      } catch (error) {
        console.error('❌ AI category generation failed, falling back to basic categorization:', error);
      }
    }

    // Fallback to basic categorization
    let category = 'general';
    
    // Category based on platform
    if (results.platform === 'youtube') {
      category = 'video-content';
    } else if (results.platform === 'soundcloud' || results.platform === 'spotify') {
      category = 'audio-content';
    } else if (results.platform === 'instagram') {
      category = 'visual-content';
    }
    
    // Refine category based on content
    if (results.transcription && results.transcription.length > 50) {
      const text = results.transcription.toLowerCase();
      
      if (text.includes('music') || text.includes('song')) {
        category = 'music-content';
      } else if (text.includes('education') || text.includes('tutorial') || text.includes('learn')) {
        category = 'educational-content';
      } else if (text.includes('news') || text.includes('report')) {
        category = 'news-content';
      } else if (text.includes('game') || text.includes('gaming')) {
        category = 'entertainment-content';
      } else if (text.includes('review') || text.includes('opinion')) {
        category = 'review-content';
      } else if (text.includes('interview') || text.includes('conversation')) {
        category = 'conversation-content';
      } else if (text.includes('funny') || text.includes('comedy') || text.includes('humor')) {
        category = 'entertainment-content';
      } else if (text.includes('sport') || text.includes('match') || text.includes('team')) {
        category = 'sports-content';
      }
    }
    
    console.log(`📂 Final category: "${category}"`);
    return category;
  }

  /**
   * Generate content category using OpenAI analysis
   * 
   * @param {Object} results - Analysis results containing summary/transcription
   * @returns {Promise<string>} AI-generated category
   */
  async generateAICategory(results) {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }

      // Prepare content for analysis - prioritize summary over transcription
      let contentToAnalyze = '';

      // Use summary if available (more focused content)
      if (results.summary && results.summary.trim()) {
        contentToAnalyze = `Summary: ${results.summary.trim()}`;
      } 
      // Fallback to transcription
      else if (results.transcription && results.transcription.trim() && results.transcription.length > 50) {
        // Use first 1500 characters to avoid token limits
        const truncatedTranscription = results.transcription.trim().substring(0, 1500);
        contentToAnalyze = `Transcription: ${truncatedTranscription}`;
      }

      if (!contentToAnalyze) {
        console.log('⚠️ No content available for AI category generation');
        return null;
      }

      console.log(`🤖 Sending content to OpenAI for category analysis (${contentToAnalyze.length} chars)`);

      const prompt = `Based on the following content, select the most appropriate category from this list:

- general (default/miscellaneous)
- video-content (general video content)
- audio-content (podcasts, music, audio)
- visual-content (images, graphics, visual art)
- people-content (interviews, personal stories, vlogs)
- food-content (cooking, recipes, food reviews)
- technology-content (tech reviews, tutorials, gadgets)
- health-content (fitness, wellness, medical)
- educational-content (tutorials, lectures, learning)
- entertainment-content (comedy, movies, shows, games)
- sports-content (athletics, games, competitions)
- news-content (current events, reporting)
- music-content (songs, concerts, music videos)
- conversation-content (interviews, discussions, podcasts)
- mature-content (adult themes)

Content to analyze:
${contentToAnalyze}

Return ONLY the category name, nothing else. Example: entertainment-content`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content categorization specialist. Analyze content and select the most appropriate category based on the main topic and theme.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const category = response.choices[0].message.content.trim().toLowerCase();
      console.log(`🤖 OpenAI category response: "${category}"`);
      
      // Validate the category is from our allowed list
      const validCategories = [
        'general', 'video-content', 'audio-content', 'visual-content', 'people-content',
        'food-content', 'technology-content', 'health-content', 'educational-content',
        'entertainment-content', 'sports-content', 'news-content', 'music-content',
        'conversation-content', 'mature-content'
      ];
      
      if (validCategories.includes(category)) {
        console.log(`✅ Valid AI category generated: "${category}"`);
        return category;
      } else {
        console.log(`⚠️ Invalid category "${category}", using fallback`);
        return null;
      }

    } catch (error) {
      console.error('❌ AI category generation failed:', error.message);
      return null;
    }
  }

  /**
   * Generate content title using AI-powered analysis
   * 
   * @param {Object} results - Analysis results containing summary/transcription
   * @returns {Promise<string>} AI-generated title
   */
  async generateTitle(results) {
    try {
      console.log('📝 Starting AI-powered title generation');
      
      if (!this.openai) {
        console.log('⚠️ OpenAI not available for title generation');
        return this.getFallbackTitle(results);
      }

      // Prepare content for analysis - prioritize summary over transcription
      let contentToAnalyze = '';

      // Use summary if available (more focused content)
      if (results.summary && results.summary.trim()) {
        contentToAnalyze = results.summary.trim();
      } 
      // Fallback to transcription
      else if (results.transcription && results.transcription.trim() && results.transcription.length > 50) {
        // Use first 1000 characters to avoid token limits
        const truncatedTranscription = results.transcription.trim().substring(0, 1000);
        contentToAnalyze = truncatedTranscription;
      }

      if (!contentToAnalyze) {
        console.log('⚠️ No content available for AI title generation');
        return this.getFallbackTitle(results);
      }

      console.log(`🤖 Sending content to OpenAI for title generation (${contentToAnalyze.length} chars)`);

      const prompt = `Based on the following content, create an engaging and descriptive title.

The title should be:
- Concise (5-10 words maximum)
- Descriptive of the main topic or theme
- Engaging and clickable
- Professional and appropriate
- Capture the essence of the content

Content: ${contentToAnalyze}

Respond with only the title, no quotes or additional text.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator who specializes in writing engaging titles that capture the essence of content. Create compelling titles that are descriptive yet concise.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 50
      });

      let generatedTitle = response.choices[0].message.content.trim();
      
      // Clean up title (remove quotes if present)
      generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
      
      // Ensure title isn't too long
      if (generatedTitle.length > 60) {
        generatedTitle = generatedTitle.substring(0, 57) + '...';
      }
      
      console.log(`✅ Generated AI title: "${generatedTitle}"`);
      return generatedTitle;
      
    } catch (error) {
      console.error('❌ AI title generation failed:', error.message);
      return this.getFallbackTitle(results);
    }
  }

  /**
   * Generate fallback title when AI generation fails
   * 
   * @param {Object} results - Analysis results
   * @returns {string} Fallback title
   */
  getFallbackTitle(results) {
    // Try to use existing metadata title
    if (results.metadata && results.metadata.title) {
      return results.metadata.title;
    }
    
    // Generate basic title based on content type
    if (results.platform === 'youtube') {
      return 'YouTube Video Content';
    } else if (results.platform === 'instagram') {
      return 'Instagram Content';
    } else if (results.transcription && results.transcription.length > 100) {
      return 'Multimedia Content with Transcription';
    } else {
      return 'Multimedia Content';
    }
  }

  /**
   * Generate fallback title specifically for images when AI generation fails
   * 
   * @param {Object} results - Image analysis results
   * @returns {string} Fallback image title
   */
  getFallbackImageTitle(results) {
    // Try to use first sentence of description - create professional structure
    if (results.description && results.description.trim()) {
      const firstSentence = results.description.split('.')[0];
      if (firstSentence.length > 0 && firstSentence.length <= 120) {
        return this.formatAsProfessionalTitle(firstSentence.trim());
      } else if (results.description.length <= 120) {
        return this.formatAsProfessionalTitle(results.description.trim());
      } else {
        const truncated = results.description.substring(0, 117).trim();
        return this.formatAsProfessionalTitle(truncated) + '...';
      }
    }
    
    // Use transcription if available - create professional structure
    if (results.transcription && results.transcription.trim()) {
      const firstSentence = results.transcription.split('.')[0];
      if (firstSentence.length > 0 && firstSentence.length <= 120) {
        return this.formatAsProfessionalTitle(firstSentence.trim());
      } else if (results.transcription.length <= 120) {
        return this.formatAsProfessionalTitle(results.transcription.trim());
      } else {
        const truncated = results.transcription.substring(0, 117).trim();
        return this.formatAsProfessionalTitle(truncated) + '...';
      }
    }
    
    // Create structured title from tags - avoid comma lists
    if (results.tags && Array.isArray(results.tags) && results.tags.length > 0) {
      const mainTag = results.tags[0];
      const additionalTags = results.tags.slice(1, 3);
      if (additionalTags.length > 0) {
        return `${this.capitalizeFirst(mainTag)} Showcase: Featuring ${additionalTags.join(' and ')}`;
      } else {
        return `Professional ${this.capitalizeFirst(mainTag)} Display`;
      }
    }
    
    // Create structured title from objects - avoid comma lists
    if (results.objects && results.objects.length > 0) {
      const mainObject = results.objects[0];
      const objectName = mainObject.name || mainObject;
      if (results.objects.length > 1) {
        return `${this.capitalizeFirst(objectName)} and Equipment: Professional Product Layout`;
      } else {
        return `Professional ${this.capitalizeFirst(objectName)} Presentation`;
      }
    }
    
    // Final fallback with professional structure
    return 'Professional Visual Content: Detailed Product and Information Display';
  }

  /**
   * Format text as a professional title with proper structure
   * @param {string} text - Text to format
   * @returns {string} Professionally formatted title
   */
  formatAsProfessionalTitle(text) {
    // Capitalize first letter and ensure proper sentence structure
    const formatted = text.charAt(0).toUpperCase() + text.slice(1);
    
    // If it already has good structure, return as is
    if (formatted.includes(':') || formatted.includes(' - ') || formatted.length > 40) {
      return formatted;
    }
    
    // Add professional structure for shorter phrases
    return `Professional ${formatted}: Detailed Visual Overview`;
  }

  /**
   * Capitalize the first letter of a string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    if (!str || typeof str !== 'string') return 'Content';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Thumbnail generation methods using ThumbnailGenerator service
  async generateVideoThumbnails(userId, videoPath, options = {}) {
    try {
      if (this.enableLogging) {
        console.log('🎬 Starting video thumbnail generation:', {
          userId,
          videoPath: path.basename(videoPath),
          options
        });
      }
      
      // Initialize ThumbnailGenerator if not already done
      if (!this.thumbnailGenerator) {
        const ThumbnailGenerator = require('./ThumbnailGenerator');
        this.thumbnailGenerator = new ThumbnailGenerator({
          enableLogging: this.enableLogging
        });
      }
      
      // Generate thumbnails using ThumbnailGenerator service
      const results = await this.thumbnailGenerator.generateVideoThumbnails(
        userId,
        videoPath,
        options.contentId || null,
        options.fileId || null,
        {
          thumbnailSize: options.thumbnailSize || 300,
          keyMomentsCount: options.keyMomentsCount || 3,
          keyMomentsSize: options.keyMomentsSize || 200,
          quality: options.quality || 'medium',
          includeMainThumbnail: true,
          includeKeyMoments: true
        }
      );
      
      if (this.enableLogging) {
        console.log('✅ Video thumbnails generated:', {
          mainThumbnail: !!results.mainThumbnail,
          keyMoments: results.keyMoments.length,
          totalThumbnails: results.metadata.totalThumbnails
        });
      }
      
      // Return array of all thumbnails for consistency
      const allThumbnails = [];
      if (results.mainThumbnail) allThumbnails.push(results.mainThumbnail);
      if (results.keyMoments) allThumbnails.push(...results.keyMoments);
      
      return allThumbnails;
    } catch (error) {
      console.error('❌ Video thumbnail generation failed:', error);
      throw error;
    }
  }

  async generateYouTubeThumbnails(url, userId, contentId) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const https = require('https');
      const http = require('http');
      const fs = require('fs');
      const path = require('path');
      const { Thumbnail } = require('../../models');
      
      // Extract YouTube video ID
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        throw new Error('Could not extract video ID from YouTube URL');
      }
      
      if (this.enableLogging) {
        console.log('🎬 Generating YouTube thumbnails for video ID:', videoId);
      }
      
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      
      // Create filename and path
      const fileName = `${uuidv4()}_youtube_hqdefault.jpg`;
      const thumbnailDir = path.join(__dirname, '../../uploads/thumbnails');
      const filePath = path.join(thumbnailDir, fileName);
      
      // Ensure directory exists
      if (!fs.existsSync(thumbnailDir)) {
        fs.mkdirSync(thumbnailDir, { recursive: true });
      }
      
      // Download and save the thumbnail
      await new Promise((resolve, reject) => {
        const protocol = thumbnailUrl.startsWith('https:') ? https : http;
        
        protocol.get(thumbnailUrl, (response) => {
          if (response.statusCode === 200) {
            const writeStream = fs.createWriteStream(filePath);
            response.pipe(writeStream);
            
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          } else {
            reject(new Error(`HTTP ${response.statusCode}: Failed to download thumbnail`));
          }
        }).on('error', reject);
      });
      
      // Get file stats
      const stats = fs.statSync(filePath);
      
      // Create database record
      const thumbnail = await Thumbnail.create({
        id: uuidv4(),
        user_id: userId,
        content_id: contentId,
        file_id: null,
        thumbnail_type: 'main',
        file_path: path.relative(process.cwd(), filePath),
        file_name: fileName,
        file_size: stats.size,
        mime_type: 'image/jpeg',
        width: 480,
        height: 360,
        quality: 'medium',
        generation_method: 'ffmpeg', // Use existing enum value
        metadata: {
          originalUrl: thumbnailUrl,
          videoId: videoId,
          size: 'hqdefault',
          generatedAt: new Date().toISOString(),
          source: 'youtube_direct'
        },
        status: 'ready'
      });
      
      if (this.enableLogging) {
        console.log(`✅ Created YouTube thumbnail: ${fileName} (480x360, ${Math.round(stats.size / 1024)}KB)`);
      }
      
      return [thumbnail];
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ YouTube thumbnail generation failed:', error);
      }
      throw error;
    }
  }

  async generateImageThumbnails(userId, imagePath, options = {}) {
    try {
      if (this.enableLogging) {
        console.log('🖼️ Starting image thumbnail generation:', {
          userId,
          imagePath: path.basename(imagePath),
          options
        });
      }
      
      // Initialize ThumbnailGenerator if not already done
      if (!this.thumbnailGenerator) {
        const ThumbnailGenerator = require('./ThumbnailGenerator');
        this.thumbnailGenerator = new ThumbnailGenerator({
          enableLogging: this.enableLogging
        });
      }
      
      // Generate thumbnails using ThumbnailGenerator service
      const results = await this.thumbnailGenerator.generateImageThumbnails(
        userId,
        imagePath,
        options.contentId || null,
        options.fileId || null,
        {
          sizes: options.sizes || [150, 300, 500],
          quality: options.quality || 'medium',
          maintainAspectRatio: true
        }
      );
      
      if (this.enableLogging) {
        console.log('✅ Image thumbnails generated:', {
          thumbnailCount: results.thumbnails.length,
          sizes: options.sizes || [150, 300, 500]
        });
      }
      
      return results.thumbnails;
    } catch (error) {
      console.error('❌ Image thumbnail generation failed:', error);
      throw error;
    }
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
   * Download and analyze Instagram content using yt-dlp to bypass popups
   * 
   * @param {string} url - Instagram URL (post or reel)
   * @returns {Promise<Object>} Download and analysis result
   */
  async getInstagramContent(url) {
    try {
      if (this.enableLogging) {
        console.log('📱 Attempting to download Instagram content:', url);
      }
      
      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = Date.now();
      const outputDir = path.join(__dirname, '../../uploads/temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputTemplate = path.join(outputDir, `instagram_${timestamp}.%(ext)s`);
      
      // Use yt-dlp to download Instagram content with various fallback options
      // --no-check-certificates: Bypass SSL issues
      // --ignore-errors: Continue on errors  
      // --cookies-from-browser: Use browser cookies to access logged-in content
      // --user-agent: Use a regular browser user agent
      const command = `yt-dlp --no-check-certificates --ignore-errors --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --format "best[height<=720]/best" -o "${outputTemplate}" "${url}"`;
      
      if (this.enableLogging) {
        console.log('📱 Executing Instagram download command:', command);
      }
      
      return new Promise((resolve) => {
        exec(command, { maxBuffer: 100 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
          try {
            if (error) {
              if (this.enableLogging) {
                console.log('⚠️ Instagram download failed (this is common due to privacy restrictions):', error.message);
              }
              resolve({ success: false, error: error.message });
              return;
            }
            
            // Find downloaded files
            const files = fs.readdirSync(outputDir).filter(file => 
              file.startsWith(`instagram_${timestamp}`) && 
              !file.endsWith('.part') && // Exclude partial downloads
              (file.includes('.mp4') || file.includes('.jpg') || file.includes('.jpeg') || file.includes('.png') || file.includes('.webp'))
            );
            
            if (files.length === 0) {
              if (this.enableLogging) {
                console.log('⚠️ No Instagram files downloaded - content may be private or restricted');
              }
              resolve({ success: false, error: 'No files downloaded' });
              return;
            }
            
            // Process the first downloaded file
            const downloadedFile = files[0];
            const filePath = path.join(outputDir, downloadedFile);
            const fileStats = fs.statSync(filePath);
            
            // Determine content type based on file extension
            const isVideo = downloadedFile.includes('.mp4');
            const isImage = downloadedFile.includes('.jpg') || downloadedFile.includes('.jpeg') || 
                           downloadedFile.includes('.png') || downloadedFile.includes('.webp');
            
            if (this.enableLogging) {
              console.log(`✅ Instagram content downloaded:`, {
                file: downloadedFile,
                size: fileStats.size,
                type: isVideo ? 'video' : 'image'
              });
            }
            
            resolve({
              success: true,
              filePath: filePath,
              type: isVideo ? 'video' : 'image',
              filename: downloadedFile,
              size: fileStats.size,
              downloadInfo: {
                url: url,
                timestamp: timestamp,
                method: 'yt-dlp'
              }
            });
            
          } catch (parseError) {
            if (this.enableLogging) {
              console.error('❌ Error processing Instagram download:', parseError);
            }
            resolve({ success: false, error: parseError.message });
          }
        });
      });
      
    } catch (setupError) {
      if (this.enableLogging) {
        console.error('❌ Instagram download setup failed:', setupError);
      }
      return { success: false, error: setupError.message };
    }
  }

  /**
   * Download and analyze Facebook content using yt-dlp to bypass popups
   * 
   * @param {string} url - Facebook URL (video or photo post)
   * @returns {Promise<Object>} Download and analysis result
   */
  async getFacebookContent(url) {
    try {
      if (this.enableLogging) {
        console.log('📘 Attempting to download Facebook content:', url);
      }
      
      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = Date.now();
      const outputDir = path.join(__dirname, '../../uploads/temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputTemplate = path.join(outputDir, `facebook_${timestamp}.%(ext)s`);
      
      // Use yt-dlp to download Facebook content with various fallback options
      // --no-check-certificates: Bypass SSL issues
      // --ignore-errors: Continue on errors  
      // --user-agent: Use a regular browser user agent
      // --format "best[height<=720]/best": Get reasonable quality video
      const command = `yt-dlp --no-check-certificates --ignore-errors --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --format "best[height<=720]/best" -o "${outputTemplate}" "${url}"`;
      
      if (this.enableLogging) {
        console.log('📘 Executing Facebook download command:', command);
      }
      
      return new Promise((resolve) => {
        exec(command, { maxBuffer: 100 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
          try {
            if (error) {
              if (this.enableLogging) {
                console.log('⚠️ Facebook download failed (this is common due to privacy restrictions):', error.message);
              }
              resolve({ success: false, error: error.message });
              return;
            }
            
            // Find downloaded files
            const files = fs.readdirSync(outputDir).filter(file => 
              file.startsWith(`facebook_${timestamp}`) && 
              !file.endsWith('.part') && // Exclude partial downloads
              (file.includes('.mp4') || file.includes('.jpg') || file.includes('.jpeg') || file.includes('.png') || file.includes('.webp'))
            );
            
            if (files.length === 0) {
              if (this.enableLogging) {
                console.log('⚠️ No Facebook files downloaded - content may be private or restricted');
              }
              resolve({ success: false, error: 'No files downloaded' });
              return;
            }
            
            // Process the first downloaded file
            const downloadedFile = files[0];
            const filePath = path.join(outputDir, downloadedFile);
            const fileStats = fs.statSync(filePath);
            
            // Determine content type based on file extension
            const isVideo = downloadedFile.includes('.mp4');
            const isImage = downloadedFile.includes('.jpg') || downloadedFile.includes('.jpeg') || 
                           downloadedFile.includes('.png') || downloadedFile.includes('.webp');
            
            if (this.enableLogging) {
              console.log(`✅ Facebook content downloaded:`, {
                file: downloadedFile,
                size: fileStats.size,
                type: isVideo ? 'video' : 'image'
              });
            }
            
            resolve({
              success: true,
              filePath: filePath,
              type: isVideo ? 'video' : 'image',
              filename: downloadedFile,
              size: fileStats.size,
              downloadInfo: {
                url: url,
                timestamp: timestamp,
                method: 'yt-dlp'
              }
            });
            
          } catch (parseError) {
            if (this.enableLogging) {
              console.error('❌ Error processing Facebook download:', parseError);
            }
            resolve({ success: false, error: parseError.message });
          }
        });
      });
      
    } catch (setupError) {
      if (this.enableLogging) {
        console.error('❌ Facebook download setup failed:', setupError);
      }
      return { success: false, error: setupError.message };
    }
  }

  /**
   * Download and analyze Pinterest content using yt-dlp to bypass restrictions
   * 
   * @param {string} url - Pinterest URL (pin or board)
   * @returns {Promise<Object>} Download and analysis result
   */
  async getPinterestContent(url) {
    try {
      if (this.enableLogging) {
        console.log('📌 Attempting to download Pinterest content:', url);
      }
      
      const { exec } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      
      const timestamp = Date.now();
      const outputDir = path.join(__dirname, '../../uploads/temp');
      
      // Ensure temp directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputTemplate = path.join(outputDir, `pinterest_${timestamp}.%(ext)s`);
      
      // Use yt-dlp to download Pinterest content with image-focused options
      // --no-check-certificates: Bypass SSL issues
      // --ignore-errors: Continue on errors  
      // --user-agent: Use a regular browser user agent
      // --format "best": Get highest quality image
      const command = `yt-dlp --no-check-certificates --ignore-errors --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --format "best" -o "${outputTemplate}" "${url}"`;
      
      if (this.enableLogging) {
        console.log('🔧 Running Pinterest download command:', command);
      }
      
      return new Promise((resolve) => {
        exec(command, { maxBuffer: 100 * 1024 * 1024, timeout: 60000 }, (error, stdout, stderr) => {
          try {
            if (error) {
              if (this.enableLogging) {
                console.log('⚠️ Pinterest download failed (this is common due to privacy restrictions):', error.message);
              }
              resolve({ success: false, error: error.message });
              return;
            }
            
            // Find downloaded files
            const files = fs.readdirSync(outputDir).filter(file => 
              file.startsWith(`pinterest_${timestamp}`) && 
              !file.endsWith('.part') && // Exclude partial downloads
              (file.includes('.jpg') || file.includes('.jpeg') || file.includes('.png') || file.includes('.webp') || file.includes('.gif'))
            );
            
            if (files.length === 0) {
              if (this.enableLogging) {
                console.log('⚠️ No Pinterest files downloaded - content may be private or restricted');
              }
              resolve({ success: false, error: 'No files downloaded' });
              return;
            }
            
            // Process the first downloaded file
            const downloadedFile = files[0];
            const filePath = path.join(outputDir, downloadedFile);
            const fileStats = fs.statSync(filePath);
            
            // Pinterest content is typically images
            const isImage = downloadedFile.includes('.jpg') || downloadedFile.includes('.jpeg') || 
                           downloadedFile.includes('.png') || downloadedFile.includes('.webp') || 
                           downloadedFile.includes('.gif');
            
            if (this.enableLogging) {
              console.log(`✅ Pinterest content downloaded:`, {
                file: downloadedFile,
                size: fileStats.size,
                type: 'image'
              });
            }
            
            resolve({
              success: true,
              filePath: filePath,
              type: 'image',
              filename: downloadedFile,
              size: fileStats.size,
              downloadInfo: {
                url: url,
                timestamp: timestamp,
                method: 'yt-dlp'
              }
            });
            
          } catch (parseError) {
            if (this.enableLogging) {
              console.error('❌ Error processing Pinterest download:', parseError);
            }
            resolve({ success: false, error: parseError.message });
          }
        });
      });
      
    } catch (setupError) {
      if (this.enableLogging) {
        console.error('❌ Pinterest download setup failed:', setupError);
      }
      return { success: false, error: setupError.message };
    }
  }

  /**
   * Transcribe video file (used for Instagram videos)
   * 
   * @param {string} videoPath - Path to video file
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeVideoFile(videoPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const { exec } = require('child_process');
      
      if (this.enableLogging) {
        console.log('🎵 Extracting audio from video for transcription:', path.basename(videoPath));
      }
      
      // Extract audio from video using ffmpeg
      const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
      
      return new Promise((resolve, reject) => {
        // Use ffmpeg to extract audio
        const ffmpegCommand = `ffmpeg -i "${videoPath}" -ac 1 -ar 16000 -y "${audioPath}"`;
        
        exec(ffmpegCommand, (error, stdout, stderr) => {
          if (error) {
            if (this.enableLogging) {
              console.error('❌ Audio extraction failed:', error.message);
            }
            reject(error);
            return;
          }
          
          // Transcribe the extracted audio
          this.transcribeAudioFile(audioPath).then(result => {
            // Clean up audio file
            if (fs.existsSync(audioPath)) {
              fs.unlinkSync(audioPath);
            }
            resolve(result);
          }).catch(transcribeError => {
            // Clean up audio file even on error
            if (fs.existsSync(audioPath)) {
              fs.unlinkSync(audioPath);
            }
            reject(transcribeError);
          });
        });
      });
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Video transcription failed:', error);
      }
      return { text: '', confidence: 0, error: error.message };
    }
  }

  /**
   * Transcribe audio file using available services
   * 
   * @param {string} audioPath - Path to audio file
   * @returns {Promise<Object>} Transcription result
   */
  async transcribeAudioFile(audioPath) {
    try {
      // Try OpenAI Whisper first
      if (this.openai) {
        try {
          const fs = require('fs');
          const transcription = await this.openai.audio.transcriptions.create({
            file: fs.createReadStream(audioPath),
            model: "whisper-1",
          });
          
          return {
            text: transcription.text || '',
            confidence: 0.9,
            provider: 'openai-whisper'
          };
        } catch (openaiError) {
          if (this.enableLogging) {
            console.log('⚠️ OpenAI transcription failed, trying Google Speech:', openaiError.message);
          }
        }
      }
      
      // Fallback to Google Speech-to-Text if available
      if (this.speechClient) {
        try {
          const fs = require('fs');
          const audioBuffer = fs.readFileSync(audioPath);
          
          const [response] = await this.speechClient.recognize({
            audio: { content: audioBuffer.toString('base64') },
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: 'en-US',
            },
          });
          
          const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
          
          return {
            text: transcription || '',
            confidence: 0.8,
            provider: 'google-speech'
          };
        } catch (googleError) {
          if (this.enableLogging) {
            console.log('⚠️ Google Speech transcription failed:', googleError.message);
          }
        }
      }
      
      // No transcription service available
      return {
        text: 'Audio transcription service not available',
        confidence: 0,
        provider: 'none'
      };
      
    } catch (error) {
      if (this.enableLogging) {
        console.error('❌ Audio transcription failed:', error);
      }
      return {
        text: '',
        confidence: 0,
        error: error.message
      };
    }
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
          // Use hqdefault.jpg as it's more widely available than maxresdefault.jpg
          metadata.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
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
    } else if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
      return 'facebook';
    } else if (urlLower.includes('vimeo.com')) {
      return 'vimeo';
    } else if (urlLower.includes('twitch.tv')) {
      return 'twitch';
    } else if (urlLower.includes('dailymotion.com')) {
      return 'dailymotion';
    } else if (urlLower.includes('soundcloud.com')) {
      return 'soundcloud';
    } else if (urlLower.includes('spotify.com')) {
      return 'spotify';
    } else if (urlLower.includes('anchor.fm')) {
      return 'anchor';
    } else if (urlLower.includes('imgur.com')) {
      return 'imgur';
    } else if (urlLower.includes('flickr.com')) {
      return 'flickr';
    } else if (urlLower.includes('pinterest.com')) {
      return 'pinterest';
    } else if (urlLower.includes('unsplash.com')) {
      return 'unsplash';
    } else if (urlLower.includes('pixabay.com')) {
      return 'pixabay';
    } else if (urlLower.includes('pexels.com')) {
      return 'pexels';
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
      /dailymotion\.com\/video/i,
      /twitch\.tv\/videos/i,
      /tiktok\.com\//i,
      /instagram\.com\/p\//i,
      /instagram\.com\/reel\//i,
      /facebook\.com\/watch/i,
      /facebook\.com\/share\/v\//i,
      /facebook\.com\/share\/p\//i,
      /facebook\.com\/share\/r\//i,  // NEW: Facebook share/r/ URLs (reels/mixed content)
      /facebook\.com\/video/i,
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
      
      // Image platforms
      /imgur\.com\//i,
      /flickr\.com\//i,
      /pinterest\.com\/pin\//i,
      /unsplash\.com\//i,
      /pixabay\.com\//i,
      /pexels\.com\//i,
      
      // Direct files
      /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i,
      /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
      /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)(\?|$)/i
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
   * Uses Google Vision API to detect objects, labels, and text with improved filtering
   * 
   * @param {string} imagePath - Path to image file
   * @param {Object} options - Detection options
   * @returns {Promise<Object>} - Enhanced detection results
   */
  async detectObjectsEnhanced(imagePath, options = {}) {
    try {
      if (!this.visionClient) {
        // Fallback to basic object detection if Vision client not available
        const basicObjects = await this.detectObjects(imagePath, options);
        return {
          objects: basicObjects,
          labels: [],
          text: '',
          textAnnotations: [],
          averageConfidence: basicObjects.length > 0 ? 
            basicObjects.reduce((sum, obj) => sum + obj.confidence, 0) / basicObjects.length : 0
        };
      }

      const objectConfidenceThreshold = options.objectConfidence || 0.25; // Very low for more objects
      const labelConfidenceThreshold = options.labelConfidence || 0.5;   // Medium for quality labels

      if (this.enableLogging) {
        console.log(`🔍 Running enhanced detection with thresholds: objects=${objectConfidenceThreshold}, labels=${labelConfidenceThreshold}`);
      }

      const [objectResult, labelResult, textResult] = await Promise.all([
        this.visionClient.objectLocalization(imagePath),
        this.visionClient.labelDetection(imagePath),
        this.visionClient.textDetection(imagePath)
      ]);

      const rawObjects = objectResult[0].localizedObjectAnnotations || [];
      const rawLabels = labelResult[0].labelAnnotations || [];
      const textAnnotations = textResult[0].textAnnotations || [];

      // Filter and map objects with lower threshold
      const objects = rawObjects
        .filter(obj => obj.score >= objectConfidenceThreshold)
        .map(obj => ({
          name: obj.name,
          confidence: obj.score,
          boundingBox: obj.boundingPoly
        }))
        .slice(0, 20); // Limit to top 20 objects

      // Filter and map labels
      const labels = rawLabels
        .filter(label => label.score >= labelConfidenceThreshold)
        .map(label => ({
          description: label.description,
          confidence: label.score
        }))
        .slice(0, 15); // Limit to top 15 labels

      // Extract full text if available
      const fullText = textAnnotations.length > 0 ? textAnnotations[0].description : '';

      if (this.enableLogging) {
        console.log(`🔍 Enhanced detection results: ${rawObjects.length}→${objects.length} objects, ${rawLabels.length}→${labels.length} labels, text: ${fullText.length} chars`);
      }

      return {
        objects,
        labels,
        text: fullText,
        textAnnotations: textAnnotations.slice(1), // Skip the first one which is the full text
        averageConfidence: objects.length > 0 ? 
          objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length : 0,
        stats: {
          rawObjectsFound: rawObjects.length,
          filteredObjects: objects.length,
          rawLabelsFound: rawLabels.length,
          filteredLabels: labels.length,
          textLength: fullText.length
        }
      };

    } catch (error) {
      console.error('❌ Enhanced object detection failed:', error);
      // Fallback to basic detection
      try {
        const basicObjects = await this.detectObjects(imagePath, options);
        return {
          objects: basicObjects,
          labels: [],
          text: '',
          textAnnotations: [],
          averageConfidence: basicObjects.length > 0 ? 
            basicObjects.reduce((sum, obj) => sum + obj.confidence, 0) / basicObjects.length : 0,
          fallback: true
        };
      } catch (fallbackError) {
        console.error('❌ Fallback detection also failed:', fallbackError);
        return {
          objects: [],
          labels: [],
          text: '',
          textAnnotations: [],
          averageConfidence: 0,
          error: true
        };
      }
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
      
      // ✨ CRITICAL FIX: Update AI-generated title
      if (results.generatedTitle && results.generatedTitle.trim()) {
        updateData.generated_title = results.generatedTitle.trim();
        console.log(`🎯 MultimediaAnalyzer: Saving AI-generated title: "${results.generatedTitle.trim()}"`);
      }
      
      // ✨ ENHANCEMENT: Update AI-generated category
      if (results.category) {
        updateData.category = results.category;
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

  /**
   * Extract web content from URL using curl
   * @param {string} url - URL to extract content from
   * @returns {Promise<Object>} Extracted content object
   */
  async extractWebContent(url) {
    try {
      const { execSync } = require('child_process');
      
      if (this.enableLogging) {
        console.log(`🌐 Extracting web content from: ${url}`);
      }
      
      // Download the webpage with timeout and user agent
      const htmlContent = execSync(`curl -s -L --max-time 15 --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${url}"`, { 
        encoding: 'utf8',
        timeout: 20000,
        maxBuffer: 1024 * 1024 * 5 // 5MB buffer limit
      });
      
      if (!htmlContent || htmlContent.length < 100) {
        throw new Error('Insufficient content received from URL');
      }
      
      // Enhanced content extraction with better HTML stripping
      let textContent = htmlContent
        // Remove scripts, styles, and navigation elements
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
        .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Clean up whitespace and entities
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#\d+;/g, ' ') // Remove numeric entities
        .trim();
      
      // Extract title
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      let title = titleMatch ? titleMatch[1].trim() : '';
      
      // Clean title of common suffixes
      title = title
        .replace(/\s*[-|]\s*.+$/i, '') // Remove everything after - or |
        .replace(/\s*\|\s*.+$/i, '')   // Remove everything after |
        .trim();
      
      // Extract meta description
      const descMatches = [
        /<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i,
        /<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i,
        /<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"[^>]*>/i
      ];
      
      let description = '';
      for (const regex of descMatches) {
        const match = htmlContent.match(regex);
        if (match && match[1]) {
          description = match[1].trim();
          break;
        }
      }
      
      // Try to extract main article content
      const articlePatterns = [
        /<article[^>]*>(.*?)<\/article>/gis,
        /<main[^>]*>(.*?)<\/main>/gis,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<div[^>]*class="[^"]*article[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<div[^>]*id="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/gis
      ];
      
      let articleContent = '';
      for (const pattern of articlePatterns) {
        const matches = htmlContent.match(pattern);
        if (matches && matches.length > 0) {
          // Take the longest match (likely the main content)
          const longestMatch = matches.reduce((longest, current) => 
            current.length > longest.length ? current : longest, '');
          
          articleContent = longestMatch
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (articleContent.length > 500) { // Only use if substantial content
            break;
          }
        }
      }
      
      // Use article content if found and substantial, otherwise use full text
      const finalContent = (articleContent.length > 500) ? articleContent : textContent;
      
      // Limit content size for processing efficiency
      const processedContent = finalContent.substring(0, 8000);
      
      if (this.enableLogging) {
        console.log(`✅ Web content extracted: ${finalContent.length} chars (using ${processedContent.length})`);
      }
      
      return {
        url,
        title: title || 'Untitled',
        description: description || '',
        content: processedContent,
        fullLength: finalContent.length,
        extractionMethod: 'enhanced-curl',
        hasArticleContent: articleContent.length > 500
      };
      
    } catch (error) {
      console.error(`❌ Web content extraction failed for ${url}:`, error.message);
      return {
        url,
        title: '',
        description: '',
        content: '',
        fullLength: 0,
        error: error.message,
        extractionMethod: 'failed'
      };
    }
  }
}

module.exports = MultimediaAnalyzer; 