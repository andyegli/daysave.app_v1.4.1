#!/usr/bin/env node

/**
 * Migration Script: Convert Legacy Content to New Processor Format
 * 
 * This script migrates existing content records from the old MultimediaAnalyzer
 * format to the new modular processor architecture with ProcessingJob tracking.
 * 
 * Migration Process:
 * 1. Identify content with legacy data (transcription but no ProcessingJob)
 * 2. Create ProcessingJob records for historical tracking
 * 3. Parse and convert legacy data to new structured format
 * 4. Create VideoAnalysis/AudioAnalysis/ImageAnalysis records as appropriate
 * 5. Update content metadata to link to new structure
 * 6. Preserve all existing data while adding new structure
 * 
 * Usage: node scripts/migrate-content-to-new-format.js [--dry-run] [--batch-size=100]
 */

const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Setup database connection
require('dotenv').config();
const db = require('../models');
const { 
  Content, 
  ProcessingJob, 
  VideoAnalysis, 
  AudioAnalysis, 
  ImageAnalysis,
  Thumbnail,
  OCRCaption,
  User
} = db;

const logger = require('../config/logger');

class ContentMigrator {
  constructor(options = {}) {
    this.dryRun = options.dryRun || false;
    this.batchSize = options.batchSize || 100;
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      startTime: Date.now()
    };
  }

  /**
   * Main migration method
   */
  async migrate() {
    console.log('🚀 Starting Content Migration to New Processor Format');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`Batch Size: ${this.batchSize}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Identify legacy content
      const legacyContent = await this.identifyLegacyContent();
      console.log(`\n📊 Found ${legacyContent.length} content records to migrate`);

      if (legacyContent.length === 0) {
        console.log('✅ No content requires migration. All content is already using the new format.');
        return;
      }

      // Step 2: Process in batches
      await this.processBatches(legacyContent);

      // Step 3: Verification
      await this.verifyMigration();

      // Step 4: Report results
      this.printSummary();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Identify content records that need migration
   */
  async identifyLegacyContent() {
    console.log('\n🔍 Identifying legacy content records...');

    // Find content with transcription/summary but no processing jobs
    const legacyContent = await Content.findAll({
      where: {
        // Has legacy data but no new processing jobs
        [db.Sequelize.Op.and]: [
          {
            [db.Sequelize.Op.or]: [
              { transcription: { [db.Sequelize.Op.ne]: null } },
              { summary: { [db.Sequelize.Op.ne]: null } },
              { sentiment: { [db.Sequelize.Op.ne]: null } },
              { auto_tags: { [db.Sequelize.Op.ne]: null } }
            ]
          }
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        },
        {
          model: ProcessingJob,
          as: 'processingJobs',
          required: false
        },
        {
          model: VideoAnalysis,
          as: 'videoAnalysis',
          required: false
        },
        {
          model: AudioAnalysis,
          as: 'audioAnalysis',
          required: false
        },
        {
          model: ImageAnalysis,
          as: 'imageAnalysis',
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Filter out content that already has new-format analysis
    const needsMigration = legacyContent.filter(content => {
      const hasProcessingJobs = content.processingJobs && content.processingJobs.length > 0;
      const hasNewAnalysis = content.videoAnalysis || content.audioAnalysis || content.imageAnalysis;
      
      return !hasProcessingJobs && !hasNewAnalysis;
    });

    console.log(`   - Total content with legacy data: ${legacyContent.length}`);
    console.log(`   - Already migrated: ${legacyContent.length - needsMigration.length}`);
    console.log(`   - Needs migration: ${needsMigration.length}`);

    return needsMigration;
  }

  /**
   * Process content in batches
   */
  async processBatches(legacyContent) {
    console.log('\n📦 Processing content in batches...');

    const totalBatches = Math.ceil(legacyContent.length / this.batchSize);
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * this.batchSize;
      const end = Math.min(start + this.batchSize, legacyContent.length);
      const batch = legacyContent.slice(start, end);

      console.log(`\n📦 Processing batch ${i + 1}/${totalBatches} (${start + 1}-${end})`);
      console.log('-'.repeat(40));

      for (const content of batch) {
        await this.migrateContentRecord(content);
      }

      // Progress update
      const progress = ((i + 1) / totalBatches * 100).toFixed(1);
      console.log(`\n📈 Progress: ${progress}% (${this.stats.successful} successful, ${this.stats.failed} failed, ${this.stats.skipped} skipped)`);
    }
  }

  /**
   * Migrate a single content record
   */
  async migrateContentRecord(content) {
    const contentId = content.id;
    const userId = content.user_id;

    try {
      console.log(`\n🔄 Migrating content ${contentId}...`);
      console.log(`   User: ${content.User?.username || 'Unknown'}`);
      console.log(`   URL: ${content.url || 'No URL'}`);
      console.log(`   Created: ${content.createdAt?.toISOString()}`);

      this.stats.totalProcessed++;

      // Determine media type from existing data
      const mediaType = this.determineMediaType(content);
      console.log(`   Detected Media Type: ${mediaType}`);

      if (!mediaType) {
        console.log('   ⚠️ Cannot determine media type, skipping...');
        this.stats.skipped++;
        return;
      }

      if (this.dryRun) {
        console.log('   🔍 DRY RUN: Would migrate this content');
        this.stats.successful++;
        return;
      }

      // Start database transaction
      const transaction = await db.sequelize.transaction();

      try {
        // Step 1: Create ProcessingJob record
        const processingJob = await this.createProcessingJob(content, mediaType, transaction);
        console.log(`   ✅ Created ProcessingJob: ${processingJob.id}`);

        // Step 2: Create appropriate analysis record
        let analysisRecord = null;
        switch (mediaType) {
          case 'video':
            analysisRecord = await this.createVideoAnalysis(content, processingJob.id, transaction);
            break;
          case 'audio':
            analysisRecord = await this.createAudioAnalysis(content, processingJob.id, transaction);
            break;
          case 'image':
            analysisRecord = await this.createImageAnalysis(content, processingJob.id, transaction);
            break;
        }

        if (analysisRecord) {
          console.log(`   ✅ Created ${mediaType}Analysis: ${analysisRecord.id}`);
        }

        // Step 3: Update content metadata
        await this.updateContentMetadata(content, processingJob.id, transaction);
        console.log(`   ✅ Updated content metadata`);

        // Step 4: Migrate related records (thumbnails, OCR)
        await this.migrateRelatedRecords(content, analysisRecord, transaction);

        // Commit transaction
        await transaction.commit();
        
        console.log(`   ✅ Migration completed for content ${contentId}`);
        this.stats.successful++;

      } catch (transactionError) {
        await transaction.rollback();
        throw transactionError;
      }

    } catch (error) {
      console.error(`   ❌ Failed to migrate content ${contentId}:`, error.message);
      this.stats.failed++;
      
      // Log detailed error for debugging
      logger.error('Content migration failed', {
        contentId,
        userId,
        error: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Determine media type from legacy content data
   */
  determineMediaType(content) {
    // Check URL patterns first
    if (content.url) {
      if (content.url.includes('youtube.com') || content.url.includes('youtu.be')) {
        return 'video';
      }
      if (content.url.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i)) {
        return 'video';
      }
      if (content.url.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
        return 'audio';
      }
      if (content.url.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
        return 'image';
      }
    }

    // Check metadata
    if (content.metadata) {
      if (content.metadata.fileCategory) {
        return content.metadata.fileCategory;
      }
      if (content.metadata.video || content.metadata.duration) {
        return 'video';
      }
      if (content.metadata.imageAnalysis) {
        return 'image';
      }
    }

    // Check content of data
    if (content.transcription && content.transcription.length > 100) {
      // Long transcription suggests audio/video
      return content.url?.includes('youtube') ? 'video' : 'audio';
    }

    // Default fallback based on data presence
    if (content.transcription || content.summary) {
      return 'video'; // Most legacy content was video
    }

    return null; // Cannot determine
  }

  /**
   * Create ProcessingJob record for historical tracking
   */
  async createProcessingJob(content, mediaType, transaction) {
    const jobData = {
      id: uuidv4(),
      content_id: content.id,
      user_id: content.user_id,
      status: 'completed', // Legacy data is already processed
      media_type: mediaType,
      source_url: content.url,
      progress: 100,
      current_stage: 'completed',
      total_stages: 1,
      stages_completed: 1,
      started_at: content.createdAt, // Use original creation time
      completed_at: content.updatedAt,
      processing_time: 0, // Unknown for legacy data
      
      // Legacy migration metadata
      job_metadata: {
        migration: true,
        migrated_at: new Date().toISOString(),
        legacy_data_source: 'MultimediaAnalyzer',
        original_created_at: content.createdAt,
        migration_version: '1.0.0'
      },

      // Processing statistics for legacy data
      processing_stats: {
        migration: true,
        legacy_conversion: true,
        original_analyzer: 'MultimediaAnalyzer',
        data_quality: this.assessDataQuality(content)
      },

      // Empty arrays for consistency
      warnings: [],
      errors: []
    };

    return await ProcessingJob.create(jobData, { transaction });
  }

  /**
   * Create VideoAnalysis record from legacy data
   */
  async createVideoAnalysis(content, processingJobId, transaction) {
    // Parse legacy video data
    const legacyMetadata = content.metadata || {};
    const videoMetadata = legacyMetadata.video || {};
    
    const analysisData = {
      id: uuidv4(),
      content_id: content.id,
      user_id: content.user_id,
      processing_job_id: processingJobId,
      
      // Basic video info
      title: legacyMetadata.title || 'Migrated Video Content',
      description: legacyMetadata.description || content.summary || '',
      duration: videoMetadata.duration || legacyMetadata.duration || 0,
      file_size: videoMetadata.file_size || videoMetadata.size || 0,
      
      // Video technical details
      video_metadata: {
        format: videoMetadata.format || 'unknown',
        resolution: videoMetadata.resolution || 'unknown',
        fps: videoMetadata.fps || 0,
        bitrate: videoMetadata.bitrate || 0,
        codec: videoMetadata.codec || 'unknown',
        aspect_ratio: videoMetadata.aspect_ratio || null,
        container: videoMetadata.container_format || null
      },

      // Transcription results
      transcription_results: content.transcription ? {
        fullText: content.transcription,
        language: legacyMetadata.language || 'unknown',
        segments: [], // Legacy data doesn't have segments
        statistics: {
          totalWords: content.transcription.split(' ').length,
          averageConfidence: 0.8, // Estimated
          wordCount: this.countWords(content.transcription)
        }
      } : null,

      // Sentiment analysis
      sentiment_analysis: content.sentiment ? {
        overall: content.sentiment,
        segments: [],
        statistics: {
          averageScore: content.sentiment.score || 0,
          dominantEmotion: content.sentiment.label || 'neutral'
        }
      } : null,

      // Content analysis
      content_analysis: {
        contentType: 'video',
        category: content.category || 'general',
        tags: content.auto_tags || [],
        summary: content.summary || '',
        migrated: true
      },

      // Processing stats
      processing_stats: {
        migrated: true,
        original_processing_time: 0,
        migration_time: Date.now(),
        legacy_analyzer: 'MultimediaAnalyzer',
        data_completeness: this.calculateDataCompleteness(content)
      },

      // Analysis metadata
      analysis_method: 'legacy_migration',
      analysis_options: {
        migrated: true,
        legacy_source: true
      },

      status: 'completed',
      created_at: content.createdAt,
      updated_at: new Date()
    };

    return await VideoAnalysis.create(analysisData, { transaction });
  }

  /**
   * Create AudioAnalysis record from legacy data
   */
  async createAudioAnalysis(content, processingJobId, transaction) {
    const legacyMetadata = content.metadata || {};
    
    const analysisData = {
      id: uuidv4(),
      content_id: content.id,
      user_id: content.user_id,
      processing_job_id: processingJobId,
      
      title: legacyMetadata.title || 'Migrated Audio Content',
      description: legacyMetadata.description || content.summary || '',
      duration: legacyMetadata.duration || 0,
      file_size: legacyMetadata.file_size || 0,

      // Audio metadata
      audio_metadata: {
        format: legacyMetadata.format || 'unknown',
        codec: legacyMetadata.codec || 'unknown',
        bitrate: legacyMetadata.bitrate || 0,
        sampleRate: legacyMetadata.sampleRate || 0,
        channels: legacyMetadata.channels || 1
      },

      // Transcription results
      transcription_results: content.transcription ? {
        fullText: content.transcription,
        language: legacyMetadata.language || 'unknown',
        segments: [],
        statistics: {
          totalWords: content.transcription.split(' ').length,
          averageConfidence: 0.8,
          wordCount: this.countWords(content.transcription)
        }
      } : null,

      // Speaker analysis (estimated from legacy data)
      speaker_analysis: {
        totalSpeakers: legacyMetadata.speaker_count || 1,
        speakers: [],
        speakerTransitions: 0
      },

      // Sentiment analysis
      sentiment_analysis: content.sentiment ? {
        overall: content.sentiment,
        temporal: [],
        statistics: {
          averageScore: content.sentiment.score || 0,
          dominantEmotion: content.sentiment.label || 'neutral'
        }
      } : null,

      // Content analysis
      content_analysis: {
        contentType: 'audio',
        category: content.category || 'general',
        tags: content.auto_tags || [],
        summary: content.summary || '',
        migrated: true
      },

      // Processing stats
      processing_stats: {
        migrated: true,
        legacy_analyzer: 'MultimediaAnalyzer',
        migration_time: Date.now()
      },

      analysis_method: 'legacy_migration',
      status: 'completed',
      created_at: content.createdAt,
      updated_at: new Date()
    };

    return await AudioAnalysis.create(analysisData, { transaction });
  }

  /**
   * Create ImageAnalysis record from legacy data
   */
  async createImageAnalysis(content, processingJobId, transaction) {
    const legacyMetadata = content.metadata || {};
    const imageData = legacyMetadata.imageAnalysis || {};
    
    const analysisData = {
      id: uuidv4(),
      content_id: content.id,
      user_id: content.user_id,
      processing_job_id: processingJobId,
      
      title: legacyMetadata.title || 'Migrated Image Content',
      description: legacyMetadata.description || content.summary || '',
      file_size: legacyMetadata.file_size || 0,

      // Image metadata
      image_metadata: {
        format: legacyMetadata.format || 'unknown',
        dimensions: legacyMetadata.dimensions || { width: 0, height: 0 },
        fileSize: legacyMetadata.file_size || 0
      },

      // AI description (from transcription field for images)
      ai_description: content.transcription ? {
        description: content.transcription,
        confidence: imageData.confidence || 0.8,
        tags: content.auto_tags || [],
        provider: 'legacy_migration'
      } : null,

      // OCR results (if available)
      ocr_results: imageData.hasText ? {
        fullText: content.summary || '',
        blocks: [],
        statistics: {
          totalCharacters: (content.summary || '').length,
          totalWords: (content.summary || '').split(' ').length
        }
      } : null,

      // Object detection
      object_detection: {
        totalObjects: imageData.objectsDetected || 0,
        objects: [],
        categories: {}
      },

      // Content analysis
      content_analysis: {
        contentType: 'image',
        category: content.category || 'general',
        tags: content.auto_tags || [],
        migrated: true
      },

      // Processing stats
      processing_stats: {
        migrated: true,
        legacy_analyzer: 'MultimediaAnalyzer',
        migration_time: Date.now()
      },

      analysis_method: 'legacy_migration',
      status: 'completed',
      created_at: content.createdAt,
      updated_at: new Date()
    };

    return await ImageAnalysis.create(analysisData, { transaction });
  }

  /**
   * Update content metadata to link to new structure
   */
  async updateContentMetadata(content, processingJobId, transaction) {
    const updatedMetadata = {
      ...(content.metadata || {}),
      migration: {
        migrated: true,
        migrated_at: new Date().toISOString(),
        processing_job_id: processingJobId,
        legacy_analyzer: 'MultimediaAnalyzer',
        migration_version: '1.0.0'
      }
    };

    await Content.update(
      { metadata: updatedMetadata },
      { 
        where: { id: content.id },
        transaction 
      }
    );
  }

  /**
   * Migrate related records (thumbnails, OCR captions)
   */
  async migrateRelatedRecords(content, analysisRecord, transaction) {
    // Link existing thumbnails to new analysis record
    if (analysisRecord) {
      await Thumbnail.update(
        { 
          analysis_id: analysisRecord.id,
          analysis_type: analysisRecord.constructor.tableName 
        },
        { 
          where: { content_id: content.id },
          transaction 
        }
      );

      await OCRCaption.update(
        { 
          analysis_id: analysisRecord.id,
          analysis_type: analysisRecord.constructor.tableName 
        },
        { 
          where: { content_id: content.id },
          transaction 
        }
      );
    }
  }

  /**
   * Verify migration results
   */
  async verifyMigration() {
    console.log('\n🔍 Verifying migration results...');

    // Count migrated records
    const migratedContent = await Content.count({
      include: [{
        model: ProcessingJob,
        as: 'processingJobs',
        where: {
          job_metadata: {
            migration: true
          }
        }
      }]
    });

    const totalAnalysis = await Promise.all([
      VideoAnalysis.count({ where: { analysis_method: 'legacy_migration' } }),
      AudioAnalysis.count({ where: { analysis_method: 'legacy_migration' } }),
      ImageAnalysis.count({ where: { analysis_method: 'legacy_migration' } })
    ]);

    console.log(`   - Content with migration ProcessingJobs: ${migratedContent}`);
    console.log(`   - Migrated VideoAnalysis records: ${totalAnalysis[0]}`);
    console.log(`   - Migrated AudioAnalysis records: ${totalAnalysis[1]}`);
    console.log(`   - Migrated ImageAnalysis records: ${totalAnalysis[2]}`);
    console.log(`   - Total analysis records created: ${totalAnalysis.reduce((a, b) => a + b, 0)}`);
  }

  /**
   * Print migration summary
   */
  printSummary() {
    const duration = Date.now() - this.stats.startTime;
    const durationMinutes = (duration / 60000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`Total Processing Time: ${durationMinutes} minutes`);
    console.log(`\nRecords Processed: ${this.stats.totalProcessed}`);
    console.log(`✅ Successful: ${this.stats.successful}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⚠️ Skipped: ${this.stats.skipped}`);
    
    if (this.stats.failed > 0) {
      console.log(`\n⚠️ ${this.stats.failed} records failed migration. Check logs for details.`);
    }
    
    if (this.dryRun) {
      console.log('\n🔍 This was a dry run. No actual changes were made.');
      console.log('Run without --dry-run to perform the actual migration.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
    console.log('='.repeat(60));
  }

  /**
   * Helper methods
   */
  assessDataQuality(content) {
    let quality = 0;
    if (content.transcription) quality += 30;
    if (content.summary) quality += 20;
    if (content.sentiment) quality += 20;
    if (content.auto_tags && content.auto_tags.length > 0) quality += 15;
    if (content.metadata && Object.keys(content.metadata).length > 0) quality += 15;
    return Math.min(quality, 100);
  }

  countWords(text) {
    if (!text) return {};
    const words = text.toLowerCase().split(/\s+/);
    const wordCount = {};
    words.forEach(word => {
      word = word.replace(/[^\w]/g, '');
      if (word.length > 2) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });
    return wordCount;
  }

  calculateDataCompleteness(content) {
    const fields = ['transcription', 'summary', 'sentiment', 'auto_tags', 'metadata'];
    const present = fields.filter(field => content[field] != null).length;
    return (present / fields.length * 100).toFixed(1);
  }
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  let batchSize = 100;
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  if (batchSizeArg) {
    batchSize = parseInt(batchSizeArg.split('=')[1]) || 100;
  }

  const migrator = new ContentMigrator({ dryRun, batchSize });

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ContentMigrator; 