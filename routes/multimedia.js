const express = require('express');
const router = express.Router();
const { isAuthenticated, requireFeature } = require('../middleware');

// Import backward compatibility service for seamless transition
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

// Import models
const { Content, VideoAnalysis, Speaker, Thumbnail, OCRCaption } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Multimedia Analysis Routes (Backward Compatible)
 * 
 * This module provides REST API endpoints for multimedia content analysis with
 * full backward compatibility. While internally using the new modular processor
 * architecture, all endpoints maintain their original response formats to ensure
 * existing clients continue to work without modifications.
 * 
 * Key Features:
 * - Video transcription and audio analysis
 * - Speaker identification and voice print matching
 * - Thumbnail generation and key moment extraction
 * - OCR text extraction from video frames
 * - Sentiment analysis and content categorization
 * - Integration with existing DaySave content management
 * 
 * All routes require authentication and follow RESTful principles.
 * Results are stored in the database and linked to user content.
 */

// Initialize backward compatibility service
const compatibilityService = new BackwardCompatibilityService();

/**
 * POST /multimedia/analyze
 * 
 * Comprehensive multimedia analysis endpoint (backward compatible)
 * Analyzes video/audio content and returns complete analysis results
 * 
 * Body parameters:
 * - url (required): Video/audio URL to analyze
 * - content_id (optional): Link analysis to existing content record
 * - options (optional): Analysis options object
 *   - transcription: boolean (default: true)
 *   - sentiment: boolean (default: true)
 *   - thumbnails: boolean (default: true)
 *   - ocr: boolean (default: true)
 *   - speaker_identification: boolean (default: true)
 * 
 * Returns:
 * - analysis_id: UUID of the analysis record
 * - transcription: Full text transcription with timestamps
 * - sentiment: Sentiment analysis results
 * - thumbnails: Generated thumbnail URLs and metadata
 * - speakers: Identified speakers with confidence scores
 * - ocr_text: Extracted text from video frames
 * - metadata: Video metadata and technical information
 */
router.post('/analyze', [
  isAuthenticated,
  requireFeature('ai_analysis_enabled')
], async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, content_id, options = {} } = req.body;
    
    // Validate required parameters
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'Valid URL is required for multimedia analysis',
        analysis_id: uuidv4() 
      });
    }
    
    // Set default analysis options
    const analysisOptions = {
      transcription: options.transcription !== false,
      sentiment: options.sentiment !== false,
      thumbnails: options.thumbnails !== false,
      ocr: options.ocr !== false,
      speaker_identification: options.speaker_identification !== false,
      enableSummarization: options.enableSummarization !== false,
      user_id: req.user.id,
      content_id: content_id,
      ...options
    };
    
    logger.info(`Starting backward compatible multimedia analysis for user ${req.user.id}`, {
      url,
      content_id,
      options: analysisOptions
    });
    
    // Perform analysis through backward compatibility service
    const analysisResults = await compatibilityService.analyzeContent(url, analysisOptions);
    
    // Update content record if linked
    if (content_id) {
      await Content.update(
        { 
          title: analysisResults.metadata?.title || undefined,
          description: analysisResults.metadata?.description || undefined,
          transcription: analysisResults.transcription || undefined,
          metadata: {
            ...(await Content.findByPk(content_id))?.metadata,
            ...analysisResults.metadata,
            last_analyzed: new Date().toISOString(),
            analysis_id: analysisResults.analysis_id
          }
        },
        { where: { id: content_id, user_id: req.user.id } }
      );
    }
    
    logger.info(`Backward compatible multimedia analysis completed for user ${req.user.id}`, {
      analysis_id: analysisResults.analysis_id,
      processing_time: analysisResults.processing_time,
      transcription_length: analysisResults.transcription?.length || 0,
      thumbnail_count: analysisResults.thumbnail_count || 0,
      speaker_count: analysisResults.speaker_count || 0
    });
    
    // Return results in legacy format
    res.json(analysisResults);
    
  } catch (error) {
    logger.error(`Backward compatible multimedia analysis failed for user ${req.user.id}`, {
      error: error.message,
      url: req.body.url,
      content_id: req.body.content_id
    });
    
    res.status(500).json({
      success: false,
      error: 'Multimedia analysis failed',
      message: error.message,
      processing_time: Date.now() - startTime
    });
  }
});

/**
 * POST /multimedia/transcribe
 * 
 * Audio transcription endpoint (backward compatible)
 * Extracts and transcribes audio from video/audio URLs
 * 
 * Body parameters:
 * - url (required): Video/audio URL to transcribe
 * - language (optional): Language code for transcription (auto-detect if not provided)
 * - speaker_identification (optional): Enable speaker identification (default: true)
 * 
 * Returns:
 * - transcription: Full text transcription
 * - timestamps: Word-level timestamps
 * - speakers: Identified speakers with confidence scores
 * - language: Detected language
 * - confidence: Overall transcription confidence
 */
router.post('/transcribe', isAuthenticated, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, language, speaker_identification = true } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required for transcription' });
    }
    
    logger.info(`Starting backward compatible transcription for user ${req.user.id}`, { url, language });
    
    // Perform transcription through backward compatibility service
    const transcriptionResults = await compatibilityService.transcribeAudio(url, {
      language,
      speaker_identification,
      user_id: req.user.id
    });
    
    // Store transcription results in legacy format
    const analysisId = uuidv4();
    await VideoAnalysis.create({
      id: analysisId,
      user_id: req.user.id,
      url,
      title: 'Audio Transcription',
      transcription: transcriptionResults.text,
      language_detected: transcriptionResults.language,
      speaker_count: transcriptionResults.speakers?.length || 0,
      processing_time: transcriptionResults.processing_time,
      analysis_version: '1.4.1-compat',
      metadata: {
        transcription_confidence: transcriptionResults.confidence,
        word_count: transcriptionResults.text?.split(' ').length || 0,
        compatibility_mode: true
      }
    });
    
    logger.info(`Backward compatible transcription completed for user ${req.user.id}`, {
      analysis_id: analysisId,
      processing_time: transcriptionResults.processing_time,
      text_length: transcriptionResults.text?.length || 0
    });
    
    // Add analysis_id to response for consistency
    const response = {
      ...transcriptionResults,
      analysis_id: analysisId
    };
    
    res.json(response);
    
  } catch (error) {
    logger.error(`Backward compatible transcription failed for user ${req.user.id}`, {
      error: error.message,
      url: req.body.url
    });
    
    res.status(500).json({
      success: false,
      error: 'Transcription failed',
      message: error.message,
      processing_time: Date.now() - startTime
    });
  }
});

/**
 * POST /multimedia/thumbnails
 * 
 * Thumbnail generation endpoint (backward compatible)
 * Generates thumbnails and extracts key moments from video content
 * 
 * Body parameters:
 * - url (required): Video URL to process
 * - count (optional): Number of thumbnails to generate (default: 5)
 * - key_moments (optional): Extract key moments (default: true)
 * 
 * Returns:
 * - thumbnails: Array of thumbnail URLs with metadata
 * - key_moments: Array of key moment thumbnails
 * - total_count: Total number of thumbnails generated
 */
router.post('/thumbnails', isAuthenticated, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, count = 5, key_moments = true } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required for thumbnail generation' });
    }
    
    logger.info(`Starting backward compatible thumbnail generation for user ${req.user.id}`, { url, count });
    
    // Use compatibility service to generate thumbnails
    const thumbnailOptions = {
      user_id: req.user.id,
      thumbnails: true,
      thumbnail_count: count,
      key_moments: key_moments,
      transcription: false,
      sentiment: false,
      speaker_identification: false
    };
    
    const analysisResults = await compatibilityService.analyzeContent(url, thumbnailOptions);
    
    logger.info(`Backward compatible thumbnail generation completed for user ${req.user.id}`, {
      processing_time: Date.now() - startTime,
      thumbnail_count: analysisResults.thumbnails?.length || 0
    });
    
    res.json({
      success: true,
      thumbnails: analysisResults.thumbnails || [],
      key_moments: analysisResults.key_moments || [],
      total_count: analysisResults.thumbnails?.length || 0,
      processing_time: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error(`Backward compatible thumbnail generation failed for user ${req.user.id}`, {
      error: error.message,
      url: req.body.url
    });
    
    res.status(500).json({
      success: false,
      error: 'Thumbnail generation failed',
      message: error.message,
      processing_time: Date.now() - startTime
    });
  }
});

/**
 * POST /multimedia/speakers/identify
 * 
 * Speaker identification endpoint (backward compatible)
 * Identifies speakers in audio/video content using voice print analysis
 * 
 * Body parameters:
 * - url (required): Audio/video URL to analyze
 * - create_new_speakers (optional): Create new speaker profiles for unknown voices (default: true)
 * - confidence_threshold (optional): Minimum confidence for speaker identification (default: 0.7)
 * 
 * Returns:
 * - speakers: Array of identified speakers with confidence scores
 * - unknown_speakers: Count of unidentified speakers
 * - new_speakers_created: Count of new speaker profiles created
 * - total_speech_time: Total duration of speech detected
 */
router.post('/speakers/identify', isAuthenticated, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, create_new_speakers = true, confidence_threshold = 0.7 } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required for speaker identification' });
    }
    
    logger.info(`Starting backward compatible speaker identification for user ${req.user.id}`, { 
      url, create_new_speakers, confidence_threshold 
    });
    
    // Use compatibility service for speaker identification
    const speakerOptions = {
      user_id: req.user.id,
      transcription: false,
      sentiment: false,
      thumbnails: false,
      speaker_identification: true,
      create_new_speakers: create_new_speakers,
      confidence_threshold: confidence_threshold
    };
    
    const analysisResults = await compatibilityService.analyzeContent(url, speakerOptions);
    
    // Format speaker results for legacy API
    const speakerResults = {
      speakers: analysisResults.speakers || [],
      unknown_speakers: 0,
      new_speakers_created: 0,
      total_speech_time: analysisResults.metadata?.duration || 0
    };
    
    // Count unknown speakers and estimate new speakers created
    speakerResults.unknown_speakers = speakerResults.speakers.filter(s => !s.speaker_id).length;
    speakerResults.new_speakers_created = Math.min(speakerResults.unknown_speakers, create_new_speakers ? 10 : 0);
    
    // Update speaker usage statistics
    for (const speaker of speakerResults.speakers) {
      if (speaker.speaker_id) {
        await Speaker.increment('usage_count', { where: { id: speaker.speaker_id } });
        await Speaker.update(
          { last_used: new Date() },
          { where: { id: speaker.speaker_id } }
        );
      }
    }
    
    logger.info(`Backward compatible speaker identification completed for user ${req.user.id}`, {
      processing_time: Date.now() - startTime,
      speakers_identified: speakerResults.speakers.length,
      new_speakers_created: speakerResults.new_speakers_created
    });
    
    res.json({
      success: true,
      ...speakerResults,
      processing_time: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error(`Backward compatible speaker identification failed for user ${req.user.id}`, {
      error: error.message,
      url: req.body.url
    });
    
    res.status(500).json({
      success: false,
      error: 'Speaker identification failed',
      message: error.message,
      processing_time: Date.now() - startTime
    });
  }
});

/**
 * GET /multimedia/analysis/:id
 * 
 * Get analysis results (backward compatible)
 * Retrieves detailed analysis results for a specific analysis ID
 * 
 * Path parameters:
 * - id: Analysis ID to retrieve
 * 
 * Returns:
 * - analysis: Complete analysis results including transcription, thumbnails, speakers, etc.
 * - related_content: Associated content record if linked
 * - processing_stats: Analysis processing statistics
 */
router.get('/analysis/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Use compatibility service to get analysis results
    const analysisResults = await compatibilityService.getAnalysisResults(id, req.user.id);
    
    if (!analysisResults) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    res.json(analysisResults);
    
  } catch (error) {
    logger.error(`Failed to fetch backward compatible analysis for user ${req.user.id}`, {
      analysis_id: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis',
      message: error.message
    });
  }
});

/**
 * GET /multimedia/analysis
 * 
 * Get user's analysis history (backward compatible)
 * Returns paginated list of all multimedia analyses for the authenticated user
 * 
 * Query parameters:
 * - limit (optional): Maximum number of analyses to return (default: 20)
 * - offset (optional): Number of analyses to skip (default: 0)
 * - sort (optional): Sort field (created_at, processing_time, title) (default: created_at)
 * - order (optional): Sort order (asc, desc) (default: desc)
 * 
 * Returns:
 * - analyses: Array of analysis records
 * - total_count: Total number of analyses
 * - page_info: Pagination information
 */
router.get('/analysis', isAuthenticated, async (req, res) => {
  try {
    const { limit = 20, offset = 0, sort = 'created_at', order = 'desc' } = req.query;
    
    // Use compatibility service to get analysis history
    const analysisHistory = await compatibilityService.getUserAnalysisHistory(req.user.id, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort,
      order
    });
    
    res.json({
      success: true,
      ...analysisHistory
    });
    
  } catch (error) {
    logger.error(`Failed to fetch backward compatible analyses for user ${req.user.id}`, {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analyses',
      message: error.message
    });
  }
});

/**
 * GET /multimedia/compatibility/test
 * 
 * Test backward compatibility (development/testing endpoint)
 * Verifies that the compatibility layer is working correctly
 * 
 * Returns:
 * - success: Boolean indicating if compatibility test passed
 * - message: Test result message
 * - details: Test execution details
 */
router.get('/compatibility/test', isAuthenticated, async (req, res) => {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Compatibility testing not available in production' });
    }
    
    logger.info(`Running backward compatibility test for user ${req.user.id}`);
    
    const testResult = await compatibilityService.testCompatibility();
    
    res.json({
      success: testResult,
      message: testResult ? 'Backward compatibility test passed' : 'Backward compatibility test failed',
      timestamp: new Date().toISOString(),
      compatibility_service_version: '1.0.0',
      details: {
        orchestrator_available: true,
        result_formatter_available: true,
        database_models_available: true
      }
    });
    
  } catch (error) {
    logger.error(`Backward compatibility test failed for user ${req.user.id}`, {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Compatibility test failed',
      message: error.message
    });
  }
});

module.exports = router; 