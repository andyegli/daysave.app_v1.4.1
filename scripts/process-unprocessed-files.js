#!/usr/bin/env node

/**
 * Process Unprocessed Files
 * 
 * Find File records that haven't been processed by AI and trigger their processing
 */

const { File, User, ProcessingJob } = require('../models');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');

// Initialize automation orchestrator 
const orchestrator = AutomationOrchestrator.getInstance();

/**
 * Check if file type should trigger multimedia analysis
 */
function isMultimediaFile(mimetype) {
  const multimediaTypes = [
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff',
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
 * Trigger analysis for a file (copied from routes/files.js)
 */
async function triggerFileAnalysis(fileRecord, user) {
  let fileMetadata = {};
  
  try {
    console.log(`🎬 Starting file analysis for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      filename: fileRecord.filename,
      mimetype: fileRecord.metadata?.mimetype
    });

    const path = require('path');
    const fs = require('fs');
    let filePath;
    
    if (fileRecord.file_path.startsWith('gs://')) {
      // GCS file handling
      console.log(`📥 Downloading GCS file for analysis: ${fileRecord.file_path}`);
      
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFileName = `temp_${fileRecord.id}_${Date.now()}_${fileRecord.filename}`;
      filePath = path.join(tempDir, tempFileName);
      
      fileMetadata = {
        filename: fileRecord.filename,
        fileId: fileRecord.id,
        userId: user.id,
        mimeType: fileRecord.metadata?.mimetype,
        fileSize: fileRecord.metadata?.size,
        source: 'manual_processing',
        cleanupTempFile: true,
        tempFilePath: filePath
      };
      
      const gcsPath = fileRecord.file_path.replace('gs://', '');
      const [bucketName, ...pathParts] = gcsPath.split('/');
      const objectName = pathParts.join('/');
      
      const FileUploadService = require('../services/fileUpload');
      await FileUploadService.downloadFromGCS(bucketName, objectName, filePath);
      console.log(`✅ Downloaded GCS file to: ${filePath}`);
      
    } else {
      // Local file handling
      console.log(`📁 Processing local file: ${fileRecord.file_path}`);
      if (fileRecord.file_path.startsWith('/uploads/')) {
        filePath = path.join(__dirname, '..', fileRecord.file_path);
      } else {
        filePath = path.resolve(fileRecord.file_path);
      }
      
      fileMetadata = {
        filename: fileRecord.filename,
        fileId: fileRecord.id,
        userId: user.id,
        mimeType: fileRecord.metadata?.mimetype,
        fileSize: fileRecord.metadata?.size,
        source: 'manual_processing',
        filePath: filePath
      };
    }

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    console.log(`📖 Reading file into buffer...`);
    const fileBuffer = await fs.promises.readFile(filePath);
    console.log(`📖 File buffer size: ${fileBuffer.length} bytes`);

    console.log(`🎯 Starting orchestrator processing...`);
    const processingResult = await orchestrator.processContent(
      fileBuffer,
      fileMetadata
    );

    console.log(`✅ Processing completed for ${fileRecord.id}`, {
      job_id: processingResult.jobId,
      media_type: processingResult.mediaType,
      processing_time: processingResult.processingTime
    });

    // Clean up temp file if needed
    if (fileMetadata.cleanupTempFile && filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Cleaned up temp file: ${filePath}`);
    }

    return processingResult;

  } catch (error) {
    console.error(`❌ File analysis failed for ${fileRecord.id}:`, {
      error: error.message,
      stack: error.stack
    });
    
    // Clean up temp file on error
    if (fileMetadata.cleanupTempFile && fileMetadata.tempFilePath && require('fs').existsSync(fileMetadata.tempFilePath)) {
      require('fs').unlinkSync(fileMetadata.tempFilePath);
      console.log(`🗑️ Cleaned up temp file after error: ${fileMetadata.tempFilePath}`);
    }
    
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Looking for unprocessed files...');
    
    // Find files that need processing
    const unprocessedFiles = await File.findAll({
      where: {
        [Op.and]: [
          // No AI analysis done yet
          {
            [Op.or]: [
              { summary: null },
              { generated_title: null },
              { auto_tags: null }
            ]
          },
          // Only multimedia files that should be processed
          {
            [Op.or]: [
              {
                metadata: {
                  mimetype: {
                    [Op.in]: [
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'application/pdf',
                      'application/msword',
                      'text/plain'
                    ]
                  }
                }
              },
              {
                filename: {
                  [Op.or]: [
                    { [Op.like]: '%.docx' },
                    { [Op.like]: '%.pdf' },
                    { [Op.like]: '%.doc' },
                    { [Op.like]: '%.txt' }
                  ]
                }
              }
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

    console.log(`📋 Found ${unprocessedFiles.length} unprocessed files`);

    if (unprocessedFiles.length === 0) {
      console.log('✨ No unprocessed files found - all documents are already processed!');
      return;
    }

    for (const file of unprocessedFiles) {
      const isDoc = file.metadata?.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.filename?.endsWith('.docx');
      
      console.log(`\n📄 Processing: ${file.filename} (${file.id}) ${isDoc ? '📝 DOCX' : ''}`);
      console.log(`   MIME: ${file.metadata?.mimetype}`);
      console.log(`   User: ${file.User.username}`);
      console.log(`   Created: ${file.createdAt}`);
      console.log(`   Has summary: ${!!file.summary}`);
      console.log(`   Has title: ${!!file.generated_title}`);
      console.log(`   Has tags: ${!!file.auto_tags}`);

      if (isMultimediaFile(file.metadata?.mimetype)) {
        try {
          console.log(`🚀 Starting AI analysis for ${file.filename}...`);
          
          await triggerFileAnalysis(file, file.User);
          
          // Verify the processing worked
          const updatedFile = await File.findOne({ where: { id: file.id } });
          console.log(`✅ Analysis completed for ${file.filename}`);
          console.log(`   New summary: ${!!updatedFile.summary} (${updatedFile.summary?.length || 0} chars)`);
          console.log(`   New title: ${!!updatedFile.generated_title}`);
          console.log(`   New tags: ${!!updatedFile.auto_tags} (${updatedFile.auto_tags?.length || 0} tags)`);
          
        } catch (processingError) {
          console.error(`❌ Failed to process ${file.filename}:`, processingError.message);
        }
      } else {
        console.log(`⏭️ Skipping ${file.filename} - not a supported multimedia file`);
      }
    }

    console.log('\n🎉 File processing completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('✅ Processing script completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Processing script failed:', error);
    process.exit(1);
  });
}

module.exports = { main }; 