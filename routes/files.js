const express = require('express');
const router = express.Router();
const multer = require('multer');
const FileUploadService = require('../services/fileUpload');
const { File, User, ContentGroup, ContentGroupMember } = require('../models');
const { isAuthenticated, isAdmin, checkUsageLimit, checkFileSizeLimit, updateUsage } = require('../middleware');
const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { AutomationOrchestrator } = require('../services/multimedia');

// Initialize automation orchestrator for file processing (singleton)
const orchestrator = AutomationOrchestrator.getInstance();

/**
 * Check if file type should trigger multimedia analysis
 * @param {string} mimetype - File MIME type
 * @returns {boolean} - True if file should be analyzed
 */
function isMultimediaFile(mimetype) {
  const multimediaTypes = [
    // Video files
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/avi',
    // Audio files
    'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
    // Image files (for OCR analysis)
    'image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/tiff'
  ];
  
  return multimediaTypes.includes(mimetype);
}

/**
 * Generate sophisticated AI title for images using OpenAI (same approach as videos)
 * @param {string} imageDescription - AI description of the image
 * @param {Object} analysisData - Additional analysis data (objects, tags, etc.)
 * @returns {Promise<string|null>} Generated title or null if failed
 */
async function generateSophisticatedImageTitle(imageDescription, analysisData = {}) {
  try {
    console.log('📝 Starting sophisticated AI-powered title generation for image');
    
    // Initialize OpenAI if not already done
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    if (!openai || !process.env.OPENAI_API_KEY) {
      console.log('⚠️ OpenAI not available for title generation');
      return null;
    }

    // Prepare content for analysis
    let contentToAnalyze = imageDescription.trim();
    
    // Enhance with additional context from analysis data
    if (analysisData.objects && analysisData.objects.length > 0) {
      const objectNames = analysisData.objects.map(obj => obj.name).join(', ');
      contentToAnalyze += `\n\nDetected objects: ${objectNames}`;
    }
    
    if (analysisData.tags && analysisData.tags.length > 0) {
      const tagList = analysisData.tags.slice(0, 5).join(', '); // Top 5 tags
      contentToAnalyze += `\n\nKey themes: ${tagList}`;
    }

    if (!contentToAnalyze || contentToAnalyze.length < 10) {
      console.log('⚠️ Insufficient content for AI title generation');
      return null;
    }

    console.log(`🤖 Sending image content to OpenAI for title generation (${contentToAnalyze.length} chars)`);

          const prompt = `Based on the following image description and analysis, create an engaging and descriptive title that follows proper narrative structure like professional video titles.

The title should be:
- Follow a narrative structure with proper grammar and flow (NOT keyword lists or bullet points)
- Be a complete, well-formed sentence or phrase that tells what the image is about
- Use descriptive language that paints a picture of the scene
- Focus on the main subject, action, or purpose shown in the image
- Be professional and engaging like video content titles
- Avoid comma-separated lists or tag-like structures
- Create a cohesive narrative that flows naturally

Image Analysis: ${contentToAnalyze}

Examples of good structured titles:
- "Professional Energy Storage Solutions Showcase: Complete Equipment Layout and Components Display"
- "Comprehensive Tutorial Setup: Step-by-Step Equipment Organization for Solar Installation"
- "Modern Industrial Design: Clean Product Layout Featuring Advanced Energy Storage Technology"
- "Educational Product Demonstration: Detailed Component Overview for Renewable Energy Systems"

BAD examples to avoid:
- "SunC New Energy Co, packing list, energy storage equipment" (keyword list)
- "Inverter, batteries, pallet, manuals, plugs" (bullet points)
- "Company name, product type, equipment list" (tag structure)

Respond with only the title, no quotes or additional text.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
                  {
            role: 'system',
            content: 'You are an expert content creator who specializes in writing professional, descriptive titles for visual content that match the quality and structure of video titles. Create compelling titles that follow proper narrative structure with complete sentences, not keyword lists or bullet points. Your titles should be well-formed, professional, and descriptive - similar to how video content is titled. Focus on the main subject, purpose, or theme of the image using proper grammar and cohesive language flow. Avoid comma-separated lists or tag-like structures.'
          },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 80
    });

    let generatedTitle = response.choices[0].message.content.trim();
    
    // Clean up title (remove quotes if present)
    generatedTitle = generatedTitle.replace(/^["']|["']$/g, '');
    
    // Ensure title isn't too long (allow for more descriptive titles)
    if (generatedTitle.length > 150) {
      generatedTitle = generatedTitle.substring(0, 147) + '...';
    }
    
    console.log(`✅ Generated sophisticated AI title: "${generatedTitle}"`);
    return generatedTitle;
    
  } catch (error) {
    console.error('❌ Sophisticated AI title generation failed:', error.message);
    return null;
  }
}

/**
 * Format text as a professional title with proper structure
 * @param {string} text - Text to format
 * @returns {string} Professionally formatted title
 */
function formatAsProfessionalTitle(text) {
  // Capitalize first letter and ensure proper sentence structure
  const formatted = text.charAt(0).toUpperCase() + text.slice(1);
  
  // If it already has good structure, return as is
  if (formatted.includes(':') || formatted.includes(' - ') || formatted.length > 40) {
    return formatted;
  }
  
  // Add professional structure for shorter phrases
  return `Professional ${formatted}: Detailed Visual Overview`;
}

/**
 * Trigger multimedia analysis for uploaded file using enhanced AI system
 * @param {Object} fileRecord - File database record
 * @param {Object} user - User object
 */
async function triggerFileAnalysis(fileRecord, user) {
  let fileMetadata = {}; // FIXED: Initialize as empty object instead of undefined
  
  try {
    console.log(`🎬 Starting enhanced file analysis for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      filename: fileRecord.filename,
      mimetype: fileRecord.metadata?.mimetype
    });

    console.log(`🔧 DEBUG: fileMetadata initialized as:`, typeof fileMetadata, fileMetadata);

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
      
      try {
        // FIXED: Initialize fileMetadata for GCS downloads BEFORE setting properties
        console.log(`🔧 DEBUG: Initializing fileMetadata for GCS download...`);
        fileMetadata = {
          filename: fileRecord.filename,
          fileId: fileRecord.id,
          userId: user.id,
          mimeType: fileRecord.metadata?.mimetype,
          fileSize: fileRecord.metadata?.size,
          source: 'upload',
          cleanupTempFile: false, // Initialize cleanup flag
          tempFilePath: null      // Initialize temp path
        };
        console.log(`🔧 DEBUG: fileMetadata after initialization:`, fileMetadata);
        
        // Download file from GCS using FileUploadService
        const gcsPath = fileRecord.file_path.replace('gs://', '');
        const [bucketName, ...pathParts] = gcsPath.split('/');
        const objectName = pathParts.join('/');
        
        // Use FileUploadService to download the file
        console.log(`📥 Downloading from bucket: ${bucketName}, object: ${objectName}`);
        const FileUploadService = require('../services/fileUpload');
        const downloadResult = await FileUploadService.downloadFromGCS(bucketName, objectName, filePath);
        console.log(`✅ Downloaded GCS file to: ${filePath}`);
        
        // FIXED: Now it's safe to set cleanup flags
        console.log(`🔧 DEBUG: Setting cleanup flags...`);
        fileMetadata.cleanupTempFile = true;
        fileMetadata.tempFilePath = filePath;
        console.log(`🔧 DEBUG: fileMetadata after cleanup flags:`, fileMetadata);
        
      } catch (downloadError) {
        console.error(`❌ Failed to download GCS file: ${downloadError.message}`);
        console.error(`🔧 DEBUG: fileMetadata when error occurred:`, typeof fileMetadata, fileMetadata);
        // Log more details about the error
        console.error(`🔧 DEBUG: GCS path: ${fileRecord.file_path}`);
        console.error(`🔧 DEBUG: Error stack:`, downloadError.stack);
        throw new Error(`Failed to download file from Google Cloud Storage: ${downloadError.message}`);
      }
    } else {
      // For local files, convert the stored path to absolute path
      console.log(`📁 Processing local file: ${fileRecord.file_path}`);
      if (fileRecord.file_path.startsWith('/uploads/')) {
        // Path is already relative to project root
        filePath = path.join(__dirname, '..', fileRecord.file_path);
      } else {
        // Path might be absolute or relative
        filePath = path.resolve(fileRecord.file_path);
      }
    }

    console.log(`🔧 DEBUG: Final filePath: ${filePath}`);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }

    console.log(`📖 Reading file into buffer...`);
    // Read file into buffer for processing
    const fileBuffer = await fs.promises.readFile(filePath);
    console.log(`📖 File buffer size: ${fileBuffer.length} bytes`);
    
    // FIXED: Update metadata for orchestrator (preserve cleanup flags)
    console.log(`🔧 DEBUG: Updating fileMetadata for orchestrator...`);
    console.log(`🔧 DEBUG: fileMetadata before update:`, fileMetadata);
    fileMetadata = {
      ...fileMetadata, // Preserve any existing properties like cleanup flags
      filename: fileRecord.filename,
      fileId: fileRecord.id,
      userId: user.id,
      mimeType: fileRecord.metadata?.mimetype,
      fileSize: fileRecord.metadata?.size,
      source: 'upload',
      filePath: filePath
    };
    console.log(`🔧 DEBUG: fileMetadata after update:`, fileMetadata);

    console.log(`🎯 Starting orchestrator processing...`);
    // Process file with new orchestrator for detailed analysis
    const processingResult = await orchestrator.processContent(
      fileBuffer,
      fileMetadata
    );

    console.log(`🎯 Orchestrator processing completed for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      job_id: processingResult.jobId,
      media_type: processingResult.mediaType,
      has_results: !!processingResult.results,
      result_keys: processingResult.results ? Object.keys(processingResult.results) : 'none'
    });

    console.log('🔍 Full processing result structure:', {
      jobId: processingResult.jobId,
      mediaType: processingResult.mediaType,
      processingTime: processingResult.processingTime,
      resultsType: typeof processingResult.results,
      resultsKeys: processingResult.results ? Object.keys(processingResult.results) : null,
      dataKeys: processingResult.results?.data ? Object.keys(processingResult.results.data) : null
    });
    
    // 🔍 DEBUG: Log the actual structure of critical data
    if (processingResult.results?.data) {
      console.log('🔍 DEBUG: AI Description structure:', processingResult.results.data.aiDescription ? typeof processingResult.results.data.aiDescription : 'undefined');
      if (processingResult.results.data.aiDescription) {
        console.log('🔍 DEBUG: AI Description preview:', JSON.stringify(processingResult.results.data.aiDescription).substring(0, 200));
      }
      console.log('🔍 DEBUG: Objects structure:', processingResult.results.data.objects ? `Array[${processingResult.results.data.objects.length}]` : 'undefined');
      console.log('🔍 DEBUG: Tags structure:', processingResult.results.data.tags ? `Array[${processingResult.results.data.tags.length}]` : 'undefined');
    }

    // Extract results from orchestrator response
    const formattedResults = processingResult.results;
    
    // ✨ ENHANCED AI PROCESSING: Use BackwardCompatibilityService for AI-powered titles and tags
    console.log(`🚀 Starting enhanced AI analysis for file ${fileRecord.id}`);
    const BackwardCompatibilityService = require('../services/BackwardCompatibilityService');
    const compatibilityService = new BackwardCompatibilityService();
    
    // Create a summary/transcription for AI analysis
    let contentForAI = '';
    
    // Build content string for AI analysis
    if (formattedResults.data.transcription) {
      if (formattedResults.data.transcription.fullText) {
        contentForAI = formattedResults.data.transcription.fullText;
      } else if (typeof formattedResults.data.transcription === 'string') {
        contentForAI = formattedResults.data.transcription;
      }
    }
    
    // For images, use AI description (FIXED: Handle both string and object formats)
    if (formattedResults.data.aiDescription) {
      if (typeof formattedResults.data.aiDescription === 'string') {
        contentForAI = formattedResults.data.aiDescription;
        console.log(`🎨 Found AI description (string): ${contentForAI.length} characters`);
      } else if (formattedResults.data.aiDescription.description) {
        contentForAI = formattedResults.data.aiDescription.description;
        console.log(`🎨 Found AI description (object): ${contentForAI.length} characters`);
      }
    }
    
    // For OCR text, append it
    if (formattedResults.data.ocrText && formattedResults.data.ocrText.fullText) {
      contentForAI = contentForAI ? 
        `${contentForAI}\n\nExtracted Text: ${formattedResults.data.ocrText.fullText}` : 
        `Extracted Text: ${formattedResults.data.ocrText.fullText}`;
      console.log(`📝 Added OCR text, total content length: ${contentForAI.length} characters`);
    }
    
    console.log(`🤖 Content for AI enhancement: ${contentForAI.length} characters`);
    
    // Enhanced AI analysis using our improved system
    let enhancedResults = null;
    if (contentForAI.trim().length > 10) { // Only if we have sufficient content
      try {
        console.log(`🎯 Running AI enhancement...`);
        // Create a fake analysis result with our content for AI enhancement
        const fakeAnalysisForAI = {
          transcription: contentForAI,
          summary: contentForAI.length > 500 ? contentForAI.substring(0, 500) + '...' : contentForAI,
          metadata: formattedResults.data.metadata || {}
        };
        
        enhancedResults = await compatibilityService.convertToLegacyFormat(fakeAnalysisForAI);
        
        console.log(`✨ Enhanced AI analysis completed for file ${fileRecord.id}`, {
          user_id: user.id,
          file_id: fileRecord.id,
          generated_title: enhancedResults.generatedTitle,
          ai_tags: enhancedResults.auto_tags,
          ai_category: enhancedResults.category
        });
      } catch (aiError) {
        console.error(`⚠️ Enhanced AI analysis failed for file ${fileRecord.id}:`, aiError.message);
        console.error(`⚠️ AI Error stack:`, aiError.stack);
        
        // 🚀 FALLBACK: Create enhanced results directly from AI content
        console.log(`🔧 Creating enhanced results directly from AI content...`);
        enhancedResults = {
          generatedTitle: null, // Will be generated later from content
          auto_tags: [],
          category: formattedResults.mediaType || 'unknown'
        };
        
        // Extract meaningful tags from AI description
        if (contentForAI.length > 20) {
          const words = contentForAI.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'will', 'would', 'could', 'should'].includes(word));
          
          // Get most frequent meaningful words as tags
          const wordCounts = {};
          words.forEach(word => {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          });
          
          const topWords = Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([word]) => word);
          
          enhancedResults.auto_tags = topWords;
          console.log(`🏷️ Generated fallback tags from content: ${topWords.join(', ')}`);
        }
      }
    } else {
      console.log(`⚠️ Insufficient content for AI enhancement (${contentForAI.length} chars)`);
    }
    
    // ✨ ENHANCED DATABASE STORAGE: Store ALL AI outputs in dedicated analysis tables
    console.log(`💾 Building comprehensive database storage for all AI outputs...`);
    
    // Create processing job record first
    const { ProcessingJob } = require('../models');
    const processingJob = await ProcessingJob.create({
      user_id: user.id,
      file_id: fileRecord.id,
      job_type: `${formattedResults.mediaType}_analysis`,
      media_type: formattedResults.mediaType,
      status: 'completed',
      progress: 100,
      job_config: {
        features: Object.keys(formattedResults.data),
        orchestrator: true,
        version: '2.0'
      },
      input_metadata: fileMetadata,
      processing_results: formattedResults.data,
      performance_metrics: {
        processingTime: processingResult.processingTime,
        jobId: processingResult.jobId,
        features: Object.keys(formattedResults.data).length,
        warnings: processingResult.warnings?.length || 0
      },
      started_at: new Date(Date.now() - (processingResult.processingTime || 0)),
      completed_at: new Date(),
      duration_ms: processingResult.processingTime || 0
    });
    
    console.log(`✅ Created processing job record: ${processingJob.id}`);
    
    // Store media-specific analysis in dedicated tables
    let analysisRecord = null;
    if (formattedResults.mediaType === 'video') {
      const { VideoAnalysis } = require('../models');
      analysisRecord = await VideoAnalysis.create({
        user_id: user.id,
        file_id: fileRecord.id,
        processing_job_id: processingJob.id,
        duration: formattedResults.data.metadata?.duration || 0,
        video_metadata: formattedResults.data.metadata || {},
        objects_detected: formattedResults.data.objects ? {
          totalObjects: formattedResults.data.objects.length,
          objects: formattedResults.data.objects,
          averageConfidence: formattedResults.data.objects.reduce((sum, obj) => sum + (obj.confidence || 0), 0) / formattedResults.data.objects.length
        } : null,
        frame_analysis: formattedResults.data.frameAnalysis || null,
        scene_detection: formattedResults.data.sceneDetection || null,
        motion_analysis: formattedResults.data.motionAnalysis || null,
        quality_assessment: formattedResults.data.qualityAssessment || null,
        content_analysis: formattedResults.data.contentAnalysis || null,
        processing_stats: {
          processingTime: processingResult.processingTime,
          features: Object.keys(formattedResults.data),
          warnings: processingResult.warnings
        },
        analysis_method: 'hybrid',
        status: 'ready',
        progress: 100,
        started_at: processingJob.started_at,
        completed_at: processingJob.completed_at,
        analysis_version: '2.0'
      });
      console.log(`📹 Created video analysis record: ${analysisRecord.id}`);
    } else if (formattedResults.mediaType === 'audio') {
      const { AudioAnalysis } = require('../models');
      analysisRecord = await AudioAnalysis.create({
        user_id: user.id,
        file_id: fileRecord.id,
        processing_job_id: processingJob.id,
        duration: formattedResults.data.metadata?.duration || 0,
        audio_metadata: formattedResults.data.metadata || {},
        transcription_results: formattedResults.data.transcription ? {
          fullText: formattedResults.data.transcription.fullText || formattedResults.data.transcription,
          segments: formattedResults.data.transcription.segments || [],
          language: formattedResults.data.transcription.language || 'unknown',
          statistics: formattedResults.data.transcription.statistics || {}
        } : null,
        speaker_analysis: formattedResults.data.speakers ? {
          totalSpeakers: formattedResults.data.speakers.length,
          speakers: formattedResults.data.speakers
        } : null,
        voice_print_data: formattedResults.data.voicePrints || null,
        sentiment_analysis: formattedResults.data.sentiment || null,
        quality_assessment: formattedResults.data.qualityAssessment || null,
        language_detection: formattedResults.data.languageDetection || null,
        content_analysis: formattedResults.data.contentAnalysis || null,
        processing_stats: {
          processingTime: processingResult.processingTime,
          features: Object.keys(formattedResults.data),
          warnings: processingResult.warnings
        },
        analysis_method: 'hybrid',
        status: 'ready',
        progress: 100,
        started_at: processingJob.started_at,
        completed_at: processingJob.completed_at,
        analysis_version: '2.0'
      });
      console.log(`🎵 Created audio analysis record: ${analysisRecord.id}`);
    } else if (formattedResults.mediaType === 'image') {
      const { ImageAnalysis } = require('../models');
      analysisRecord = await ImageAnalysis.create({
        user_id: user.id,
        file_id: fileRecord.id,
        processing_job_id: processingJob.id,
        image_metadata: formattedResults.data.metadata || {},
        object_detection: formattedResults.data.objects ? {
          totalObjects: formattedResults.data.objects.length,
          objects: formattedResults.data.objects,
          averageConfidence: formattedResults.data.objects.reduce((sum, obj) => sum + (obj.confidence || 0), 0) / formattedResults.data.objects.length
        } : null,
        ocr_results: formattedResults.data.ocrText || null,
        ai_description: formattedResults.data.aiDescription || null,
        face_detection: formattedResults.data.faces || null,
        color_analysis: formattedResults.data.colorAnalysis || null,
        quality_assessment: formattedResults.data.qualityAssessment || null,
        label_detection: formattedResults.data.labels || null,
        content_analysis: formattedResults.data.contentAnalysis || null,
        processing_stats: {
          processingTime: processingResult.processingTime,
          features: Object.keys(formattedResults.data),
          warnings: processingResult.warnings
        },
        analysis_method: 'hybrid',
        status: 'ready',
        progress: 100,
        started_at: processingJob.started_at,
        completed_at: processingJob.completed_at,
        analysis_version: '2.0'
      });
      console.log(`🖼️ Created image analysis record: ${analysisRecord.id}`);
    }
    
    // Store supporting data in specialized tables
    if (formattedResults.data.thumbnails && formattedResults.data.thumbnails.length > 0) {
      const { Thumbnail } = require('../models');
      for (const thumb of formattedResults.data.thumbnails) {
        await Thumbnail.create({
          user_id: user.id,
          file_id: fileRecord.id,
          video_analysis_id: formattedResults.mediaType === 'video' ? analysisRecord?.id : null,
          image_analysis_id: formattedResults.mediaType === 'image' ? analysisRecord?.id : null,
          file_path: thumb.url || thumb.path,
          timestamp_seconds: thumb.timestamp || 0,
          size: thumb.size || 'medium',
          width: thumb.width,
          height: thumb.height,
          metadata: {
            originalUrl: thumb.url,
            generatedAt: new Date().toISOString(),
            quality: thumb.quality || 'standard'
          }
        });
      }
      console.log(`🖼️ Created ${formattedResults.data.thumbnails.length} thumbnail records`);
    }
    
    if (formattedResults.data.ocrCaptions && formattedResults.data.ocrCaptions.length > 0) {
      const { OCRCaption } = require('../models');
      for (const caption of formattedResults.data.ocrCaptions) {
        await OCRCaption.create({
          user_id: user.id,
          file_id: fileRecord.id,
          video_analysis_id: formattedResults.mediaType === 'video' ? analysisRecord?.id : null,
          text: caption.text,
          timestamp_seconds: caption.timestamp || 0,
          confidence: caption.confidence || 0,
          bounding_box: caption.boundingBox || null,
          language: caption.language || 'unknown'
        });
      }
      console.log(`📝 Created ${formattedResults.data.ocrCaptions.length} OCR caption records`);
    }
    
    if (formattedResults.data.speakers && formattedResults.data.speakers.length > 0) {
      const { Speaker } = require('../models');
      for (const speaker of formattedResults.data.speakers) {
        await Speaker.create({
          user_id: user.id,
          audio_analysis_id: formattedResults.mediaType === 'audio' ? analysisRecord?.id : null,
          name: speaker.name || `Speaker ${speaker.id}`,
          voice_fingerprint: speaker.voiceFingerprint || null,
          confidence_score: speaker.confidence || 0,
          gender: speaker.gender || 'unknown',
          language: speaker.language || 'unknown',
          total_speaking_time: speaker.totalSpeakingTime || 0,
          first_appearance: speaker.firstAppearance || 0,
          last_appearance: speaker.lastAppearance || 0,
          characteristics: speaker.characteristics || {}
        });
      }
      console.log(`👥 Created ${formattedResults.data.speakers.length} speaker records`);
    }
    
    // Update file record with legacy fields for backward compatibility
    const updateData = {};
    
    // Store basic metadata - ensure proper parsing and merging
    let existingMetadata = {};
    if (fileRecord.metadata) {
      if (typeof fileRecord.metadata === 'string') {
        try {
          existingMetadata = JSON.parse(fileRecord.metadata);
        } catch (e) {
          console.log(`⚠️ Failed to parse existing metadata, using empty object`);
          existingMetadata = {};
        }
      } else {
        existingMetadata = fileRecord.metadata;
      }
    }
    
    // Build metadata object
    updateData.metadata = {
      ...existingMetadata,
      ...(formattedResults.data.metadata || {}),
      processingJobId: processingJob.id,
      analysisId: analysisRecord?.id,
      lastAnalyzed: new Date().toISOString(),
      aiVersion: '2.0'
    };
    console.log(`📊 Added metadata to update`);
    
    // Handle transcription results based on media type
    if (formattedResults.data.transcription) {
      if (formattedResults.data.transcription.fullText) {
        updateData.transcription = formattedResults.data.transcription.fullText;
      } else if (typeof formattedResults.data.transcription === 'string') {
        updateData.transcription = formattedResults.data.transcription;
      }
      console.log(`📝 Added transcription to update: ${updateData.transcription?.length} characters`);
    }
    
    // Handle AI descriptions for images (enhanced with better structure detection)
    console.log(`🔍 DEBUG: Checking for AI description...`);
    console.log(`🔍 DEBUG: formattedResults.data.aiDescription:`, formattedResults.data.aiDescription);
    
    if (formattedResults.data.aiDescription) {
      // Handle different possible structures
      let aiDescription = '';
      if (typeof formattedResults.data.aiDescription === 'string') {
        aiDescription = formattedResults.data.aiDescription;
        console.log(`🎨 Found AI description as string: ${aiDescription.length} characters`);
      } else if (formattedResults.data.aiDescription.description) {
        aiDescription = formattedResults.data.aiDescription.description;
        console.log(`🎨 Found AI description as object.description: ${aiDescription.length} characters`);
      } else if (formattedResults.data.aiDescription.text) {
        aiDescription = formattedResults.data.aiDescription.text;
        console.log(`🎨 Found AI description as object.text: ${aiDescription.length} characters`);
      } else {
        console.log(`🔍 DEBUG: AI description structure:`, JSON.stringify(formattedResults.data.aiDescription, null, 2));
      }
      
      if (aiDescription && aiDescription.length > 0) {
        updateData.summary = aiDescription;
        console.log(`🎨 Added AI description to summary: ${updateData.summary.length} characters`);
      }
    } else {
      console.log(`⚠️ No AI description found in formattedResults.data`);
    }
    
    // Handle OCR text for images/videos
    if (formattedResults.data.ocrText && formattedResults.data.ocrText.fullText) {
      // Append OCR text to existing summary or create new one
      const ocrText = formattedResults.data.ocrText.fullText;
      updateData.summary = updateData.summary ? 
        `${updateData.summary}\n\nExtracted Text: ${ocrText}` : 
        `Extracted Text: ${ocrText}`;
      console.log(`📝 Added OCR text to summary: ${updateData.summary.length} characters`);
    }
    
    // Store sentiment analysis
    if (formattedResults.data.sentiment) {
      updateData.sentiment = formattedResults.data.sentiment;
      console.log(`😊 Added sentiment analysis`);
    }
    
    // ✨ ENHANCED: Use AI-powered tags and title if available
    if (enhancedResults) {
      // AI-generated title - store in BOTH fields for consistency with content items
      if (enhancedResults.generatedTitle) {
        updateData.generated_title = enhancedResults.generatedTitle; // Primary field (like content items)
        updateData.metadata.title = enhancedResults.generatedTitle;  // Backup field for metadata
        console.log(`🎯 Added AI-generated title to both fields: "${enhancedResults.generatedTitle}"`);
      }
      
      // AI-powered tags (prioritize these over basic object detection)
      if (enhancedResults.auto_tags && enhancedResults.auto_tags.length > 0) {
        updateData.auto_tags = [...new Set(enhancedResults.auto_tags)]; // Remove duplicates
        console.log(`🏷️ Added AI-generated tags: ${updateData.auto_tags.join(', ')}`);
      }
      
      // AI-powered category
      if (enhancedResults.category) {
        updateData.category = enhancedResults.category;
        console.log(`📁 Added AI category: ${enhancedResults.category}`);
      }
    }
    
    // 🚀 ENHANCED: Use core pipeline's sophisticated AI title or generate one
    if ((!enhancedResults || !enhancedResults.generatedTitle) && !updateData.metadata.title) {
            // Check if core pipeline generated a title
      if (formattedResults.data && formattedResults.data.generatedTitle) {
        updateData.generated_title = formattedResults.data.generatedTitle; // Primary field
        updateData.metadata.title = formattedResults.data.generatedTitle;  // Backup field
        console.log(`🎯 Using core pipeline AI title: "${formattedResults.data.generatedTitle}"`);
      } else if (updateData.summary) {
        // Fallback: Generate title using the same function as core pipeline
        try {
          console.log(`🎯 Generating sophisticated AI title as fallback...`);
          const aiTitle = await generateSophisticatedImageTitle(updateData.summary, formattedResults.data);
          if (aiTitle) {
            updateData.generated_title = aiTitle; // Primary field
            updateData.metadata.title = aiTitle;  // Backup field
            console.log(`🎯 Generated sophisticated AI title: "${aiTitle}"`);
          } else {
            // Final fallback - create professional structured title
            const firstSentence = updateData.summary.split('.')[0];
            let professionalTitle;
            if (firstSentence.length > 0 && firstSentence.length <= 120) {
              professionalTitle = formatAsProfessionalTitle(firstSentence.trim());
              console.log(`🎯 Professional fallback title from summary: "${professionalTitle}"`);
            } else if (updateData.summary.length <= 120) {
              professionalTitle = formatAsProfessionalTitle(updateData.summary.trim());
              console.log(`🎯 Using full summary as professional title: "${professionalTitle}"`);
            } else {
              const truncated = updateData.summary.substring(0, 117).trim();
              professionalTitle = formatAsProfessionalTitle(truncated) + '...';
              console.log(`🎯 Using truncated summary as professional title: "${professionalTitle}"`);
            }
            updateData.generated_title = professionalTitle; // Primary field
            updateData.metadata.title = professionalTitle;  // Backup field
          }
        } catch (titleError) {
          console.error(`⚠️ AI title generation failed: ${titleError.message}`);
          // Fallback to professional structured title
          const firstSentence = updateData.summary.split('.')[0];
          let professionalTitle;
          if (firstSentence.length > 0 && firstSentence.length <= 120) {
            professionalTitle = formatAsProfessionalTitle(firstSentence.trim());
            console.log(`🎯 Professional error fallback title: "${professionalTitle}"`);
          } else if (updateData.summary.length <= 120) {
            professionalTitle = formatAsProfessionalTitle(updateData.summary.trim());
            console.log(`🎯 Using full summary as professional title: "${professionalTitle}"`);
          } else {
            const truncated = updateData.summary.substring(0, 117).trim();
            professionalTitle = formatAsProfessionalTitle(truncated) + '...';
            console.log(`🎯 Using truncated summary as professional title: "${professionalTitle}"`);
          }
          updateData.generated_title = professionalTitle; // Primary field
          updateData.metadata.title = professionalTitle;  // Backup field
        }
      }
    }
    
    // Fallback to basic tags if AI enhancement didn't produce any
    if (!updateData.auto_tags || updateData.auto_tags.length === 0) {
      const autoTags = [];
      
      // Tags from AI description/processor results (priority)
      if (formattedResults.data.tags && Array.isArray(formattedResults.data.tags)) {
        autoTags.push(...formattedResults.data.tags);
        console.log(`🎨 Added AI processor tags: ${formattedResults.data.tags.join(', ')}`);
      }
      
      // Tags from objects detected (fallback)
      if (formattedResults.data.objects) {
        formattedResults.data.objects.forEach(obj => {
          if (obj.confidence > 0.7) { // Only high-confidence objects
            autoTags.push(obj.name);
          }
        });
        console.log(`🔍 Added object detection tags: ${autoTags.join(', ')}`);
      }
      
      // Tags from AI description metadata (additional fallback)
      if (formattedResults.data.aiDescription && formattedResults.data.aiDescription.tags) {
        autoTags.push(...formattedResults.data.aiDescription.tags);
        console.log(`🎨 Added AI description metadata tags`);
      }
      
      // Store fallback tags if we have any
      if (autoTags.length > 0) {
        updateData.auto_tags = [...new Set(autoTags)]; // Remove duplicates
        console.log(`🏷️ Using fallback tags: ${updateData.auto_tags.join(', ')}`);
      }
    }
    
    // Determine category based on media type and content (fallback)
    if (!updateData.category && formattedResults.mediaType) {
      updateData.category = formattedResults.mediaType;
      console.log(`📁 Using fallback category: ${updateData.category}`);
    }

    // 🔧 FALLBACK: If we have analysis data but no summary, copy from analysis record
    if (!updateData.summary && analysisRecord && analysisRecord.ai_description) {
      console.log(`🔧 FALLBACK: Copying AI description from analysis record...`);
      if (typeof analysisRecord.ai_description === 'string') {
        updateData.summary = analysisRecord.ai_description;
        console.log(`🎨 Copied AI description from analysis record: ${updateData.summary.length} characters`);
      } else if (analysisRecord.ai_description.description) {
        updateData.summary = analysisRecord.ai_description.description;
        console.log(`🎨 Copied AI description.description from analysis record: ${updateData.summary.length} characters`);
      }
    }

    console.log(`💾 Final update data:`, {
      hasMetadata: !!updateData.metadata,
      hasTranscription: !!updateData.transcription,
      hasSummary: !!updateData.summary,
      hasSentiment: !!updateData.sentiment,
      hasGeneratedTitle: !!updateData.generated_title,
      hasAutoTags: !!updateData.auto_tags,
      hasCategory: !!updateData.category,
      autoTagsCount: updateData.auto_tags?.length || 0
    });

    // Update file record with analysis results
    if (Object.keys(updateData).length > 0) {
      console.log(`💾 Updating file record with ${Object.keys(updateData).length} fields...`);
      await File.update(updateData, {
        where: { id: fileRecord.id, user_id: user.id }
      });
      
      console.log(`✅ File ${fileRecord.id} updated with enhanced analysis results`, {
        user_id: user.id,
        file_id: fileRecord.id,
        job_id: processingResult.jobId,
        updates: Object.keys(updateData),
        enhanced_ai: !!enhancedResults,
        generated_title: updateData.generated_title,
        ai_tags: updateData.auto_tags,
        ai_category: updateData.category
      });
    } else {
      console.log(`⚠️ No update data generated - this is unusual!`);
    }

    console.log(`🎉 Enhanced file analysis completed for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      job_id: processingResult.jobId,
      media_type: formattedResults.mediaType,
      processing_time: processingResult.processingTime,
      features_used: Object.keys(formattedResults.data),
      warnings: processingResult.warnings?.length || 0,
      enhanced_ai_success: !!enhancedResults
    });

  } catch (error) {
    console.error(`❌ Enhanced file analysis failed for ${fileRecord.id}:`, {
      user_id: user.id,
      file_id: fileRecord.id,
      error: error.message,
      stack: error.stack
    });
    
    // Log the error but don't fail the upload
    logger.logError(`File analysis failed for ${fileRecord.id}`, {
      user_id: user.id,
      file_id: fileRecord.id,
      error: error.message,
      stack: error.stack,
      orchestrator: true
    });
  } finally {
    // Clean up temporary file if it was downloaded from GCS
    console.log(`🧹 Cleanup phase...`);
    console.log(`🔧 DEBUG: fileMetadata in cleanup:`, typeof fileMetadata, fileMetadata);
    if (fileMetadata && fileMetadata.cleanupTempFile && fileMetadata.tempFilePath) {
      try {
        const fs = require('fs');
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

// File Management Dashboard
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get user's files with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    // Build where clause for search and filters
    const whereClause = { user_id: req.user.id };
    
    // Search functionality
    if (req.query.search) {
      whereClause[Op.or] = [
        { filename: { [Op.like]: `%${req.query.search}%` } },
        { user_comments: { [Op.like]: `%${req.query.search}%` } }
      ];
    }
    
    // Filter by file type
    if (req.query.type) {
      whereClause['$metadata.mimetype$'] = { [Op.like]: `${req.query.type}/%` };
    }

    const { count, rows: files } = await File.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Get user's content groups for assignment
    const groups = await ContentGroup.findAll({
      where: { user_id: req.user.id },
      order: [['name', 'ASC']]
    });

    // Get upload statistics
    const stats = await FileUploadService.getUploadStats(req.user.id);
    
    // Calculate pagination
    const totalPages = Math.ceil(count / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    // Log file access
    logger.logAuthEvent('FILE_DASHBOARD_ACCESS', {
      userId: req.user.id,
      fileCount: count,
      page,
      search: req.query.search || null,
      timestamp: new Date().toISOString()
    });

    res.render('files/list', {
      user: req.user,
      title: 'File Management - DaySave',
      files,
      groups,
      stats,
      pagination: {
        current: page,
        total: totalPages,
        hasNext,
        hasPrev,
        limit
      },
      search: req.query.search || '',
      selectedType: req.query.type || ''
    });
  } catch (error) {
    console.error('Error loading file dashboard:', error);
    res.status(500).render('error', {
      title: 'Error - DaySave',
      message: 'Failed to load file dashboard',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// File Upload Route
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for validation
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
    files: 10 // Max 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', [
  isAuthenticated,
  checkUsageLimit('file_uploads', (req) => req.files ? req.files.length : 1),
  checkFileSizeLimit(),
  upload.array('files', 10),
  updateUsage('file_uploads', (req) => req.files ? req.files.length : 1),
  updateUsage('storage_mb', (req) => {
    if (req.files) {
      return req.files.reduce((total, file) => total + Math.ceil(file.size / (1024 * 1024)), 0);
    }
    return 0;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const uploadResults = [];
    const uploadErrors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Validate file
        const validation = await FileUploadService.validateFile(file);
        if (!validation.isValid) {
          uploadErrors.push({
            filename: file.originalname,
            errors: validation.errors
          });
          continue;
        }

        // Upload file to storage
        const uploadResult = await FileUploadService.uploadFile(file, req.user.id, {
          makePublic: false,
          metadata: {
            uploadedBy: req.user.id,
            uploadMethod: 'web_interface'
          }
        });

        // Create file record in database
        const fileRecord = await File.create({
          user_id: req.user.id,
          filename: file.originalname,
          file_path: uploadResult.filePath,
          metadata: {
            size: uploadResult.size,
            mimetype: uploadResult.mimetype,
            storage: uploadResult.storage,
            uploadedAt: new Date().toISOString(),
            publicUrl: uploadResult.publicUrl
          },
          user_comments: req.body.comments || '',
          user_tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
        });

        // Assign to groups if specified
        if (req.body.group_ids) {
          const groupIds = Array.isArray(req.body.group_ids) ? req.body.group_ids : [req.body.group_ids];
          const groupMemberships = groupIds.map(group_id => ({
            content_id: fileRecord.id,
            group_id
          }));
          await ContentGroupMember.bulkCreate(groupMemberships);
        }

        uploadResults.push({
          id: fileRecord.id,
          filename: file.originalname,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype,
          success: true
        });

        // Log successful upload
        logger.logAuthEvent('FILE_UPLOAD_SUCCESS', {
          userId: req.user.id,
          fileId: fileRecord.id,
          filename: file.originalname,
          size: uploadResult.size,
          mimetype: uploadResult.mimetype,
          storage: uploadResult.storage,
          timestamp: new Date().toISOString()
        });

        // Trigger multimedia analysis if the file type is multimedia
        if (isMultimediaFile(file.mimetype)) {
          console.log(`🎬 Detected multimedia file, triggering analysis: ${file.originalname}`);
          console.log(`🔍 File details: ID=${fileRecord.id}, MIME=${file.mimetype}, Path=${fileRecord.file_path}`);
          
          // Run analysis in background (don't wait for it)
          setImmediate(async () => {
            try {
              console.log(`🚀 Starting background analysis for file ${fileRecord.id}`);
              await triggerFileAnalysis(fileRecord, req.user);
              console.log(`✅ Background analysis completed for file ${fileRecord.id}`);
            } catch (analysisError) {
              console.error(`❌ Background analysis failed for ${fileRecord.id}:`, analysisError);
              console.error('Error details:', analysisError.stack);
              // Don't let analysis errors affect the upload response
            }
          });
        } else {
          console.log(`📄 Non-multimedia file, skipping analysis: ${file.originalname}`);
        }

      } catch (uploadError) {
        console.error('Individual file upload error:', uploadError);
        uploadErrors.push({
          filename: file.originalname,
          errors: [uploadError.message]
        });
      }
    }

    // Return results
    const response = {
      success: uploadResults.length > 0,
      uploaded: uploadResults,
      errors: uploadErrors,
      summary: {
        total: req.files.length,
        successful: uploadResults.length,
        failed: uploadErrors.length
      }
    };

    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      res.json(response);
    } else {
      // Handle form submission redirect
      if (response.success) {
        req.session.uploadSuccess = `Successfully uploaded ${uploadResults.length} file(s)`;
      }
      if (uploadErrors.length > 0) {
        req.session.uploadErrors = uploadErrors;
      }
      res.redirect('/files');
    }
  } catch (error) {
    console.error('Upload route error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request details:', {
      method: req.method,
      url: req.url,
      headers: req.headers,
      files: req.files ? req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })) : 'none'
    });
    
    // Return a detailed error response
    res.status(500).json({
      error: 'Upload failed',
      message: error.message || 'An unexpected error occurred during upload',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get File Details
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await File.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id // Users can only view their own files
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!file) {
      return res.status(404).render('error', {
        title: 'File Not Found - DaySave',
        message: 'The requested file was not found or you do not have permission to view it.',
        error: {},
        user: req.user
      });
    }

    // Get file URL for viewing
    const fileUrl = await FileUploadService.getFileUrl(file.file_path);

    // Log file access
    logger.logAuthEvent('FILE_VIEW', {
      userId: req.user.id,
      fileId: file.id,
      filename: file.filename,
      timestamp: new Date().toISOString()
    });

    res.render('files/detail', {
      user: req.user,
      title: `${file.filename} - File Details - DaySave`,
      file,
      fileUrl
    });

  } catch (error) {
    console.error('Error loading file details:', error);
    res.status(500).render('error', {
      title: 'Error - DaySave',
      message: 'Failed to load file details',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: req.user
    });
  }
});

// Update File
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const file = await File.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Update file metadata
    const updates = {};
    if (req.body.comments !== undefined) {
      updates.user_comments = req.body.comments;
    }
    if (req.body.tags !== undefined) {
      updates.user_tags = Array.isArray(req.body.tags) ? req.body.tags : req.body.tags.split(',').map(tag => tag.trim());
    }
    if (req.body.summary !== undefined) {
      updates.summary = req.body.summary;
    }

    await file.update(updates);

    // Update group memberships if specified
    if (req.body.group_ids !== undefined) {
      await ContentGroupMember.destroy({
        where: { content_id: file.id }
      });

      if (req.body.group_ids && req.body.group_ids.length > 0) {
        const groupIds = Array.isArray(req.body.group_ids) ? req.body.group_ids : [req.body.group_ids];
        const groupMemberships = groupIds.map(group_id => ({
          content_id: file.id,
          group_id
        }));
        await ContentGroupMember.bulkCreate(groupMemberships);
      }
    }

    // Log file update
    logger.logAuthEvent('FILE_UPDATE', {
      userId: req.user.id,
      fileId: file.id,
      updates: Object.keys(updates),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'File updated successfully',
      file: await file.reload()
    });

  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({
      error: 'Update failed',
      message: 'An error occurred while updating the file'
    });
  }
});

// Delete File
router.delete('/:id', isAuthenticated, async (req, res) => {
  const fileId = req.params.id;
  const userId = req.user.id;
  
  console.log('🗑️ DELETE /files/:id called', { fileId, userId });
  
  try {
    const file = await File.findOne({
      where: {
        id: fileId,
        user_id: userId
      }
    });

    if (!file) {
      console.log('🚨 File not found for deletion', { fileId, userId });
      return res.status(404).json({
        error: 'File not found or already deleted'
      });
    }
    
    console.log('📁 Found file for deletion:', {
      id: file.id,
      filename: file.filename,
      filePath: file.file_path,
      userId: file.user_id
    });

    // Delete file from storage
    await FileUploadService.deleteFile(file.file_path);

    // Delete related thumbnails from storage and database
    const { Thumbnail } = require('../models');
    const thumbnails = await Thumbnail.findAll({
      where: { 
        file_id: file.id,
        user_id: req.user.id 
      }
    });

    console.log(`🗑️ Found ${thumbnails.length} thumbnails to delete for file ${file.id}`);
    
    for (const thumbnail of thumbnails) {
      try {
        // Delete thumbnail file from storage
        if (thumbnail.file_path) {
          if (thumbnail.file_path.startsWith('gs://')) {
            // For GCS thumbnails, use FileUploadService 
            await FileUploadService.deleteFile(thumbnail.file_path);
          } else {
            // For local thumbnails, delete directly
            const fs = require('fs');
            const path = require('path');
            const fullPath = path.join(__dirname, '..', thumbnail.file_path);
            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
              console.log(`✅ Deleted thumbnail file: ${fullPath}`);
            }
          }
        }
        
        // Delete thumbnail database record
        await thumbnail.destroy();
        console.log(`✅ Deleted thumbnail record: ${thumbnail.id}`);
        
      } catch (thumbnailError) {
        console.error(`⚠️ Failed to delete thumbnail ${thumbnail.id}:`, thumbnailError);
        // Continue with other thumbnails even if one fails
      }
    }

    // Delete group memberships
    await ContentGroupMember.destroy({
      where: { content_id: file.id }
    });

    // Delete file record
    await file.destroy();

    // Log file deletion
    logger.logAuthEvent('FILE_DELETE', {
      userId: req.user.id,
      fileId: file.id,
      filename: file.filename,
      thumbnailsDeleted: thumbnails.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'File deleted successfully',
      thumbnailsDeleted: thumbnails.length
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Delete failed',
      message: 'An error occurred while deleting the file'
    });
  }
});

// Get Upload Settings (for frontend)
router.get('/api/settings', isAuthenticated, async (req, res) => {
  try {
    const settings = await FileUploadService.getUploadSettings();
    res.json({
      maxFileSize: settings.maxFileSize,
      maxFileSizeMB: Math.round(settings.maxFileSize / 1024 / 1024),
      allowedFileTypes: settings.allowedFileTypes,
      supportedCategories: {
        images: settings.allowedFileTypes.filter(type => type.startsWith('image/')),
        audio: settings.allowedFileTypes.filter(type => type.startsWith('audio/')),
        video: settings.allowedFileTypes.filter(type => type.startsWith('video/')),
        documents: settings.allowedFileTypes.filter(type => type.startsWith('application/') || type.startsWith('text/'))
      }
    });
  } catch (error) {
    console.error('Error getting upload settings:', error);
    res.status(500).json({
      error: 'Failed to get upload settings'
    });
  }
});

// Get File Statistics
router.get('/api/stats', isAuthenticated, async (req, res) => {
  try {
    const stats = await FileUploadService.getUploadStats(req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('Error getting file stats:', error);
    res.status(500).json({
      error: 'Failed to get file statistics'
    });
  }
});

// Secure file serving route - serves uploaded files with authentication
router.get('/serve/:userId/:filename', isAuthenticated, async (req, res) => {
  try {
    const { userId, filename } = req.params;
    const requestingUserId = req.user.id;
    
    // Users can only access their own files (except admins)
    const isAdmin = req.user.Role && req.user.Role.name === 'admin';
    if (userId !== requestingUserId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied - you can only access your own files' });
    }
    
    // First, try to find the file in the database to get the correct path
    const fileRecord = await File.findOne({
      where: {
        user_id: userId,
        filename: filename
      }
    });
    
    if (fileRecord) {
      // File found in database - use proper URL generation
      try {
        const fileUrl = await FileUploadService.getFileUrl(fileRecord.file_path);
        
        // If it's a GCS signed URL, redirect to it
        if (fileUrl.includes('storage.googleapis.com')) {
          return res.redirect(fileUrl);
        }
        
        // For local files, continue with local serving
        const path = require('path');
        const fs = require('fs');
        const filePath = path.join(__dirname, '..', fileRecord.file_path);
        
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          const mimeType = await FileUploadService.getMimeType(filePath);
          
          res.setHeader('Content-Type', mimeType || 'application/octet-stream');
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Cache-Control', 'private, max-age=3600');
          
          const readStream = fs.createReadStream(filePath);
          readStream.pipe(res);
          return;
        }
      } catch (urlError) {
        console.error('Error generating file URL:', urlError);
      }
    }
    
    // Fallback: Try original local file serving for backwards compatibility
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(__dirname, '..', 'uploads', userId, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stat = fs.statSync(filePath);
    
    // Set appropriate headers
    const mimeType = await FileUploadService.getMimeType(filePath);
    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    
    // Log file access
    logger.logAuthEvent('FILE_SERVE', {
      userId: requestingUserId,
      accessedUserId: userId,
      filename: filename,
      fileSize: stat.size,
      mimeType: mimeType,
      timestamp: new Date().toISOString()
    });
    
    // Stream the file
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Get file analysis results (updated for new architecture)
router.get('/:id/analysis', isAuthenticated, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user.id;
    
    console.log(`🔍 Analysis request for file: ${fileId} by user: ${userId}`);
    
    // Verify user owns the file
    const file = await File.findOne({ where: { id: fileId, user_id: userId } });
    if (!file) {
      console.log(`❌ File not found: ${fileId} for user: ${userId}`);
      return res.status(404).json({ error: 'File not found.' });
    }
    
    console.log(`✅ File found: ${file.filename} (${file.metadata?.mimetype})`);
    
    // Get multimedia analysis results from new models
    let models;
    try {
      models = require('../models');
      console.log('📊 All available models:', Object.keys(models));
    } catch (modelError) {
      console.error('❌ Error loading models:', modelError);
      return res.status(500).json({ error: 'Model loading failed', details: modelError.message });
    }
    
    const { VideoAnalysis, AudioAnalysis, ImageAnalysis, ProcessingJob, Thumbnail, OCRCaption, Speaker } = models;
    
    // Debug: Check if models are available
    console.log('📊 Target models availability:', {
      VideoAnalysis: !!VideoAnalysis,
      AudioAnalysis: !!AudioAnalysis, 
      ImageAnalysis: !!ImageAnalysis,
      ProcessingJob: !!ProcessingJob,
      Thumbnail: !!Thumbnail,
      OCRCaption: !!OCRCaption,
      Speaker: !!Speaker
    });
    
    // Function to get proper title
    function getFileTitle(fileRecord) {
      // Try metadata title first
      if (fileRecord.metadata && fileRecord.metadata.title) {
        return fileRecord.metadata.title;
      }
      
      // Use filename without extension
      const nameWithoutExt = fileRecord.filename.replace(/\.[^/.]+$/, '');
      return nameWithoutExt.replace(/[-_]/g, ' ');
    }
    
    // Look for processing jobs for this file
    let processingJobs = [];
    try {
      console.log('🔍 Querying processing jobs...');
      processingJobs = await ProcessingJob.findAll({
        where: { file_id: fileId, user_id: userId },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      console.log(`📊 Found ${processingJobs.length} processing jobs`);
    } catch (jobError) {
      console.error('❌ Error querying processing jobs:', jobError);
      // Continue without processing jobs data
    }
    
    // Look for analysis records
    let videoAnalysis, audioAnalysis, imageAnalysis;
    try {
      console.log('🔍 Querying analysis records...');
      [videoAnalysis, audioAnalysis, imageAnalysis] = await Promise.all([
        VideoAnalysis ? VideoAnalysis.findOne({ where: { file_id: fileId, user_id: userId } }) : Promise.resolve(null),
        AudioAnalysis ? AudioAnalysis.findOne({ where: { file_id: fileId, user_id: userId } }) : Promise.resolve(null),
        ImageAnalysis ? ImageAnalysis.findOne({ where: { file_id: fileId, user_id: userId } }) : Promise.resolve(null)
      ]);
      console.log(`📊 Analysis records found:`, {
        video: !!videoAnalysis,
        audio: !!audioAnalysis,
        image: !!imageAnalysis
      });
    } catch (analysisError) {
      console.error('❌ Error querying analysis records:', analysisError);
      // Continue without analysis records
      videoAnalysis = audioAnalysis = imageAnalysis = null;
    }
    
    // Get any analysis record that exists
    const analysis = videoAnalysis || audioAnalysis || imageAnalysis;
    
    // Check if we have transcription data directly in the file record (legacy support)
    const hasTranscription = file.transcription && file.transcription.length > 0;
    const hasSummary = file.summary && file.summary.length > 0;
    
    // Determine media type
    const mimeType = file.metadata?.mimetype || '';
    let mediaType = 'file';
    if (videoAnalysis) mediaType = 'video';
    else if (audioAnalysis) mediaType = 'audio';
    else if (imageAnalysis) mediaType = 'image';
    else if (mimeType.startsWith('image/')) mediaType = 'image';
    else if (mimeType.startsWith('video/')) mediaType = 'video';
    else if (mimeType.startsWith('audio/')) mediaType = 'audio';
    
    // If we have processing jobs, get the latest one
    const latestJob = processingJobs.length > 0 ? processingJobs[0] : null;
    
    // If no analysis but we have a processing job, check its status
    if (!analysis && latestJob) {
      return res.json({
        success: true,
        status: latestJob.status,
        job: {
          id: latestJob.id,
          status: latestJob.status,
          progress: latestJob.progress,
          currentStage: latestJob.current_stage,
          startedAt: latestJob.started_at,
          estimatedCompletion: latestJob.estimated_completion
        },
        message: `Processing ${latestJob.status} - ${latestJob.progress}% complete`
      });
    }
    
    // If no analysis but we have legacy data
    if (!analysis && (hasTranscription || hasSummary)) {
      // Parse sentiment data
      let sentiment = null;
      if (file.sentiment) {
        try {
          sentiment = typeof file.sentiment === 'string' ? JSON.parse(file.sentiment) : file.sentiment;
        } catch (e) {
          sentiment = { label: 'neutral', confidence: 0.5 };
        }
      } else {
        sentiment = { label: 'neutral', confidence: 0.5 };
      }
      
      return res.json({
        success: true,
        status: 'completed',
        mediaType: 'legacy',
        analysis: {
          id: file.id,
          title: getFileTitle(file),
          description: file.metadata?.description || '',
          duration: file.metadata?.duration || 0,
          transcription: file.transcription || '',
          summary: file.summary || '',
          sentiment: sentiment,
          language: file.metadata?.language || 'unknown',
          processing_time: file.metadata?.processing_time || null,
          quality_score: file.metadata?.quality_score || null,
          created_at: file.createdAt,
          metadata: file.metadata || {}
        },
        thumbnails: [],
        speakers: [],
        ocr_captions: [],
        auto_tags: file.auto_tags || [],
        user_tags: file.user_tags || []
      });
    }
    
    // If no analysis data at all
    if (!analysis) {
      return res.json({
        success: true,
        status: 'not_analyzed',
        message: 'No multimedia analysis found for this file'
      });
    }
    
    // Get related multimedia data based on analysis type
    let thumbnails = [];
    let speakers = [];
    let ocrCaptions = [];
    
    try {
      if (videoAnalysis && Thumbnail && OCRCaption) {
        console.log('🔍 Querying video-related data...');
        // Get video-specific related data
        [thumbnails, ocrCaptions] = await Promise.all([
          Thumbnail.findAll({
            where: { file_id: fileId, user_id: userId },
            order: [['timestamp_seconds', 'ASC']],
            limit: 10
          }),
          OCRCaption.findAll({
            where: { file_id: fileId, user_id: userId },
            order: [['timestamp_seconds', 'ASC']],
            limit: 20
          })
        ]);
        console.log(`📊 Video data: ${thumbnails.length} thumbnails, ${ocrCaptions.length} OCR captions`);
      }
      
      if (audioAnalysis && Speaker) {
        console.log('🔍 Querying audio-related data...');
        // Get audio-specific related data
        speakers = await Speaker.findAll({
          where: { user_id: userId, audio_analysis_id: audioAnalysis.id },
          order: [['confidence_score', 'DESC']],
          limit: 5
        });
        console.log(`📊 Audio data: ${speakers.length} speakers`);
      }
      
      if (imageAnalysis && Thumbnail) {
        console.log('🔍 Querying image-related data...');
        // Get image-specific related data
        thumbnails = await Thumbnail.findAll({
          where: { file_id: fileId, user_id: userId },
          order: [['createdAt', 'ASC']],
          limit: 5
        });
        console.log(`📊 Image data: ${thumbnails.length} thumbnails`);
      }
    } catch (relatedDataError) {
      console.error('❌ Error querying related data:', relatedDataError);
      // Continue with empty arrays
    }
    
    // Format response based on analysis type
    const responseData = {
      success: true,
      status: analysis.status || 'completed',
      mediaType: mediaType,
      analysis: {
        id: analysis.id,
        title: getFileTitle(file),
        description: analysis.metadata?.description || file.metadata?.description || '',
        duration: analysis.duration || file.metadata?.duration || 0,
        quality: analysis.quality_assessment,
        processing_time: analysis.processing_stats?.processingTime,
        created_at: analysis.createdAt,
        metadata: file.metadata || {}
      },
      job: latestJob ? {
        id: latestJob.id,
        status: latestJob.status,
        progress: latestJob.progress,
        processingTime: latestJob.duration_ms
      } : null,
      auto_tags: file.auto_tags || [],
      user_tags: file.user_tags || []
    };
    
    // Add type-specific data
    if (videoAnalysis) {
      responseData.analysis.transcription = videoAnalysis.transcription_results?.fullText || '';
      responseData.analysis.sentiment = videoAnalysis.sentiment_analysis;
      responseData.analysis.objects = videoAnalysis.object_detection?.objects || [];
      responseData.analysis.scenes = videoAnalysis.scene_detection?.scenes || [];
    }
    
    if (audioAnalysis) {
      responseData.analysis.transcription = audioAnalysis.transcription_results?.fullText || '';
      responseData.analysis.sentiment = audioAnalysis.sentiment_analysis;
      responseData.analysis.speakers = audioAnalysis.speaker_analysis?.speakers || [];
      responseData.analysis.language = audioAnalysis.language_detection?.primaryLanguage || 'unknown';
    }
    
    if (imageAnalysis) {
      responseData.analysis.description = imageAnalysis.ai_description?.description || '';
      responseData.analysis.objects = imageAnalysis.object_detection?.objects || [];
      responseData.analysis.ocrText = imageAnalysis.ocr_results?.fullText || '';
      responseData.analysis.colors = imageAnalysis.color_analysis;
      responseData.analysis.faces = imageAnalysis.face_detection?.faces || [];
    }
    
    // Add related data
    responseData.thumbnails = thumbnails.map(t => ({
      id: t.id,
      url: t.file_path,
      timestamp: t.timestamp_seconds || 0,
      size: t.size || 'medium',
      width: t.width,
      height: t.height
    }));
    
    responseData.speakers = speakers.map(s => ({
      id: s.id,
      name: s.name || `Speaker ${s.id}`,
      confidence: s.confidence_score || 0,
      gender: s.gender || 'unknown',
      language: s.language || 'unknown'
    }));
    
    responseData.ocr_captions = ocrCaptions.map(o => ({
      id: o.id,
      text: o.text,
      timestamp: o.timestamp_seconds,
      confidence: o.confidence
    }));
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in file analysis endpoint:', {
      error: error.message,
      stack: error.stack,
      fileId: req.params.id,
      userId: req.user?.id
    });
    res.status(500).json({ 
      error: 'Failed to get file analysis',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 