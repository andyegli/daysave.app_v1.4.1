const express = require('express');
const router = express.Router();
const { isAuthenticated, checkUsageLimit, updateUsage, requireFeature } = require('../middleware');
const { Content, ContentGroup, ContentGroupMember } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');
const logger = require('../config/logger');

// Initialize automation orchestrator (singleton)
const orchestrator = AutomationOrchestrator.getInstance();

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
    console.log(`🎬 TRIGGER: Starting multimedia analysis for content ${content.id}`, {
      user_id: user.id,
      content_id: content.id,
      url: content.url
    });

    // Enhanced logging for analysis start
    logger.multimedia.start(user.id, content.id, content.url, {
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speakers: true
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

    // For URL-based content, we need to use the backward compatibility service
    // since the orchestrator expects file buffers, not URLs
    console.log('🔄 TRIGGER: Using backward compatibility service for URL processing...');
    
    const compatibilityService = new BackwardCompatibilityService();
    
    const processingResult = await compatibilityService.analyzeContent(content.url, {
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speaker_identification: true,
      enableSummarization: true,
      enableSentimentAnalysis: true,
      user_id: user.id,
      content_id: content.id
    });

    // Extract results from backward compatibility service
    const formattedResults = processingResult;
    
    // Update content record with new structured results
    const updateData = {};
    
    // Store basic metadata from backward compatibility service
    if (formattedResults.metadata) {
      updateData.metadata = {
        ...(content.metadata || {}),
        ...formattedResults.metadata,
        analysisId: formattedResults.analysisId,
        lastAnalyzed: new Date().toISOString()
      };
    }
    
    // Handle transcription results
    if (formattedResults.transcription) {
      updateData.transcription = formattedResults.transcription;
    }
    
    // Handle summary
    if (formattedResults.summary) {
      updateData.summary = formattedResults.summary;
    }
    
    // Handle generated title - ENHANCED: Ensure AI titles are prioritized and saved
    if (formattedResults.generatedTitle && formattedResults.generatedTitle.trim()) {
      updateData.generated_title = formattedResults.generatedTitle.trim();
      console.log(`🎯 Saving AI-generated title: "${formattedResults.generatedTitle.trim()}"`);
    }
    
    // Store sentiment analysis
    if (formattedResults.sentiment) {
      updateData.sentiment = formattedResults.sentiment;
    }
    
    // Handle auto-generated tags
    if (formattedResults.auto_tags && formattedResults.auto_tags.length > 0) {
      updateData.auto_tags = [...new Set(formattedResults.auto_tags)]; // Remove duplicates
    }
    
    // Store category
    if (formattedResults.category) {
      updateData.category = formattedResults.category;
    }

    // Log processing results
    console.log(`🎬 Multimedia analysis completed for content ${content.id}`, {
      user_id: user.id,
      content_id: content.id,
      analysis_id: formattedResults.analysisId,
      platform: formattedResults.platform,
      processing_time: formattedResults.processing_time,
      status: formattedResults.status,
      has_transcription: !!formattedResults.transcription,
      has_summary: !!formattedResults.summary,
      has_sentiment: !!formattedResults.sentiment
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
    console.error(`❌ TRIGGER ERROR: Analysis failed for content ${content.id}:`, {
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
    
    // ✨ PAGINATION: Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Show 10 items per page
    const offset = (page - 1) * limit;
    
    let { tag, from, to } = req.query;
    const where = { user_id: req.user.id };
    
    if (from) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(from) };
    if (to) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(to) };
    
    // ✨ PAGINATION: Fetch both content items and files with count and pagination
    const [contentResult, fileResult] = await Promise.all([
      Content.findAndCountAll({
        where,
        include: [{
          model: require('../models').SocialAccount,
          as: 'SocialAccount',
          attributes: ['platform', 'handle'],
          required: false // Make it a LEFT JOIN so it doesn't fail if no social account
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      }),
      require('../models').File.findAndCountAll({
        where: { user_id: req.user.id },
        include: [{
          model: require('../models').Thumbnail,
          as: 'thumbnails',
          required: false,
          where: {
            status: 'ready'
          }
        }],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      })
    ]);
    
    const contentItems = contentResult.rows;
    const fileItems = fileResult.rows;
    const totalContentItems = contentResult.count;
    const totalFileItems = fileResult.count;
    const totalItems = totalContentItems + totalFileItems;

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

    /**
     * Format image summary as a professional title (matching video quality)
     * @param {string} summary - AI-generated image description
     * @param {Array} tags - Auto-generated tags for additional context
     * @returns {string} Professional formatted title
     */
    function formatAsProfessionalImageTitle(summary, tags = []) {
      if (!summary || summary.trim().length === 0) {
        return createProfessionalTitleFromTags(tags);
      }
      
      // Use first sentence and format professionally
      const firstSentence = summary.split('.')[0].trim();
      
      if (firstSentence.length > 0 && firstSentence.length <= 120) {
        return formatAsProfessionalTitle(firstSentence);
      } else if (summary.length <= 120) {
        return formatAsProfessionalTitle(summary.trim());
      } else {
        const truncated = summary.substring(0, 117).trim();
        return formatAsProfessionalTitle(truncated) + '...';
      }
    }

    /**
     * Create professional title from tags (avoid comma lists)
     * @param {Array} tags - Auto-generated tags
     * @returns {string} Professional structured title
     */
    function createProfessionalTitleFromTags(tags) {
      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        return 'Professional Visual Content: Detailed Product Display';
      }
      
      const mainTag = tags[0];
      const additionalTags = tags.slice(1, 3);
      
      if (additionalTags.length > 0) {
        return `${capitalizeFirst(mainTag)} Showcase: Featuring ${additionalTags.join(' and ')}`;
      } else {
        return `Professional ${capitalizeFirst(mainTag)} Display`;
      }
    }

    /**
     * Format text as a professional title with proper structure
     * @param {string} text - Text to format
     * @returns {string} Professionally formatted title
     */
    function formatAsProfessionalTitle(text) {
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
    function capitalizeFirst(str) {
      if (!str || typeof str !== 'string') return 'Content';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Function to extract title from URL or metadata
    function getContentTitle(item) {
      // First priority: AI-generated title
      if (item.generated_title && item.generated_title.trim()) {
        return item.generated_title;
      }
      
      // Second priority: metadata title
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
    const processedContentItems = contentItems.map(item => {
      item.sourceInfo = getContentSourceInfo(item.url, item.SocialAccount);
      item.displayTitle = getContentTitle(item);
      item.itemType = 'content';
      return item;
    });

    // Function to normalize file items to content format
    function normalizeFileItem(file) {
      const fileType = file.metadata?.mimetype || '';
      let sourceInfo = {
        source: 'File Upload',
        logo: 'bi-cloud-upload',
        color: '#6c757d'
      };

      // Set specific icons and colors based on file type
      if (fileType.startsWith('image/')) {
        sourceInfo = { source: 'Image', logo: 'bi-image', color: '#fd7e14' };
      } else if (fileType.startsWith('video/')) {
        sourceInfo = { source: 'Video', logo: 'bi-camera-video', color: '#dc3545' };
      } else if (fileType.startsWith('audio/')) {
        sourceInfo = { source: 'Audio', logo: 'bi-music-note', color: '#20c997' };
      }

      // Get title from metadata or generate from filename
      const getFileTitle = (file) => {
        // First priority: AI-generated title (same as content items)
        // Note: generated_title field will be available after migration
        if (file.generated_title && file.generated_title.trim()) {
          return file.generated_title;
        }
        
        // Parse metadata if it's a string
        let metadata = file.metadata;
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch (e) {
            metadata = {};
          }
        }
        
        // Second priority: metadata.title (backup field)
        if (metadata && metadata.title) {
          return metadata.title;
        }
        
        // Get correct file type from parsed metadata
        const parsedFileType = metadata?.mimetype || '';
        
        // For images, prefer AI-generated titles with professional structure
        if (parsedFileType.startsWith('image/')) {
          // Try to use AI summary for sophisticated title generation (matching video approach)
          if (file.summary && file.summary.length > 0) {
            // Use professional title formatting instead of simple extraction
            return formatAsProfessionalImageTitle(file.summary, file.auto_tags);
          }
          
          // Create structured title from tags - avoid comma lists (matching video quality)
          if (file.auto_tags && Array.isArray(file.auto_tags) && file.auto_tags.length > 0) {
            return createProfessionalTitleFromTags(file.auto_tags);
          }
        }
        
        // Fallback: clean up filename
        return file.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      };

      // Get thumbnail URL for images
      let thumbnailUrl = null;
      if (fileType.startsWith('image/')) {
        // Check if thumbnails are loaded and available
        if (file.thumbnails && file.thumbnails.length > 0) {
          // Find main thumbnail or use first available
          const mainThumbnail = file.thumbnails.find(t => t.thumbnail_type === 'main' && t.status === 'ready');
          const usableThumbnail = mainThumbnail || file.thumbnails.find(t => t.status === 'ready');
          
          if (usableThumbnail) {
            // For thumbnails, use the file path directly (they should be accessible)
            thumbnailUrl = `/${usableThumbnail.file_path}`;
          }
        }
        
        // Fallback: Use the original image file as thumbnail
        if (!thumbnailUrl) {
          thumbnailUrl = `/files/serve/${file.user_id}/${encodeURIComponent(file.filename)}`;
        }
      }

      return {
        id: file.id,
        itemType: 'file',
        url: `/files/${file.id}`, // Link to file detail page
        title: getFileTitle(file),
        displayTitle: getFileTitle(file),
        user_comments: file.user_comments || '',
        summary: file.summary || '',
        transcription: file.transcription || '',
        auto_tags: file.auto_tags || [],
        user_tags: file.user_tags || [],
        sentiment: file.sentiment,
        createdAt: file.createdAt,
        metadata: {
          ...file.metadata,
          thumbnail: thumbnailUrl, // Use the computed thumbnail URL
          fileId: file.id,
          filename: file.filename,
          isFile: true,
          hasGeneratedThumbnail: !!(file.thumbnails && file.thumbnails.length > 0)
        },
        sourceInfo
      };
    }

    // Normalize file items and merge with content items
    const processedFileItems = fileItems.map(normalizeFileItem);
    let allItems = [...processedContentItems, ...processedFileItems];

    // Sort all items by creation date (newest first)
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    

    

    
    // Apply tag filtering to all items
    if (tag) {
      const tagList = tag.split(/[,	\s]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
      allItems = allItems.filter(item => {
        const itemTags = [
          ...(item.user_tags || []),
          ...(item.auto_tags || [])
        ].map(t => t.trim().toLowerCase());
        return tagList.some(filterTag => itemTags.some(t => t.includes(filterTag)));
      });
    }
    const contentGroups = await ContentGroup.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']]
    });
    // ✨ PAGINATION: Calculate pagination data
    const totalPages = Math.ceil(totalItems / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: limit,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null
    };
    
    // Split items by type for debugging
    const contentCount = allItems.filter(item => item.itemType === 'content').length;
    const fileCount = allItems.filter(item => item.itemType === 'file').length;
    
    console.log(`DEBUG: Found ${allItems.length} total items (${contentCount} content + ${fileCount} files) and ${contentGroups.length} groups for user ${req.user.id}`);
    if (allItems.length > 0) {
      console.log('DEBUG: First item:', {
        type: allItems[0].itemType,
        title: allItems[0].displayTitle,
        id: allItems[0].id,
        sourceInfo: allItems[0].sourceInfo
      });
    } else {
      console.log('DEBUG: No items found');
    }

    res.render('content/list', {
        user: req.user,
        title: 'Content Management - DaySave',
        contentItems: allItems, // Pass unified items array
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
      setImmediate(async () => {
        const startTime = Date.now();
        const automationId = `AUTO-${content.id.substring(0, 8)}`;
        
        try {
          console.log(`🚀 [${automationId}] AUTOMATION TRIGGER: Starting multimedia analysis for content: ${content.id}`);
          console.log(`📊 [${automationId}] System status: Memory usage being monitored...`);
          
          // Check if we have the required services before starting
          if (!req.user) {
            throw new Error('User object is missing');
          }
          
          console.log(`🎯 [${automationId}] User: ${req.user.id}, Content: ${content.id}, URL: ${content.url}`);
          
          // Add process monitoring
          const beforeMemory = process.memoryUsage();
          console.log(`📈 [${automationId}] Memory before: ${Math.round(beforeMemory.heapUsed / 1024 / 1024)}MB`);
          
          await triggerMultimediaAnalysis(content, req.user);
          
          const afterMemory = process.memoryUsage();
          const duration = Date.now() - startTime;
          
          console.log(`✅ [${automationId}] AUTOMATION TRIGGER: Analysis started successfully for content: ${content.id}`);
          console.log(`📊 [${automationId}] Duration: ${duration}ms, Memory after: ${Math.round(afterMemory.heapUsed / 1024 / 1024)}MB`);
          
        } catch (error) {
          const duration = Date.now() - startTime;
          console.error(`❌ [${automationId}] AUTOMATION TRIGGER: Failed to start analysis for content: ${content.id}`);
          console.error(`❌ [${automationId}] Error details:`, {
            error: error.message,
            stack: error.stack,
            duration: `${duration}ms`,
            contentId: content.id,
            userId: req.user?.id,
            url: content.url
          });
          
          // Log to error file as well
          const logger = require('../config/logger');
          logger.logError(`Automation trigger failed for content ${content.id}`, {
            error: error.message,
            stack: error.stack,
            contentId: content.id,
            userId: req.user?.id,
            url: content.url,
            duration
          });
        }
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
      // First priority: AI-generated title
      if (item.generated_title && item.generated_title.trim()) {
        return item.generated_title;
      }
      
      // Second priority: metadata title
      if (item.metadata && item.metadata.title) {
        return item.metadata.title;
      }
      
      // Third priority: content title field
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