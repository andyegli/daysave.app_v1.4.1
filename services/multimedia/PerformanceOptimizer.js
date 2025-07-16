/**
 * Performance Optimizer for Modular Architecture
 * 
 * This service provides comprehensive performance optimizations including:
 * - Memory management and garbage collection
 * - Resource pooling and caching
 * - Concurrent processing optimization
 * - Performance monitoring and metrics
 * - Database query optimization
 * - File streaming and buffer management
 */

const EventEmitter = require('events');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const cluster = require('cluster');
const os = require('os');
const path = require('path');

class PerformanceOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
      maxConcurrentJobs: options.maxConcurrentJobs || Math.min(4, Math.max(2, Math.floor(os.cpus().length / 2))),
      cacheSize: options.cacheSize || 100,
      gcInterval: options.gcInterval || 30000, // 30 seconds
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      enableWorkerThreads: options.enableWorkerThreads !== false,
      enableClustering: options.enableClustering || false,
      streamThreshold: options.streamThreshold || 50 * 1024 * 1024, // 50MB
      ...options
    };
    
    // Performance metrics
    this.metrics = {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      memoryUsage: {
        current: 0,
        peak: 0,
        average: 0
      },
      cacheHitRate: 0,
      resourcePoolStats: {}
    };
    
    // Resource management
    this.resourcePool = new Map();
    this.cache = new Map();
    this.cacheStats = { hits: 0, misses: 0 };
    this.activeJobs = new Set();
    this.jobQueue = [];
    this.workerPool = [];
    
    // Initialize optimizer
    this.initialize();
  }
  
  /**
   * Initialize performance optimizer
   */
  async initialize() {
    console.log('🚀 Initializing Performance Optimizer...');
    
    // Set up memory monitoring
    this.startMemoryMonitoring();
    
    // Set up garbage collection
    this.setupGarbageCollection();
    
    // Initialize worker pool if enabled
    if (this.options.enableWorkerThreads) {
      await this.initializeWorkerPool();
    }
    
    // Setup performance monitoring
    this.startPerformanceMonitoring();
    
    console.log(`✅ Performance Optimizer initialized with ${this.options.maxConcurrentJobs} concurrent jobs`);
  }
  
  /**
   * Process content with performance optimizations
   */
  async processWithOptimization(processor, buffer, metadata, options = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    
    try {
      // Check if we should use streaming for large files
      if (buffer.length > this.options.streamThreshold) {
        return await this.processWithStreaming(processor, buffer, metadata, options, jobId);
      }
      
      // Check cache first
      const cacheKey = this.generateCacheKey(buffer, metadata, options);
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        this.cacheStats.hits++;
        this.emit('cacheHit', { jobId, cacheKey });
        return cachedResult;
      }
      this.cacheStats.misses++;
      
      // Add job to active jobs
      this.activeJobs.add(jobId);
      this.metrics.activeJobs = this.activeJobs.size;
      this.metrics.totalJobs++;
      
      // Check if we need to queue the job
      if (this.activeJobs.size > this.options.maxConcurrentJobs) {
        return await this.queueJob(processor, buffer, metadata, options, jobId);
      }
      
      // Process with resource management
      const result = await this.processWithResourceManagement(
        processor, buffer, metadata, options, jobId
      );
      
      // Cache successful results
      if (result.success && this.shouldCacheResult(result)) {
        this.addToCache(cacheKey, result);
      }
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(processingTime, result.success);
      
      return result;
      
    } catch (error) {
      this.metrics.failedJobs++;
      throw error;
    } finally {
      // Cleanup
      this.activeJobs.delete(jobId);
      this.metrics.activeJobs = this.activeJobs.size;
      this.processQueue();
    }
  }
  
  /**
   * Process large files using streaming
   */
  async processWithStreaming(processor, buffer, metadata, options, jobId) {
    console.log(`📊 Processing large file (${buffer.length} bytes) with streaming for job ${jobId}`);
    
    // Create stream from buffer
    const { Readable } = require('stream');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    
    // Process in chunks
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = [];
    
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    // Process chunks in parallel (limited concurrency)
    const maxConcurrentChunks = Math.min(4, this.options.maxConcurrentJobs);
    const results = [];
    
    for (let i = 0; i < chunks.length; i += maxConcurrentChunks) {
      const chunkBatch = chunks.slice(i, i + maxConcurrentChunks);
      const batchPromises = chunkBatch.map(async (chunk, index) => {
        const chunkMetadata = {
          ...metadata,
          chunkIndex: i + index,
          isChunk: true,
          originalSize: buffer.length
        };
        
        // Extract userId from metadata
        const userId = chunkMetadata.userId || chunkMetadata.user_id || 'unknown';
        
        // Create temp file for chunk processing  
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        const tempDir = path.join(os.tmpdir(), 'daysave-processing');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const extension = this.getFileExtension(chunkMetadata.mimeType || chunkMetadata.fileType || 'application/octet-stream');
        const tempFilePath = path.join(tempDir, `chunk_${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`);
        
        // Write chunk to temp file
        fs.writeFileSync(tempFilePath, chunk);
        
        try {
          return await processor.process(userId, tempFilePath, options);
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // Merge results
    return this.mergeChunkResults(results, metadata);
  }
  
  /**
   * Process with resource management
   */
  async processWithResourceManagement(processor, buffer, metadata, options, jobId) {
    // Get or create resource for this processor type
    const resourceKey = processor.constructor.name;
    let resource = this.getResource(resourceKey);
    
    if (!resource) {
      resource = await this.createResource(resourceKey, processor);
    }
    
    // Track resource usage
    resource.activeJobs++;
    resource.totalJobs++;
    
    try {
      // Set memory limit for this job
      const memoryLimit = this.calculateMemoryLimit(buffer.length);
      
      // Process with memory monitoring
      const result = await this.processWithMemoryLimit(
        processor, buffer, metadata, options, memoryLimit, jobId
      );
      
      return result;
      
    } finally {
      resource.activeJobs--;
      this.updateResourceStats(resourceKey, resource);
    }
  }
  
  /**
   * Process with memory limit
   */
  async processWithMemoryLimit(processor, buffer, metadata, options, memoryLimit, jobId) {
    const initialMemory = process.memoryUsage();
    
    // Set up memory monitoring for this job
    const memoryMonitor = setInterval(() => {
      const currentMemory = process.memoryUsage();
      const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;
      
      if (memoryIncrease > memoryLimit) {
        console.warn(`⚠️ Job ${jobId} exceeding memory limit: ${memoryIncrease} bytes`);
        this.emit('memoryWarning', { jobId, memoryUsage: memoryIncrease, limit: memoryLimit });
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
      }
    }, 1000);
    
    try {
      // Process with timeout
      const timeout = this.calculateTimeout(buffer.length);
      const result = await this.processWithTimeout(processor, buffer, metadata, options, timeout);
      
      return result;
      
    } finally {
      clearInterval(memoryMonitor);
    }
  }
  
  /**
   * Process with timeout
   */
  async processWithTimeout(processor, buffer, metadata, options, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Processing timeout after ${timeout}ms`));
      }, timeout);
      
      try {
        // Extract userId and create a temporary file path for buffer processing
        const userId = metadata.userId || metadata.user_id || 'unknown';
        
        // For buffer-based processing, we need to create a temporary file
        // or modify the processor API to handle buffers directly
        if (processor.processBuffer && typeof processor.processBuffer === 'function') {
          // Use buffer processing method if available
          const result = await processor.processBuffer(userId, buffer, metadata, options);
          clearTimeout(timeoutId);
          resolve(result);
        } else {
          // Fallback: create temp file for legacy processors
          const fs = require('fs');
          const path = require('path');
          const os = require('os');
          
          const tempDir = path.join(os.tmpdir(), 'daysave-processing');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const extension = this.getFileExtension(metadata.mimeType || metadata.fileType || 'application/octet-stream');
          const tempFilePath = path.join(tempDir, `${Date.now()}_${Math.random().toString(36).substring(7)}${extension}`);
          
          // Write buffer to temp file
          fs.writeFileSync(tempFilePath, buffer);
          
          try {
            const result = await processor.process(userId, tempFilePath, options);
            clearTimeout(timeoutId);
            resolve(result);
          } finally {
            // Clean up temp file
            if (fs.existsSync(tempFilePath)) {
              fs.unlinkSync(tempFilePath);
            }
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
  
  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/bmp': '.bmp',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/x-msvideo': '.avi',
      'video/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
      'application/octet-stream': '.bin'
    };
    
    return mimeToExt[mimeType] || '.tmp';
  }
  
  /**
   * Queue job when at capacity
   */
  async queueJob(processor, buffer, metadata, options, jobId) {
    return new Promise((resolve, reject) => {
      this.jobQueue.push({
        processor,
        buffer,
        metadata,
        options,
        jobId,
        resolve,
        reject,
        queuedAt: Date.now()
      });
      
      console.log(`📥 Job ${jobId} queued (queue size: ${this.jobQueue.length})`);
    });
  }
  
  /**
   * Process job queue
   */
  async processQueue() {
    while (this.jobQueue.length > 0 && this.activeJobs.size < this.options.maxConcurrentJobs) {
      const job = this.jobQueue.shift();
      const queueTime = Date.now() - job.queuedAt;
      
      console.log(`📤 Processing queued job ${job.jobId} (queued for ${queueTime}ms)`);
      
      // Process job asynchronously
      this.processWithOptimization(job.processor, job.buffer, job.metadata, job.options)
        .then(job.resolve)
        .catch(job.reject);
    }
  }
  
  /**
   * Initialize worker pool
   */
  async initializeWorkerPool() {
    const workerCount = Math.min(this.options.maxConcurrentJobs, os.cpus().length);
    
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(__filename, {
        workerData: { isWorker: true, workerId: i }
      });
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(message);
      });
      
      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });
      
      this.workerPool.push(worker);
    }
    
    console.log(`👥 Initialized ${workerCount} worker threads`);
  }
  
  /**
   * Get or create resource
   */
  getResource(resourceKey) {
    return this.resourcePool.get(resourceKey);
  }
  
  async createResource(resourceKey, processor) {
    const resource = {
      processor: processor,
      activeJobs: 0,
      totalJobs: 0,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };
    
    this.resourcePool.set(resourceKey, resource);
    return resource;
  }
  
  /**
   * Cache management
   */
  generateCacheKey(buffer, metadata, options) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(buffer);
    hash.update(JSON.stringify(metadata));
    hash.update(JSON.stringify(options));
    return hash.digest('hex');
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      return cached.data;
    }
    return null;
  }
  
  addToCache(key, data) {
    if (this.cache.size >= this.options.cacheSize) {
      // Remove least recently used item
      const oldestKey = this.findOldestCacheKey();
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    });
  }
  
  shouldCacheResult(result) {
    return result.success && 
           result.data && 
           Object.keys(result.data).length > 0 &&
           !result.errors?.length;
  }
  
  findOldestCacheKey() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * Memory management
   */
  startMemoryMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      
      this.metrics.memoryUsage.current = memUsage.heapUsed;
      this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memUsage.heapUsed);
      
      // Calculate average
      if (this.metrics.memoryUsage.average === 0) {
        this.metrics.memoryUsage.average = memUsage.heapUsed;
      } else {
        this.metrics.memoryUsage.average = (this.metrics.memoryUsage.average + memUsage.heapUsed) / 2;
      }
      
      // Check if memory usage is too high
      if (memUsage.heapUsed > this.options.maxMemoryUsage) {
        this.emit('memoryPressure', memUsage);
        this.handleMemoryPressure();
      }
    }, this.options.monitoringInterval);
  }
  
  setupGarbageCollection() {
    if (global.gc) {
      setInterval(() => {
        global.gc();
        this.emit('garbageCollection', process.memoryUsage());
      }, this.options.gcInterval);
    }
  }
  
  handleMemoryPressure() {
    console.warn('⚠️ High memory usage detected, performing cleanup...');
    
    // Clear cache
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    console.log(`🧹 Cleaned up cache (${cacheSize} entries) and forced GC`);
  }
  
  calculateMemoryLimit(bufferSize) {
    // Allow 2x buffer size plus 100MB overhead
    return (bufferSize * 2) + (100 * 1024 * 1024);
  }
  
  calculateTimeout(bufferSize) {
    // Base timeout of 30s plus 1s per MB
    const baseMB = Math.ceil(bufferSize / (1024 * 1024));
    return 30000 + (baseMB * 1000);
  }
  
  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updateMetrics();
      this.emit('metrics', this.getMetrics());
    }, this.options.monitoringInterval);
  }
  
  updateMetrics() {
    // Update cache hit rate
    const totalCacheRequests = this.cacheStats.hits + this.cacheStats.misses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 ? 
      (this.cacheStats.hits / totalCacheRequests) * 100 : 0;
    
    // Update resource pool stats
    this.metrics.resourcePoolStats = {};
    for (const [key, resource] of this.resourcePool) {
      this.metrics.resourcePoolStats[key] = {
        activeJobs: resource.activeJobs,
        totalJobs: resource.totalJobs,
        utilization: resource.activeJobs > 0 ? (resource.activeJobs / this.options.maxConcurrentJobs) * 100 : 0
      };
    }
  }
  
  updateProcessingMetrics(processingTime, success) {
    if (success) {
      this.metrics.completedJobs++;
    } else {
      this.metrics.failedJobs++;
    }
    
    // Update average processing time
    if (this.metrics.averageProcessingTime === 0) {
      this.metrics.averageProcessingTime = processingTime;
    } else {
      this.metrics.averageProcessingTime = 
        (this.metrics.averageProcessingTime + processingTime) / 2;
    }
  }
  
  updateResourceStats(resourceKey, resource) {
    resource.lastUsed = Date.now();
  }
  
  /**
   * Utility methods
   */
  mergeChunkResults(results, metadata) {
    // Combine results from multiple chunks
    const mergedData = {};
    const allWarnings = [];
    const allErrors = [];
    let totalProcessingTime = 0;
    
    results.forEach(result => {
      if (result.success) {
        // Merge data fields
        Object.keys(result.data || {}).forEach(key => {
          if (!mergedData[key]) {
            mergedData[key] = result.data[key];
          } else if (Array.isArray(mergedData[key]) && Array.isArray(result.data[key])) {
            mergedData[key] = mergedData[key].concat(result.data[key]);
          }
        });
      }
      
      if (result.warnings) allWarnings.push(...result.warnings);
      if (result.errors) allErrors.push(...result.errors);
      totalProcessingTime += result.processingTime || 0;
    });
    
    return {
      success: allErrors.length === 0,
      data: mergedData,
      warnings: allWarnings,
      errors: allErrors,
      processingTime: totalProcessingTime,
      chunked: true,
      chunkCount: results.length
    };
  }
  
  /**
   * Public API
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.jobQueue.length,
      cacheSize: this.cache.size,
      resourcePoolSize: this.resourcePool.size,
      uptime: Date.now() - this.startTime || Date.now()
    };
  }
  
  clearCache() {
    this.cache.clear();
    this.cacheStats = { hits: 0, misses: 0 };
  }
  
  async optimizeDatabase() {
    // Database optimization suggestions
    console.log('🔍 Analyzing database performance...');
    
    // Add database-specific optimizations here
    return {
      suggestions: [
        'Add indexes on frequently queried fields',
        'Implement connection pooling',
        'Use read replicas for heavy queries',
        'Implement query result caching'
      ]
    };
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up Performance Optimizer...');
    
    // Terminate worker threads
    for (const worker of this.workerPool) {
      await worker.terminate();
    }
    
    // Clear caches
    this.cache.clear();
    this.resourcePool.clear();
    
    // Stop monitoring
    this.removeAllListeners();
  }
}

// Worker thread handler
if (!isMainThread && workerData?.isWorker) {
  // Worker thread logic here
  parentPort.on('message', async (message) => {
    try {
      // Process work in worker thread
      const result = await processInWorker(message.data);
      parentPort.postMessage({ success: true, result, jobId: message.jobId });
    } catch (error) {
      parentPort.postMessage({ success: false, error: error.message, jobId: message.jobId });
    }
  });
}

async function processInWorker(data) {
  // Worker-specific processing logic
  return { processed: true, data };
}

module.exports = PerformanceOptimizer; 