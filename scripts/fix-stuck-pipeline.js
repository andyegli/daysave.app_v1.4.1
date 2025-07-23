#!/usr/bin/env node

/**
 * Fix Stuck Pipeline Items
 * 
 * Identifies content items stuck in processing and attempts to resolve them
 * by either restarting analysis or marking them as incomplete for retry.
 */

const path = require('path');
const { Content, VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, User } = require('../models');

// Import the analysis trigger function (fallback if not available)
let triggerMultimediaAnalysis;
try {
  triggerMultimediaAnalysis = require('../routes/content').triggerMultimediaAnalysis;
} catch (error) {
  triggerMultimediaAnalysis = async (content, user) => {
    console.log(`⚠️ triggerMultimediaAnalysis not available, skipping ${content.id}`);
  };
}

async function main() {
  console.log('🔧 Starting stuck pipeline analysis...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Find potentially stuck content items
    const cutoffTime = new Date(Date.now() - (20 * 60 * 1000)); // 20 minutes ago
    
    console.log(`🔍 Looking for content created before ${cutoffTime.toISOString()}`);
    
    const stuckContent = await Content.findAll({
      where: {
        createdAt: {
          [require('sequelize').Op.lt]: cutoffTime
        }
      },
      include: [
        { model: User, as: 'User', attributes: ['id', 'email'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    console.log(`📊 Found ${stuckContent.length} potentially stuck items`);

    if (stuckContent.length === 0) {
      console.log('✅ No stuck items found!');
      return;
    }

    // Analyze each item
    for (const content of stuckContent) {
      console.log(`\n🔍 Analyzing content: ${content.id}`);
      console.log(`   📄 URL: ${content.url?.substring(0, 60)}...`);
      console.log(`   👤 User: ${content.User?.email}`);
      console.log(`   📅 Created: ${content.createdAt}`);

      // Check analysis completeness
      const hasTranscription = !!(content.transcription && content.transcription.length > 10);
      const hasSummary = !!(content.summary && content.summary.length > 10);
      const hasTitle = !!(content.generated_title && content.generated_title.length > 0);
      const hasTags = !!(content.auto_tags && content.auto_tags.length > 0);
      const hasSentiment = !!(content.sentiment);

      // Calculate current completion
      const isMultimedia = content.url && (
        content.url.includes('facebook.com') ||
        content.url.includes('youtube.com') ||
        content.url.includes('instagram.com') ||
        content.url.includes('tiktok.com')
      );

      let features = [];
      if (isMultimedia) {
        features = [
          { name: 'Download', completed: true },
          { name: 'Processing', completed: hasSummary || hasTranscription },
          { name: 'Transcription', completed: hasTranscription },
          { name: 'Summary', completed: hasSummary },
          { name: 'Thumbnails', completed: false }, // Can't easily check
          { name: 'Tags', completed: hasTags },
          { name: 'Sentiment', completed: hasSentiment }
        ];
      } else {
        features = [
          { name: 'Processing', completed: hasSummary || hasTitle },
          { name: 'Summary', completed: hasSummary },
          { name: 'Title', completed: hasTitle },
          { name: 'Tags', completed: hasTags }
        ];
      }

      const completedFeatures = features.filter(f => f.completed).length;
      const progressPercentage = Math.round((completedFeatures / features.length) * 100);

      console.log(`   📊 Progress: ${progressPercentage}% (${completedFeatures}/${features.length})`);
      console.log(`   ✅ Has: ${features.filter(f => f.completed).map(f => f.name).join(', ')}`);
      console.log(`   ❌ Missing: ${features.filter(f => !f.completed).map(f => f.name).join(', ')}`);

      // Determine action
      if (progressPercentage === 0) {
        console.log(`   🔄 Action: RESTART - No analysis started`);
        await restartAnalysis(content);
      } else if (progressPercentage > 0 && progressPercentage < 100) {
        if (hasTranscription || hasSummary) {
          console.log(`   ⚠️  Action: PARTIAL - Some core features completed, likely minor issues`);
          await markMinorIssues(content);
        } else {
          console.log(`   🔄 Action: RESTART - No core features completed`);
          await restartAnalysis(content);
        }
      } else {
        console.log(`   ✅ Action: COMPLETE - Analysis appears finished`);
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing stuck pipeline:', error);
  }
}

async function restartAnalysis(content) {
  try {
    console.log(`   🚀 Restarting analysis for ${content.id}...`);
    
    // Clear existing analysis data
    await Content.update({
      transcription: null,
      summary: null,
      sentiment: null,
      auto_tags: [],
      generated_title: null,
      metadata: {
        ...content.metadata,
        retryAt: new Date().toISOString(),
        retryReason: 'Pipeline stuck - automated restart'
      }
    }, {
      where: { id: content.id }
    });

    // Note: In a real scenario, we'd trigger the analysis here
    // For now, just log that we've prepared it for restart
    console.log(`   ✅ Content ${content.id} prepared for restart`);
    console.log(`   💡 Manual trigger needed: Visit the content page and click retry`);

  } catch (error) {
    console.error(`   ❌ Failed to restart analysis for ${content.id}:`, error.message);
  }
}

async function markMinorIssues(content) {
  try {
    console.log(`   ⚠️  Marking minor issues for ${content.id}...`);
    
    // Update metadata to indicate partial completion
    await Content.update({
      metadata: {
        ...content.metadata,
        partialAnalysis: true,
        analyzedAt: new Date().toISOString(),
        issueReason: 'Analysis partially completed before app restart'
      }
    }, {
      where: { id: content.id }
    });

    console.log(`   ✅ Content ${content.id} marked with partial analysis flag`);

  } catch (error) {
    console.error(`   ❌ Failed to mark issues for ${content.id}:`, error.message);
  }
}

// Run the script
main().then(() => {
  console.log('\n🎉 Stuck pipeline analysis completed!');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Script failed:', error);
  process.exit(1);
}); 