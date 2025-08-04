const express = require('express');
const router = express.Router();
const { isAuthenticated, checkUsageLimit, updateUsage, requireFeature } = require('../middleware');
const { Content, ContentGroup, ContentGroupMember } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');
const { ContentTypeDetector } = require('../scripts/populate-content-types');
const logger = require('../config/logger');
const { logging } = require('../config/config');

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
    /facebook\.com\/share\/r\//i,  // Facebook share/r/ URLs (reels/mixed content)
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
  try {
    // Initialize models
    const models = require('../models');
    
    // ✨ ENHANCED PAGINATION: Get pagination parameters with user-configurable limit
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    
    // Validate and constrain limit to reasonable values
    const allowedLimits = [5, 10, 20, 50, 100];
    if (!allowedLimits.includes(limit)) {
      limit = 10; // Default fallback
    }
    
    const offset = (page - 1) * limit;
    console.log(`📄 Pagination settings: page=${page}, limit=${limit}, offset=${offset}`);
    
    // ✨ ENHANCED FILTERING: Get filter parameters including sort
    let { tag, from, to, search, content_type, status, sort } = req.query;
    console.log('🔍 Filter parameters:', { tag, from, to, search, content_type, status, sort, page, limit });
    
    // Build where clauses for both content and files
    const contentWhere = { user_id: req.user.id };
    const fileWhere = { user_id: req.user.id };
    
    // ✨ DATE FILTERING
    if (from) {
      const fromDate = new Date(from);
      contentWhere.createdAt = { ...(contentWhere.createdAt || {}), [Op.gte]: fromDate };
      fileWhere.createdAt = { ...(fileWhere.createdAt || {}), [Op.gte]: fromDate };
    }
    if (to) {
      const toDate = new Date(to + 'T23:59:59.999Z'); // Include the entire day
      contentWhere.createdAt = { ...(contentWhere.createdAt || {}), [Op.lte]: toDate };
      fileWhere.createdAt = { ...(fileWhere.createdAt || {}), [Op.lte]: toDate };
    }
    
    // ✨ TAG FILTERING  
    if (tag && tag.trim()) {
      const tagFilter = tag.trim();
      console.log('🏷️ Applying tag filter:', tagFilter);
      
      // For content: search in both user_tags and auto_tags
      contentWhere[Op.or] = [
        {
          user_tags: {
            [Op.like]: `%${tagFilter}%`
          }
        },
        {
          auto_tags: {
            [Op.like]: `%${tagFilter}%`
          }
        }
      ];
      
      // For files: search in both user_tags and auto_tags
      fileWhere[Op.or] = [
        {
          user_tags: {
            [Op.like]: `%${tagFilter}%`
          }
        },
        {
          auto_tags: {
            [Op.like]: `%${tagFilter}%`
          }
        }
      ];
    }
    
    // ✨ SEARCH FILTERING (in title, summary, comments, URL)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      console.log('🔎 Applying search filter:', searchTerm);
      
      // For content: search in url, user_comments, summary, generated_title
      const contentSearchOr = [
        { url: { [Op.like]: `%${searchTerm}%` } },
        { user_comments: { [Op.like]: `%${searchTerm}%` } },
        { summary: { [Op.like]: `%${searchTerm}%` } },
        { generated_title: { [Op.like]: `%${searchTerm}%` } }
      ];
      
      contentWhere[Op.and] = [
        ...(contentWhere[Op.and] || []),
        { [Op.or]: contentSearchOr }
      ];
      
      // For files: search in filename, user_comments, summary, generated_title
      const fileSearchOr = [
        { filename: { [Op.like]: `%${searchTerm}%` } },
        { user_comments: { [Op.like]: `%${searchTerm}%` } },
        { summary: { [Op.like]: `%${searchTerm}%` } },
        { generated_title: { [Op.like]: `%${searchTerm}%` } }
      ];
      
      fileWhere[Op.and] = [
        ...(fileWhere[Op.and] || []),
        { [Op.or]: fileSearchOr }
      ];
    }
    
    // ✨ CONTENT TYPE FILTERING
    if (content_type && content_type !== 'all') {
      console.log('📁 Applying content type filter:', content_type);
      
      if (content_type === 'multimedia') {
        // Show only multimedia content (video, audio, image)
        contentWhere.content_type = { [Op.in]: ['video', 'audio', 'image'] };
        fileWhere[Op.or] = [
          { 
            metadata: {
              [Op.like]: '%"mimetype":"video/%'
            }
          },
          { 
            metadata: {
              [Op.like]: '%"mimetype":"audio/%'
            }
          },
          { 
            metadata: {
              [Op.like]: '%"mimetype":"image/%'
            }
          }
        ];
      } else if (content_type === 'social') {
        // Show only social media content
        contentWhere.content_type = { [Op.in]: ['instagram', 'facebook', 'twitter', 'youtube', 'linkedin'] };
        // Files don't have social content, so exclude all files
        fileWhere.id = null;
      } else if (content_type === 'files') {
        // Show only uploaded files
        contentWhere.id = null; // Exclude all content
        // Keep files as-is
      } else {
        // Specific content type
        contentWhere.content_type = content_type;
      }
    }
    
    // ✨ STATUS FILTERING 
    if (status && status !== 'all') {
      console.log('📊 Applying status filter:', status);
      
      if (status === 'analyzed') {
        // Show only items with AI analysis
        contentWhere.summary = { [Op.not]: null };
        fileWhere.summary = { [Op.not]: null };
      } else if (status === 'pending') {
        // Show only items without AI analysis
        contentWhere[Op.or] = [
          { summary: null },
          { summary: '' }
        ];
        fileWhere[Op.or] = [
          { summary: null },
          { summary: '' }
        ];
      }
    }
    
    console.log('🔍 Content WHERE clause:', JSON.stringify(contentWhere, null, 2));
    console.log('🔍 File WHERE clause:', JSON.stringify(fileWhere, null, 2));
    
    // ✨ SORT HANDLING: Determine sort order based on user selection
    let orderClause = [['createdAt', 'DESC']]; // Default: newest first
    let sortDisplayName = 'Newest First';
    
    if (sort) {
      console.log('🔄 Applying sort:', sort);
      
      switch (sort) {
        case 'oldest':
          orderClause = [['createdAt', 'ASC']];
          sortDisplayName = 'Oldest First';
          break;
        case 'channel':
          // For content, sort by platform/source, then by date
          // For files, sort by filename, then by date
          orderClause = [['createdAt', 'DESC']]; // Will be handled differently for channel sorting
          sortDisplayName = 'By Channel';
          break;
        case 'newest':
        default:
          orderClause = [['createdAt', 'DESC']];
          sortDisplayName = 'Newest First';
          break;
      }
    }
    
    console.log('📊 Sort order:', { sort, orderClause, sortDisplayName });
    
    // ✨ CORRECTED PAGINATION: Fetch items with proper server-side pagination
    // First, get total counts for both content and files (without pagination)
    const [totalContentCount, totalFileCount] = await Promise.all([
      Content.count({ where: contentWhere }),
      require('../models').File.count({ where: fileWhere })
    ]);
    
    const totalItems = totalContentCount + totalFileCount;
    console.log('📊 Total counts:', { content: totalContentCount, files: totalFileCount, total: totalItems });
    
    // ✨ UNIFIED QUERY: Get items from both tables and combine them properly
    const [contentItems, fileItems] = await Promise.all([
      Content.findAll({
        where: contentWhere,
        include: [{
          model: require('../models').SocialAccount,
          as: 'SocialAccount',
          attributes: ['platform', 'handle'],
          required: false
        }, {
          model: require('../models').Thumbnail,
          as: 'thumbnails',
          required: false,
          attributes: ['id', 'file_path', 'file_name', 'thumbnail_type', 'width', 'height', 'timestamp_seconds']
        }],
        order: sort === 'channel' ? 
          [
            [{ model: require('../models').SocialAccount, as: 'SocialAccount' }, 'platform', 'ASC'],
            ['createdAt', 'DESC']
          ] : orderClause,
        limit: Math.max(0, limit * 2), // Get more items to ensure we have enough after merging
        offset: 0 // We'll handle pagination after merging
      }),
      require('../models').File.findAll({
        where: fileWhere,
        include: [{
          model: require('../models').Thumbnail,
          as: 'thumbnails',
          required: false,
          attributes: ['id', 'file_path', 'file_name', 'thumbnail_type', 'width', 'height', 'timestamp_seconds']
        }],
        order: sort === 'channel' ? 
          [['filename', 'ASC'], ['createdAt', 'DESC']] : orderClause,
        limit: Math.max(0, limit * 2), // Get more items to ensure we have enough after merging
        offset: 0 // We'll handle pagination after merging
      })
    ]);

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

    // Function to normalize content items to include thumbnail data
    function normalizeContentItem(item) {
      const sourceInfo = getContentSourceInfo(item.url, item.SocialAccount);
      
      // Get thumbnail from database or URL
      let thumbnailUrl = null;
      let thumbnails = [];
      
      // Check if item has thumbnails from database
      if (item.thumbnails && item.thumbnails.length > 0) {
        thumbnails = item.thumbnails.map(thumb => ({
          id: thumb.id,
          file_path: thumb.file_path,
          file_name: thumb.file_name,
          thumbnail_type: thumb.thumbnail_type,
          width: thumb.width,
          height: thumb.height,
          timestamp_seconds: thumb.timestamp_seconds
        }));
        
        // Find main thumbnail or use first available
        const mainThumbnail = thumbnails.find(t => t.thumbnail_type === 'main');
        const usableThumbnail = mainThumbnail || thumbnails[0];
        
        if (usableThumbnail) {
          // Fix thumbnail URL generation for direct serving
          if (usableThumbnail.file_path.startsWith('http')) {
            thumbnailUrl = usableThumbnail.file_path;
          } else if (usableThumbnail.file_path.startsWith('uploads/thumbnails/')) {
            // For uploads/thumbnails/, create direct URL
            thumbnailUrl = '/' + usableThumbnail.file_path;
          } else if (usableThumbnail.file_path.startsWith('/files/serve/')) {
            // Remove the problematic /files/serve/ prefix and use direct path
            thumbnailUrl = usableThumbnail.file_path.replace('/files/serve/', '/');
          } else if (usableThumbnail.file_path.startsWith('uploads/')) {
            // For other uploads, add leading slash
            thumbnailUrl = '/' + usableThumbnail.file_path;
          } else {
            // Default: ensure leading slash
            thumbnailUrl = usableThumbnail.file_path.startsWith('/') ? 
              usableThumbnail.file_path : 
              '/' + usableThumbnail.file_path;
          }
        }
      }
      
      // Fallback to URL if it's an image
      if (!thumbnailUrl && item.url && item.url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        thumbnailUrl = item.url;
      }

      return {
        id: item.id,
        itemType: 'content',
        url: item.url,
        title: getContentTitle(item),
        displayTitle: getContentTitle(item),
        user_comments: item.user_comments || '',
        summary: item.summary || '',
        transcription: item.transcription || '',
        auto_tags: item.auto_tags || [],
        user_tags: item.user_tags || [],
        sentiment: item.sentiment,
        createdAt: item.createdAt,
        metadata: {
          ...item.metadata,
          thumbnail: thumbnailUrl,
          thumbnails: thumbnails, // Include all thumbnails data
          contentId: item.id,
          isFile: false
        },
        sourceInfo
      };
    }

    // Add source info and title to each content item
    const processedContentItems = contentItems.map(item => normalizeContentItem(item));

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

    // ✨ DYNAMIC SORTING: Apply user-selected sort order
    if (sort === 'oldest') {
      // Sort by creation date (oldest first)
      allItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      console.log('📊 Applied sort: Oldest First');
    } else if (sort === 'channel') {
      // Sort by channel/source, then by creation date (newest first within each channel)
      allItems.sort((a, b) => {
        // First, sort by source name
        const sourceA = a.sourceInfo?.source || 'Unknown';
        const sourceB = b.sourceInfo?.source || 'Unknown';
        const sourceCompare = sourceA.localeCompare(sourceB);
        
        if (sourceCompare !== 0) {
          return sourceCompare;
        }
        
        // If same source, sort by creation date (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      console.log('📊 Applied sort: By Channel');
    } else {
      // Default: Sort by creation date (newest first)
      allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      console.log('📊 Applied sort: Newest First (default)');
    }
    
    // ✨ PROPER SERVER-SIDE PAGINATION: Apply pagination to the merged and sorted items
    const paginatedItems = allItems.slice(offset, offset + limit);
    
    console.log(`📄 Pagination: Showing items ${offset + 1}-${Math.min(offset + limit, allItems.length)} of ${totalItems} total`);
    
    // Get content groups for the UI
    const contentGroups = await ContentGroup.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']]
    });
    
    // ✨ ENHANCED PAGINATION: Calculate pagination data with proper totals
    const totalPages = Math.ceil(totalItems / limit);
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: limit,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      // Add filter state to pagination for maintaining filters across pages
      filters: {
        tag: tag || '',
        from: from || '',
        to: to || '',
        search: search || '',
        content_type: content_type || 'all',
        status: status || 'all',
        sort: sort || 'newest'
      },
      // Helper function to build pagination URLs
      buildUrl: function(pageNum) {
        const params = new URLSearchParams();
        params.set('page', pageNum);
        if (tag) params.set('tag', tag);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (search) params.set('search', search);
        if (content_type && content_type !== 'all') params.set('content_type', content_type);
        if (status && status !== 'all') params.set('status', status);
        if (sort && sort !== 'newest') params.set('sort', sort);
        if (limit && limit !== 10) params.set('limit', limit);
        return '?' + params.toString();
      }
    };
    
    // Split items by type for debugging
    const contentCount = paginatedItems.filter(item => item.itemType === 'content').length;
    const fileCount = paginatedItems.filter(item => item.itemType === 'file').length;
    
    console.log(`📊 Found ${paginatedItems.length} items on page ${page} (${contentCount} content + ${fileCount} files) of ${totalItems} total for user ${req.user.id}`);
    // Render the content list page

    res.render('content/list', {
        user: req.user,
        title: 'Content Management - DaySave',
        contentItems: paginatedItems, // Pass paginated items array
        contentGroups,
        pagination,
        // Pass filter values to maintain state in the UI
        tag: tag || '',
        from: from || '',
        to: to || '',
        search: search || '',
        content_type: content_type || 'all',
        status: status || 'all',
        sort: sort || 'newest',
        debugInfo: {
          userId: req.user.id,
          contentCount: totalContentCount,
          fileCount: totalFileCount,
          totalItems: totalItems,
          currentPageItems: paginatedItems.length,
          groupCount: contentGroups.length
        }
      });
  } catch (error) {
    console.error('ERROR in /content route:', error);
    console.error('ERROR stack:', error.stack);
    res.status(500).render('error', { user: req.user, title: 'Error', message: 'Failed to load content' });
  }
});

/**
 * Handle bulk URL submission
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function handleBulkUrlSubmission(req, res) {
  console.log('🔄 Processing bulk URL submission');
  
  try {
    const { bulk_urls, user_comments, user_tags, group_ids, generate_ai_title, auto_tag } = req.body;
    
    if (!bulk_urls || typeof bulk_urls !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'bulk_urls is required and must be a string' 
      });
    }
    
    // Parse URLs from text (split by newlines, filter empty lines)
    const urls = bulk_urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    
    console.log(`📋 Processing ${urls.length} URLs from bulk submission`);
    
    if (urls.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid URLs found in bulk submission' 
      });
    }
    
    // Limit bulk submissions to prevent abuse
    if (urls.length > 50) {
      return res.status(400).json({ 
        success: false,
        error: 'Maximum 50 URLs allowed per bulk submission' 
      });
    }
    
    // Check usage limits for bulk submission
    const { checkUsageLimit, updateUsage } = require('../middleware');
    try {
      await new Promise((resolve, reject) => {
        // Check if user can add this many content items
        const customLimitChecker = (req, res, next) => {
          req.bulkItemCount = urls.length; // Custom property for bulk checking
          checkUsageLimit('content_items', () => urls.length)(req, res, next);
        };
        customLimitChecker(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (limitError) {
      return res.status(429).json({ 
        success: false,
        error: `Usage limit exceeded: Cannot add ${urls.length} items`,
        message: limitError.message 
      });
    }
    
    const results = {
      success: true,
      imported: [],
      errors: [],
      total: urls.length
    };
    
    const detector = new ContentTypeDetector();
    
    // Process each URL
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      try {
        console.log(`📤 [${i+1}/${urls.length}] Processing URL: ${url.substring(0, 60)}...`);
        
        // Detect content type
        const detected_content_type = detector.detectFromUrl(url) || 'unknown';
        
        // Create content record
        const content = await Content.create({
          user_id: req.user.id,
          url,
          user_comments: user_comments || '',
          user_tags: Array.isArray(user_tags) ? user_tags : [],
          content_type: detected_content_type
        });
        
        // Add to group if specified
        if (Array.isArray(group_ids) && group_ids.length > 0) {
          const groupMemberships = group_ids.map(group_id => ({
            content_id: content.id,
            group_id
          }));
          await ContentGroupMember.bulkCreate(groupMemberships);
        }
        
        // Log successful import
        logger.user.contentAdd(req.user.id, content.id, url, 'bulk_import');
        
        results.imported.push({
          id: content.id,
          url: url,
          content_type: detected_content_type,
          success: true
        });
        
        // Trigger comprehensive AI analysis for all content
        console.log(`🧠 [${i+1}/${urls.length}] Triggering AI analysis for content: ${content.id}`);
        
        // Trigger analysis in background
        setImmediate(async () => {
          try {
            await triggerMultimediaAnalysis(content, req.user);
            console.log(`✅ Background analysis started for ${content.id}`);
          } catch (analysisError) {
            console.error(`❌ Analysis failed for ${content.id}:`, analysisError.message);
          }
        });
        
      } catch (urlError) {
        console.error(`❌ [${i+1}/${urls.length}] Failed to process URL: ${url}`, urlError.message);
        
        results.errors.push({
          url: url,
          error: urlError.message
        });
      }
    }
    
    console.log(`📊 Bulk import completed: ${results.imported.length} success, ${results.errors.length} errors`);
    
    // Update usage count for successful imports
    if (results.imported.length > 0) {
      try {
        await new Promise((resolve, reject) => {
          const customUsageUpdater = (req, res, next) => {
            req.actualUsage = results.imported.length; // Update based on actual successful imports
            updateUsage('content_items', () => results.imported.length)(req, res, next);
          };
          customUsageUpdater(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } catch (usageError) {
        console.warn('⚠️ Failed to update usage count:', usageError.message);
      }
    }
    
    // Return results
    return res.json(results);
    
  } catch (error) {
    console.error('❌ Bulk URL submission failed:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Bulk URL submission failed',
      message: error.message 
    });
  }
}

// Create new content
router.post('/', [
  isAuthenticated
], async (req, res) => {
  try {
    // Check if this is a bulk URL submission
    if (req.body.content_type === 'bulk_urls') {
      return await handleBulkUrlSubmission(req, res);
    }
    
    // Handle single URL submission - check usage limits
    const { checkUsageLimit, updateUsage } = require('../middleware');
    await new Promise((resolve, reject) => {
      checkUsageLimit('content_items')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const { url, user_comments, user_tags, group_ids } = req.body;

    if (!url || typeof url !== 'string' || url.length < 5) {
      return res.status(400).json({ error: 'A valid URL is required.' });
    }

    // Detect content type before creation
    const detector = new ContentTypeDetector();
    const detected_content_type = detector.detectFromUrl(url) || 'unknown';
    
    const content = await Content.create({
      user_id: req.user.id,
      url,
      user_comments: user_comments || '',
      user_tags: Array.isArray(user_tags) ? user_tags : [],
      content_type: detected_content_type
    });

    // Log content creation
    logger.user.contentAdd(req.user.id, content.id, url, isMultimediaURL(url) ? 'multimedia' : 'standard');
    
    // Update usage count for single URL
    await new Promise((resolve, reject) => {
      updateUsage('content_items')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log content creation
    logger.user.contentAdd(req.user.id, content.id, url, isMultimediaURL(url) ? 'multimedia' : 'standard');

    if (Array.isArray(group_ids) && group_ids.length > 0) {
      const groupMemberships = group_ids.map(group_id => ({
        content_id: content.id,
        group_id
      }));
      await ContentGroupMember.bulkCreate(groupMemberships);
    }

    // Trigger comprehensive AI analysis for all content types
    console.log(`🧠 CONTENT ANALYSIS: Triggering AI analysis for content: ${content.id}`);
    
    // Trigger comprehensive analysis in background (don't wait for it)
    setImmediate(async () => {
      const startTime = Date.now();
      const automationId = `AUTO-${content.id.substring(0, 8)}`;
      
      try {
        console.log(`🚀 [${automationId}] AUTOMATION TRIGGER: Starting comprehensive AI analysis for content: ${content.id}`);
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
        ai_analysis: {
          status: 'started',
          message: 'Comprehensive AI analysis has been started and will update content when complete'
        }
      });
  } catch (error) {
    console.error('ERROR creating content:', error);
    res.status(500).json({ error: 'Failed to create content.' });
  }
});

// Test route to verify POST is working
router.post('/test', isAuthenticated, (req, res) => {
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
  
  try {
    const content = await Content.findOne({ where: { id: contentId, user_id: userId } });
    if (!content) {
      return res.status(404).json({ error: 'Content not found or already deleted.' });
    }
    await content.destroy();
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

// Content Analysis Status API Endpoint
router.get('/api/:id/status', isAuthenticated, async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    const { logging } = require('../config/config');
    if (logging.enableStatusPollingLogging) {
      console.log(`🔍 Status check request for content: ${contentId} by user: ${userId}`);
    }
    
    // Find the content item
    const content = await Content.findOne({
      where: { id: contentId, user_id: userId },
      include: [
        {
          model: require('../models').Thumbnail,
          as: 'thumbnails',
          required: false,
          limit: 5
        }
      ]
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check analysis completeness
    const hasTranscription = !!(content.transcription && content.transcription.length > 10);
    const hasSummary = !!(content.summary && content.summary.length > 10);
    const hasTitle = !!(content.generated_title && content.generated_title.length > 0);
    const hasTags = !!(content.auto_tags && content.auto_tags.length > 0);
    const hasThumbnails = content.thumbnails && content.thumbnails.length > 0;
    const hasSentiment = !!(content.sentiment);
    
    // Calculate completion percentage
    const features = [];
    let completedFeatures = 0;
    
    // Check if it's a multimedia URL
    const isMultimedia = content.url && (
      content.url.includes('facebook.com') ||
      content.url.includes('youtube.com') ||
      content.url.includes('instagram.com') ||
      content.url.includes('tiktok.com')
    );
    
    if (isMultimedia) {
      features.push(
        { name: 'Download', completed: true }, // Always completed if we have the content
        { name: 'Processing', completed: hasSummary || hasTranscription },
        { name: 'Transcription', completed: hasTranscription },
        { name: 'Summary', completed: hasSummary },
        { name: 'Thumbnails', completed: hasThumbnails },
        { name: 'Tags', completed: hasTags },
        { name: 'Sentiment', completed: hasSentiment }
      );
    } else {
      features.push(
        { name: 'Processing', completed: hasSummary || hasTitle },
        { name: 'Summary', completed: hasSummary },
        { name: 'Title', completed: hasTitle },
        { name: 'Tags', completed: hasTags }
      );
    }
    
    completedFeatures = features.filter(f => f.completed).length;
    const progressPercentage = Math.round((completedFeatures / features.length) * 100);
    
    // Determine status
    let status = 'waiting';
    if (progressPercentage === 0) {
      status = 'waiting';
    } else if (progressPercentage === 100) {
      status = 'analysed';
    } else if (progressPercentage > 0) {
      status = 'processing';
    }
    
    // Check for errors (if content is old but incomplete analysis)
    const isOld = (Date.now() - new Date(content.createdAt).getTime()) > (15 * 60 * 1000); // 15 minutes
    if (isOld && isMultimedia) {
      if (progressPercentage === 0) {
        status = 'incomplete'; // No analysis started
      } else if (progressPercentage > 0 && progressPercentage < 100 && !hasTranscription && !hasSummary) {
        status = 'incomplete'; // Analysis started but core features failed
      }
    }
    
    const response = {
      success: true,
      status: status,
      progress: progressPercentage,
      features: features,
      analysis: {
        hasTranscription: hasTranscription,
        hasSummary: hasSummary,
        hasTitle: hasTitle,
        hasTags: hasTags,
        hasThumbnails: hasThumbnails,
        hasSentiment: hasSentiment,
        transcriptionLength: content.transcription?.length || 0,
        summaryLength: content.summary?.length || 0,
        tagCount: content.auto_tags?.length || 0,
        thumbnailCount: content.thumbnails?.length || 0
      },
      metadata: {
        contentId: contentId,
        createdAt: content.createdAt,
        isMultimedia: isMultimedia,
        url: content.url,
        canRetry: isOld && (status === 'incomplete' || (progressPercentage > 0 && progressPercentage < 100))
      }
    };
    
    if (logging.enableStatusPollingLogging) {
      console.log(`📊 Status response for ${contentId}: ${status} (${progressPercentage}%)`);
    }
    res.json(response);
    
  } catch (error) {
    console.error('❌ Error checking content status:', error);
    res.status(500).json({ 
      error: 'Failed to check status',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Retry Content Analysis API Endpoint
router.post('/api/:id/retry', isAuthenticated, async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    if (logging.enableAnalysisRequestLogging) {
      console.log(`🔄 Retry analysis request for content: ${contentId} by user: ${userId}`);
    }
    
    // Find the content item
    const content = await Content.findOne({
      where: { id: contentId, user_id: userId }
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if it's a multimedia URL that can be reanalyzed
    const isMultimedia = content.url && (
      content.url.includes('facebook.com') ||
      content.url.includes('youtube.com') ||
      content.url.includes('instagram.com') ||
      content.url.includes('tiktok.com')
    );
    
    if (!isMultimedia) {
      return res.status(400).json({ error: 'Only multimedia content can be reanalyzed' });
    }
    
    // Trigger reanalysis
    try {
      console.log(`🚀 Triggering reanalysis for ${content.url}`);
      
      // Import the analysis function
      const { triggerMultimediaAnalysis } = require('./content');
      
      // Reset analysis fields to indicate reprocessing
      await content.update({
        transcription: null,
        summary: null,
        sentiment: null,
        metadata: {
          ...content.metadata,
          retryAt: new Date().toISOString(),
          retryReason: 'Manual retry - stuck analysis'
        }
      });
      
      // Trigger analysis in background
      setImmediate(async () => {
        try {
          await triggerMultimediaAnalysis(content.url, req.user.id, {
            source: 'retry',
            contentId: content.id
          });
          console.log(`✅ Reanalysis triggered for ${contentId}`);
        } catch (retryError) {
          console.error(`❌ Reanalysis failed for ${contentId}:`, retryError);
        }
      });
      
      res.json({
        success: true,
        message: 'Reanalysis triggered successfully',
        contentId: contentId,
        status: 'waiting'
      });
      
    } catch (triggerError) {
      console.error(`❌ Failed to trigger reanalysis for ${contentId}:`, triggerError);
      res.status(500).json({
        error: 'Failed to trigger reanalysis',
        details: triggerError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in retry endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to retry analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Reprocess Content Analysis Endpoint
router.post('/:id/reprocess', isAuthenticated, async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    if (logging.enableAnalysisRequestLogging) {
      console.log(`🔄 Reprocess analysis request for content: ${contentId} by user: ${userId}`);
    }
    
    // Find the content item
    const content = await Content.findOne({
      where: { id: contentId, user_id: userId }
    });
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    // Check if it's a multimedia URL that can be reprocessed
    const isMultimedia = isMultimediaURL(content.url);
    
    if (!isMultimedia) {
      return res.status(400).json({ error: 'Only multimedia content can be reprocessed' });
    }
    
    // Trigger reprocessing
    try {
      console.log(`🚀 Triggering reprocessing for ${content.url}`);
      
      // Reset analysis fields to clear previous results
      await content.update({
        transcription: null,
        summary: null,
        sentiment: null,
        auto_tags: null,
        generated_title: null,
        metadata: {
          ...content.metadata,
          reprocessedAt: new Date().toISOString(),
          reprocessReason: 'Manual reprocess - user requested'
        }
      });
      
      // Trigger analysis in background using the multimedia orchestrator
      setImmediate(async () => {
        try {
          // Use the correct function signature: triggerMultimediaAnalysis(content, user)
          await triggerMultimediaAnalysis(content, req.user);
          console.log(`✅ Reprocessing triggered for ${contentId}`);
        } catch (reprocessError) {
          console.error(`❌ Reprocessing failed for ${contentId}:`, reprocessError);
        }
      });
      
      res.json({
        success: true,
        message: 'Content reprocessing started successfully',
        contentId: contentId,
        status: 'processing'
      });
      
    } catch (triggerError) {
      console.error(`❌ Failed to trigger reprocessing for ${contentId}:`, triggerError);
      res.status(500).json({
        error: 'Failed to trigger reprocessing',
        details: triggerError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in reprocess endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to reprocess content',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get content analysis results page (NEW: Dedicated analysis page)
router.get('/:id/analysis/view', isAuthenticated, async (req, res) => {
  try {
    const contentId = req.params.id;
    const userId = req.user.id;
    
    console.log(`🔍 Analysis page request for content: ${contentId} by user: ${userId}`);
    
    // Verify user owns the content
    const content = await Content.findOne({ where: { id: contentId, user_id: userId } });
    if (!content) {
      console.log(`❌ Content not found: ${contentId} for user: ${userId}`);
      return res.status(404).render('error', { 
        user: req.user, 
        title: 'Content Not Found', 
        message: 'The requested content was not found.' 
      });
    }
    
    console.log(`✅ Content found: ${content.url}`);
    
    // Get comprehensive analysis data (reuse existing logic)
    const { VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, Thumbnail, OCRCaption, Speaker } = require('../models');
    
    // Get analysis records and related data
    let videoAnalysis, audioAnalysis, imageAnalysis, processingJobs = [], thumbnails = [], speakers = [], ocrCaptions = [];
    
    try {
      [videoAnalysis, audioAnalysis, imageAnalysis, processingJobs] = await Promise.all([
        VideoAnalysis.findOne({ where: { content_id: contentId, user_id: userId } }),
        AudioAnalysis.findOne({ where: { content_id: contentId, user_id: userId } }),
        ImageAnalysis.findOne({ where: { content_id: contentId, user_id: userId } }),
        ProcessingJob.findAll({
          where: { content_id: contentId, user_id: userId },
          order: [['createdAt', 'DESC']],
          limit: 5
        })
      ]);
    } catch (analysisError) {
      console.error('❌ Error querying analysis records:', analysisError);
      videoAnalysis = audioAnalysis = imageAnalysis = null;
      processingJobs = [];
    }
    
    // Get related data based on analysis type
    try {
      if (videoAnalysis && Thumbnail && OCRCaption) {
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
      
      if (audioAnalysis && Speaker) {
        speakers = await Speaker.findAll({
          where: { user_id: userId, audio_analysis_id: audioAnalysis.id },
          order: [['confidence_score', 'DESC']],
          limit: 5
        });
      }
      
      if (imageAnalysis && Thumbnail) {
        thumbnails = await Thumbnail.findAll({
          where: { content_id: contentId, user_id: userId },
          order: [['createdAt', 'ASC']],
          limit: 5
        });
      }
    } catch (relatedDataError) {
      console.error('❌ Error querying related data:', relatedDataError);
    }
    
    // Determine analysis type and primary analysis object
    const analysis = videoAnalysis || audioAnalysis || imageAnalysis;
    let mediaType = content.content_type === 'unknown' ? 'content' : content.content_type;
    if (videoAnalysis) mediaType = 'video';
    else if (audioAnalysis) mediaType = 'audio';
    else if (imageAnalysis) mediaType = 'image';
    
    // Helper function to get proper title
    function getContentTitle(content) {
      if (content.generated_title && content.generated_title.trim()) {
        return content.generated_title;
      }
      if (content.metadata && content.metadata.title) {
        return content.metadata.title;
      }
      if (content.url) {
        try {
          const url = new URL(content.url);
          const hostname = url.hostname.replace('www.', '');
          const pathname = url.pathname.replace(/\/$/, '').split('/').pop();
          if (pathname && pathname.length > 3) {
            return `${hostname} - ${pathname.replace(/[-_]/g, ' ')}`;
          }
          return hostname;
        } catch (e) {
          return content.url;
        }
      }
      return 'Untitled Content';
    }
    
    // Prepare comprehensive analysis data for the view
    const analysisData = {
      content: content,
      title: getContentTitle(content),
      mediaType: mediaType,
      hasAnalysis: !!analysis,
      
      // Core analysis data
      analysis: analysis,
      videoAnalysis: videoAnalysis,
      audioAnalysis: audioAnalysis,
      imageAnalysis: imageAnalysis,
      
      // Summary and content
      summary: content.summary || '',
      transcription: content.transcription || '',
      
      // AI-generated content
      generatedTitle: content.generated_title || '',
      autoTags: content.auto_tags || [],
      userTags: content.user_tags || [],
      category: content.category || '',
      userComments: content.user_comments || '',
      sentiment: content.sentiment || null,
      
      // Technical metadata
      metadata: content.metadata || {},
      
      // Related data
      thumbnails: thumbnails || [],
      speakers: speakers || [],
      ocrCaptions: ocrCaptions || [],
      processingJobs: processingJobs || [],
      
      // Processing information
      latestJob: processingJobs.length > 0 ? processingJobs[0] : null,
      
      // Content details
      url: content.url,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt
    };
    
    console.log(`📊 Rendering analysis page for content ${contentId}:`, {
      hasAnalysis: !!analysis,
      mediaType: mediaType,
      hasSummary: !!content.summary,
      hasTranscription: !!content.transcription,
      thumbnailCount: thumbnails.length,
      speakerCount: speakers.length
    });
    
    // Render the dedicated analysis page
    res.render('content/analysis', {
      user: req.user,
      title: `AI Analysis - ${getContentTitle(content)}`,
      analysisData: analysisData
    });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in content analysis page:', {
      error: error.message,
      stack: error.stack,
      contentId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).render('error', { 
      user: req.user, 
      title: 'Analysis Error', 
      message: 'Failed to load content analysis. Please try again later.' 
    });
  }
});

module.exports = router; 