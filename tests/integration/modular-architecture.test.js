/**
 * Integration Tests for New Modular Architecture
 * 
 * These tests verify that the new modular processor architecture
 * works correctly with all components integrated together.
 * 
 * Test Coverage:
 * - Individual processors (Video, Audio, Image)
 * - AutomationOrchestrator coordination
 * - Plugin system functionality
 * - Error handling and isolation
 * - Database integration
 * - Backward compatibility
 * - API endpoint compatibility
 * - End-to-end workflows
 */

const { expect } = require('chai');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs').promises;

// Import components to test
const AutomationOrchestrator = require('../../services/multimedia/AutomationOrchestrator');
const VideoProcessor = require('../../services/multimedia/VideoProcessor');
const AudioProcessor = require('../../services/multimedia/AudioProcessor');
const ImageProcessor = require('../../services/multimedia/ImageProcessor');
const PluginRegistry = require('../../services/multimedia/PluginRegistry');
const ConfigurationManager = require('../../services/multimedia/ConfigurationManager');
const ResultFormatter = require('../../services/multimedia/ResultFormatter');
const ErrorIsolationManager = require('../../services/multimedia/ErrorIsolationManager');
const ProgressTracker = require('../../services/multimedia/ProgressTracker');
const BackwardCompatibilityService = require('../../services/BackwardCompatibilityService');

// Import database models
const db = require('../../models');
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

describe('Modular Architecture Integration Tests', function() {
  this.timeout(30000); // Long timeout for processing operations
  
  let testUser;
  let orchestrator;
  let compatibilityService;
  
  before(async function() {
    // Ensure database is synced
    await db.sequelize.sync({ force: false });
    
    // Create test user
    testUser = await User.create({
      id: 'test-user-integration',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'test_hash'
    });
    
    // Initialize services
    orchestrator = new AutomationOrchestrator();
    compatibilityService = new BackwardCompatibilityService();
  });
  
  after(async function() {
    // Cleanup test data
    await ProcessingJob.destroy({ where: { user_id: testUser.id } });
    await VideoAnalysis.destroy({ where: { user_id: testUser.id } });
    await AudioAnalysis.destroy({ where: { user_id: testUser.id } });
    await ImageAnalysis.destroy({ where: { user_id: testUser.id } });
    await Content.destroy({ where: { user_id: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
  });
  
  describe('Individual Processor Tests', function() {
    
    describe('VideoProcessor', function() {
      let videoProcessor;
      
      beforeEach(function() {
        videoProcessor = new VideoProcessor();
      });
      
      it('should initialize correctly', async function() {
        const result = await videoProcessor.initialize();
        expect(result).to.be.true;
        expect(videoProcessor.getSupportedTypes()).to.include('video/mp4');
      });
      
      it('should validate video files correctly', async function() {
        const testBuffer = Buffer.from('fake video data');
        const metadata = { 
          filename: 'test.mp4',
          mimetype: 'video/mp4',
          size: testBuffer.length 
        };
        
        const isValid = await videoProcessor.validate(testBuffer, metadata);
        expect(isValid).to.be.true;
      });
      
      it('should handle invalid video files', async function() {
        const testBuffer = Buffer.from('not video data');
        const metadata = { 
          filename: 'test.txt',
          mimetype: 'text/plain',
          size: testBuffer.length 
        };
        
        const isValid = await videoProcessor.validate(testBuffer, metadata);
        expect(isValid).to.be.false;
      });
      
      it('should return correct capabilities', function() {
        const capabilities = videoProcessor.getCapabilities();
        expect(capabilities).to.have.property('transcription');
        expect(capabilities).to.have.property('thumbnails');
        expect(capabilities).to.have.property('objectDetection');
        expect(capabilities).to.have.property('qualityAnalysis');
      });
    });
    
    describe('AudioProcessor', function() {
      let audioProcessor;
      
      beforeEach(function() {
        audioProcessor = new AudioProcessor();
      });
      
      it('should initialize correctly', async function() {
        const result = await audioProcessor.initialize();
        expect(result).to.be.true;
        expect(audioProcessor.getSupportedTypes()).to.include('audio/mp3');
      });
      
      it('should validate audio files correctly', async function() {
        const testBuffer = Buffer.from('fake audio data');
        const metadata = { 
          filename: 'test.mp3',
          mimetype: 'audio/mp3',
          size: testBuffer.length 
        };
        
        const isValid = await audioProcessor.validate(testBuffer, metadata);
        expect(isValid).to.be.true;
      });
      
      it('should return correct capabilities', function() {
        const capabilities = audioProcessor.getCapabilities();
        expect(capabilities).to.have.property('transcription');
        expect(capabilities).to.have.property('speakers');
        expect(capabilities).to.have.property('sentiment');
        expect(capabilities).to.have.property('languageDetection');
      });
    });
    
    describe('ImageProcessor', function() {
      let imageProcessor;
      
      beforeEach(function() {
        imageProcessor = new ImageProcessor();
      });
      
      it('should initialize correctly', async function() {
        const result = await imageProcessor.initialize();
        expect(result).to.be.true;
        expect(imageProcessor.getSupportedTypes()).to.include('image/jpeg');
      });
      
      it('should validate image files correctly', async function() {
        const testBuffer = Buffer.from('fake image data');
        const metadata = { 
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
          size: testBuffer.length 
        };
        
        const isValid = await imageProcessor.validate(testBuffer, metadata);
        expect(isValid).to.be.true;
      });
      
      it('should return correct capabilities', function() {
        const capabilities = imageProcessor.getCapabilities();
        expect(capabilities).to.have.property('objectDetection');
        expect(capabilities).to.have.property('ocrText');
        expect(capabilities).to.have.property('aiDescription');
        expect(capabilities).to.have.property('faceDetection');
      });
    });
  });
  
  describe('Plugin System Tests', function() {
    let pluginRegistry;
    
    beforeEach(function() {
      pluginRegistry = new PluginRegistry();
    });
    
    it('should register plugins correctly', function() {
      const mockPlugin = {
        name: 'test-plugin',
        type: 'transcription',
        priority: 1,
        process: sinon.stub().resolves({ success: true })
      };
      
      pluginRegistry.registerPlugin(mockPlugin);
      expect(pluginRegistry.hasPlugin('transcription')).to.be.true;
    });
    
    it('should execute plugins in priority order', async function() {
      const plugin1 = {
        name: 'plugin-1',
        type: 'transcription',
        priority: 2,
        process: sinon.stub().resolves({ success: true, data: 'plugin1' })
      };
      
      const plugin2 = {
        name: 'plugin-2',
        type: 'transcription',
        priority: 1,
        process: sinon.stub().resolves({ success: true, data: 'plugin2' })
      };
      
      pluginRegistry.registerPlugin(plugin1);
      pluginRegistry.registerPlugin(plugin2);
      
      const result = await pluginRegistry.executePlugin('transcription', {});
      expect(plugin2.process.calledBefore(plugin1.process)).to.be.true;
    });
    
    it('should handle plugin fallbacks correctly', async function() {
      const failingPlugin = {
        name: 'failing-plugin',
        type: 'transcription',
        priority: 1,
        process: sinon.stub().rejects(new Error('Plugin failed'))
      };
      
      const fallbackPlugin = {
        name: 'fallback-plugin',
        type: 'transcription',
        priority: 2,
        process: sinon.stub().resolves({ success: true, data: 'fallback' })
      };
      
      pluginRegistry.registerPlugin(failingPlugin);
      pluginRegistry.registerPlugin(fallbackPlugin);
      
      const result = await pluginRegistry.executePlugin('transcription', {});
      expect(result.success).to.be.true;
      expect(result.data).to.equal('fallback');
    });
  });
  
  describe('Configuration Manager Tests', function() {
    let configManager;
    
    beforeEach(function() {
      configManager = new ConfigurationManager();
    });
    
    it('should load default configuration', function() {
      const config = configManager.getConfig();
      expect(config).to.have.property('processors');
      expect(config).to.have.property('plugins');
      expect(config).to.have.property('features');
    });
    
    it('should validate processor configurations', function() {
      const validConfig = {
        enabled: true,
        maxFileSize: 100 * 1024 * 1024,
        timeout: 30000
      };
      
      const isValid = configManager.validateProcessorConfig('video', validConfig);
      expect(isValid).to.be.true;
    });
    
    it('should reject invalid configurations', function() {
      const invalidConfig = {
        enabled: 'not-boolean',
        maxFileSize: -1,
        timeout: 'not-number'
      };
      
      const isValid = configManager.validateProcessorConfig('video', invalidConfig);
      expect(isValid).to.be.false;
    });
  });
  
  describe('AutomationOrchestrator Integration Tests', function() {
    
    it('should process content with appropriate processor', async function() {
      const testBuffer = Buffer.from('test image data');
      const metadata = {
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        userId: testUser.id,
        size: testBuffer.length
      };
      
      // Mock the image processor to avoid actual API calls
      const imageProcessorStub = sinon.stub(ImageProcessor.prototype, 'process')
        .resolves({
          success: true,
          data: {
            aiDescription: { description: 'Test image description', confidence: 0.9 },
            objectDetection: { objects: [{ name: 'test-object', confidence: 0.8 }] },
            metadata: { format: 'JPEG', dimensions: { width: 100, height: 100 } }
          },
          warnings: [],
          processingTime: 1000
        });
      
      const result = await orchestrator.processContent(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      expect(result.mediaType).to.equal('image');
      expect(result.results.data).to.have.property('aiDescription');
      expect(result.jobId).to.be.a('string');
      
      // Verify ProcessingJob was created
      const job = await ProcessingJob.findByPk(result.jobId);
      expect(job).to.not.be.null;
      expect(job.status).to.equal('completed');
      expect(job.media_type).to.equal('image');
      
      imageProcessorStub.restore();
    });
    
    it('should handle processing errors gracefully', async function() {
      const testBuffer = Buffer.from('test data');
      const metadata = {
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        userId: testUser.id,
        size: testBuffer.length
      };
      
      // Mock the processor to throw an error
      const imageProcessorStub = sinon.stub(ImageProcessor.prototype, 'process')
        .rejects(new Error('Processing failed'));
      
      const result = await orchestrator.processContent(testBuffer, metadata);
      
      expect(result.success).to.be.false;
      expect(result.errors).to.have.length.greaterThan(0);
      
      // Verify ProcessingJob was created and marked as failed
      const job = await ProcessingJob.findByPk(result.jobId);
      expect(job).to.not.be.null;
      expect(job.status).to.equal('failed');
      
      imageProcessorStub.restore();
    });
    
    it('should track progress correctly', async function() {
      const testBuffer = Buffer.from('test video data');
      const metadata = {
        filename: 'test.mp4',
        mimetype: 'video/mp4',
        userId: testUser.id,
        size: testBuffer.length
      };
      
      // Mock the video processor with progress tracking
      const videoProcessorStub = sinon.stub(VideoProcessor.prototype, 'process')
        .callsFake(async function(buffer, metadata, options, progressCallback) {
          // Simulate progress updates
          if (progressCallback) {
            await progressCallback('initializing', 10);
            await new Promise(resolve => setTimeout(resolve, 10));
            await progressCallback('processing', 50);
            await new Promise(resolve => setTimeout(resolve, 10));
            await progressCallback('finalizing', 90);
          }
          
          return {
            success: true,
            data: {
              transcription: { fullText: 'Test transcription', language: 'en' },
              metadata: { duration: 60, format: 'MP4' }
            },
            warnings: [],
            processingTime: 2000
          };
        });
      
      const result = await orchestrator.processContent(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      
      // Verify progress was tracked
      const job = await ProcessingJob.findByPk(result.jobId);
      expect(job.progress).to.equal(100);
      expect(job.stages_completed).to.be.greaterThan(0);
      
      videoProcessorStub.restore();
    });
  });
  
  describe('Database Integration Tests', function() {
    
    it('should create VideoAnalysis record correctly', async function() {
      const analysisData = {
        id: 'test-video-analysis',
        user_id: testUser.id,
        processing_job_id: 'test-job-id',
        title: 'Test Video',
        duration: 120,
        video_metadata: { format: 'MP4', resolution: '1080p' },
        transcription_results: { fullText: 'Test transcription', language: 'en' },
        status: 'completed'
      };
      
      const analysis = await VideoAnalysis.create(analysisData);
      
      expect(analysis.id).to.equal(analysisData.id);
      expect(analysis.user_id).to.equal(testUser.id);
      expect(analysis.title).to.equal(analysisData.title);
      expect(analysis.video_metadata.format).to.equal('MP4');
      expect(analysis.transcription_results.fullText).to.equal('Test transcription');
    });
    
    it('should create AudioAnalysis record correctly', async function() {
      const analysisData = {
        id: 'test-audio-analysis',
        user_id: testUser.id,
        processing_job_id: 'test-job-id-2',
        title: 'Test Audio',
        duration: 60,
        audio_metadata: { format: 'MP3', bitrate: 128 },
        transcription_results: { fullText: 'Audio transcription', language: 'en' },
        speaker_analysis: { totalSpeakers: 2, speakers: [] },
        status: 'completed'
      };
      
      const analysis = await AudioAnalysis.create(analysisData);
      
      expect(analysis.id).to.equal(analysisData.id);
      expect(analysis.user_id).to.equal(testUser.id);
      expect(analysis.audio_metadata.format).to.equal('MP3');
      expect(analysis.speaker_analysis.totalSpeakers).to.equal(2);
    });
    
    it('should create ImageAnalysis record correctly', async function() {
      const analysisData = {
        id: 'test-image-analysis',
        user_id: testUser.id,
        processing_job_id: 'test-job-id-3',
        title: 'Test Image',
        image_metadata: { format: 'JPEG', dimensions: { width: 1920, height: 1080 } },
        ai_description: { description: 'Test image description', confidence: 0.9 },
        object_detection: { totalObjects: 3, objects: [] },
        status: 'completed'
      };
      
      const analysis = await ImageAnalysis.create(analysisData);
      
      expect(analysis.id).to.equal(analysisData.id);
      expect(analysis.user_id).to.equal(testUser.id);
      expect(analysis.image_metadata.format).to.equal('JPEG');
      expect(analysis.ai_description.description).to.equal('Test image description');
    });
    
    it('should create ProcessingJob with proper associations', async function() {
      const jobData = {
        id: 'test-processing-job',
        user_id: testUser.id,
        media_type: 'video',
        status: 'completed',
        progress: 100,
        started_at: new Date(),
        completed_at: new Date(),
        processing_time: 5000
      };
      
      const job = await ProcessingJob.create(jobData);
      
      expect(job.id).to.equal(jobData.id);
      expect(job.user_id).to.equal(testUser.id);
      expect(job.media_type).to.equal('video');
      expect(job.status).to.equal('completed');
      
      // Test association with user
      const user = await job.getUser();
      expect(user.id).to.equal(testUser.id);
    });
  });
  
  describe('Result Formatter Tests', function() {
    let resultFormatter;
    
    beforeEach(function() {
      resultFormatter = new ResultFormatter();
    });
    
    it('should format video results correctly', function() {
      const rawResults = {
        transcription: { fullText: 'Test transcription', language: 'en' },
        metadata: { duration: 120, format: 'MP4' },
        sentiment: { overall: { label: 'positive', confidence: 0.8 } }
      };
      
      const formatted = resultFormatter.formatResults(rawResults, 'video');
      
      expect(formatted.mediaType).to.equal('video');
      expect(formatted.data.transcription.fullText).to.equal('Test transcription');
      expect(formatted.data.metadata.duration).to.equal(120);
      expect(formatted.data.sentiment.overall.label).to.equal('positive');
    });
    
    it('should format audio results correctly', function() {
      const rawResults = {
        transcription: { fullText: 'Audio transcription', language: 'en' },
        speakers: { totalSpeakers: 2, speakers: [] },
        sentiment: { overall: { label: 'neutral', confidence: 0.7 } }
      };
      
      const formatted = resultFormatter.formatResults(rawResults, 'audio');
      
      expect(formatted.mediaType).to.equal('audio');
      expect(formatted.data.transcription.fullText).to.equal('Audio transcription');
      expect(formatted.data.speakers.totalSpeakers).to.equal(2);
    });
    
    it('should format image results correctly', function() {
      const rawResults = {
        aiDescription: { description: 'Test image', confidence: 0.9 },
        objectDetection: { objects: [{ name: 'car', confidence: 0.8 }] },
        ocrText: { fullText: 'Extracted text' }
      };
      
      const formatted = resultFormatter.formatResults(rawResults, 'image');
      
      expect(formatted.mediaType).to.equal('image');
      expect(formatted.data.aiDescription.description).to.equal('Test image');
      expect(formatted.data.objectDetection.objects).to.have.length(1);
      expect(formatted.data.ocrText.fullText).to.equal('Extracted text');
    });
  });
  
  describe('Error Isolation Tests', function() {
    let errorManager;
    
    beforeEach(function() {
      errorManager = new ErrorIsolationManager();
    });
    
    it('should isolate processor errors', async function() {
      const processorError = new Error('Processor failed');
      
      const result = await errorManager.isolateError('video-processor', async () => {
        throw processorError;
      });
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal(processorError);
      expect(result.isolated).to.be.true;
    });
    
    it('should implement circuit breaker pattern', async function() {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        await errorManager.isolateError('test-processor', async () => {
          throw new Error('Repeated failure');
        });
      }
      
      // Next call should be immediately rejected due to circuit breaker
      const result = await errorManager.isolateError('test-processor', async () => {
        return { success: true };
      });
      
      expect(result.success).to.be.false;
      expect(result.circuitBreakerOpen).to.be.true;
    });
  });
  
  describe('Progress Tracker Tests', function() {
    let progressTracker;
    
    beforeEach(function() {
      progressTracker = new ProgressTracker();
    });
    
    it('should track job progress correctly', async function() {
      const jobId = 'test-progress-job';
      
      progressTracker.startJob(jobId, ['initialize', 'process', 'finalize']);
      
      await progressTracker.updateProgress(jobId, 'initialize', 33);
      await progressTracker.updateProgress(jobId, 'process', 66);
      await progressTracker.updateProgress(jobId, 'finalize', 100);
      
      const status = progressTracker.getJobStatus(jobId);
      expect(status.progress).to.equal(100);
      expect(status.currentStage).to.equal('finalize');
      expect(status.stagesCompleted).to.equal(3);
    });
    
    it('should calculate performance metrics', function() {
      const jobId = 'test-metrics-job';
      
      progressTracker.startJob(jobId, ['process']);
      progressTracker.completeJob(jobId);
      
      const metrics = progressTracker.getPerformanceMetrics(jobId);
      expect(metrics).to.have.property('totalTime');
      expect(metrics).to.have.property('averageStageTime');
      expect(metrics.totalTime).to.be.a('number');
    });
  });
  
  describe('Backward Compatibility Tests', function() {
    
    it('should handle legacy API format', async function() {
      const testUrl = 'https://example.com/test-video.mp4';
      const legacyOptions = {
        user_id: testUser.id,
        transcription: true,
        sentiment: true,
        thumbnails: false
      };
      
      // Mock the orchestrator to avoid actual processing
      const orchestratorStub = sinon.stub(orchestrator, 'processContent')
        .resolves({
          success: true,
          jobId: 'test-job',
          results: {
            data: {
              transcription: { fullText: 'Test transcription', language: 'en' },
              sentiment: { overall: { label: 'positive', confidence: 0.8 } },
              metadata: { duration: 60, format: 'MP4' }
            },
            mediaType: 'video'
          },
          warnings: [],
          errors: []
        });
      
      const result = await compatibilityService.analyzeContent(testUrl, legacyOptions);
      
      expect(result.success).to.be.true;
      expect(result.transcription).to.equal('Test transcription');
      expect(result.sentiment).to.have.property('label');
      expect(result.sentiment.label).to.equal('positive');
      expect(result.analysis_id).to.be.a('string');
      
      orchestratorStub.restore();
    });
    
    it('should convert new results to legacy format', async function() {
      const newResults = {
        success: true,
        jobId: 'test-job',
        results: {
          data: {
            transcription: { fullText: 'New format transcription', language: 'en' },
            sentiment: { overall: { label: 'negative', confidence: 0.9 } },
            metadata: { duration: 120, format: 'MP4' }
          },
          mediaType: 'video'
        },
        warnings: [],
        errors: []
      };
      
      const legacyFormat = await compatibilityService.convertToLegacyFormat(
        newResults,
        'test-analysis-id',
        'https://example.com/test.mp4',
        { user_id: testUser.id },
        Date.now() - 5000
      );
      
      expect(legacyFormat.success).to.be.true;
      expect(legacyFormat.analysis_id).to.equal('test-analysis-id');
      expect(legacyFormat.transcription).to.equal('New format transcription');
      expect(legacyFormat.sentiment.label).to.equal('negative');
      expect(legacyFormat.processing_time).to.be.a('number');
    });
  });
  
  describe('End-to-End Workflow Tests', function() {
    
    it('should complete full image processing workflow', async function() {
      // Create test content
      const content = await Content.create({
        id: 'test-content-image',
        user_id: testUser.id,
        url: 'https://example.com/test-image.jpg',
        metadata: { source: 'test' }
      });
      
      // Mock processors to avoid external API calls
      const imageProcessorStub = sinon.stub(ImageProcessor.prototype, 'process')
        .resolves({
          success: true,
          data: {
            aiDescription: { 
              description: 'A beautiful landscape photo with mountains and trees',
              confidence: 0.95,
              tags: ['landscape', 'mountains', 'nature']
            },
            objectDetection: { 
              totalObjects: 3,
              objects: [
                { name: 'mountain', confidence: 0.9 },
                { name: 'tree', confidence: 0.85 },
                { name: 'sky', confidence: 0.8 }
              ]
            },
            metadata: { 
              format: 'JPEG',
              dimensions: { width: 1920, height: 1080 },
              fileSize: 2048576
            }
          },
          warnings: [],
          processingTime: 3000
        });
      
      // Process the content
      const testBuffer = Buffer.from('fake image data');
      const metadata = {
        filename: 'test-image.jpg',
        mimetype: 'image/jpeg',
        contentId: content.id,
        userId: testUser.id,
        size: testBuffer.length
      };
      
      const result = await orchestrator.processContent(testBuffer, metadata);
      
      // Verify orchestrator result
      expect(result.success).to.be.true;
      expect(result.mediaType).to.equal('image');
      expect(result.results.data.aiDescription.description).to.include('landscape');
      
      // Verify database records were created
      const job = await ProcessingJob.findByPk(result.jobId);
      expect(job).to.not.be.null;
      expect(job.status).to.equal('completed');
      expect(job.media_type).to.equal('image');
      
      const analysis = await ImageAnalysis.findOne({ 
        where: { processing_job_id: result.jobId } 
      });
      expect(analysis).to.not.be.null;
      expect(analysis.ai_description.description).to.include('landscape');
      expect(analysis.object_detection.totalObjects).to.equal(3);
      
      imageProcessorStub.restore();
    });
    
    it('should handle mixed success/failure scenarios', async function() {
      // Mock processor with partial success
      const videoProcessorStub = sinon.stub(VideoProcessor.prototype, 'process')
        .resolves({
          success: true,
          data: {
            transcription: { fullText: 'Partial transcription', language: 'en' },
            metadata: { duration: 60, format: 'MP4' }
            // Missing thumbnails and other features due to partial failure
          },
          warnings: [
            'Thumbnail generation failed',
            'Object detection service unavailable'
          ],
          processingTime: 8000
        });
      
      const testBuffer = Buffer.from('test video data');
      const metadata = {
        filename: 'test-video.mp4',
        mimetype: 'video/mp4',
        userId: testUser.id,
        size: testBuffer.length
      };
      
      const result = await orchestrator.processContent(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      expect(result.warnings).to.have.length(2);
      expect(result.results.data.transcription).to.exist;
      
      // Verify job shows warnings
      const job = await ProcessingJob.findByPk(result.jobId);
      expect(job.warnings).to.have.length(2);
      expect(job.status).to.equal('completed'); // Still completed despite warnings
      
      videoProcessorStub.restore();
    });
  });
  
  describe('Performance and Scalability Tests', function() {
    
    it('should handle concurrent processing requests', async function() {
      this.timeout(60000); // Extended timeout for concurrent operations
      
      // Mock processor for consistent behavior
      const imageProcessorStub = sinon.stub(ImageProcessor.prototype, 'process')
        .resolves({
          success: true,
          data: {
            aiDescription: { description: 'Concurrent test image', confidence: 0.9 },
            metadata: { format: 'JPEG' }
          },
          warnings: [],
          processingTime: 1000
        });
      
      // Create multiple concurrent processing requests
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => {
        const testBuffer = Buffer.from(`test image data ${i}`);
        const metadata = {
          filename: `test-${i}.jpg`,
          mimetype: 'image/jpeg',
          userId: testUser.id,
          size: testBuffer.length
        };
        
        return orchestrator.processContent(testBuffer, metadata);
      });
      
      const results = await Promise.all(concurrentRequests);
      
      // Verify all requests completed successfully
      results.forEach((result, index) => {
        expect(result.success).to.be.true;
        expect(result.mediaType).to.equal('image');
        expect(result.jobId).to.be.a('string');
      });
      
      // Verify all jobs were created
      const jobs = await ProcessingJob.findAll({
        where: { user_id: testUser.id, status: 'completed' }
      });
      expect(jobs.length).to.be.at.least(5);
      
      imageProcessorStub.restore();
    });
    
    it('should cleanup resources properly', async function() {
      const testBuffer = Buffer.from('test data for cleanup');
      const metadata = {
        filename: 'cleanup-test.jpg',
        mimetype: 'image/jpeg',
        userId: testUser.id,
        size: testBuffer.length
      };
      
      // Mock processor with cleanup tracking
      let cleanupCalled = false;
      const imageProcessorStub = sinon.stub(ImageProcessor.prototype, 'process')
        .resolves({
          success: true,
          data: { aiDescription: { description: 'Test', confidence: 0.9 } },
          warnings: [],
          processingTime: 1000
        });
      
      const cleanupStub = sinon.stub(ImageProcessor.prototype, 'cleanup')
        .callsFake(async function() {
          cleanupCalled = true;
        });
      
      await orchestrator.processContent(testBuffer, metadata);
      
      // Verify cleanup was called
      expect(cleanupCalled).to.be.true;
      
      imageProcessorStub.restore();
      cleanupStub.restore();
    });
  });
});

// Helper functions for testing
function createMockBuffer(type, size = 1024) {
  return Buffer.alloc(size, `mock ${type} data`);
}

function createMockMetadata(filename, mimetype, options = {}) {
  return {
    filename,
    mimetype,
    size: 1024,
    userId: 'test-user',
    ...options
  };
} 