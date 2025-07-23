#!/usr/bin/env node

/**
 * Trigger Document Processing for Stuck Files
 * 
 * This script identifies files stuck in 'waiting' status and manually triggers
 * their AI analysis processing.
 */

const { File, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');

// Initialize automation orchestrator for file processing (singleton)
const orchestrator = AutomationOrchestrator.getInstance();

/**
 * Check if file type should trigger multimedia analysis
 */
function isMultimediaFile(mimetype) {
  const multimediaTypes = [
    // Video files
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
    // Audio files
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
    // Image files (for OCR analysis)
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
    // Document files (for AI text analysis)
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/rtf',
    'application/rtf'
  ];
  
  return multimediaTypes.includes(mimetype);
}

/**
 * Trigger multimedia analysis for file
 */
async function triggerFileAnalysis(fileRecord, user) {
  let fileMetadata = {};
  
  try {
    console.log(`🎬 Starting manual file analysis for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      filename: fileRecord.filename,
      mimetype: fileRecord.metadata?.mimetype
    });

    // Get the actual filesystem path for the uploaded file
    const path = require('path');
    const fs = require('fs');
    let filePath;
    
    if (fileRecord.file_path.startsWith('gs://')) {
      // For Google Cloud Storage files, download them temporarily for analysis
      console.log(`📥 Downloading GCS file for analysis: ${fileRecord.file_path}`);
      
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFileName = `temp_${fileRecord.id}_${Date.now()}_${fileRecord.filename}`;
      filePath = path.join(tempDir, tempFileName);
      
      // Initialize fileMetadata for GCS downloads
      fileMetadata = {
        filename: fileRecord.filename,
        fileId: fileRecord.id,
        userId: user.id,
        mimeType: fileRecord.metadata?.mimetype,
        fileSize: fileRecord.metadata?.size,
        source: 'manual_trigger',
        cleanupTempFile: false,
        tempFilePath: null
      };
      
      // Download file from GCS using FileUploadService
      const gcsPath = fileRecord.file_path.replace('gs://', '');
      const [bucketName, ...pathParts] = gcsPath.split('/');
      const objectName = pathParts.join('/');
      
      const FileUploadService = require('../services/fileUpload');
      const downloadResult = await FileUploadService.downloadFromGCS(bucketName, objectName, filePath);
      console.log(`✅ Downloaded GCS file to: ${filePath}`);
      
      fileMetadata.cleanupTempFile = true;
      fileMetadata.tempFilePath = filePath;
      
    } else {
      // For local files, convert the stored path to absolute path
      console.log(`📁 Processing local file: ${fileRecord.file_path}`);
      if (fileRecord.file_path.startsWith('/uploads/')) {
        filePath = path.join(__dirname, '..', fileRecord.file_path);
      } else {
        filePath = path.resolve(fileRecord.file_path);
      }
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    console.log(`📖 Reading file into buffer...`);
    const fileBuffer = await fs.promises.readFile(filePath);
    console.log(`📖 File buffer size: ${fileBuffer.length} bytes`);
    
    // Update metadata for orchestrator
    fileMetadata = {
      ...fileMetadata,
      filename: fileRecord.filename,
      fileId: fileRecord.id,
      userId: user.id,
      mimeType: fileRecord.metadata?.mimetype,
      fileSize: fileRecord.metadata?.size,
      source: 'manual_trigger',
      filePath: filePath
    };

    console.log(`🎯 Starting orchestrator processing...`);
    const processingResult = await orchestrator.processContent(
      fileBuffer,
      fileMetadata
    );

    console.log(`✅ Manual processing completed for ${fileRecord.id}`, {
      job_id: processingResult.jobId,
      media_type: processingResult.mediaType,
      processing_time: processingResult.processingTime
    });

    return processingResult;

  } catch (error) {
    console.error(`❌ Manual file analysis failed for ${fileRecord.id}:`, {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Looking for files stuck in waiting status...');
    
    // Find files that might be stuck
    const stuckFiles = await File.findAll({
      where: {
        // Look for files that should have processing but don't
        [Op.and]: [
          {
            metadata: {
              [Op.or]: [
                { mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
                { mimetype: 'application/pdf' },
                { mimetype: 'application/msword' },
                { mimetype: 'text/plain' }
              ]
            }
          },
          {
            [Op.or]: [
              { summary: null },
              { generated_title: null },
              { auto_tags: null }
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

    console.log(`📋 Found ${stuckFiles.length} files that might need processing`);

    for (const file of stuckFiles) {
      console.log(`\n📄 Processing file: ${file.filename} (${file.id})`);
      console.log(`   MIME type: ${file.metadata?.mimetype}`);
      console.log(`   User: ${file.User.username}`);
      console.log(`   Has summary: ${!!file.summary}`);
      console.log(`   Has title: ${!!file.generated_title}`);
      console.log(`   Has tags: ${!!file.auto_tags}`);

      if (isMultimediaFile(file.metadata?.mimetype)) {
        try {
          console.log(`🚀 Triggering analysis for ${file.filename}...`);
          
          await triggerFileAnalysis(file, file.User);
          
          // Verify the update worked
          const updatedFile = await File.findOne({ where: { id: file.id } });
          console.log(`✅ Analysis completed for ${file.filename}`);
          console.log(`   New summary: ${!!updatedFile.summary}`);
          console.log(`   New title: ${!!updatedFile.generated_title}`);
          console.log(`   New tags: ${!!updatedFile.auto_tags}`);
          
        } catch (processingError) {
          console.error(`❌ Failed to process ${file.filename}:`, processingError.message);
        }
      } else {
        console.log(`⏭️ Skipping ${file.filename} - not a multimedia file`);
      }
    }

    console.log('\n🎉 Document processing trigger completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 