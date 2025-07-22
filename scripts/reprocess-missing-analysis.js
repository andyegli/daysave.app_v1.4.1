const { File } = require('../models');
const { AutomationOrchestrator } = require('../services/multimedia');

async function reprocessMissingAnalysis() {
  try {
    console.log('🔍 Finding files missing AI analysis...');
    
    // Find multimedia files without proper AI analysis
    const filesNeedingAnalysis = await File.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { summary: null },
          { summary: '' },
          { auto_tags: null },
          { auto_tags: [] }
        ]
      },
      limit: 10 // Process 10 at a time to avoid overwhelming the system
    });
    
    console.log(`📊 Found ${filesNeedingAnalysis.length} files needing analysis`);
    
    if (filesNeedingAnalysis.length === 0) {
      console.log('✅ All files have proper AI analysis!');
      return;
    }
    
    const orchestrator = AutomationOrchestrator.getInstance();
    
    for (const file of filesNeedingAnalysis) {
      try {
        console.log(`\n🔄 Reprocessing: ${file.filename} (ID: ${file.id})`);
        
        // Parse metadata to check if it's a multimedia file
        let metadata = file.metadata;
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
        }
        
        const mimeType = metadata.mimetype || '';
        const isMultimedia = ['image/', 'video/', 'audio/'].some(type => mimeType.startsWith(type));
        
        if (!isMultimedia) {
          console.log(`⏭️  Skipping non-multimedia file: ${mimeType}`);
          continue;
        }
        
        console.log(`📸 Processing ${mimeType} file...`);
        
        // Simple analysis for files already processed but missing some data
        if (metadata.aiDescription && !file.summary) {
          console.log(`📝 Found AI description in metadata, updating summary...`);
          await file.update({
            summary: metadata.aiDescription
          });
          console.log(`✅ Updated summary from metadata`);
          continue;
        }
        
        if (metadata.tags && (!file.auto_tags || file.auto_tags.length === 0)) {
          console.log(`🏷️ Found tags in metadata, updating auto_tags...`);
          await file.update({
            auto_tags: metadata.tags
          });
          console.log(`✅ Updated auto_tags from metadata`);
          continue;
        }
        
        console.log(`⚠️  File needs full reprocessing: ${file.filename}`);
        console.log(`   Current summary: ${file.summary ? 'EXISTS' : 'MISSING'}`);
        console.log(`   Current auto_tags: ${file.auto_tags ? file.auto_tags.length : 0} tags`);
        
      } catch (fileError) {
        console.error(`❌ Error processing ${file.filename}:`, fileError.message);
        continue;
      }
    }
    
    console.log('\n🎉 Reprocessing complete!');
    console.log('💡 Tip: Run this script periodically to catch files with failed analysis');
    
  } catch (error) {
    console.error('❌ Reprocessing failed:', error.message);
  }
  
  process.exit(0);
}

// Run the reprocessing
reprocessMissingAnalysis(); 