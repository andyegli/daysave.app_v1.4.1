const express = require('express');
const router = express.Router();
const { isAuthenticated, requireRole } = require('../middleware');
const { File, User, ContentGroup, ContentGroupMember } = require('../models');
const fileUploadService = require('../services/fileUpload');
const { logAuthEvent } = require('../config/logger');
const { Op } = require('sequelize');

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
    const stats = await fileUploadService.getUploadStats(req.user.id);
    
    // Calculate pagination
    const totalPages = Math.ceil(count / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Log file access
    logAuthEvent('FILE_DASHBOARD_ACCESS', {
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
router.post('/upload', isAuthenticated, async (req, res) => {
  try {
    // Create upload middleware with current settings
    const upload = await fileUploadService.createUploadMiddleware();
    
    // Handle the upload
    upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File too large',
            message: `File size exceeds the maximum allowed limit`
          });
        }
        
        return res.status(400).json({
          error: 'Upload failed',
          message: err.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files uploaded',
          message: 'Please select at least one file to upload'
        });
      }

      const uploadResults = [];
      const errors = [];

      // Process each uploaded file
      for (const file of req.files) {
        try {
          // Validate file
          const validation = await fileUploadService.validateFile(file);
          if (!validation.isValid) {
            errors.push({
              filename: file.originalname,
              errors: validation.errors
            });
            continue;
          }

          // Upload file to storage
          const uploadResult = await fileUploadService.uploadFile(file, req.user.id, {
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
          logAuthEvent('FILE_UPLOAD_SUCCESS', {
            userId: req.user.id,
            fileId: fileRecord.id,
            filename: file.originalname,
            size: uploadResult.size,
            mimetype: uploadResult.mimetype,
            storage: uploadResult.storage,
            timestamp: new Date().toISOString()
          });

        } catch (uploadError) {
          console.error('Individual file upload error:', uploadError);
          errors.push({
            filename: file.originalname,
            errors: [uploadError.message]
          });
        }
      }

      // Return results
      const response = {
        success: uploadResults.length > 0,
        uploaded: uploadResults,
        errors,
        summary: {
          total: req.files.length,
          successful: uploadResults.length,
          failed: errors.length
        }
      };

      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.json(response);
      } else {
        // Handle form submission redirect
        if (response.success) {
          req.session.uploadSuccess = `Successfully uploaded ${uploadResults.length} file(s)`;
        }
        if (errors.length > 0) {
          req.session.uploadErrors = errors;
        }
        res.redirect('/files');
      }
    });

  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: 'An unexpected error occurred during upload'
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
    const fileUrl = await fileUploadService.getFileUrl(file.file_path);

    // Log file access
    logAuthEvent('FILE_VIEW', {
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
    logAuthEvent('FILE_UPDATE', {
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
    await fileUploadService.deleteFile(file.file_path);

    // Delete group memberships
    await ContentGroupMember.destroy({
      where: { content_id: file.id }
    });

    // Delete file record
    await file.destroy();

    // Log file deletion
    logAuthEvent('FILE_DELETE', {
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
    const settings = await fileUploadService.getUploadSettings();
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
    const stats = await fileUploadService.getUploadStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting file stats:', error);
    res.status(500).json({
      error: 'Failed to get file statistics'
    });
  }
});

module.exports = router; 