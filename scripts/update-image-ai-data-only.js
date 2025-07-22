const { File, User } = require('../models');
const { Op } = require('sequelize');

/**
 * Simple script to update AI data for images without thumbnails
 * This extracts AI description from transcription field and populates missing fields
 */

async function updateImageAIData() {
    try {
        console.log('🔄 Updating AI data for image files...\n');

        // Find image files that need AI data updates (only checking existing fields)
        const imagesToUpdate = await File.findAll({
            where: {
                [Op.and]: [
                    // Image file extensions
                    {
                        [Op.or]: [
                            { filename: { [Op.like]: '%.jpg' } },
                            { filename: { [Op.like]: '%.jpeg' } },
                            { filename: { [Op.like]: '%.png' } },
                            { filename: { [Op.like]: '%.gif' } },
                            { filename: { [Op.like]: '%.webp' } }
                        ]
                    },
                    // Has transcription but missing summary
                    {
                        [Op.or]: [
                            { summary: { [Op.is]: null } },
                            { summary: '' }
                        ]
                    },
                    // Has transcription with AI description
                    {
                        transcription: { [Op.not]: null },
                        transcription: { [Op.not]: '' }
                    }
                ]
            },
            limit: 20
        });

        console.log(`📋 Found ${imagesToUpdate.length} image files to update\n`);

        let successCount = 0;
        let errorCount = 0;

        for (const file of imagesToUpdate) {
            try {
                console.log(`🔄 [${successCount + 1}/${imagesToUpdate.length}] Processing: ${file.filename}`);

                const updateData = {};

                // Move AI description from transcription to summary
                if (file.transcription && file.transcription.length > 0) {
                    updateData.summary = file.transcription;
                    console.log(`   📝 Moving description to summary (${file.transcription.length} chars)`);
                }

                // Add basic sentiment if missing
                if (!file.sentiment) {
                    updateData.sentiment = {
                        label: 'neutral',
                        confidence: 0.75,
                        source: 'default_update'
                    };
                    console.log(`   😊 Added default sentiment`);
                }

                // Enhance metadata with title if missing
                let metadata = file.metadata || {};
                if (typeof metadata === 'string') {
                    try {
                        metadata = JSON.parse(metadata);
                    } catch (e) {
                        metadata = {};
                    }
                }

                if (!metadata.title) {
                    const cleanTitle = file.filename
                        .replace(/\.[^/.]+$/, '') // Remove extension
                        .replace(/[-_]/g, ' ')    // Replace dashes/underscores with spaces
                        .replace(/\b\w/g, l => l.toUpperCase()); // Title case
                    
                    metadata.title = cleanTitle;
                    updateData.metadata = metadata;
                    console.log(`   🎯 Added title to metadata: "${cleanTitle}"`);
                }

                // Update the file record
                if (Object.keys(updateData).length > 0) {
                    await File.update(updateData, {
                        where: { id: file.id }
                    });

                    console.log(`   ✅ Updated successfully\n`);
                    successCount++;
                } else {
                    console.log(`   ⚠️  No updates needed\n`);
                }

            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error updating ${file.filename}:`, error.message);
                console.error(`      ${error.stack}\n`);
            }
        }

        console.log('📊 Update Summary:');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`✅ Successfully updated: ${successCount} files`);
        console.log(`❌ Errors: ${errorCount} files`);
        console.log(`📋 Total processed: ${imagesToUpdate.length} files`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        if (successCount > 0) {
            console.log('🎉 Image AI data updated successfully!');
            console.log('💡 Your image content cards should now show:');
            console.log('   • Proper titles (from metadata.title)');
            console.log('   • 4-line AI-generated summaries');
            console.log('   • Consistent sentiment analysis');
            console.log('   • Same layout as video content cards');
        }

    } catch (error) {
        console.error('❌ Fatal error during update:', error);
        console.error(error.stack);
        process.exit(1);
    }

    process.exit(0);
}

updateImageAIData(); 