/**
 * Reprocess Images Missing AI Analysis
 * 
 * This script finds all image files that have no AI analysis data
 * (summary, description, tags) and re-triggers the analysis process.
 * 
 * Use this after fixing bugs in the AI analysis pipeline to backfill
 * missing data for previously uploaded images.
 */

const { Op } = require('sequelize');
const { File, Content, User } = require('../models');
const path = require('path');
const fs = require('fs');

// Import the multimedia analyzer directly
const AutomationOrchestrator = require('../services/multimedia/AutomationOrchestrator');
const FileUploadService = require('../services/fileUpload');

async function reprocessImagesWithoutAI() {
    console.log('🔍 Starting reprocessing of images missing AI analysis...\n');
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('📁 Created temp directory:', tempDir);
    }
    
    try {
        // Find all image files that have no AI summary/description
        const imagesToReprocess = await File.findAll({
            where: {
                [Op.and]: [
                    // Only image files
                    {
                        [Op.or]: [
                            { metadata: { [Op.like]: '%"mimetype":"image/%' } },
                            { filename: { [Op.like]: '%.jpg' } },
                            { filename: { [Op.like]: '%.jpeg' } },
                            { filename: { [Op.like]: '%.png' } },
                            { filename: { [Op.like]: '%.gif' } },
                            { filename: { [Op.like]: '%.webp' } },
                            { filename: { [Op.like]: '%.bmp' } }
                        ]
                    },
                    // Missing AI analysis data (check existing fields only)
                    {
                        [Op.or]: [
                            { summary: { [Op.is]: null } },
                            { summary: '' },
                            { transcription: { [Op.is]: null } },
                            { transcription: '' },
                            { auto_tags: { [Op.is]: null } },
                            { auto_tags: '' }
                        ]
                    }
                ]
            },
            order: [['created_at', 'DESC']]
        });

        console.log(`📊 Found ${imagesToReprocess.length} images that need AI analysis:\n`);

        if (imagesToReprocess.length === 0) {
            console.log('✅ All images already have AI analysis data!');
            return;
        }

        // Process each image
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (let i = 0; i < imagesToReprocess.length; i++) {
            const file = imagesToReprocess[i];
            const progress = `${i + 1}/${imagesToReprocess.length}`;
            
            console.log(`🔄 [${progress}] Processing: ${file.filename} (ID: ${file.id.substring(0, 8)}...)`);
            
            try {
                // Check if file still exists
                if (file.file_path && file.file_path.startsWith('gs://')) {
                    // GCS file - should be accessible
                    console.log(`   📁 GCS file: ${file.file_path}`);
                } else if (file.file_path && fs.existsSync(file.file_path)) {
                    // Local file exists
                    console.log(`   📁 Local file: ${file.file_path}`);
                } else {
                    console.log(`   ⚠️  Skipping - file not found: ${file.file_path}`);
                    skipCount++;
                    continue;
                }

                // Get user info for analysis
                const user = await User.findByPk(file.user_id);
                if (!user) {
                    console.log(`   ⚠️  Skipping - user not found for file ${file.filename}`);
                    skipCount++;
                    continue;
                }

                console.log(`   🤖 Triggering AI analysis...`);
                
                // Process the file using the same logic as triggerFileAnalysis
                await processFileWithAI(file, user);
                
                // Wait a moment to avoid overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                successCount++;
                console.log(`   ✅ Analysis triggered successfully\n`);
                
            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error processing ${file.filename}:`, error.message);
                console.error(`      File: ${file.file_path}`);
                console.error(`      Error: ${error.stack}\n`);
                
                // Continue with next file
                continue;
            }
        }

        console.log('📊 Reprocessing Summary:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Successfully triggered: ${successCount} files`);
        console.log(`⚠️  Skipped (file missing): ${skipCount} files`);
        console.log(`❌ Errors: ${errorCount} files`);
        console.log(`📋 Total processed: ${imagesToReprocess.length} files`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        if (successCount > 0) {
            console.log('🎉 Reprocessing initiated! Check the server logs for analysis progress.');
            console.log('💡 AI analysis runs in the background - results will appear in content cards as processing completes.');
        }

    } catch (error) {
        console.error('💥 Fatal error during reprocessing:', error);
        process.exit(1);
    }
}

// Process file with AI analysis (mimics triggerFileAnalysis logic)
async function processFileWithAI(fileRecord, user) {
    let fileMetadata = {};
    
    try {
        console.log(`🎬 Starting enhanced file analysis for ${fileRecord.id}`);
        
        // Parse metadata if it's stored as string
        let metadata = fileRecord.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch (e) {
                metadata = {};
            }
        }

        // Initialize fileMetadata for GCS downloads
        fileMetadata = {
            filename: fileRecord.filename,
            fileId: fileRecord.id,
            userId: user.id,
            mimeType: metadata?.mimetype || 'image/jpeg',
            fileSize: metadata?.size || 0,
            source: 'reprocess'
        };

        // Get the actual filesystem path for the uploaded file
        let filePath;
        
        if (fileRecord.file_path.startsWith('gs://')) {
            // Download file from GCS using FileUploadService
            const gcsPath = fileRecord.file_path.replace('gs://', '');
            const [bucketName, ...pathParts] = gcsPath.split('/');
            const objectName = pathParts.join('/');
            
            const tempFilename = `temp_${fileRecord.id}_${Date.now()}_${fileRecord.filename}`;
            const tempFilePath = path.join(__dirname, '../temp', tempFilename);
            
            console.log(`📥 Downloading GCS file for analysis: ${fileRecord.file_path}`);
            
            await FileUploadService.downloadFromGCS(bucketName, objectName, tempFilePath);
            
            filePath = tempFilePath;
            fileMetadata.cleanupTempFile = true;
            fileMetadata.tempFilePath = tempFilePath;
        } else {
            // Local file
            filePath = fileRecord.file_path;
        }

        fileMetadata.filePath = filePath;

        // Read file into buffer for processing
        console.log(`📖 Reading file into buffer...`);
        const fileBuffer = await fs.promises.readFile(filePath);
        
        // Use AutomationOrchestrator for processing
        const orchestrator = new AutomationOrchestrator();
        
        console.log(`🎯 Starting orchestrator processing...`);
        const result = await orchestrator.processContent(fileBuffer, fileMetadata);
        
        console.log(`🎯 Orchestrator processing completed for ${fileRecord.id}`);
        
        // Extract AI analysis results
        const aiResults = result.results?.data || {};
        
        // Build enhanced AI content for the file
        let enhancedContent = '';
        let aiTags = [];
        
        if (aiResults.aiDescription) {
            enhancedContent = aiResults.aiDescription;
        }
        
        if (aiResults.tags && Array.isArray(aiResults.tags)) {
            aiTags = aiResults.tags;
        }
        
        // Update the file record with AI analysis results (using correct File model fields)
        const updatedMetadata = {
            ...metadata,
            ...(aiResults.objects && { objects: aiResults.objects }),
            ...(aiResults.quality && { quality: aiResults.quality }),
            ...(aiResults.aiDescription && { aiDescription: aiResults.aiDescription }),
            ...(aiResults.tags && { tags: aiResults.tags }),
            analysis_version: '1.4.2',
            reprocessed_at: new Date().toISOString()
        };

        const updateData = {
            transcription: enhancedContent || null,  // Use transcription field for AI description
            summary: enhancedContent || null,        // Also populate summary
            auto_tags: aiTags.length > 0 ? aiTags : null,  // Store tags as JSON array (not stringified)
            category: 'image',
            metadata: JSON.stringify(updatedMetadata)
        };

        await File.update(updateData, {
            where: { id: fileRecord.id }
        });

        console.log(`✅ File ${fileRecord.id} updated with AI analysis results`);

    } catch (error) {
        console.error(`❌ Enhanced file analysis failed for ${fileRecord.id}:`, error);
        throw error;
    } finally {
        // Cleanup temporary files
        if (fileMetadata.cleanupTempFile && fileMetadata.tempFilePath) {
            try {
                if (fs.existsSync(fileMetadata.tempFilePath)) {
                    fs.unlinkSync(fileMetadata.tempFilePath);
                    console.log(`🗑️ Cleaned up temporary file: ${fileMetadata.tempFilePath}`);
                }
            } catch (cleanupError) {
                console.error(`⚠️ Failed to cleanup temp file: ${cleanupError.message}`);
            }
        }
    }
}

// Helper function to check if analysis is needed
function needsAIAnalysis(file) {
    // Check if any AI-generated fields are missing (using correct File model fields)
    const hasTranscription = file.transcription && file.transcription.trim().length > 0;
    const hasSummary = file.summary && file.summary.trim().length > 0;
    const hasTags = file.auto_tags && (Array.isArray(file.auto_tags) ? file.auto_tags.length > 0 : false);
    
    return !(hasTranscription || hasSummary || hasTags);
}

// Run the script if called directly
if (require.main === module) {
    console.log('🚀 Image AI Analysis Reprocessing Script');
    console.log('==========================================\n');
    
    reprocessImagesWithoutAI()
        .then(() => {
            console.log('✅ Script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script failed:', error);
            process.exit(1);
        });
}

module.exports = { reprocessImagesWithoutAI }; 