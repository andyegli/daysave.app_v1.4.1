const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware');
const { Content, ContentGroup, ContentGroupMember } = require('../models');
const { Op } = require('sequelize');

// Main content management page with real data and debugging
router.get('/', isAuthenticated, async (req, res) => {
  console.log('DEBUG: /content route hit by user:', req.user ? req.user.id : 'NO USER');
  try {
    // Debug: Check if models are available
    const models = require('../models');
    console.log('DEBUG: Available models:', Object.keys(models));
    console.log('DEBUG: SocialAccount model exists:', !!models.SocialAccount);
    console.log('DEBUG: Content model exists:', !!models.Content);
    let { tag, from, to, category, source } = req.query;
    const where = { user_id: req.user.id };
    
    // Support multi-category (array or single value)
    let selectedCategories = [];
    if (category) {
      if (Array.isArray(category)) {
        selectedCategories = category;
      } else if (typeof category === 'string' && category.length > 0) {
        selectedCategories = [category];
      }
    }
    if (selectedCategories.length > 0) {
      where.category = { [Op.or]: selectedCategories };
    }
    
    // Support multi-source (array or single value)
    let selectedSources = [];
    if (source) {
      if (Array.isArray(source)) {
        selectedSources = source;
      } else if (typeof source === 'string' && source.length > 0) {
        selectedSources = [source];
      }
    }
    
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

    // Add source info to each content item
    contentItems = contentItems.map(item => {
      item.sourceInfo = getContentSourceInfo(item.url, item.SocialAccount);
      return item;
    });
    
    // Apply source filtering (after source info is added)
    if (selectedSources.length > 0) {
      contentItems = contentItems.filter(item => {
        return selectedSources.includes(item.sourceInfo.source);
      });
    }
    
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
    } else {
      console.log('DEBUG: No content items found');
    }
    // Generate filter options from content data
    const categories = Array.from(new Set(contentItems.map(i => i.category).filter(Boolean)));
    const sources = Array.from(new Set(contentItems.map(i => i.sourceInfo.source).filter(Boolean)));
    
    res.render('content/list', {
      user: req.user,
      title: 'Content Management - DaySave',
      contentItems,
      contentGroups,
      pagination,
      categories,
      sources,
      category: selectedCategories,
      source: selectedSources,
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
router.post('/', isAuthenticated, async (req, res) => {
  console.log('DEBUG: POST /content route hit by user:', req.user ? req.user.id : 'NO USER');
  console.log('DEBUG: Request method:', req.method);
  console.log('DEBUG: Request headers:', req.headers['content-type']);
  console.log('DEBUG: Request body type:', typeof req.body);
  console.log('DEBUG: Request body:', req.body);
  
  try {
    const { url, user_comments, category, user_tags, group_ids } = req.body;
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
      category: category || '',
      user_tags: Array.isArray(user_tags) ? user_tags : []
    });

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

    res.json({ success: true, content });
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

// Update content
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, user_comments, category, user_tags, group_ids } = req.body;
    const content = await Content.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!content) {
      return res.status(404).json({ error: 'Content not found.' });
    }
    // Update fields
    if (title !== undefined) content.title = title;
    if (user_comments !== undefined) content.user_comments = user_comments;
    if (category !== undefined) content.category = category;
    if (user_tags !== undefined) content.user_tags = Array.isArray(user_tags) ? user_tags : [];
    await content.save();
    // Update group memberships if provided
    if (Array.isArray(group_ids)) {
      await ContentGroupMember.destroy({ where: { content_id: content.id } });
      const groupMemberships = group_ids.map(group_id => ({ content_id: content.id, group_id }));
      if (groupMemberships.length > 0) {
        await ContentGroupMember.bulkCreate(groupMemberships);
      }
    }
    res.json({ success: true, content });
  } catch (error) {
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

module.exports = router; 