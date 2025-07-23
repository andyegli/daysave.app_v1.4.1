#!/usr/bin/env node

/**
 * Complete Stuck Analysis Records
 * 
 * Updates analysis table statuses and triggers missing analysis
 */

const { Op } = require('sequelize');
require('dotenv').config();
const models = require('../models');
const { Content, VideoAnalysis, AudioAnalysis, ImageAnalysis } = models;

async function main() {
  console.log('🔧 === COMPLETING STUCK ANALYSIS RECORDS ===');
  console.log('==========================================');
  
  try {
    await models.sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Step 1: Update analysis statuses that have data but are still "processing"
    console.log('\n📊 Updating analysis record statuses...');
    
    // Update video analysis records that have transcription but are still processing
    const videoUpdates = await VideoAnalysis.update(
      { status: 'ready' },
      { 
        where: {
          status: 'processing',
          transcription_results: { [Op.ne]: null }
        }
      }
    );
    console.log(`✅ Updated ${videoUpdates[0]} video analysis records to "ready"`);
    
    // Update audio analysis records  
    const audioUpdates = await AudioAnalysis.update(
      { status: 'ready' },
      { 
        where: {
          status: 'processing', 
          transcription_results: { [Op.ne]: null }
        }
      }
    );
    console.log(`✅ Updated ${audioUpdates[0]} audio analysis records to "ready"`);
    
    // Update image analysis records
    const imageUpdates = await ImageAnalysis.update(
      { status: 'ready' },
      { 
        where: {
          status: 'processing',
          ai_description: { [Op.ne]: null }
        }
      }
    );
    console.log(`✅ Updated ${imageUpdates[0]} image analysis records to "ready"`);
    
    // Step 2: Handle the text file that hasn't been processed
    console.log('\n📄 Checking text file processing...');
    const textFileContent = await Content.findByPk('df49d630-9574-47bc-8853-2d4c4de0c89e');
    
    if (textFileContent && !textFileContent.summary) {
      console.log('🔄 Processing text file URL...');
      
      try {
        // Simple text file processing
        const response = await fetch(textFileContent.url);
        const textContent = await response.text();
        
        if (textContent && textContent.length > 0) {
          // Create simple summary and title
          const summary = textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '');
          const words = textContent.split(' ').slice(0, 10);
          const title = words.join(' ') + (words.length >= 10 ? '...' : '');
          
          await textFileContent.update({
            transcription: textContent,
            summary: summary,
            generated_title: title,
            content_type: 'document',
            auto_tags: ['text', 'document', 'sample'],
            metadata: {
              ...textFileContent.metadata,
              processed: true,
              processedAt: new Date().toISOString(),
              contentLength: textContent.length
            }
          });
          
          console.log('✅ Text file processed and summary created');
        }
      } catch (error) {
        console.error('❌ Error processing text file:', error.message);
      }
    }
    
    // Step 3: Verify fixes
    console.log('\n🔍 Verifying fixes...');
    
    const stuckContentIds = [
      'c9cf8e0f-db9b-40d7-b6f4-4bb698cda56a',
      'b9691d74-291f-4b12-812a-f1f90eddce73', 
      '022fc1d4-c1ad-4410-91ba-686391676eec',
      'b4f93e4a-7642-487b-9b73-5610eb2ae38e',
      '049af111-e251-42c4-9a4f-92bb68ec7b76',
      'df49d630-9574-47bc-8853-2d4c4de0c89e'
    ];
    
    for (const contentId of stuckContentIds) {
      const content = await Content.findByPk(contentId);
      if (content) {
        const completionStatus = {
          summary: !!content.summary,
          transcription: !!content.transcription,
          title: !!content.generated_title,
          tags: !!(content.auto_tags && content.auto_tags.length > 0)
        };
        
        const completedFeatures = Object.values(completionStatus).filter(Boolean).length;
        const progressPercentage = Math.round((completedFeatures / 4) * 100);
        
        console.log(`📋 ${contentId.substring(0, 8)}...: ${progressPercentage}% complete`);
        console.log(`   ✅ ${Object.entries(completionStatus).filter(([k,v]) => v).map(([k]) => k).join(', ')}`);
        
        if (progressPercentage < 100) {
          const missing = Object.entries(completionStatus).filter(([k,v]) => !v).map(([k]) => k);
          console.log(`   ❌ Missing: ${missing.join(', ')}`);
        }
      }
    }
    
    console.log('\n✅ Analysis completion script finished!');
    
  } catch (error) {
    console.error('❌ Error completing analysis:', error);
    process.exit(1);
  } finally {
    await models.sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main }; 