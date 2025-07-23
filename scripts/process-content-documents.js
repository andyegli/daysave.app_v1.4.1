#!/usr/bin/env node

/**
 * Process Content Document URLs
 * 
 * Download and process Content records that point to document URLs
 */

const { Content, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Initialize automation orchestrator
const orchestrator = AutomationOrchestrator.getInstance();

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath) {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * Process a content document URL
 */
async function processContentDocument(content, user) {
  try {
    console.log(`🎬 Processing content document: ${content.id}`);
    console.log(`   URL: ${content.url}`);
    console.log(`   User: ${user.username}`);

    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Determine file extension from URL
    const urlObj = new URL(content.url);
    const pathname = urlObj.pathname;
    const fileExt = path.extname(pathname) || '.docx';
    const tempFileName = `content_${content.id}_${Date.now()}${fileExt}`;
    const tempFilePath = path.join(tempDir, tempFileName);

    console.log(`📥 Downloading document from URL...`);
    await downloadFile(content.url, tempFilePath);
    console.log(`✅ Downloaded to: ${tempFilePath}`);

    // Verify file was downloaded
    if (!fs.existsSync(tempFilePath)) {
      throw new Error(`Failed to download file to ${tempFilePath}`);
    }

    const fileStats = fs.statSync(tempFilePath);
    console.log(`📖 Downloaded file size: ${fileStats.size} bytes`);

    if (fileStats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    // Read file into buffer
    const fileBuffer = fs.readFileSync(tempFilePath);
    console.log(`📖 File buffer size: ${fileBuffer.length} bytes`);

    // Determine MIME type
    const mimeTypes = {
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain'
    };
    const mimeType = mimeTypes[fileExt] || 'application/octet-stream';

    // Create metadata for processing
    const fileMetadata = {
      filename: path.basename(pathname),
      contentId: content.id,
      userId: user.id,
      mimeType: mimeType,
      fileSize: fileBuffer.length,
      source: 'content_url',
      filePath: tempFilePath,
      originalUrl: content.url
    };

    console.log(`🎯 Starting orchestrator processing...`);
    const processingResult = await orchestrator.processContent(
      fileBuffer,
      fileMetadata
    );

    console.log(`✅ Processing completed for content ${content.id}`, {
      job_id: processingResult.jobId,
      media_type: processingResult.mediaType,
      processing_time: processingResult.processingTime
    });

    // Extract results
    const formattedResults = processingResult.results;
    
    // Build content for AI analysis
    let contentForAI = '';
    
    if (formattedResults.data.transcription) {
      if (formattedResults.data.transcription.fullText) {
        contentForAI = formattedResults.data.transcription.fullText;
      } else if (typeof formattedResults.data.transcription === 'string') {
        contentForAI = formattedResults.data.transcription;
      }
    }

    // Enhanced AI analysis using BackwardCompatibilityService
    let enhancedResults = null;
    if (contentForAI.trim().length > 10) {
      try {
        console.log(`🎯 Running AI enhancement...`);
        const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');
        const compatibilityService = new BackwardCompatibilityService();
        
        const fakeAnalysisForAI = {
          transcription: contentForAI,
          summary: contentForAI.length > 500 ? contentForAI.substring(0, 500) + '...' : contentForAI,
          metadata: formattedResults.data.metadata || {}
        };
        
        enhancedResults = await compatibilityService.convertToLegacyFormat(fakeAnalysisForAI);
        console.log(`✨ Enhanced AI analysis completed`);
        
      } catch (aiError) {
        console.error(`⚠️ Enhanced AI analysis failed:`, aiError.message);
        
        // Create fallback results
        enhancedResults = {
          generatedTitle: null,
          auto_tags: [],
          category: formattedResults.mediaType || 'document'
        };
        
        // Extract meaningful tags from content
        if (contentForAI.length > 20) {
          const words = contentForAI.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'will', 'would', 'could', 'should'].includes(word));
          
          const wordCounts = {};
          words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          });
          
          const topWords = Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([word]) => word);
          
          enhancedResults.auto_tags = topWords;
          console.log(`🏷️ Generated fallback tags: ${topWords.join(', ')}`);
        }
      }
    }

    // Update the Content record
    const updateData = {
      transcription: contentForAI || null,
      summary: formattedResults.data.aiDescription?.description || 
               formattedResults.data.summary || 
               (contentForAI.length > 300 ? contentForAI.substring(0, 300) + '...' : contentForAI) || 
               null,
      metadata: {
        ...content.metadata,
        processingJobId: processingResult.jobId,
        lastAnalyzed: new Date().toISOString(),
        aiVersion: '2.0',
        documentProcessing: true,
        originalUrl: content.url,
        mimeType: mimeType,
        fileSize: fileBuffer.length
      }
    };

    // Add enhanced AI results
    if (enhancedResults) {
      if (enhancedResults.generatedTitle) {
        updateData.generated_title = enhancedResults.generatedTitle;
      }
      if (enhancedResults.auto_tags && enhancedResults.auto_tags.length > 0) {
        updateData.auto_tags = enhancedResults.auto_tags;
      }
      if (enhancedResults.category) {
        updateData.category = enhancedResults.category;
      }
    }

    console.log(`💾 Updating content record with AI results...`);
    await Content.update(updateData, {
      where: { id: content.id, user_id: user.id }
    });

    console.log(`✅ Content ${content.id} updated with document analysis results`);

    // Clean up temp file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`🗑️ Cleaned up temp file: ${tempFilePath}`);
    }

    return {
      success: true,
      processedContent: contentForAI.length,
      hasAI: !!enhancedResults,
      updateFields: Object.keys(updateData)
    };

  } catch (error) {
    console.error(`❌ Failed to process content document ${content.id}:`, {
      error: error.message,
      stack: error.stack
    });
    
    // Clean up temp file on error
    const tempDir = path.join(__dirname, '..', 'temp');
    const tempFileName = `content_${content.id}_${Date.now()}.docx`;
    const tempFilePath = path.join(tempDir, tempFileName);
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log(`🗑️ Cleaned up temp file after error: ${tempFilePath}`);
    }
    
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Looking for unprocessed document Content records...');
    
    // Find content records pointing to documents that need processing
    const unprocessedDocs = await Content.findAll({
      where: {
        [Op.and]: [
          // No AI analysis done yet
          {
            [Op.or]: [
              { summary: null },
              { generated_title: null },
              { transcription: null }
            ]
          },
          // Document URLs
          {
            [Op.or]: [
              { content_type: 'document' },
              { url: { [Op.like]: '%.docx%' } },
              { url: { [Op.like]: '%.pdf%' } },
              { url: { [Op.like]: '%.doc%' } },
              { url: { [Op.like]: '%.txt%' } }
            ]
          }
        ]
      },
      include: [{
        model: User,
        attributes: ['id', 'username', 'email']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    console.log(`📋 Found ${unprocessedDocs.length} unprocessed document content records`);

    if (unprocessedDocs.length === 0) {
      console.log('✨ No unprocessed document content found!');
      return;
    }

    for (const content of unprocessedDocs) {
      console.log(`\n📄 Processing: ${content.url}`);
      console.log(`   Content ID: ${content.id}`);
      console.log(`   Type: ${content.content_type}`);
      console.log(`   User: ${content.User.username}`);
      console.log(`   Created: ${content.createdAt}`);

      try {
        const result = await processContentDocument(content, content.User);
        
        console.log(`✅ Successfully processed: ${content.id}`);
        console.log(`   Processed content: ${result.processedContent} chars`);
        console.log(`   AI enhanced: ${result.hasAI}`);
        console.log(`   Updated fields: ${result.updateFields.join(', ')}`);
        
        // Verify the update worked
        const updatedContent = await Content.findOne({ where: { id: content.id } });
        console.log(`🔍 Post-processing state:`);
        console.log(`   Has summary: ${!!updatedContent.summary} (${updatedContent.summary?.length || 0} chars)`);
        console.log(`   Has title: ${!!updatedContent.generated_title}`);
        console.log(`   Has tags: ${!!updatedContent.auto_tags} (${updatedContent.auto_tags?.length || 0} tags)`);
        console.log(`   Has transcription: ${!!updatedContent.transcription} (${updatedContent.transcription?.length || 0} chars)`);
        
      } catch (processingError) {
        console.error(`❌ Failed to process ${content.url}:`, processingError.message);
      }
    }

    console.log('\n🎉 Document content processing completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('✅ Document content processing script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Document content processing script failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 