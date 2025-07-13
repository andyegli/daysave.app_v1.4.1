/**
 * Import Voice Prints Script
 * 
 * Imports speaker voice print data from the multimedia-analysis-backend
 * voice_prints.json file into the DaySave database using the Speaker model.
 * 
 * Usage: node scripts/import-voice-prints.js [userId]
 * 
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { VoicePrintDatabase } = require('../services/multimedia');

/**
 * Main import function
 */
async function importVoicePrints() {
  try {
    console.log('🎙️ Starting voice prints import...');

    // Get user ID from command line arguments or use default
    const userId = process.argv[2];
    
    if (!userId) {
      console.error('❌ Usage: node scripts/import-voice-prints.js <userId>');
      console.error('   Example: node scripts/import-voice-prints.js 123e4567-e89b-12d3-a456-426614174000');
      process.exit(1);
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('❌ Invalid UUID format for user ID');
      process.exit(1);
    }

    // Path to voice prints data
    const voicePrintsPath = path.join(__dirname, '../multimedia-analysis-backend/voice_prints.json');
    
    if (!fs.existsSync(voicePrintsPath)) {
      console.error('❌ Voice prints file not found:', voicePrintsPath);
      console.error('   Make sure the multimedia-analysis-backend folder is in the project root');
      process.exit(1);
    }

    // Load voice prints data
    console.log('📥 Loading voice prints data...');
    const voicePrintsData = JSON.parse(fs.readFileSync(voicePrintsPath, 'utf8'));
    
    if (!voicePrintsData.speakers) {
      console.error('❌ Invalid voice prints data format - missing speakers object');
      process.exit(1);
    }

    console.log('📊 Voice prints data loaded:', {
      totalSpeakers: Object.keys(voicePrintsData.speakers).length,
      metadata: voicePrintsData.metadata || 'No metadata'
    });

    // Initialize VoicePrintDatabase service
    const voicePrintDB = new VoicePrintDatabase({
      enableLogging: true
    });

    // Import voice prints
    console.log('🔄 Importing voice prints to database...');
    const importedSpeakers = await voicePrintDB.importVoicePrints(userId, voicePrintsData);

    console.log('✅ Voice prints import completed:', {
      imported: importedSpeakers.length,
      total: Object.keys(voicePrintsData.speakers).length
    });

    // Display imported speakers
    if (importedSpeakers.length > 0) {
      console.log('\n📋 Imported speakers:');
      importedSpeakers.forEach((speaker, index) => {
        console.log(`  ${index + 1}. ${speaker.name} (${speaker.speaker_tag})`);
        console.log(`     - Confidence: ${speaker.confidence_score}`);
        console.log(`     - Appearances: ${speaker.total_appearances}`);
        console.log(`     - Status: ${speaker.status}`);
        console.log('');
      });
    }

    // Get speaker statistics
    console.log('📊 Getting speaker statistics...');
    const stats = await voicePrintDB.getSpeakerStats(userId);
    
    console.log('📈 Speaker Statistics:');
    console.log(`  - Total Speakers: ${stats.totalSpeakers}`);
    console.log(`  - Active Speakers: ${stats.activeSpeakers}`);
    console.log(`  - Inactive Speakers: ${stats.inactiveSpeakers}`);
    console.log(`  - Total Appearances: ${stats.totalAppearances}`);
    console.log(`  - Average Confidence: ${stats.averageConfidence.toFixed(3)}`);
    
    if (stats.topSpeakers.length > 0) {
      console.log('\n🏆 Top Speakers:');
      stats.topSpeakers.forEach((speaker, index) => {
        console.log(`  ${index + 1}. ${speaker.name} - ${speaker.appearances} appearances`);
      });
    }

    console.log('\n🎉 Import process completed successfully!');
    console.log('💡 You can now use the imported voice prints for speaker recognition in multimedia analysis.');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  importVoicePrints();
}

module.exports = importVoicePrints; 