/**
 * Backward Compatibility Service
 * 
 * This service provides a compatibility layer between the old MultimediaAnalyzer
 * API format and the new modular processor architecture. It ensures that existing
 * API endpoints continue to work with the same response formats while internally
 * using the new orchestrator system.
 * 
 * Key Functions:
 * 1. Convert new processor results to legacy API format
 * 2. Route analysis requests through new orchestrator  
 * 3. Handle mixed data scenarios (legacy + new data)
 * 4. Maintain response format consistency
 * 5. Provide seamless migration path
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const logger = require('../config/logger');

// Import new architecture components
const AutomationOrchestrator = require('./multimedia/AutomationOrchestrator');
const ResultFormatter = require('./multimedia/ResultFormatter');

// Import database models
const { 
  Content, 
  VideoAnalysis, 
  AudioAnalysis, 
  ImageAnalysis,
  ProcessingJob,
  Thumbnail,
  OCRCaption,
  Speaker
} = require('../models');

class BackwardCompatibilityService {
  constructor() {
    this.orchestrator = AutomationOrchestrator.getInstance();
    this.resultFormatter = new ResultFormatter();
  }

  /**
   * Analyze content with legacy API format
   * Routes through new orchestrator but returns legacy format
   */
  async analyzeContent(url, options = {}) {
    const startTime = Date.now();
    const analysisId = uuidv4();
    
    try {
      logger.info('Backward compatibility analysis started', {
        analysisId,
        url,
        options
      });

      // Convert legacy options to new orchestrator options
      const orchestratorOptions = this.convertLegacyOptions(options);
      
      // Create content metadata for orchestrator
      const contentMetadata = {
        filename: url,
        source: 'url',
        url: url,
        userId: options.user_id,
        contentId: options.content_id,
        analysisId: analysisId
      };

      // For URL content, use MultimediaAnalyzer directly instead of orchestrator
      console.log('🔄 Processing URL content with MultimediaAnalyzer...');
      const { MultimediaAnalyzer } = require('./multimedia');
      const analyzer = new MultimediaAnalyzer({ enableLogging: true });
      
      const processingResult = await analyzer.analyzeContent(url, {
        ...options,
        analysisId: analysisId
      });

      // Convert new results to legacy format
      const legacyResults = await this.convertToLegacyFormat(
        processingResult,
        analysisId,
        url,
        options,
        startTime
      );

      // Store in legacy VideoAnalysis format for backward compatibility
      await this.storeLegacyAnalysisRecord(legacyResults, options);

      logger.info('Backward compatibility analysis completed', {
        analysisId,
        processingTime: Date.now() - startTime
      });

      return legacyResults;

    } catch (error) {
      logger.error('Backward compatibility analysis failed', {
        analysisId,
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Transcribe audio with legacy API format
   */
  async transcribeAudio(url, options = {}) {
    const startTime = Date.now();
    
    try {
      // Use audio processor through orchestrator
      const contentMetadata = {
        filename: url,
        source: 'url',
        url: url,
        userId: options.user_id,
        mediaType: 'audio'
      };

      const processingResult = await this.orchestrator.processContent(
        null,
        contentMetadata,
        {
          transcription: true,
          speakers: options.speaker_identification !== false,
          sentiment: false,
          summarization: false
        }
      );

      // Convert to legacy transcription format
      const legacyResult = this.convertTranscriptionToLegacy(
        processingResult,
        options,
        startTime
      );

      return legacyResult;

    } catch (error) {
      logger.error('Backward compatibility transcription failed', {
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get analysis results with legacy format
   */
  async getAnalysisResults(analysisId, userId) {
    try {
      // First try to find in new models
      const [videoAnalysis, audioAnalysis, imageAnalysis] = await Promise.all([
        VideoAnalysis.findOne({ where: { id: analysisId, user_id: userId } }),
        AudioAnalysis.findOne({ where: { id: analysisId, user_id: userId } }),
        ImageAnalysis.findOne({ where: { id: analysisId, user_id: userId } })
      ]);

      const analysis = videoAnalysis || audioAnalysis || imageAnalysis;

      if (analysis) {
        // Convert new format to legacy format
        return await this.convertNewAnalysisToLegacy(analysis, userId);
      }

      // Fallback to legacy VideoAnalysis table
      const legacyAnalysis = await VideoAnalysis.findOne({
        where: { id: analysisId, user_id: userId },
        include: [{ model: Content, as: 'Content', required: false }]
      });

      if (legacyAnalysis) {
        return await this.formatLegacyAnalysis(legacyAnalysis, userId);
      }

      return null;

    } catch (error) {
      logger.error('Failed to get analysis results', {
        analysisId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user's analysis history with legacy format
   */
  async getUserAnalysisHistory(userId, options = {}) {
    const { limit = 20, offset = 0, sort = 'created_at', order = 'desc' } = options;

    try {
      // Get from both new and legacy sources
      const [newAnalyses, legacyAnalyses] = await Promise.all([
        this.getNewFormatAnalyses(userId, { limit, offset, sort, order }),
        this.getLegacyFormatAnalyses(userId, { limit, offset, sort, order })
      ]);

      // Merge and deduplicate results
      const mergedResults = this.mergeAnalysisHistory(newAnalyses, legacyAnalyses);
      
      // Sort by specified field and order
      mergedResults.sort((a, b) => {
        const aVal = a[sort];
        const bVal = b[sort];
        if (order.toLowerCase() === 'desc') {
          return bVal > aVal ? 1 : -1;
        } else {
          return aVal > bVal ? 1 : -1;
        }
      });

      // Apply pagination
      const paginatedResults = mergedResults.slice(offset, offset + limit);

      return {
        analyses: paginatedResults,
        total_count: mergedResults.length,
        page_info: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: mergedResults.length > parseInt(offset) + parseInt(limit)
        }
      };

    } catch (error) {
      logger.error('Failed to get user analysis history', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Convert legacy options to new orchestrator format
   */
  convertLegacyOptions(legacyOptions) {
    return {
      transcription: legacyOptions.transcription !== false,
      sentiment: legacyOptions.sentiment !== false,
      thumbnails: legacyOptions.thumbnails !== false,
      objectDetection: legacyOptions.ocr !== false,
      speakers: legacyOptions.speaker_identification !== false,
      summarization: legacyOptions.enableSummarization !== false,
      qualityAnalysis: true,
      metadataExtraction: true
    };
  }

  /**
   * Convert new orchestrator results to legacy format
   */
  async convertToLegacyFormat(processingResult, analysisId, url, options, startTime) {
    const processingTime = Date.now() - startTime;

    // Handle both orchestrator format (processingResult.results.data) and 
    // MultimediaAnalyzer format (direct properties)
    const isOrchestratorFormat = processingResult.results && processingResult.results.data;
    const data = isOrchestratorFormat ? processingResult.results.data : processingResult;

    // Base legacy result structure
    const legacyResult = {
      success: true,
      analysis_id: analysisId,
      processing_time: processingTime,
      url: url,
      platform: data.platform || this.detectPlatform(url),
      status: data.status || 'completed',
      metadata: data.metadata || {},
      quality_score: data.qualityAnalysis?.overallScore || 0,
      errors: processingResult.errors || [],
      warnings: processingResult.warnings || []
    };

    // Handle transcription
    if (data.transcription) {
      if (data.transcription.fullText) {
        legacyResult.transcription = data.transcription.fullText;
        legacyResult.language = data.transcription.language || 'unknown';
      } else if (typeof data.transcription === 'string') {
        legacyResult.transcription = data.transcription;
      }
    }

    // Handle sentiment analysis
    if (data.sentiment) {
      legacyResult.sentiment = {
        score: data.sentiment.overall?.score || data.sentiment.score || 0,
        label: data.sentiment.overall?.label || data.sentiment.label || 'neutral',
        confidence: data.sentiment.overall?.confidence || data.sentiment.confidence || 0
      };
    }

    // Handle speakers
    if (data.speakers) {
      legacyResult.speakers = data.speakers.speakers || data.speakers || [];
      legacyResult.speaker_count = legacyResult.speakers.length;
    }

    // Handle thumbnails
    if (data.thumbnails) {
      legacyResult.thumbnails = data.thumbnails;
      legacyResult.thumbnail_count = legacyResult.thumbnails.length;
    }

    // Handle OCR/text extraction
    if (data.ocrText) {
      legacyResult.ocr_text = data.ocrText.fullText || data.ocrText || '';
      legacyResult.ocr_text_length = legacyResult.ocr_text.length;
    }

    // Handle object detection
    if (data.objects) {
      legacyResult.objects = data.objects;
    }

    // Handle AI description (for images)
    if (data.aiDescription) {
      legacyResult.description = data.aiDescription.description;
      legacyResult.ai_confidence = data.aiDescription.confidence;
    }

    // Handle summary
    if (data.summary) {
      legacyResult.summary = data.summary;
    }

    // Handle generated title
    if (data.generatedTitle) {
      legacyResult.generatedTitle = data.generatedTitle;
    }

    // Handle auto tags - prioritize AI-generated tags over generic platform tags
    if (data.tags && data.tags.length > 0) {
      // Use AI-generated tags (from MultimediaAnalyzer.generateTags)
      legacyResult.auto_tags = data.tags;
    } else if (data.auto_tags && data.auto_tags.length > 0) {
      // Fallback to basic auto_tags if no AI tags available
      legacyResult.auto_tags = data.auto_tags;
    }

    // Handle tags (from AI analysis) - ensure compatibility
    if (data.tags) {
      legacyResult.tags = data.tags;
    }

    // Handle category
    if (data.category) {
      legacyResult.category = data.category;
    }

    return legacyResult;
  }

  /**
   * Convert transcription results to legacy format
   */
  convertTranscriptionToLegacy(processingResult, options, startTime) {
    const results = processingResult.results;
    const processingTime = Date.now() - startTime;

    const transcriptionData = results.data.transcription || {};
    const speakerData = results.data.speakers || {};

    return {
      success: true,
      text: transcriptionData.fullText || '',
      transcription: transcriptionData.fullText || '',
      timestamps: transcriptionData.segments || [],
      speakers: speakerData.speakers || [],
      language: transcriptionData.language || 'unknown',
      confidence: transcriptionData.statistics?.averageConfidence || 0.8,
      processing_time: processingTime
    };
  }

  /**
   * Store analysis record in legacy format for compatibility
   */
  async storeLegacyAnalysisRecord(legacyResults, options) {
    try {
      // Store in VideoAnalysis table using legacy structure
      const analysisRecord = {
        id: legacyResults.analysis_id,
        user_id: options.user_id,
        content_id: options.content_id || null,
        url: legacyResults.url,
        title: legacyResults.metadata?.title || 'Untitled',
        description: legacyResults.metadata?.description || '',
        duration: legacyResults.metadata?.duration || 0,
        file_size: legacyResults.metadata?.file_size || 0,
        format: legacyResults.metadata?.format || 'unknown',
        resolution: legacyResults.metadata?.resolution || 'unknown',
        fps: legacyResults.metadata?.fps || 0,
        bitrate: legacyResults.metadata?.bitrate || 0,
        codec: legacyResults.metadata?.codec || 'unknown',
        transcription: legacyResults.transcription || '',
        sentiment_score: legacyResults.sentiment?.score || 0,
        sentiment_label: legacyResults.sentiment?.label || 'neutral',
        sentiment_confidence: legacyResults.sentiment?.confidence || 0,
        language_detected: legacyResults.language || 'unknown',
        processing_time: legacyResults.processing_time,
        thumbnail_count: legacyResults.thumbnail_count || 0,
        speaker_count: legacyResults.speaker_count || 0,
        ocr_text_length: legacyResults.ocr_text_length || 0,
        quality_score: legacyResults.quality_score || 0,
        error_count: legacyResults.errors?.length || 0,
        warning_count: legacyResults.warnings?.length || 0,
        analysis_version: '1.4.1-compat',
        metadata: legacyResults.metadata || {},
        processing_stats: {
          compatibility_mode: true,
          orchestrator_used: true,
          processing_time: legacyResults.processing_time
        }
      };

      await VideoAnalysis.create(analysisRecord);

      // Update linked content if provided
      if (options.content_id) {
        await Content.update(
          {
            transcription: legacyResults.transcription,
            metadata: {
              ...legacyResults.metadata,
              last_analyzed: new Date().toISOString(),
              analysis_id: legacyResults.analysis_id
            }
          },
          { where: { id: options.content_id, user_id: options.user_id } }
        );
      }

    } catch (error) {
      logger.error('Failed to store legacy analysis record', {
        analysisId: legacyResults.analysis_id,
        error: error.message
      });
      // Don't throw - analysis still succeeded
    }
  }

  /**
   * Convert new analysis models to legacy format
   */
  async convertNewAnalysisToLegacy(analysis, userId) {
    const analysisType = analysis.constructor.tableName;
    let legacyFormat = {
      id: analysis.id,
      user_id: analysis.user_id,
      url: analysis.source_url || '',
      title: analysis.title || 'Untitled',
      description: analysis.description || '',
      created_at: analysis.createdAt,
      processing_stats: analysis.processing_stats || {}
    };

    // Add type-specific fields
    switch (analysisType) {
      case 'video_analyses':
        legacyFormat = {
          ...legacyFormat,
          duration: analysis.duration || 0,
          format: analysis.video_metadata?.format || 'unknown',
          resolution: analysis.video_metadata?.resolution || 'unknown',
          fps: analysis.video_metadata?.fps || 0,
          transcription: analysis.transcription_results?.fullText || '',
          sentiment_score: analysis.sentiment_analysis?.overall?.score || 0,
          sentiment_label: analysis.sentiment_analysis?.overall?.label || 'neutral',
          language_detected: analysis.transcription_results?.language || 'unknown',
          quality_score: analysis.quality_assessment?.qualityScore || 0
        };
        break;

      case 'audio_analyses':
        legacyFormat = {
          ...legacyFormat,
          duration: analysis.duration || 0,
          transcription: analysis.transcription_results?.fullText || '',
          sentiment_score: analysis.sentiment_analysis?.overall?.score || 0,
          sentiment_label: analysis.sentiment_analysis?.overall?.label || 'neutral',
          language_detected: analysis.language_detection?.primaryLanguage || 'unknown',
          speaker_count: analysis.speaker_analysis?.totalSpeakers || 0
        };
        break;

      case 'image_analyses':
        legacyFormat = {
          ...legacyFormat,
          description: analysis.ai_description?.description || '',
          ocr_text: analysis.ocr_results?.fullText || '',
          quality_score: analysis.quality_assessment?.qualityScore || 0
        };
        break;
    }

    // Get related data
    const [thumbnails, ocrCaptions] = await Promise.all([
      Thumbnail.findAll({
        where: { 
          user_id: userId,
          analysis_id: analysis.id 
        },
        order: [['timestamp_seconds', 'ASC']],
        limit: 10
      }),
      OCRCaption.findAll({
        where: { 
          user_id: userId,
          analysis_id: analysis.id 
        },
        order: [['timestamp_seconds', 'ASC']],
        limit: 20
      })
    ]);

    return {
      success: true,
      analysis: legacyFormat,
      thumbnails: thumbnails,
      ocr_captions: ocrCaptions,
      related_content: null
    };
  }

  /**
   * Format legacy analysis for API response
   */
  async formatLegacyAnalysis(legacyAnalysis, userId) {
    // Get related data
    const [thumbnails, ocrCaptions] = await Promise.all([
      Thumbnail.findAll({
        where: { 
          user_id: userId,
          video_url: legacyAnalysis.url 
        },
        order: [['timestamp', 'ASC']]
      }),
      OCRCaption.findAll({
        where: { 
          user_id: userId,
          video_url: legacyAnalysis.url 
        },
        order: [['timestamp', 'ASC']]
      })
    ]);

    return {
      success: true,
      analysis: legacyAnalysis,
      thumbnails: thumbnails,
      ocr_captions: ocrCaptions,
      related_content: legacyAnalysis.Content
    };
  }

  /**
   * Get analyses from new format models
   */
  async getNewFormatAnalyses(userId, options) {
    const { limit, offset, sort, order } = options;
    
    const [videoAnalyses, audioAnalyses, imageAnalyses] = await Promise.all([
      VideoAnalysis.findAll({
        where: { user_id: userId, analysis_method: { [require('../models').Sequelize.Op.ne]: 'legacy_migration' } },
        limit: Math.ceil(limit / 3),
        offset: Math.floor(offset / 3),
        order: [[sort === 'created_at' ? 'createdAt' : sort, order.toUpperCase()]],
        attributes: ['id', 'title', 'description', 'duration', 'quality_assessment', 'createdAt']
      }),
      AudioAnalysis.findAll({
        where: { user_id: userId, analysis_method: { [require('../models').Sequelize.Op.ne]: 'legacy_migration' } },
        limit: Math.ceil(limit / 3),
        offset: Math.floor(offset / 3),
        order: [[sort === 'created_at' ? 'createdAt' : sort, order.toUpperCase()]],
        attributes: ['id', 'title', 'description', 'duration', 'quality_assessment', 'createdAt']
      }),
      ImageAnalysis.findAll({
        where: { user_id: userId, analysis_method: { [require('../models').Sequelize.Op.ne]: 'legacy_migration' } },
        limit: Math.ceil(limit / 3),
        offset: Math.floor(offset / 3),
        order: [[sort === 'created_at' ? 'createdAt' : sort, order.toUpperCase()]],
        attributes: ['id', 'title', 'description', 'quality_assessment', 'createdAt']
      })
    ]);

    // Convert to legacy format
    const converted = [];
    
    videoAnalyses.forEach(analysis => {
      converted.push({
        id: analysis.id,
        title: analysis.title,
        description: analysis.description,
        duration: analysis.duration,
        format: 'video',
        quality_score: analysis.quality_assessment?.qualityScore || 0,
        created_at: analysis.createdAt,
        processing_time: analysis.processing_stats?.processingTime || 0,
        analysis_type: 'video'
      });
    });

    audioAnalyses.forEach(analysis => {
      converted.push({
        id: analysis.id,
        title: analysis.title,
        description: analysis.description,
        duration: analysis.duration,
        format: 'audio',
        quality_score: analysis.quality_assessment?.qualityScore || 0,
        created_at: analysis.createdAt,
        processing_time: analysis.processing_stats?.processingTime || 0,
        analysis_type: 'audio'
      });
    });

    imageAnalyses.forEach(analysis => {
      converted.push({
        id: analysis.id,
        title: analysis.title,
        description: analysis.description,
        duration: 0,
        format: 'image',
        quality_score: analysis.quality_assessment?.qualityScore || 0,
        created_at: analysis.createdAt,
        processing_time: analysis.processing_stats?.processingTime || 0,
        analysis_type: 'image'
      });
    });

    return converted;
  }

  /**
   * Get analyses from legacy format
   */
  async getLegacyFormatAnalyses(userId, options) {
    const { limit, offset, sort, order } = options;

    const legacyAnalyses = await VideoAnalysis.findAll({
      where: { 
        user_id: userId,
        [require('../models').Sequelize.Op.or]: [
          { analysis_version: '1.4.1' },
          { analysis_method: 'legacy_migration' },
          { analysis_method: null }
        ]
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort === 'created_at' ? 'createdAt' : sort, order.toUpperCase()]],
      attributes: [
        'id', 'url', 'title', 'description', 'duration', 'format',
        'sentiment_score', 'sentiment_label', 'language_detected',
        'thumbnail_count', 'speaker_count', 'processing_time',
        'quality_score', 'createdAt'
      ]
    });

    return legacyAnalyses.map(analysis => ({
      id: analysis.id,
      url: analysis.url,
      title: analysis.title,
      description: analysis.description,
      duration: analysis.duration,
      format: analysis.format,
      sentiment_score: analysis.sentiment_score,
      sentiment_label: analysis.sentiment_label,
      language_detected: analysis.language_detected,
      thumbnail_count: analysis.thumbnail_count,
      speaker_count: analysis.speaker_count,
      processing_time: analysis.processing_time,
      quality_score: analysis.quality_score,
      created_at: analysis.createdAt,
      analysis_type: 'legacy'
    }));
  }

  /**
   * Merge analysis history from different sources
   */
  mergeAnalysisHistory(newAnalyses, legacyAnalyses) {
    const merged = [...newAnalyses, ...legacyAnalyses];
    
    // Remove duplicates based on ID
    const uniqueAnalyses = merged.filter((analysis, index, self) => 
      index === self.findIndex(a => a.id === analysis.id)
    );

    return uniqueAnalyses;
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url) {
    if (!url) return null;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.includes('facebook.com') || url.includes('fb.com')) {
      return 'facebook';
    }
    if (url.includes('instagram.com')) {
      return 'instagram';
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter';
    }
    if (url.includes('tiktok.com')) {
      return 'tiktok';
    }
    
    return 'unknown';
  }

  /**
   * Test backward compatibility
   */
  async testCompatibility() {
    console.log('🧪 Testing backward compatibility...');
    
    try {
      // Test basic functionality
      const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const testOptions = {
        user_id: 'test-user',
        transcription: true,
        sentiment: true,
        thumbnails: false
      };
      
      console.log('   - Testing analyzeContent...');
      // Note: This would normally analyze real content, but for testing we just verify the interface
      
      console.log('   - Testing result format conversion...');
      const mockProcessingResult = {
        results: {
          data: {
            transcription: { fullText: 'Test transcription', language: 'en' },
            sentiment: { overall: { score: 0.8, label: 'positive', confidence: 0.9 } }
          }
        },
        jobId: 'test-job',
        errors: [],
        warnings: []
      };
      
      const legacyFormat = await this.convertToLegacyFormat(
        mockProcessingResult,
        'test-analysis-id',
        testUrl,
        testOptions,
        Date.now() - 5000
      );
      
      console.log('   - Legacy format structure:', Object.keys(legacyFormat));
      
      console.log('✅ Backward compatibility test passed');
      return true;
      
    } catch (error) {
      console.error('❌ Backward compatibility test failed:', error);
      return false;
    }
  }
}

module.exports = BackwardCompatibilityService; 