const express = require('express');
const router = express.Router();
const { isAuthenticated, requireFeature } = require('../middleware');
const { 
  MultimediaAnalyzer, 
  VoicePrintDatabase, 
  ThumbnailGenerator, 
  VideoProcessor 
} = require('../services/multimedia');
const { Content, VideoAnalysis, Speaker, Thumbnail, OCRCaption } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Multimedia Analysis Routes
 * 
 * This module provides REST API endpoints for multimedia content analysis including:
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

// Initialize multimedia services
const multimediaAnalyzer = new MultimediaAnalyzer();
const voicePrintDB = new VoicePrintDatabase();
const thumbnailGenerator = new ThumbnailGenerator();
const videoProcessor = new VideoProcessor();

/**
 * POST /multimedia/analyze
 * 
 * Comprehensive multimedia analysis endpoint
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
  const analysisId = uuidv4();
  
  try {
    const { url, content_id, options = {} } = req.body;
    
    // Validate required parameters
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        error: 'Valid URL is required for multimedia analysis',
        analysis_id: analysisId 
      });
    }
    
    // Set default analysis options
    const analysisOptions = {
      transcription: options.transcription !== false,
      sentiment: options.sentiment !== false,
      thumbnails: options.thumbnails !== false,
      ocr: options.ocr !== false,
      speaker_identification: options.speaker_identification !== false,
      ...options
    };
    
    logger.info(`Starting multimedia analysis for user ${req.user.id}`, {
      analysis_id: analysisId,
      url,
      content_id,
      options: analysisOptions
    });
    
    // Perform comprehensive multimedia analysis
    const analysisResults = await multimediaAnalyzer.analyzeContent(url, {
      user_id: req.user.id,
      analysis_id: analysisId,
      content_id,
      ...analysisOptions
    });
    
    // Store analysis results in database
    const videoAnalysis = await VideoAnalysis.create({
      id: analysisId,
      user_id: req.user.id,
      content_id: content_id || null,
      url,
      title: analysisResults.metadata?.title || 'Untitled',
      description: analysisResults.metadata?.description || '',
      duration: analysisResults.metadata?.duration || 0,
      file_size: analysisResults.metadata?.file_size || 0,
      format: analysisResults.metadata?.format || 'unknown',
      resolution: analysisResults.metadata?.resolution || 'unknown',
      fps: analysisResults.metadata?.fps || 0,
      bitrate: analysisResults.metadata?.bitrate || 0,
      codec: analysisResults.metadata?.codec || 'unknown',
      transcription: analysisResults.transcription || '',
      sentiment_score: analysisResults.sentiment?.score || 0,
      sentiment_label: analysisResults.sentiment?.label || 'neutral',
      sentiment_confidence: analysisResults.sentiment?.confidence || 0,
      language_detected: analysisResults.language || 'unknown',
      processing_time: Date.now() - startTime,
      thumbnail_count: analysisResults.thumbnails?.length || 0,
      speaker_count: analysisResults.speakers?.length || 0,
      ocr_text_length: analysisResults.ocr_text?.length || 0,
      quality_score: analysisResults.quality_score || 0,
      error_count: analysisResults.errors?.length || 0,
      warning_count: analysisResults.warnings?.length || 0,
      analysis_version: '1.4.1',
      metadata: analysisResults.metadata || {},
      processing_stats: {
        start_time: startTime,
        end_time: Date.now(),
        total_time: Date.now() - startTime,
        options_used: analysisOptions
      }
    });
    
    // Update content record if linked
    if (content_id) {
      await Content.update(
        { 
          title: analysisResults.metadata?.title || undefined,
          description: analysisResults.metadata?.description || undefined 
        },
        { where: { id: content_id, user_id: req.user.id } }
      );
    }
    
    logger.info(`Multimedia analysis completed for user ${req.user.id}`, {
      analysis_id: analysisId,
      processing_time: Date.now() - startTime,
      transcription_length: analysisResults.transcription?.length || 0,
      thumbnail_count: analysisResults.thumbnails?.length || 0,
      speaker_count: analysisResults.speakers?.length || 0
    });
    
    // Return comprehensive analysis results
    res.json({
      success: true,
      analysis_id: analysisId,
      processing_time: Date.now() - startTime,
      transcription: analysisResults.transcription,
      sentiment: analysisResults.sentiment,
      thumbnails: analysisResults.thumbnails,
      speakers: analysisResults.speakers,
      ocr_text: analysisResults.ocr_text,
      metadata: analysisResults.metadata,
      quality_score: analysisResults.quality_score,
      language: analysisResults.language,
      errors: analysisResults.errors || [],
      warnings: analysisResults.warnings || []
    });
    
  } catch (error) {
    logger.error(`Multimedia analysis failed for user ${req.user.id}`, {
      analysis_id: analysisId,
      error: error.message,
      stack: error.stack,
      processing_time: Date.now() - startTime
    });
    
    // Store failed analysis record for debugging
    try {
      await VideoAnalysis.create({
        id: analysisId,
        user_id: req.user.id,
        content_id: req.body.content_id || null,
        url: req.body.url,
        title: 'Analysis Failed',
        processing_time: Date.now() - startTime,
        error_count: 1,
        analysis_version: '1.4.1',
        metadata: { error: error.message },
        processing_stats: {
          start_time: startTime,
          end_time: Date.now(),
          total_time: Date.now() - startTime,
          failed: true
        }
      });
    } catch (dbError) {
      logger.error('Failed to store error analysis record', { error: dbError.message });
    }
    
    res.status(500).json({
      success: false,
      error: 'Multimedia analysis failed',
      analysis_id: analysisId,
      message: error.message,
      processing_time: Date.now() - startTime
    });
  }
});

/**
 * POST /multimedia/transcribe
 * 
 * Audio transcription endpoint
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
    
    logger.info(`Starting transcription for user ${req.user.id}`, { url, language });
    
    // Perform audio transcription
    const transcriptionResults = await multimediaAnalyzer.transcribeAudio(url, {
      language,
      speaker_identification,
      user_id: req.user.id
    });
    
    // Store transcription results
    const analysisId = uuidv4();
    await VideoAnalysis.create({
      id: analysisId,
      user_id: req.user.id,
      url,
      title: 'Audio Transcription',
      transcription: transcriptionResults.text,
      language_detected: transcriptionResults.language,
      speaker_count: transcriptionResults.speakers?.length || 0,
      processing_time: Date.now() - startTime,
      analysis_version: '1.4.1',
      metadata: {
        transcription_confidence: transcriptionResults.confidence,
        word_count: transcriptionResults.text?.split(' ').length || 0
      }
    });
    
    logger.info(`Transcription completed for user ${req.user.id}`, {
      analysis_id: analysisId,
      processing_time: Date.now() - startTime,
      text_length: transcriptionResults.text?.length || 0
    });
    
    res.json({
      success: true,
      analysis_id: analysisId,
      transcription: transcriptionResults.text,
      timestamps: transcriptionResults.timestamps,
      speakers: transcriptionResults.speakers,
      language: transcriptionResults.language,
      confidence: transcriptionResults.confidence,
      processing_time: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error(`Transcription failed for user ${req.user.id}`, {
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
 * Thumbnail generation endpoint
 * Generates thumbnails and extracts key moments from videos
 * 
 * Body parameters:
 * - url (required): Video URL to generate thumbnails from
 * - count (optional): Number of thumbnails to generate (default: 5)
 * - quality (optional): Thumbnail quality (low, medium, high) (default: medium)
 * - key_moments (optional): Extract key moments automatically (default: true)
 * 
 * Returns:
 * - thumbnails: Array of generated thumbnail objects with URLs and metadata
 * - key_moments: Automatically detected key moments with timestamps
 * - total_count: Total number of thumbnails generated
 * - processing_time: Time taken to generate thumbnails
 */
router.post('/thumbnails', isAuthenticated, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { url, count = 5, quality = 'medium', key_moments = true } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Valid URL is required for thumbnail generation' });
    }
    
    logger.info(`Starting thumbnail generation for user ${req.user.id}`, { 
      url, count, quality, key_moments 
    });
    
    // Generate thumbnails
    const thumbnailResults = await thumbnailGenerator.generateThumbnails(url, {
      count,
      quality,
      key_moments,
      user_id: req.user.id
    });
    
    // Store thumbnail records in database
    const thumbnailRecords = [];
    for (const thumbnail of thumbnailResults.thumbnails) {
      const thumbnailRecord = await Thumbnail.create({
        id: uuidv4(),
        user_id: req.user.id,
        video_url: url,
        thumbnail_url: thumbnail.url,
        timestamp: thumbnail.timestamp,
        width: thumbnail.width,
        height: thumbnail.height,
        file_size: thumbnail.file_size,
        format: thumbnail.format,
        quality: quality,
        is_key_moment: thumbnail.is_key_moment || false,
        confidence_score: thumbnail.confidence || 0,
        scene_description: thumbnail.scene_description || '',
        dominant_colors: thumbnail.dominant_colors || [],
        brightness: thumbnail.brightness || 0,
        contrast: thumbnail.contrast || 0,
        blur_score: thumbnail.blur_score || 0,
        face_count: thumbnail.face_count || 0,
        object_count: thumbnail.object_count || 0,
        text_detected: thumbnail.text_detected || false,
        motion_score: thumbnail.motion_score || 0,
        aesthetic_score: thumbnail.aesthetic_score || 0,
        processing_time: thumbnail.processing_time || 0,
        analysis_version: '1.4.1',
        metadata: thumbnail.metadata || {}
      });
      thumbnailRecords.push(thumbnailRecord);
    }
    
    logger.info(`Thumbnail generation completed for user ${req.user.id}`, {
      processing_time: Date.now() - startTime,
      thumbnail_count: thumbnailResults.thumbnails.length,
      key_moments_count: thumbnailResults.key_moments?.length || 0
    });
    
    res.json({
      success: true,
      thumbnails: thumbnailResults.thumbnails,
      key_moments: thumbnailResults.key_moments,
      total_count: thumbnailResults.thumbnails.length,
      processing_time: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error(`Thumbnail generation failed for user ${req.user.id}`, {
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
 * Speaker identification endpoint
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
    
    logger.info(`Starting speaker identification for user ${req.user.id}`, { 
      url, create_new_speakers, confidence_threshold 
    });
    
    // Perform speaker identification
    const speakerResults = await voicePrintDB.identifySpeakers(url, {
      user_id: req.user.id,
      create_new_speakers,
      confidence_threshold
    });
    
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
    
    logger.info(`Speaker identification completed for user ${req.user.id}`, {
      processing_time: Date.now() - startTime,
      speakers_identified: speakerResults.speakers.length,
      new_speakers_created: speakerResults.new_speakers_created
    });
    
    res.json({
      success: true,
      speakers: speakerResults.speakers,
      unknown_speakers: speakerResults.unknown_speakers,
      new_speakers_created: speakerResults.new_speakers_created,
      total_speech_time: speakerResults.total_speech_time,
      processing_time: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error(`Speaker identification failed for user ${req.user.id}`, {
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
 * GET /multimedia/speakers
 * 
 * Get user's speaker database
 * Returns all speaker profiles associated with the authenticated user
 * 
 * Query parameters:
 * - limit (optional): Maximum number of speakers to return (default: 50)
 * - offset (optional): Number of speakers to skip (default: 0)
 * - sort (optional): Sort field (name, usage_count, created_at) (default: usage_count)
 * - order (optional): Sort order (asc, desc) (default: desc)
 * 
 * Returns:
 * - speakers: Array of speaker profiles
 * - total_count: Total number of speakers in database
 * - page_info: Pagination information
 */
router.get('/speakers', isAuthenticated, async (req, res) => {
  try {
    const { limit = 50, offset = 0, sort = 'usage_count', order = 'desc' } = req.query;
    
    const speakers = await Speaker.findAndCountAll({
      where: { user_id: req.user.id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      attributes: [
        'id', 'name', 'description', 'gender', 'age_range', 'accent',
        'language', 'confidence_score', 'usage_count', 'created_at', 'last_used'
      ]
    });
    
    res.json({
      success: true,
      speakers: speakers.rows,
      total_count: speakers.count,
      page_info: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: speakers.count > parseInt(offset) + parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error(`Failed to fetch speakers for user ${req.user.id}`, {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch speakers',
      message: error.message
    });
  }
});

/**
 * PUT /multimedia/speakers/:id
 * 
 * Update speaker profile
 * Updates an existing speaker profile with new information
 * 
 * Path parameters:
 * - id: Speaker ID to update
 * 
 * Body parameters:
 * - name (optional): Speaker name
 * - description (optional): Speaker description
 * - gender (optional): Speaker gender
 * - age_range (optional): Speaker age range
 * - accent (optional): Speaker accent
 * - language (optional): Speaker primary language
 * 
 * Returns:
 * - speaker: Updated speaker profile
 * - updated_fields: List of fields that were updated
 */
router.put('/speakers/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, gender, age_range, accent, language } = req.body;
    
    const speaker = await Speaker.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!speaker) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    const updatedFields = [];
    if (name !== undefined) { speaker.name = name; updatedFields.push('name'); }
    if (description !== undefined) { speaker.description = description; updatedFields.push('description'); }
    if (gender !== undefined) { speaker.gender = gender; updatedFields.push('gender'); }
    if (age_range !== undefined) { speaker.age_range = age_range; updatedFields.push('age_range'); }
    if (accent !== undefined) { speaker.accent = accent; updatedFields.push('accent'); }
    if (language !== undefined) { speaker.language = language; updatedFields.push('language'); }
    
    await speaker.save();
    
    logger.info(`Speaker profile updated for user ${req.user.id}`, {
      speaker_id: id,
      updated_fields: updatedFields
    });
    
    res.json({
      success: true,
      speaker: speaker,
      updated_fields: updatedFields
    });
    
  } catch (error) {
    logger.error(`Failed to update speaker for user ${req.user.id}`, {
      speaker_id: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to update speaker',
      message: error.message
    });
  }
});

/**
 * DELETE /multimedia/speakers/:id
 * 
 * Delete speaker profile
 * Removes a speaker profile from the user's database
 * 
 * Path parameters:
 * - id: Speaker ID to delete
 * 
 * Returns:
 * - success: Boolean indicating deletion success
 * - speaker_id: ID of deleted speaker
 */
router.delete('/speakers/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const speaker = await Speaker.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!speaker) {
      return res.status(404).json({ error: 'Speaker not found' });
    }
    
    await speaker.destroy();
    
    logger.info(`Speaker profile deleted for user ${req.user.id}`, {
      speaker_id: id
    });
    
    res.json({
      success: true,
      speaker_id: id
    });
    
  } catch (error) {
    logger.error(`Failed to delete speaker for user ${req.user.id}`, {
      speaker_id: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete speaker',
      message: error.message
    });
  }
});

/**
 * GET /multimedia/analysis/:id
 * 
 * Get analysis results
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
    
    const analysis = await VideoAnalysis.findOne({
      where: { id, user_id: req.user.id },
      include: [
        {
          model: Content,
          as: 'Content',
          required: false
        }
      ]
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    // Get related thumbnails
    const thumbnails = await Thumbnail.findAll({
      where: { 
        user_id: req.user.id,
        video_url: analysis.url 
      },
      order: [['timestamp', 'ASC']]
    });
    
    // Get related OCR captions
    const ocrCaptions = await OCRCaption.findAll({
      where: { 
        user_id: req.user.id,
        video_url: analysis.url 
      },
      order: [['timestamp', 'ASC']]
    });
    
    res.json({
      success: true,
      analysis: analysis,
      thumbnails: thumbnails,
      ocr_captions: ocrCaptions,
      related_content: analysis.Content
    });
    
  } catch (error) {
    logger.error(`Failed to fetch analysis for user ${req.user.id}`, {
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
 * Get user's analysis history
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
    
    const analyses = await VideoAnalysis.findAndCountAll({
      where: { user_id: req.user.id },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      attributes: [
        'id', 'url', 'title', 'description', 'duration', 'format',
        'sentiment_score', 'sentiment_label', 'language_detected',
        'thumbnail_count', 'speaker_count', 'processing_time',
        'quality_score', 'created_at'
      ]
    });
    
    res.json({
      success: true,
      analyses: analyses.rows,
      total_count: analyses.count,
      page_info: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: analyses.count > parseInt(offset) + parseInt(limit)
      }
    });
    
  } catch (error) {
    logger.error(`Failed to fetch analyses for user ${req.user.id}`, {
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
 * DELETE /multimedia/analysis/:id
 * 
 * Delete analysis record
 * Removes an analysis record and all associated data (thumbnails, OCR captions, etc.)
 * 
 * Path parameters:
 * - id: Analysis ID to delete
 * 
 * Returns:
 * - success: Boolean indicating deletion success
 * - analysis_id: ID of deleted analysis
 * - cleanup_stats: Statistics about cleaned up associated data
 */
router.delete('/analysis/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    const analysis = await VideoAnalysis.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    
    // Clean up associated data
    const thumbnailCount = await Thumbnail.count({
      where: { user_id: req.user.id, video_url: analysis.url }
    });
    
    const ocrCount = await OCRCaption.count({
      where: { user_id: req.user.id, video_url: analysis.url }
    });
    
    await Thumbnail.destroy({
      where: { user_id: req.user.id, video_url: analysis.url }
    });
    
    await OCRCaption.destroy({
      where: { user_id: req.user.id, video_url: analysis.url }
    });
    
    await analysis.destroy();
    
    logger.info(`Analysis deleted for user ${req.user.id}`, {
      analysis_id: id,
      thumbnails_deleted: thumbnailCount,
      ocr_captions_deleted: ocrCount
    });
    
    res.json({
      success: true,
      analysis_id: id,
      cleanup_stats: {
        thumbnails_deleted: thumbnailCount,
        ocr_captions_deleted: ocrCount
      }
    });
    
  } catch (error) {
    logger.error(`Failed to delete analysis for user ${req.user.id}`, {
      analysis_id: req.params.id,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete analysis',
      message: error.message
    });
  }
});

module.exports = router; 