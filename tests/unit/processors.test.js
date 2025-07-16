/**
 * Unit Tests for Individual Processors
 * 
 * These tests focus on testing individual processor components
 * in isolation to verify their specific functionality.
 */

const { expect } = require('chai');
const sinon = require('sinon');

// Import processors
const BaseMediaProcessor = require('../../services/multimedia/BaseMediaProcessor');
const VideoProcessor = require('../../services/multimedia/VideoProcessor');
const AudioProcessor = require('../../services/multimedia/AudioProcessor');
const ImageProcessor = require('../../services/multimedia/ImageProcessor');

describe('Processor Unit Tests', function() {
  
  describe('BaseMediaProcessor Abstract Class', function() {
    
    it('should not be instantiable directly', function() {
      expect(() => new BaseMediaProcessor()).to.throw();
    });
    
    it('should require abstract methods to be implemented', function() {
      class IncompleteProcessor extends BaseMediaProcessor {}
      
      expect(() => new IncompleteProcessor()).to.throw();
    });
    
    it('should accept complete implementations', function() {
      class CompleteProcessor extends BaseMediaProcessor {
        async initialize() { return true; }
        async process() { return { success: true, data: {} }; }
        async validate() { return true; }
        async cleanup() { return true; }
        getSupportedTypes() { return ['test/type']; }
        getCapabilities() { return { test: true }; }
      }
      
      expect(() => new CompleteProcessor()).to.not.throw();
    });
  });
  
  describe('VideoProcessor', function() {
    let processor;
    
    beforeEach(function() {
      processor = new VideoProcessor();
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should initialize with correct configuration', async function() {
      const result = await processor.initialize();
      expect(result).to.be.true;
    });
    
    it('should support video MIME types', function() {
      const supportedTypes = processor.getSupportedTypes();
      expect(supportedTypes).to.include('video/mp4');
      expect(supportedTypes).to.include('video/avi');
      expect(supportedTypes).to.include('video/mov');
    });
    
    it('should have correct capabilities', function() {
      const capabilities = processor.getCapabilities();
      expect(capabilities).to.have.property('transcription', true);
      expect(capabilities).to.have.property('thumbnails', true);
      expect(capabilities).to.have.property('objectDetection', true);
      expect(capabilities).to.have.property('qualityAnalysis', true);
      expect(capabilities).to.have.property('sceneDetection', true);
    });
    
    it('should validate video files correctly', async function() {
      const validBuffer = Buffer.from('fake video content');
      const validMetadata = {
        filename: 'test.mp4',
        mimetype: 'video/mp4',
        size: validBuffer.length
      };
      
      const isValid = await processor.validate(validBuffer, validMetadata);
      expect(isValid).to.be.true;
    });
    
    it('should reject non-video files', async function() {
      const invalidBuffer = Buffer.from('not video content');
      const invalidMetadata = {
        filename: 'test.txt',
        mimetype: 'text/plain',
        size: invalidBuffer.length
      };
      
      const isValid = await processor.validate(invalidBuffer, invalidMetadata);
      expect(isValid).to.be.false;
    });
    
    it('should handle progress callbacks during processing', async function() {
      const progressCallbacks = [];
      const progressCallback = sinon.spy((stage, progress) => {
        progressCallbacks.push({ stage, progress });
      });
      
      // Mock external dependencies to avoid actual processing
      sinon.stub(processor, 'extractVideoMetadata').resolves({
        duration: 60,
        format: 'MP4',
        resolution: '1080p'
      });
      
      sinon.stub(processor, 'transcribeVideo').resolves({
        fullText: 'Test transcription',
        language: 'en',
        segments: []
      });
      
      const testBuffer = Buffer.from('test video data');
      const metadata = {
        filename: 'test.mp4',
        mimetype: 'video/mp4',
        size: testBuffer.length
      };
      
      await processor.process(testBuffer, metadata, {}, progressCallback);
      
      expect(progressCallback.called).to.be.true;
      expect(progressCallbacks.length).to.be.greaterThan(0);
    });
    
    it('should handle errors gracefully', async function() {
      // Mock method to throw error
      sinon.stub(processor, 'extractVideoMetadata').rejects(new Error('Metadata extraction failed'));
      
      const testBuffer = Buffer.from('test video data');
      const metadata = {
        filename: 'test.mp4',
        mimetype: 'video/mp4',
        size: testBuffer.length
      };
      
      const result = await processor.process(testBuffer, metadata);
      
      expect(result.success).to.be.false;
      expect(result.errors).to.have.length.greaterThan(0);
      expect(result.errors[0]).to.include('Metadata extraction failed');
    });
  });
  
  describe('AudioProcessor', function() {
    let processor;
    
    beforeEach(function() {
      processor = new AudioProcessor();
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should support audio MIME types', function() {
      const supportedTypes = processor.getSupportedTypes();
      expect(supportedTypes).to.include('audio/mp3');
      expect(supportedTypes).to.include('audio/wav');
      expect(supportedTypes).to.include('audio/m4a');
    });
    
    it('should have correct capabilities', function() {
      const capabilities = processor.getCapabilities();
      expect(capabilities).to.have.property('transcription', true);
      expect(capabilities).to.have.property('speakers', true);
      expect(capabilities).to.have.property('sentiment', true);
      expect(capabilities).to.have.property('languageDetection', true);
      expect(capabilities).to.have.property('voicePrint', true);
    });
    
    it('should validate audio files correctly', async function() {
      const validBuffer = Buffer.from('fake audio content');
      const validMetadata = {
        filename: 'test.mp3',
        mimetype: 'audio/mp3',
        size: validBuffer.length
      };
      
      const isValid = await processor.validate(validBuffer, validMetadata);
      expect(isValid).to.be.true;
    });
    
    it('should process transcription with speaker diarization', async function() {
      // Mock dependencies
      sinon.stub(processor, 'extractAudioMetadata').resolves({
        duration: 30,
        format: 'MP3',
        bitrate: 128
      });
      
      sinon.stub(processor, 'transcribeAudio').resolves({
        fullText: 'Hello, this is a test audio file.',
        language: 'en',
        segments: [
          { text: 'Hello,', startTime: 0, endTime: 1, speakerId: 'speaker1' },
          { text: 'this is a test audio file.', startTime: 1, endTime: 5, speakerId: 'speaker1' }
        ]
      });
      
      sinon.stub(processor, 'identifySpeakers').resolves({
        totalSpeakers: 1,
        speakers: [
          { id: 'speaker1', name: 'Speaker 1', confidence: 0.9 }
        ]
      });
      
      const testBuffer = Buffer.from('test audio data');
      const metadata = {
        filename: 'test.mp3',
        mimetype: 'audio/mp3',
        size: testBuffer.length
      };
      
      const result = await processor.process(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      expect(result.data.transcription.fullText).to.equal('Hello, this is a test audio file.');
      expect(result.data.speakers.totalSpeakers).to.equal(1);
    });
  });
  
  describe('ImageProcessor', function() {
    let processor;
    
    beforeEach(function() {
      processor = new ImageProcessor();
    });
    
    afterEach(function() {
      sinon.restore();
    });
    
    it('should support image MIME types', function() {
      const supportedTypes = processor.getSupportedTypes();
      expect(supportedTypes).to.include('image/jpeg');
      expect(supportedTypes).to.include('image/png');
      expect(supportedTypes).to.include('image/gif');
      expect(supportedTypes).to.include('image/webp');
    });
    
    it('should have correct capabilities', function() {
      const capabilities = processor.getCapabilities();
      expect(capabilities).to.have.property('objectDetection', true);
      expect(capabilities).to.have.property('ocrText', true);
      expect(capabilities).to.have.property('aiDescription', true);
      expect(capabilities).to.have.property('faceDetection', true);
      expect(capabilities).to.have.property('colorAnalysis', true);
    });
    
    it('should validate image files correctly', async function() {
      const validBuffer = Buffer.from('fake image content');
      const validMetadata = {
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        size: validBuffer.length
      };
      
      const isValid = await processor.validate(validBuffer, validMetadata);
      expect(isValid).to.be.true;
    });
    
    it('should process image with all features', async function() {
      // Mock dependencies
      sinon.stub(processor, 'extractImageMetadata').resolves({
        format: 'JPEG',
        dimensions: { width: 1920, height: 1080 },
        fileSize: 2048576
      });
      
      sinon.stub(processor, 'generateAIDescription').resolves({
        description: 'A beautiful sunset over mountains with colorful sky',
        confidence: 0.95,
        tags: ['sunset', 'mountains', 'nature', 'landscape']
      });
      
      sinon.stub(processor, 'detectObjects').resolves({
        totalObjects: 3,
        objects: [
          { name: 'mountain', confidence: 0.9, category: 'landscape' },
          { name: 'sky', confidence: 0.85, category: 'nature' },
          { name: 'cloud', confidence: 0.8, category: 'weather' }
        ]
      });
      
      sinon.stub(processor, 'extractOCRText').resolves({
        fullText: 'Mountain Peak Trail',
        blocks: [
          { text: 'Mountain Peak Trail', confidence: 0.9 }
        ]
      });
      
      sinon.stub(processor, 'detectFaces').resolves({
        totalFaces: 0,
        faces: []
      });
      
      sinon.stub(processor, 'analyzeColors').resolves({
        dominantColors: [
          { name: 'orange', hex: '#FF8C00', percentage: 35 },
          { name: 'blue', hex: '#4169E1', percentage: 25 },
          { name: 'purple', hex: '#8A2BE2', percentage: 20 }
        ]
      });
      
      const testBuffer = Buffer.from('test image data');
      const metadata = {
        filename: 'sunset.jpg',
        mimetype: 'image/jpeg',
        size: testBuffer.length
      };
      
      const result = await processor.process(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      expect(result.data.aiDescription.description).to.include('sunset');
      expect(result.data.objectDetection.totalObjects).to.equal(3);
      expect(result.data.ocrText.fullText).to.equal('Mountain Peak Trail');
      expect(result.data.faceDetection.totalFaces).to.equal(0);
      expect(result.data.colorAnalysis.dominantColors).to.have.length(3);
    });
    
    it('should handle images with no text or objects', async function() {
      // Mock dependencies for simple image
      sinon.stub(processor, 'extractImageMetadata').resolves({
        format: 'PNG',
        dimensions: { width: 800, height: 600 }
      });
      
      sinon.stub(processor, 'generateAIDescription').resolves({
        description: 'A simple abstract pattern',
        confidence: 0.7,
        tags: ['abstract', 'pattern']
      });
      
      sinon.stub(processor, 'detectObjects').resolves({
        totalObjects: 0,
        objects: []
      });
      
      sinon.stub(processor, 'extractOCRText').resolves({
        fullText: '',
        blocks: []
      });
      
      const testBuffer = Buffer.from('simple image data');
      const metadata = {
        filename: 'abstract.png',
        mimetype: 'image/png',
        size: testBuffer.length
      };
      
      const result = await processor.process(testBuffer, metadata);
      
      expect(result.success).to.be.true;
      expect(result.data.aiDescription.description).to.include('abstract');
      expect(result.data.objectDetection.totalObjects).to.equal(0);
      expect(result.data.ocrText.fullText).to.equal('');
    });
  });
  
  describe('Processor Error Handling', function() {
    
    it('should handle initialization failures', async function() {
      const processor = new VideoProcessor();
      
      // Mock initialization to fail
      sinon.stub(processor, 'initializeDependencies').rejects(new Error('Init failed'));
      
      const result = await processor.initialize();
      expect(result).to.be.false;
    });
    
    it('should track retry attempts', async function() {
      const processor = new AudioProcessor();
      let attemptCount = 0;
      
      // Mock method to fail first two times, succeed on third
      sinon.stub(processor, 'transcribeAudio').callsFake(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { fullText: 'Success on retry', language: 'en' };
      });
      
      const result = await processor.processWithRetry('transcribeAudio', {}, { maxRetries: 3 });
      
      expect(result.fullText).to.equal('Success on retry');
      expect(attemptCount).to.equal(3);
    });
    
    it('should respect timeout limits', async function() {
      this.timeout(5000);
      
      const processor = new ImageProcessor();
      
      // Mock method to take too long
      sinon.stub(processor, 'generateAIDescription').callsFake(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
        return { description: 'Should not reach here' };
      });
      
      const startTime = Date.now();
      const result = await processor.processWithTimeout('generateAIDescription', {}, 1000); // 1 second timeout
      const endTime = Date.now();
      
      expect(endTime - startTime).to.be.lessThan(2000); // Should timeout in ~1 second
      expect(result.success).to.be.false;
      expect(result.error).to.include('timeout');
    });
  });
  
  describe('Processor Resource Management', function() {
    
    it('should cleanup temporary files', async function() {
      const processor = new VideoProcessor();
      const tempFiles = ['temp1.mp4', 'temp2.wav', 'temp3.jpg'];
      
      // Mock cleanup method
      const cleanupSpy = sinon.spy();
      processor.cleanupTempFiles = cleanupSpy;
      
      processor.addTempFile('temp1.mp4');
      processor.addTempFile('temp2.wav');
      processor.addTempFile('temp3.jpg');
      
      await processor.cleanup();
      
      expect(cleanupSpy.calledOnce).to.be.true;
    });
    
    it('should manage memory usage', function() {
      const processor = new AudioProcessor();
      
      // Test memory tracking
      processor.trackMemoryUsage('start');
      
      // Simulate some processing
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      
      processor.trackMemoryUsage('peak');
      
      const memoryStats = processor.getMemoryStats();
      expect(memoryStats).to.have.property('start');
      expect(memoryStats).to.have.property('peak');
      expect(memoryStats.peak).to.be.greaterThan(memoryStats.start);
    });
  });
});

// Test utilities
function createMockProcessor(overrides = {}) {
  return {
    initialize: sinon.stub().resolves(true),
    process: sinon.stub().resolves({ success: true, data: {} }),
    validate: sinon.stub().resolves(true),
    cleanup: sinon.stub().resolves(true),
    getSupportedTypes: sinon.stub().returns(['test/type']),
    getCapabilities: sinon.stub().returns({ test: true }),
    ...overrides
  };
} 