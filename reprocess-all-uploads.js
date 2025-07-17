const { File, User, VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob } = require('./models');
const path = require('path');
const fs = require('fs');

// Import the updated triggerFileAnalysis function
async function importTriggerFileAnalysis() {
  // We'll recreate the logic here since we can't easily import from routes
  const FileUploadService = require('./services/fileUpload');
  const { AutomationOrchestrator } = require('./services/multimedia');
  const logger = require('./config/logger');
  
  const orchestrator = AutomationOrchestrator.getInstance();
  
  async function triggerFileAnalysis(fileRecord, user) {
    let fileMetadata;
    
    try {
      console.log(`🎬 Starting enhanced file analysis for ${fileRecord.id}`, {
        user_id: user.id,
        file_id: fileRecord.id,
        filename: fileRecord.filename,
        mimetype: fileRecord.metadata?.mimetype
      });

      let filePath;
      
      if (fileRecord.file_path.startsWith('gs://')) {
        // Download from GCS
        console.log(`📥 Downloading GCS file for analysis: ${fileRecord.file_path}`);
        
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFileName = `temp_${fileRecord.id}_${Date.now()}_${fileRecord.filename}`;
        filePath = path.join(tempDir, tempFileName);
        
        try {
          const gcsPath = fileRecord.file_path.replace('gs://', '');
          const [bucketName, ...pathParts] = gcsPath.split('/');
          const objectName = pathParts.join('/');
          
          await FileUploadService.downloadFromGCS(bucketName, objectName, filePath);
          console.log(`✅ Downloaded GCS file to: ${filePath}`);
          
        } catch (downloadError) {
          console.error(`❌ Failed to download GCS file: ${downloadError.message}`);
          throw new Error(`Failed to download file from Google Cloud Storage: ${downloadError.message}`);
        }
      } else {
        if (fileRecord.file_path.startsWith('/uploads/')) {
          filePath = path.join(__dirname, fileRecord.file_path);
        } else {
          filePath = path.resolve(fileRecord.file_path);
        }
      }

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at path: ${filePath}`);
      }

      // Read file into buffer for processing
      const fileBuffer = fs.readFileSync(filePath);
      
      fileMetadata = {
        filename: fileRecord.filename,
        fileId: fileRecord.id,
        userId: user.id,
        mimeType: fileRecord.metadata?.mimetype,
        fileSize: fileRecord.metadata?.size,
        source: 'upload',
        filePath: filePath,
        cleanupTempFile: fileRecord.file_path.startsWith('gs://'),
        tempFilePath: fileRecord.file_path.startsWith('gs://') ? filePath : null
      };

      // Process file with orchestrator
      const processingResult = await orchestrator.processContent(
        fileBuffer,
        fileMetadata
      );

      console.log(`🎯 Orchestrator processing completed for ${fileRecord.id}`, {
        job_id: processingResult.jobId,
        media_type: processingResult.mediaType,
        has_results: !!processingResult.results
      });

      // Extract and process results
      const formattedResults = processingResult.results;
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

      // Handle transcription results
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

      // Handle OCR text
      if (formattedResults.data.ocrText && formattedResults.data.ocrText.fullText) {
        const ocrText = formattedResults.data.ocrText.fullText;
        updateData.summary = updateData.summary ? 
          `${updateData.summary}\n\nExtracted Text: ${ocrText}` : 
          `Extracted Text: ${ocrText}`;
      }

      // Store sentiment analysis
      if (formattedResults.data.sentiment) {
        updateData.sentiment = formattedResults.data.sentiment;
      }

      // Generate auto tags from various sources
      const autoTags = [];
      
      if (formattedResults.data.objects && formattedResults.data.objects.length > 0) {
        formattedResults.data.objects.forEach(obj => {
          if (obj.label && obj.confidence > 0.7) {
            autoTags.push(obj.label);
          }
        });
      }
      
      if (formattedResults.data.aiDescription && formattedResults.data.aiDescription.tags) {
        autoTags.push(...formattedResults.data.aiDescription.tags);
      }
      
      if (autoTags.length > 0) {
        updateData.auto_tags = [...new Set(autoTags)];
      }

      // Generate title if we have content
      let contentForTitle = '';
      if (updateData.transcription) {
        contentForTitle = updateData.transcription;
      } else if (updateData.summary) {
        contentForTitle = updateData.summary;
      }
      
      if (contentForTitle && contentForTitle.length > 20) {
        // Generate a simple title from the first meaningful sentence
        const sentences = contentForTitle.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length > 0) {
          let title = sentences[0].trim();
          if (title.length > 100) {
            title = title.substring(0, 100) + '...';
          }
          updateData.generated_title = title;
        }
      }

      // Determine category based on media type
      if (!updateData.category && formattedResults.mediaType) {
        updateData.category = formattedResults.mediaType;
      }

      // Update file record with analysis results
      if (Object.keys(updateData).length > 0) {
        await File.update(updateData, {
          where: { id: fileRecord.id, user_id: user.id }
        });
        
        console.log(`✅ File ${fileRecord.id} updated with analysis results`, {
          updates: Object.keys(updateData),
          generated_title: updateData.generated_title,
          ai_tags: updateData.auto_tags,
          has_transcription: !!updateData.transcription,
          has_summary: !!updateData.summary
        });
      }

      return {
        success: true,
        jobId: processingResult.jobId,
        mediaType: processingResult.mediaType,
        updatedFields: Object.keys(updateData)
      };

    } catch (error) {
      console.error(`❌ Enhanced file analysis failed for ${fileRecord.id}:`, {
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      // Clean up temporary file
      if (fileMetadata && fileMetadata.cleanupTempFile && fileMetadata.tempFilePath) {
        try {
          if (fs.existsSync(fileMetadata.tempFilePath)) {
            fs.unlinkSync(fileMetadata.tempFilePath);
            console.log(`🗑️ Cleaned up temporary file: ${fileMetadata.tempFilePath}`);
          }
        } catch (cleanupError) {
          console.error(`⚠️ Failed to clean up temporary file: ${cleanupError.message}`);
        }
      }
    }
  }
  
  return triggerFileAnalysis;
}

function isMultimediaFile(mimetype) {
  const multimediaTypes = [
    // Video files
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
    // Audio files
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
    // Image files
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'
  ];
  
  return multimediaTypes.includes(mimetype);
}

async function reprocessAllUploads() {
  try {
    console.log('🚀 REPROCESSING FILE UPLOADS FOR andy.egli@gmail.com WITH UPDATED AI PIPELINE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const triggerFileAnalysis = await importTriggerFileAnalysis();
    
    // Find all multimedia files for andy.egli@gmail.com that need reprocessing
    const targetUser = 'andy.egli@gmail.com';
    const files = await File.findAll({
      include: [{ 
        model: User, 
        attributes: ['id', 'username'],
        where: { username: targetUser }
      }],
      order: [['createdAt', 'DESC']]
    });
    
    console.log(`📁 Found ${files.length} total files for ${targetUser}`);
    
    // Filter multimedia files
    const multimediaFiles = files.filter(file => 
      file.metadata?.mimetype && isMultimediaFile(file.metadata.mimetype)
    );
    
    console.log(`🎬 Found ${multimediaFiles.length} multimedia files to process for ${targetUser}`);
    
    if (multimediaFiles.length === 0) {
      console.log(`✅ No multimedia files found to process for ${targetUser}`);
      return;
    }
    
    // Show breakdown by type
    const byType = {};
    multimediaFiles.forEach(file => {
      const type = file.metadata.mimetype.split('/')[0];
      byType[type] = (byType[type] || 0) + 1;
    });
    
    console.log('📊 Files by type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} files`);
    });
    console.log('');
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const results = [];
    
    for (const file of multimediaFiles) {
      processed++;
      console.log(`\n[${processed}/${multimediaFiles.length}] 🎬 Processing: ${file.filename}`);
      console.log(`   📋 ID: ${file.id}`);
      console.log(`   📊 Type: ${file.metadata?.mimetype}`);
      console.log(`   📏 Size: ${(file.metadata?.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   👤 User: ${file.User.username}`);
      console.log(`   📍 Path: ${file.file_path}`);
      
      try {
        const result = await triggerFileAnalysis(file, file.User);
        successful++;
        
        console.log(`   ✅ Success - Job ID: ${result.jobId}`);
        console.log(`   📋 Media Type: ${result.mediaType}`);
        console.log(`   🔄 Updated: ${result.updatedFields.join(', ')}`);
        
        results.push({
          file: file.filename,
          id: file.id,
          status: 'success',
          jobId: result.jobId,
          mediaType: result.mediaType,
          updatedFields: result.updatedFields
        });
        
      } catch (error) {
        failed++;
        console.log(`   ❌ Failed: ${error.message}`);
        
        results.push({
          file: file.filename,
          id: file.id,
          status: 'failed',
          error: error.message
        });
      }
      
      // Add a small delay to prevent overwhelming the system
      if (processed < multimediaFiles.length) {
        console.log('   ⏳ Waiting 2 seconds before next file...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n🎉 REPROCESSING COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 SUMMARY:`);
    console.log(`   Total files: ${multimediaFiles.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success rate: ${((successful / multimediaFiles.length) * 100).toFixed(1)}%`);
    
    if (successful > 0) {
      console.log('\n✅ Successfully processed files:');
      results.filter(r => r.status === 'success').forEach(r => {
        console.log(`   📁 ${r.file} → ${r.mediaType} (${r.updatedFields.length} fields updated)`);
      });
    }
    
    if (failed > 0) {
      console.log('\n❌ Failed files:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   📁 ${r.file} → ${r.error}`);
      });
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. Check your content management page to see files integrated with content');
    console.log('   2. Verify AI analysis results (transcriptions, tags, summaries)');
    console.log('   3. Files should now appear in unified content cards display');
    
  } catch (error) {
    console.error('💥 Reprocessing failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the reprocessing
reprocessAllUploads(); 