#!/usr/bin/env node
/**
 * Failed URL Content Reprocessor for DaySave
 * 
 * PURPOSE:
 * Reprocesses URL content that failed to generate AI-powered titles and tags
 * by running the complete AI analysis pipeline on specific content items.
 * 
 * USAGE:
 * 1. Edit the contentId variable (line ~19) to target specific content
 * 2. Run: node scripts/reprocess-failed-url.js
 * 
 * FEATURES:
 * - Targets specific content by ID for reprocessing
 * - Runs complete AI analysis (summary, title, tags, sentiment)
 * - Uses BackwardCompatibilityService for URL content analysis
 * - Updates database with generated results
 * - Provides detailed progress logging and verification
 * 
 * CONFIGURATION:
 * - Update contentId variable to target specific failed content
 * - Supports any URL content type (web articles, multimedia, etc.)
 * 
 * OUTPUT:
 * - Analysis progress and results
 * - Generated title and tags
 * - Updated content verification
 * - Processing time and metadata
 * 
 * USE CASES:
 * - Fix content missing titles/tags after initial submission
 * - Reprocess content after system fixes
 * - Debug and test AI analysis pipeline
 * - Recover from failed automatic processing
 * 
 * DEPENDENCIES:
 * - Database models (Content, User, ProcessingJob)
 * - BackwardCompatibilityService for AI analysis
 * - Environment configuration
 * 
 * AUTHOR: DaySave Development Team
 * CREATED: 2025-08-06 (URL Processing Debug Updates)
 */

require('dotenv').config();
const { Content, User, ProcessingJob } = require('../models');
const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');

async function reprocessFailedContent() {
  try {
    console.log('🔄 Starting reprocessing of failed URL content...');
    
    // Target the specific failed content
    const contentId = 'b5e405a9-a445-4275-a824-20fa9b13430b';
    
    // Find the content
    const content = await Content.findByPk(contentId, {
      include: [{ model: User, attributes: ['id', 'username', 'email'] }]
    });
    
    if (!content) {
      console.error('❌ Content not found:', contentId);
      return;
    }
    
    console.log('📋 Content found:');
    console.log('   URL:', content.url);
    console.log('   User:', content.User.username);
    console.log('   Current Summary:', content.summary ? `${content.summary.substring(0, 100)}...` : 'None');
    console.log('   Current Title:', content.generated_title || 'None');
    console.log('   Current Tags:', content.auto_tags || 'None');
    
    // Check if it really needs reprocessing
    const needsProcessing = !content.generated_title || !content.auto_tags || content.auto_tags.length === 0;
    
    if (!needsProcessing) {
      console.log('✅ Content already has title and tags, skipping...');
      return;
    }
    
    console.log('\n🧠 Starting AI analysis...');
    
    // Use BackwardCompatibilityService to reprocess
    const compatibilityService = new BackwardCompatibilityService();
    
    const analysisOptions = {
      transcription: true,
      sentiment: true,
      summarization: true,
      thumbnails: true,
      speaker_identification: true,
      enableSummarization: true,
      enableSentimentAnalysis: true,
      user_id: content.User.id,
      content_id: content.id
    };
    
    const processingResult = await compatibilityService.analyzeContent(content.url, analysisOptions);
    
    console.log('\n📊 Analysis Results:');
    console.log('   Analysis ID:', processingResult.analysisId);
    console.log('   Status:', processingResult.status);
    console.log('   Platform:', processingResult.platform);
    console.log('   Summary Length:', processingResult.summary?.length || 0);
    console.log('   Generated Title:', processingResult.generatedTitle || 'None');
    console.log('   Auto Tags:', processingResult.auto_tags || 'None');
    
    // Update content record with new results
    const updateData = {};
    
    if (processingResult.summary) {
      updateData.summary = processingResult.summary;
    }
    
    if (processingResult.generatedTitle && processingResult.generatedTitle.trim()) {
      updateData.generated_title = processingResult.generatedTitle.trim();
      console.log(`🎯 Updating AI-generated title: "${processingResult.generatedTitle.trim()}"`);
    }
    
    if (processingResult.auto_tags && processingResult.auto_tags.length > 0) {
      updateData.auto_tags = [...new Set(processingResult.auto_tags)]; // Remove duplicates
      console.log(`🏷️ Updating auto tags: [${processingResult.auto_tags.join(', ')}]`);
    }
    
    if (processingResult.category) {
      updateData.category = processingResult.category;
    }
    
    if (processingResult.sentiment) {
      updateData.sentiment = processingResult.sentiment;
    }
    
    // Update metadata
    if (processingResult.metadata) {
      updateData.metadata = {
        ...(content.metadata || {}),
        ...processingResult.metadata,
        analysisId: processingResult.analysisId,
        lastAnalyzed: new Date().toISOString(),
        reprocessedAt: new Date().toISOString(),
        reprocessingReason: 'missing_title_and_tags'
      };
    }
    
    if (Object.keys(updateData).length > 0) {
      await Content.update(updateData, {
        where: { id: content.id }
      });
      
      console.log('\n✅ Content updated successfully!');
      console.log('📋 Updated fields:', Object.keys(updateData).join(', '));
    } else {
      console.log('\n⚠️ No updates needed.');
    }
    
    // Verify the update
    const updatedContent = await Content.findByPk(contentId);
    console.log('\n🔍 Verification:');
    console.log('   Has Title:', !!updatedContent.generated_title);
    console.log('   Title:', updatedContent.generated_title || 'None');
    console.log('   Has Tags:', !!(updatedContent.auto_tags && updatedContent.auto_tags.length > 0));
    console.log('   Tags:', updatedContent.auto_tags || 'None');
    console.log('   Has Summary:', !!updatedContent.summary);
    console.log('   Summary Length:', updatedContent.summary?.length || 0);
    
    console.log('\n🎉 Reprocessing completed successfully!');
    
  } catch (error) {
    console.error('❌ Reprocessing failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  reprocessFailedContent()
    .then(() => {
      console.log('✅ Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { reprocessFailedContent };