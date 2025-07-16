const express = require('express');
const router = express.Router();
const { isAuthenticated, checkUsageLimit, updateUsage, requireFeature } = require('../middleware');
const { Content, ContentGroup, ContentGroupMember } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');
const logger = require('../config/logger');

// Initialize automation orchestrator
const orchestrator = new AutomationOrchestrator();

/**
 * Detect if URL contains multimedia content that should be analyzed
 * @param {string} url - URL to analyze
 * @returns {boolean} - True if URL likely contains video/audio/image content
 */
function isMultimediaURL(url) {
  if (!url || typeof url !== 'string') return false;
  
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
    /linkedin\.com\/posts\//i,
    
    // Direct video/audio file extensions
    /\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v)(\?|$)/i,
    /\.(mp3|wav|flac|aac|ogg|wma|m4a)(\?|$)/i,
    
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
    
    // Streaming platforms
    /soundcloud\.com\//i,
    /spotify\.com\//i,
    /anchor\.fm\//i,
    /podcasts\.apple\.com\//i,
    
    // Video hosting services
    /wistia\.com\//i,
    /brightcove\.com\//i,
    /jwplayer\.com\//i
  ];
  
  return multimediaPatterns.some(pattern => pattern.test(url));
}

/**
 * Trigger multimedia analysis for content using new orchestrator
 * @param {Object} content - Content record
 * @param {Object} user - User object
 */
async function triggerMultimediaAnalysis(content, user) {
  try {
    // Enhanced logging for analysis start
    logger.multimedia.start(user.id, content.id, content.url, {
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speakers: true
    });

    console.log(`🎬 Starting orchestrated multimedia analysis for content ${content.id}`, {
      user_id: user.id,
      content_id: content.id,
      url: content.url
    });

    // Create a buffer/stream from URL for processing
    // For URL-based content, we'll pass metadata and let the orchestrator handle it
    const contentMetadata = {
      filename: content.url,
      contentId: content.id,
      userId: user.id,
      source: 'url',
      url: content.url
    };

    // Process content with new orchestrator
    const processingResult = await orchestrator.processContent(
      null, // No buffer for URL content - orchestrator will fetch
      contentMetadata
    );

    // Extract results from orchestrator response
    const formattedResults = processingResult.results;
    
    // Update content record with new structured results
    const updateData = {};
    
    // Store basic metadata
    if (formattedResults.data.metadata) {
      updateData.metadata = {
        ...(content.metadata || {}),
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

    // Log processing results
    console.log(`🎬 Orchestrated analysis completed for content ${content.id}`, {
      user_id: user.id,
      content_id: content.id,
      job_id: processingResult.jobId,
      media_type: formattedResults.mediaType,
      processing_time: processingResult.processingTime,
      features_used: Object.keys(formattedResults.data),
      warnings: processingResult.warnings?.length || 0
    });
    
    // Update content record if we have data to update
    if (Object.keys(updateData).length > 0) {
      await Content.update(updateData, {
        where: { id: content.id, user_id: user.id }
      });
      
      console.log(`✅ Content ${content.id} updated with orchestrated analysis results`, {
        user_id: user.id,
        content_id: content.id,
        job_id: processingResult.jobId,
        updates: Object.keys(updateData)
      });
    }
    
  } catch (error) {
    console.error(`❌ Orchestrated analysis failed for content ${content.id}:`, {
      user_id: user.id,
      content_id: content.id,
      error: error.message,
      stack: error.stack
    });
    
    logger.logError(`Multimedia analysis failed for content ${content.id}`, {
      user_id: user.id,
      content_id: content.id,
      error: error.message,
      stack: error.stack,
      orchestrator: true
    });
  }
}

// Main content management page with real data and debugging
router.get('/', isAuthenticated, async (req, res) => {
  console.log('DEBUG: /content route hit by user:', req.user ? req.user.id : 'NO USER');
  try {
    // Debug: Check if models are available
    const models = require('../models');
    console.log('DEBUG: Available models:', Object.keys(models));
    console.log('DEBUG: SocialAccount model exists:', !!models.SocialAccount);
    console.log('DEBUG: Content model exists:', !!models.Content);
    let { tag, from, to } = req.query;
    const where = { user_id: req.user.id };
    
    if (from) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(to) };
    let contentItems = await Content.findAll({
      where,
      include: [{
        model: require('../models').SocialAccount,
        as: 'SocialAccount',
        attributes: ['platform', 'handle'],
        required: false // Make it a LEFT JOIN so it doesn't fail if no social account
      }],
      order: [['createdAt', 'DESC']]
    });

    // Function to determine content source and get brand logo
    function getContentSourceInfo(url, socialAccount) {
      // If we have social account info, use that
      if (socialAccount && socialAccount.platform) {
        const platform = socialAccount.platform.toLowerCase();
        const logoMap = {
          'instagram': 'bi-instagram',
          'facebook': 'bi-facebook',
          'twitter': 'bi-twitter-x',
          'linkedin': 'bi-linkedin',
          'youtube': 'bi-youtube',
          'tiktok': 'bi-tiktok',
          'pinterest': 'bi-pinterest',
          'reddit': 'bi-reddit',
          'snapchat': 'bi-snapchat',
          'whatsapp': 'bi-whatsapp',
          'telegram': 'bi-telegram',
          'discord': 'bi-discord'
        };
        return {
          source: socialAccount.platform,
          logo: logoMap[platform] || 'bi-globe',
          color: getPlatformColor(platform)
        };
      }
      
      // Fallback: try to detect from URL
      if (url) {
        const urlLower = url.toLowerCase();
        if (urlLower.includes('instagram.com')) {
          return { source: 'Instagram', logo: 'bi-instagram', color: '#E4405F' };
        } else if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) {
          return { source: 'Facebook', logo: 'bi-facebook', color: '#1877F2' };
        } else if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) {
          return { source: 'Twitter', logo: 'bi-twitter-x', color: '#000000' };
        } else if (urlLower.includes('linkedin.com')) {
          return { source: 'LinkedIn', logo: 'bi-linkedin', color: '#0A66C2' };
        } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
          return { source: 'YouTube', logo: 'bi-youtube', color: '#FF0000' };
        } else if (urlLower.includes('tiktok.com')) {
          return { source: 'TikTok', logo: 'bi-tiktok', color: '#000000' };
        } else if (urlLower.includes('pinterest.com')) {
          return { source: 'Pinterest', logo: 'bi-pinterest', color: '#BD081C' };
        } else if (urlLower.includes('reddit.com')) {
          return { source: 'Reddit', logo: 'bi-reddit', color: '#FF4500' };
        } else if (urlLower.includes('snapchat.com')) {
          return { source: 'Snapchat', logo: 'bi-snapchat', color: '#FFFC00' };
        } else if (urlLower.includes('whatsapp.com')) {
          return { source: 'WhatsApp', logo: 'bi-whatsapp', color: '#25D366' };
        } else if (urlLower.includes('telegram.org')) {
          return { source: 'Telegram', logo: 'bi-telegram', color: '#0088CC' };
        } else if (urlLower.includes('discord.com')) {
          return { source: 'Discord', logo: 'bi-discord', color: '#5865F2' };
        }
      }
      
      // Default fallback
      return { source: 'Manual', logo: 'bi-globe', color: '#6c757d' };
    }
    
    function getPlatformColor(platform) {
      const colorMap = {
        'instagram': '#E4405F',
        'facebook': '#1877F2',
        'twitter': '#000000',
        'linkedin': '#0A66C2',
        'youtube': '#FF0000',
        'tiktok': '#000000',
        'pinterest': '#BD081C',
        'reddit': '#FF4500',
        'snapchat': '#FFFC00',
        'whatsapp': '#25D366',
        'telegram': '#0088CC',
        'discord': '#5865F2'
      };
      return colorMap[platform] || '#6c757d';
    }

    // Function to extract title from URL or metadata
    function getContentTitle(item) {
      // First try metadata title
      if (item.metadata && item.metadata.title) {
        return item.metadata.title;
      }
      
      // Fallback: extract from URL
      if (item.url) {
        try {
          const url = new URL(item.url);
          const hostname = url.hostname.replace('www.', '');
          const pathname = url.pathname.replace(/\/$/, '').split('/').pop();
          if (pathname && pathname.length > 3) {
            return `${hostname} - ${pathname.replace(/[-_]/g, ' ')}`;
          }
          return hostname;
        } catch (e) {
          return item.url;
        }
      }
      
      return 'Content Title';
    }

    // Add source info and title to each content item
    contentItems = contentItems.map(item => {
      item.sourceInfo = getContentSourceInfo(item.url, item.SocialAccount);
      item.displayTitle = getContentTitle(item);
      return item;
    });
    

    

    
    // Apply tag filtering
    if (tag) {
      const tagList = tag.split(/[,	\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      contentItems = contentItems.filter(item => {
        const allTags = [
          ...(item.user_tags || []),
          ...(item.auto_tags || [])
        ].map(t => t.trim().toLowerCase());
        return tagList.some(filterTag => allTags.some(t => t.includes(filterTag)));
      });
    }
    const contentGroups = await ContentGroup.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']]
    });
    const pagination = {
      currentPage: 1,
      totalPages: 1,
      totalItems: contentItems.length
    };
    console.log(`DEBUG: Found ${contentItems.length} content items and ${contentGroups.length} groups for user ${req.user.id}`);
    if (contentItems.length > 0) {
      console.log('DEBUG: First content item:', JSON.stringify(contentItems[0], null, 2));
      console.log('DEBUG: First content metadata:', contentItems[0].metadata);
      console.log('DEBUG: First content URL:', contentItems[0].url);
    } else {
      console.log('DEBUG: No content items found');
    }

    
          res.render('content/list', {
        user: req.user,
        title: 'Content Management - DaySave',
        contentItems,
        contentGroups,
        pagination,
        tag,
        from,
        to,
        debugInfo: {
          userId: req.user.id,
          contentCount: contentItems.length,
          groupCount: contentGroups.length
        }
      });
  } catch (error) {
    console.error('ERROR in /content route:', error);
    console.error('ERROR stack:', error.stack);
    res.status(500).render('error', { user: req.user, title: 'Error', message: 'Failed to load content' });
  }
});

// Create new content
router.post('/', [
  isAuthenticated,
  checkUsageLimit('content_items'),
  updateUsage('content_items')
], async (req, res) => {
  console.log('DEBUG: POST /content route hit by user:', req.user ? req.user.id : 'NO USER');
  console.log('DEBUG: Request method:', req.method);
  console.log('DEBUG: Request headers:', req.headers['content-type']);
  console.log('DEBUG: Request body type:', typeof req.body);
  console.log('DEBUG: Request body:', req.body);
  
  try {
    const { url, user_comments, user_tags, group_ids } = req.body;
    console.log('DEBUG: Creating content with URL:', url);
    console.log('DEBUG: Request body:', JSON.stringify(req.body, null, 2));

    if (!url || typeof url !== 'string' || url.length < 5) {
      console.log('DEBUG: URL validation failed:', url);
      return res.status(400).json({ error: 'A valid URL is required.' });
    }

    const content = await Content.create({
      user_id: req.user.id,
      url,
      user_comments: user_comments || '',
      user_tags: Array.isArray(user_tags) ? user_tags : []
    });

    // Log content creation
    logger.user.contentAdd(req.user.id, content.id, url, isMultimediaURL(url) ? 'multimedia' : 'standard');

    console.log('DEBUG: Content created successfully:', content.id);
    console.log('DEBUG: Created content data:', JSON.stringify(content.toJSON(), null, 2));

    if (Array.isArray(group_ids) && group_ids.length > 0) {
      const groupMemberships = group_ids.map(group_id => ({
        content_id: content.id,
        group_id
      }));
      await ContentGroupMember.bulkCreate(groupMemberships);
      console.log('DEBUG: Group memberships created for content:', content.id);
    }

    // Check if URL contains multimedia content and trigger analysis
    if (isMultimediaURL(url)) {
      console.log('DEBUG: Multimedia URL detected, triggering analysis for content:', content.id);
      
      // Trigger multimedia analysis in background (don't wait for it)
      setImmediate(() => {
        triggerMultimediaAnalysis(content, req.user);
      });
      
      // Return success immediately - analysis will update content in background
      res.json({ 
        success: true, 
        content,
        multimedia_analysis: {
          status: 'started',
          message: 'Multimedia analysis has been started and will update content when complete'
        }
      });
    } else {
      console.log('DEBUG: Non-multimedia URL, skipping analysis for content:', content.id);
      res.json({ success: true, content });
    }
  } catch (error) {
    console.error('ERROR creating content:', error);
    res.status(500).json({ error: 'Failed to create content.' });
  }
});

// Test route to verify POST is working
router.post('/test', isAuthenticated, (req, res) => {
  console.log('DEBUG: POST /content/test route hit');
  res.json({ success: true, message: 'POST route is working' });
});

router.get('/manage', isAuthenticated, (req, res) => {
  const contentItems = [
    { title: 'Instagram Post', image: '/public/images/content_section.png', description: 'A recent Instagram post.' },
    { title: 'Twitter Thread', image: '/public/images/content_section.png', description: 'A thread about productivity.' },
    { title: 'Facebook Update', image: '/public/images/content_section.png', description: 'Shared a new milestone.' }
  ];
  res.render('content/manage', { user: req.user, contentItems });
});

/**
 * Update content record
 * PUT /content/:id
 * 
 * Updates existing content with new information including:
 * - title: Content title
 * - user_comments: User-provided comments
 * - user_tags: User-defined tags array
 * - summary: AI-generated or user-edited summary
 * - group_ids: Content group memberships
 * 
 * @param {string} req.params.id - Content ID
 * @param {Object} req.body - Update data
 * @returns {Object} Updated content record
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, user_comments, user_tags, summary, group_ids } = req.body;
    const content = await Content.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found.' });
    }
    
    // Store original values for audit logging
    const originalValues = {
      title: content.title,
      user_comments: content.user_comments,
      user_tags: content.user_tags,
      summary: content.summary
    };
    
    // Update fields with validation
    if (title !== undefined) content.title = title;
    if (user_comments !== undefined) content.user_comments = user_comments;
    if (user_tags !== undefined) content.user_tags = Array.isArray(user_tags) ? user_tags : [];
    if (summary !== undefined) content.summary = summary; // Support for AI summary editing
    
    await content.save();
    
    // Log content update activity
    const updatedFields = [];
    if (title !== undefined && title !== originalValues.title) updatedFields.push('title');
    if (user_comments !== undefined && user_comments !== originalValues.user_comments) updatedFields.push('user_comments');
    if (user_tags !== undefined && JSON.stringify(user_tags) !== JSON.stringify(originalValues.user_tags)) updatedFields.push('user_tags');
    if (summary !== undefined && summary !== originalValues.summary) updatedFields.push('summary');
    
    if (updatedFields.length > 0) {
      logger.user.contentEdit(req.user.id, content.id, {
        title: title !== undefined ? title : originalValues.title,
        user_comments: user_comments !== undefined ? user_comments : originalValues.user_comments,
        user_tags: user_tags !== undefined ? user_tags : originalValues.user_tags,
        summary: summary !== undefined ? summary : originalValues.summary
      });
    }
    
    // Update group memberships if provided
    if (Array.isArray(group_ids)) {
      await ContentGroupMember.destroy({ where: { content_id: content.id } });
      const groupMemberships = group_ids.map(group_id => ({ content_id: content.id, group_id }));
      if (groupMemberships.length > 0) {
        await ContentGroupMember.bulkCreate(groupMemberships);
      }
      
      // Log group membership changes
      logger.user.contentEdit(req.user.id, content.id, { group_ids });
    }
    
    res.json({ success: true, content });
    
  } catch (error) {
    console.error('Error updating content:', error);
    logger.error('Content update failed', {
      user_id: req.user.id,
      content_id: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: 'Failed to update content.' });
  }
});

// Delete content
router.delete('/:id', isAuthenticated, async (req, res) => {
  const contentId = req.params.id;
  const userId = req.user.id;
  console.log('DEBUG: DELETE /content/:id called', { contentId, userId });
  try {
    const content = await Content.findOne({ where: { id: contentId, user_id: userId } });
    if (!content) {
      console.log('DEBUG: Content not found for delete', { contentId, userId });
      return res.status(404).json({ error: 'Content not found or already deleted.' });
    }
    await content.destroy();
    console.log('DEBUG: Content deleted successfully', { contentId, userId });
    res.json({ success: true });
  } catch (error) {
    console.error('ERROR deleting content:', error);
    res.status(500).json({ error: 'Failed to delete content.' });
  }
});

// Get multimedia analysis status for content (updated for new architecture)
router.get('/:id/analysis', isAuthenticated, async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    // Verify user owns the content
    const content = await Content.findOne({ where: { id: contentId, user_id: userId } });
    if (!content) {
      return res.status(404).json({ error: 'Content not found.' });
    }
    
    // Get multimedia analysis results from new models
    const { VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, Thumbnail, OCRCaption, Speaker } = require('../models');
    
    // Function to get proper title (reuse from main route)
    function getContentTitle(item) {
      // First try metadata title
      if (item.metadata && item.metadata.title) {
        return item.metadata.title;
      }
      
      // Then try content title field
      if (item.title && item.title.trim()) {
        return item.title;
      }
      
      // Fallback: extract from URL
      if (item.url) {
        try {
          const url = new URL(item.url);
          const hostname = url.hostname.replace('www.', '');
          const pathname = url.pathname.replace(/\/$/, '').split('/').pop();
          if (pathname && pathname.length > 3) {
            return `${hostname} - ${pathname.replace(/[-_]/g, ' ')}`;
          }
          return hostname;
        } catch (e) {
          return item.url;
        }
      }
      
      return 'Untitled Content';
    }
    
    // Look for processing jobs for this content
    const processingJobs = await ProcessingJob.findAll({
      where: { content_id: contentId, user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    // Look for analysis records
    const [videoAnalysis, audioAnalysis, imageAnalysis] = await Promise.all([
      VideoAnalysis.findOne({ where: { content_id: contentId, user_id: userId } }),
      AudioAnalysis.findOne({ where: { content_id: contentId, user_id: userId } }),
      ImageAnalysis.findOne({ where: { content_id: contentId, user_id: userId } })
    ]);
    
    // Get any analysis record that exists
    const analysis = videoAnalysis || audioAnalysis || imageAnalysis;
    
    // Check if we have transcription data directly in the content record (legacy support)
    const hasContentTranscription = content.transcription && content.transcription.length > 0;
    
    // Determine media type
    let mediaType = 'unknown';
    if (videoAnalysis) mediaType = 'video';
    else if (audioAnalysis) mediaType = 'audio';
    else if (imageAnalysis) mediaType = 'image';
    
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
    
    // If no analysis but we have legacy transcription data
    if (!analysis && hasContentTranscription) {
      // Parse transcription data from content
      const transcriptionText = content.transcription;
      const wordCount = transcriptionText.split(' ').length;
      
      // Get sentiment from content.sentiment field
      let sentiment = null;
      if (content.sentiment) {
        try {
          sentiment = typeof content.sentiment === 'string' ? JSON.parse(content.sentiment) : content.sentiment;
        } catch (e) {
          sentiment = { label: 'positive', confidence: 0.75 };
        }
      } else {
        sentiment = { label: 'neutral', confidence: 0.5 };
      }
      
      return res.json({
        success: true,
        status: 'completed',
        mediaType: 'legacy',
        analysis: {
          id: content.id,
          title: getContentTitle(content),
          description: content.metadata?.description || '',
          duration: 0,
          transcription: transcriptionText,
          summary: content.summary || '',
          sentiment: sentiment,
          language: 'unknown',
          processing_time: null,
          quality_score: null,
          created_at: content.createdAt
        },
        thumbnails: [],
        speakers: [],
        ocr_captions: []
      });
    }
    
    // If no analysis data at all
    if (!analysis) {
      return res.json({
        success: true,
        status: 'not_analyzed',
        message: 'No multimedia analysis found for this content'
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
          where: { content_id: contentId, user_id: userId },
          order: [['timestamp_seconds', 'ASC']],
          limit: 10
        }),
        OCRCaption.findAll({
          where: { content_id: contentId, user_id: userId },
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
        where: { content_id: contentId, user_id: userId },
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
        title: getContentTitle(content),
        description: analysis.metadata?.description || content.metadata?.description || '',
        duration: analysis.duration || 0,
        quality: analysis.quality_assessment,
        processing_time: analysis.processing_stats?.processingTime,
        created_at: analysis.createdAt
      },
      job: latestJob ? {
        id: latestJob.id,
        status: latestJob.status,
        progress: latestJob.progress,
        processingTime: latestJob.duration_ms
      } : null
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
    console.error('ERROR getting content analysis:', error);
    res.status(500).json({ error: 'Failed to get content analysis.' });
  }
});

module.exports = router; 