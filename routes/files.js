const express = require('express');
const router = express.Router();
const multer = require('multer');
const FileUploadService = require('../services/fileUpload');
const { File, User, ContentGroup, ContentGroupMember } = require('../models');
const { isAuthenticated, isAdmin, checkUsageLimit, checkFileSizeLimit, updateUsage } = require('../middleware');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');

// Initialize automation orchestrator for file processing (singleton)
const orchestrator = AutomationOrchestrator.getInstance();

/**
 * Check if file type should trigger multimedia analysis
 * @param {string} mimetype - File MIME type
 * @returns {boolean} - True if file should be analyzed
 */
function isMultimediaFile(mimetype) {
  const multimediaTypes = [
    // Video files
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
    // Audio files
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
    // Image files (for OCR analysis)
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'
  ];
  
  return multimediaTypes.includes(mimetype);
}

/**
 * Trigger multimedia analysis for uploaded file using new orchestrator
 * @param {Object} fileRecord - File database record
 * @param {Object} user - User object
 */
async function triggerFileAnalysis(fileRecord, user) {
  try {
    console.log(`🎬 Starting orchestrated file analysis for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      filename: fileRecord.filename,
      mimetype: fileRecord.metadata?.mimetype
    });

    // Get the actual filesystem path for the uploaded file
    const path = require('path');
    const fs = require('fs');
    let filePath;
    
    if (fileRecord.file_path.startsWith('gs://')) {
      // For Google Cloud Storage files, we need to download them first
      // This is a temporary solution - in production, you might want to stream directly
      throw new Error('Google Cloud Storage files not yet supported for orchestrated analysis');
    } else {
      // For local files, convert the stored path to absolute path
      if (fileRecord.file_path.startsWith('/uploads/')) {
        // Path is already relative to project root
        filePath = path.join(__dirname, '..', fileRecord.file_path);
      } else {
        // Path might be absolute or relative
        filePath = path.resolve(fileRecord.file_path);
      }
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    // Read file into buffer for processing
    const fileBuffer = await fs.readFile(filePath);
    
    // Create metadata for orchestrator
    const fileMetadata = {
      filename: fileRecord.filename,
      fileId: fileRecord.id,
      userId: user.id,
      mimeType: fileRecord.metadata?.mimetype,
      fileSize: fileRecord.metadata?.size,
      source: 'upload',
      filePath: filePath
    };

    // Process file with new orchestrator
    const processingResult = await orchestrator.processContent(
      fileBuffer,
      fileMetadata
    );

    // Extract results from orchestrator response
    const formattedResults = processingResult.results;
    
    // Update file record with new structured results
    const updateData = {};
    
    // Store basic metadata
    if (formattedResults.data.metadata) {
      updateData.metadata = {
        ...(fileRecord.metadata || {}),
        ...formattedResults.data.metadata,
        processingJobId: processingResult.jobId,
        lastAnalyzed: new Date().toISOString()
      };
    }
    
    // Handle transcription results based on media type
    if (formattedResults.data.transcription) {
      if (formattedResults.data.transcription.fullText) {
        updateData.transcription = formattedResults.data.transcription.fullText;
      } else if (typeof formattedResults.data.transcription === 'string') {
        updateData.transcription = formattedResults.data.transcription;
      }
    }
    
    // Handle AI descriptions for images
    if (formattedResults.data.aiDescription) {
      updateData.summary = formattedResults.data.aiDescription.description || '';
    }
    
    // Handle OCR text for images/videos
    if (formattedResults.data.ocrText && formattedResults.data.ocrText.fullText) {
      // Append OCR text to existing summary or create new one
      const ocrText = formattedResults.data.ocrText.fullText;
      updateData.summary = updateData.summary ? 
        `${updateData.summary}\n\nExtracted Text: ${ocrText}` : 
        `Extracted Text: ${ocrText}`;
    }
    
    // Store sentiment analysis
    if (formattedResults.data.sentiment) {
      updateData.sentiment = formattedResults.data.sentiment;
    }
    
    // Handle auto-generated tags from various sources
    const autoTags = [];
    
    // Tags from objects detected
    if (formattedResults.data.objects) {
      formattedResults.data.objects.forEach(obj => {
        if (obj.confidence > 0.7) { // Only high-confidence objects
          autoTags.push(obj.name);
        }
      });
    }
    
    // Tags from AI description
    if (formattedResults.data.aiDescription && formattedResults.data.aiDescription.tags) {
      autoTags.push(...formattedResults.data.aiDescription.tags);
    }
    
    // Store auto tags if we have any
    if (autoTags.length > 0) {
      updateData.auto_tags = [...new Set(autoTags)]; // Remove duplicates
    }
    
    // Determine category based on media type and content
    if (formattedResults.mediaType) {
      updateData.category = formattedResults.mediaType;
    }

    // Update file record with analysis results
    if (Object.keys(updateData).length > 0) {
      await File.update(updateData, {
        where: { id: fileRecord.id, user_id: user.id }
      });
      
      console.log(`✅ File ${fileRecord.id} updated with orchestrated analysis results`, {
        user_id: user.id,
        file_id: fileRecord.id,
        job_id: processingResult.jobId,
        updates: Object.keys(updateData)
      });
    }

    console.log(`🎉 Orchestrated file analysis completed for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      job_id: processingResult.jobId,
      media_type: formattedResults.mediaType,
      processing_time: processingResult.processingTime,
      features_used: Object.keys(formattedResults.data),
      warnings: processingResult.warnings?.length || 0
    });

  } catch (error) {
    console.error(`❌ Orchestrated file analysis failed for ${fileRecord.id}:`, {
      user_id: user.id,
      file_id: fileRecord.id,
      error: error.message,
      stack: error.stack
    });
    
    // Log the error but don't fail the upload
    logger.logError(`File analysis failed for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      error: error.message,
      stack: error.stack,
      orchestrator: true
    });
  }
}

// File Management Dashboard
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get user's files with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    // Build where clause for search and filters
    const whereClause = { user_id: req.user.id };
    
    // Search functionality
    if (req.query.search) {
      whereClause[Op.or] = [
        { filename: { [Op.like]: `%${req.query.search}%` } },
        { user_comments: { [Op.like]: `%${req.query.search}%` } }
      ];
    }
    
    // Filter by file type
    if (req.query.type) {
      whereClause['$metadata.mimetype$'] = { [Op.like]: `${req.query.type}/%` };
    }

    const { count, rows: files } = await File.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Get user's content groups for assignment
    const groups = await ContentGroup.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']]
    });

    // Get upload statistics
    const stats = await FileUploadService.getUploadStats(req.user.id);
    
    // Calculate pagination
    const totalPages = Math.ceil(count / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Log file access
    logger.logAuthEvent('FILE_DASHBOARD_ACCESS', {
      userId: req.user.id,
      fileCount: count,
      page,
      search: req.query.search || null,
      timestamp: new Date().toISOString()
    });

    res.render('files/list', {
      user: req.user,
      title: 'File Management - DaySave',
      files,
      groups,
      stats,
      pagination: {
        current: page,
        total: totalPages,
        hasNext,
        hasPrev,
        limit
      },
      search: req.query.search || '',
      selectedType: req.query.type || ''
    });
  } catch (error) {
    console.error('Error loading file dashboard:', error);
    res.status(500).render('error', {
      title: 'Error - DaySave',
      message: 'Failed to load file dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// File Upload Route
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for validation
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
    files: 10 // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', [
  isAuthenticated,
  checkUsageLimit('file_uploads', (req) => req.files ? req.files.length : 1),
  checkFileSizeLimit(),
  upload.array('files', 10),
  updateUsage('file_uploads', (req) => req.files ? req.files.length : 1),
  updateUsage('storage_mb', (req) => {
    if (req.files) {
      return req.files.reduce((total, file) => total + Math.ceil(file.size / (1024 * 1024)), 0);
    }
    return 0;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const uploadResults = [];
    const uploadErrors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Validate file
        const validation = await FileUploadService.validateFile(file);
        if (!validation.isValid) {
          uploadErrors.push({
            filename: file.originalname,
            errors: validation.errors
          });
          continue;
        }

        // Upload file to storage
        const uploadResult = await FileUploadService.uploadFile(file, req.user.id, {
          makePublic: false,
          metadata: {
            uploadedBy: req.user.id,
            uploadMethod: 'web_interface'
          }
        });

        // Create file record in database
        const fileRecord = await File.create({
          user_id: req.user.id,
          filename: file.originalname,
          file_path: uploadResult.filePath,
          metadata: {
            size: uploadResult.size,
            mimetype: uploadResult.mimetype,
            storage: uploadResult.storage,
            uploadedAt: new Date().toISOString(),
            publicUrl: uploadResult.publicUrl
          },
          user_comments: req.body.comments || '',
          user_tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
        });

        // Assign to groups if specified
        if (req.body.group_ids) {
          const groupIds = Array.isArray(req.body.group_ids) ? req.body.group_ids : [req.body.group_ids];
          const groupMemberships = groupIds.map(group_id => ({
            content_id: fileRecord.id,
            group_id
          }));
          await ContentGroupMember.bulkCreate(groupMemberships);
        }

        uploadResults.push({
          id: fileRecord.id,
          filename: file.originalname,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype,
          success: true
        });

        // Log successful upload
        logger.logAuthEvent('FILE_UPLOAD_SUCCESS', {
          userId: req.user.id,
          fileId: fileRecord.id,
          filename: file.originalname,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype,
          storage: uploadResult.storage,
          timestamp: new Date().toISOString()
        });

        // Trigger multimedia analysis if the file type is multimedia
        if (isMultimediaFile(file.mimetype)) {
          console.log(`🎬 Detected multimedia file, triggering analysis: ${file.originalname}`);
          // Run analysis in background (don't wait for it)
          setImmediate(async () => {
            try {
              await triggerFileAnalysis(fileRecord, req.user);
            } catch (analysisError) {
              console.error(`❌ Background analysis failed for ${fileRecord.id}:`, analysisError);
              // Don't let analysis errors affect the upload response
            }
          });
        } else {
          console.log(`📄 Non-multimedia file, skipping analysis: ${file.originalname}`);
        }

      } catch (uploadError) {
        console.error('Individual file upload error:', uploadError);
        uploadErrors.push({
          filename: file.originalname,
          errors: [uploadError.message]
        });
      }
    }

    // Return results
    const response = {
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors: uploadErrors,
      summary: {
        total: req.files.length,
        successful: uploadResults.length,
        failed: uploadErrors.length
      }
    };

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json(response);
    } else {
      // Handle form submission redirect
      if (response.success) {
        req.session.uploadSuccess = `Successfully uploaded ${uploadResults.length} file(s)`;
      }
      if (uploadErrors.length > 0) {
        req.session.uploadErrors = uploadErrors;
      }
      res.redirect('/files');
    }
  } catch (error) {
    console.error('Upload route error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      files: req.files ? req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) : 'none'
    });
    
    // Return a detailed error response
    res.status(500).json({
      error: 'Upload failed',
      message: error.message || 'An unexpected error occurred during upload',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get File Details
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await File.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id // Users can only view their own files
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!file) {
      return res.status(404).render('error', {
        title: 'File Not Found - DaySave',
        message: 'The requested file was not found or you do not have permission to view it.',
        error: {},
        user: req.user
      });
    }

    // Get file URL for viewing
    const fileUrl = await FileUploadService.getFileUrl(file.file_path);

    // Log file access
    logger.logAuthEvent('FILE_VIEW', {
      userId: req.user.id,
      fileId: file.id,
      filename: file.filename,
      timestamp: new Date().toISOString()
    });

    res.render('files/detail', {
      user: req.user,
      title: `${file.filename} - File Details - DaySave`,
      file,
      fileUrl
    });

  } catch (error) {
    console.error('Error loading file details:', error);
    res.status(500).render('error', {
      title: 'Error - DaySave',
      message: 'Failed to load file details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Update File
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await File.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Update file metadata
    const updates = {};
    if (req.body.comments !== undefined) {
      updates.user_comments = req.body.comments;
    }
    if (req.body.tags !== undefined) {
      updates.user_tags = Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim());
    }
    if (req.body.summary !== undefined) {
      updates.summary = req.body.summary;
    }

    await file.update(updates);

    // Update group memberships if specified
    if (req.body.group_ids !== undefined) {
      await ContentGroupMember.destroy({
        where: { content_id: file.id }
      });

      if (req.body.group_ids && req.body.group_ids.length > 0) {
        const groupIds = Array.isArray(req.body.group_ids) ? req.body.group_ids : [req.body.group_ids];
        const groupMemberships = groupIds.map(group_id => ({
          content_id: file.id,
          group_id
        }));
        await ContentGroupMember.bulkCreate(groupMemberships);
      }
    }

    // Log file update
    logger.logAuthEvent('FILE_UPDATE', {
      userId: req.user.id,
      fileId: file.id,
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'File updated successfully',
      file: await file.reload()
    });

  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'An error occurred while updating the file'
    });
  }
});

// Delete File
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await File.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Delete file from storage
    await FileUploadService.deleteFile(file.file_path);

    // Delete group memberships
    await ContentGroupMember.destroy({
      where: { content_id: file.id }
    });

    // Delete file record
    await file.destroy();

    // Log file deletion
    logger.logAuthEvent('FILE_DELETE', {
      userId: req.user.id,
      fileId: file.id,
      filename: file.filename,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: 'An error occurred while deleting the file'
    });
  }
});

// Get Upload Settings (for frontend)
router.get('/api/settings', isAuthenticated, async (req, res) => {
  try {
    const settings = await FileUploadService.getUploadSettings();
    res.json({
      maxFileSize: settings.maxFileSize,
      maxFileSizeMB: Math.round(settings.maxFileSize / 1024 / 1024),
      allowedFileTypes: settings.allowedFileTypes,
      supportedCategories: {
        images: settings.allowedFileTypes.filter(type => type.startsWith('image/')),
        audio: settings.allowedFileTypes.filter(type => type.startsWith('audio/')),
        video: settings.allowedFileTypes.filter(type => type.startsWith('video/')),
        documents: settings.allowedFileTypes.filter(type => type.startsWith('application/') || type.startsWith('text/'))
      }
    });
  } catch (error) {
    console.error('Error getting upload settings:', error);
    res.status(500).json({
      error: 'Failed to get upload settings'
    });
  }
});

// Get File Statistics
router.get('/api/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await FileUploadService.getUploadStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting file stats:', error);
    res.status(500).json({
      error: 'Failed to get file statistics'
    });
  }
});

// Secure file serving route - serves uploaded files with authentication
router.get('/serve/:userId/:filename', isAuthenticated, async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const requestingUserId = req.user.id;
    
    // Users can only access their own files (except admins)
    const isAdmin = req.user.Role && req.user.Role.name === 'admin';
    if (userId !== requestingUserId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied - you can only access your own files' });
    }
    
    // Construct file path
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'uploads', userId, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(filePath);
    
    // Set appropriate headers
    const mimeType = await FileUploadService.getMimeType(filePath);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    // Log file access
    logger.logAuthEvent('FILE_SERVE', {
      userId: requestingUserId,
      accessedUserId: userId,
      filename: filename,
      fileSize: stat.size,
      mimeType: mimeType,
      timestamp: new Date().toISOString()
    });
    
    // Stream the file
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Get file analysis results (updated for new architecture)
router.get('/:id/analysis', isAuthenticated, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;
    
    // Verify user owns the file
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      return res.status(404).json({ error: 'File not found.' });
    }
    
    // Get multimedia analysis results from new models
    const { VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, Thumbnail, OCRCaption, Speaker } = require('../models');
    
    // Function to get proper title
    function getFileTitle(fileRecord) {
      // Try metadata title first
      if (fileRecord.metadata && fileRecord.metadata.title) {
        return fileRecord.metadata.title;
      }
      
      // Use filename without extension
      const nameWithoutExt = fileRecord.filename.replace(/\.[^/.]+$/, '');
      return nameWithoutExt.replace(/[-_]/g, ' ');
    }
    
    // Look for processing jobs for this file
    const processingJobs = await ProcessingJob.findAll({
      where: { file_id: fileId, user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Look for analysis records
    const [videoAnalysis, audioAnalysis, imageAnalysis] = await Promise.all([
      VideoAnalysis.findOne({ where: { file_id: fileId, user_id: userId } }),
      AudioAnalysis.findOne({ where: { file_id: fileId, user_id: userId } }),
      ImageAnalysis.findOne({ where: { file_id: fileId, user_id: userId } })
    ]);
    
    // Get any analysis record that exists
    const analysis = videoAnalysis || audioAnalysis || imageAnalysis;
    
    // Check if we have transcription data directly in the file record (legacy support)
    const hasTranscription = file.transcription && file.transcription.length > 0;
    const hasSummary = file.summary && file.summary.length > 0;
    
    // Determine media type
    const mimeType = file.metadata?.mimetype || '';
    let mediaType = 'file';
    if (videoAnalysis) mediaType = 'video';
    else if (audioAnalysis) mediaType = 'audio';
    else if (imageAnalysis) mediaType = 'image';
    else if (mimeType.startsWith('image/')) mediaType = 'image';
    else if (mimeType.startsWith('video/')) mediaType = 'video';
    else if (mimeType.startsWith('audio/')) mediaType = 'audio';
    
    // If we have processing jobs, get the latest one
    const latestJob = processingJobs.length > 0 ? processingJobs[0] : null;
    
    // If no analysis but we have a processing job, check its status
    if (!analysis && latestJob) {
      return res.json({
        success: true,
        status: latestJob.status,
        job: {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          currentStage: latestJob.current_stage,
          startedAt: latestJob.started_at,
          estimatedCompletion: latestJob.estimated_completion
        },
        message: `Processing ${latestJob.status} - ${latestJob.progress}% complete`
      });
    }
    
    // If no analysis but we have legacy data
    if (!analysis && (hasTranscription || hasSummary)) {
      // Parse sentiment data
      let sentiment = null;
      if (file.sentiment) {
        try {
          sentiment = typeof file.sentiment === 'string' ? JSON.parse(file.sentiment) : file.sentiment;
        } catch (e) {
          sentiment = { label: 'neutral', confidence: 0.5 };
        }
      } else {
        sentiment = { label: 'neutral', confidence: 0.5 };
      }
      
      return res.json({
        success: true,
        status: 'completed',
        mediaType: 'legacy',
        analysis: {
          id: file.id,
          title: getFileTitle(file),
          description: file.metadata?.description || '',
          duration: file.metadata?.duration || 0,
          transcription: file.transcription || '',
          summary: file.summary || '',
          sentiment: sentiment,
          language: file.metadata?.language || 'unknown',
          processing_time: file.metadata?.processing_time || null,
          quality_score: file.metadata?.quality_score || null,
          created_at: file.createdAt,
          metadata: file.metadata || {}
        },
        thumbnails: [],
        speakers: [],
        ocr_captions: [],
        auto_tags: file.auto_tags || [],
        user_tags: file.user_tags || []
      });
    }
    
    // If no analysis data at all
    if (!analysis) {
      return res.json({
        success: true,
        status: 'not_analyzed',
        message: 'No multimedia analysis found for this file'
      });
    }
    
    // Get related multimedia data based on analysis type
    let thumbnails = [];
    let speakers = [];
    let ocrCaptions = [];
    
    if (videoAnalysis) {
      // Get video-specific related data
      [thumbnails, ocrCaptions] = await Promise.all([
        Thumbnail.findAll({
          where: { file_id: fileId, user_id: userId },
          order: [['timestamp_seconds', 'ASC']],
          limit: 10
        }),
        OCRCaption.findAll({
          where: { file_id: fileId, user_id: userId },
          order: [['timestamp_seconds', 'ASC']],
          limit: 20
        })
      ]);
    }
    
    if (audioAnalysis) {
      // Get audio-specific related data
      speakers = await Speaker.findAll({
        where: { user_id: userId, audio_analysis_id: audioAnalysis.id },
        order: [['confidence_score', 'DESC']],
        limit: 5
      });
    }
    
    if (imageAnalysis) {
      // Get image-specific related data
      thumbnails = await Thumbnail.findAll({
        where: { file_id: fileId, user_id: userId },
        order: [['createdAt', 'ASC']],
        limit: 5
      });
    }
    
    // Format response based on analysis type
    const responseData = {
      success: true,
      status: analysis.status || 'completed',
      mediaType: mediaType,
      analysis: {
        id: analysis.id,
        title: getFileTitle(file),
        description: analysis.metadata?.description || file.metadata?.description || '',
        duration: analysis.duration || file.metadata?.duration || 0,
        quality: analysis.quality_assessment,
        processing_time: analysis.processing_stats?.processingTime,
        created_at: analysis.createdAt,
        metadata: file.metadata || {}
      },
      job: latestJob ? {
        id: latestJob.id,
        status: latestJob.status,
        progress: latestJob.progress,
        processingTime: latestJob.duration_ms
      } : null,
      auto_tags: file.auto_tags || [],
      user_tags: file.user_tags || []
    };
    
    // Add type-specific data
    if (videoAnalysis) {
      responseData.analysis.transcription = videoAnalysis.transcription_results?.fullText || '';
      responseData.analysis.sentiment = videoAnalysis.sentiment_analysis;
      responseData.analysis.objects = videoAnalysis.object_detection?.objects || [];
      responseData.analysis.scenes = videoAnalysis.scene_detection?.scenes || [];
    }
    
    if (audioAnalysis) {
      responseData.analysis.transcription = audioAnalysis.transcription_results?.fullText || '';
      responseData.analysis.sentiment = audioAnalysis.sentiment_analysis;
      responseData.analysis.speakers = audioAnalysis.speaker_analysis?.speakers || [];
      responseData.analysis.language = audioAnalysis.language_detection?.primaryLanguage || 'unknown';
    }
    
    if (imageAnalysis) {
      responseData.analysis.description = imageAnalysis.ai_description?.description || '';
      responseData.analysis.objects = imageAnalysis.object_detection?.objects || [];
      responseData.analysis.ocrText = imageAnalysis.ocr_results?.fullText || '';
      responseData.analysis.colors = imageAnalysis.color_analysis;
      responseData.analysis.faces = imageAnalysis.face_detection?.faces || [];
    }
    
    // Add related data
    responseData.thumbnails = thumbnails.map(t => ({
      id: t.id,
      url: t.file_path,
      timestamp: t.timestamp_seconds || 0,
      size: t.size || 'medium',
      width: t.width,
      height: t.height
    }));
    
    responseData.speakers = speakers.map(s => ({
      id: s.id,
      name: s.name || `Speaker ${s.id}`,
      confidence: s.confidence_score || 0,
      gender: s.gender || 'unknown',
      language: s.language || 'unknown'
    }));
    
    responseData.ocr_captions = ocrCaptions.map(o => ({
      id: o.id,
      text: o.text,
      timestamp: o.timestamp_seconds,
      confidence: o.confidence
    }));
    
    res.json(responseData);
    
  } catch (error) {
    console.error('ERROR getting file analysis:', error);
    res.status(500).json({ error: 'Failed to get file analysis.' });
  }
});

module.exports = router; 