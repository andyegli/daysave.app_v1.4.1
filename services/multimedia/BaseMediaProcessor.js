/**
 * BaseMediaProcessor Abstract Class
 * 
 * Defines the common interface contract for all media processors in the DaySave system.
 * This base class provides standardized initialization, validation, progress tracking,
 * error handling, and cleanup patterns that all concrete processors must implement.
 * 
 * @abstract
 * @author DaySave Integration Team
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { OpenAI } = require('openai');

/**
 * Abstract BaseMediaProcessor Class
 * 
 * All media processors (Video, Audio, Image) must extend this base class
 * and implement the required abstract methods.
 */
class BaseMediaProcessor {
  /**
   * Initialize the BaseMediaProcessor
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.openaiApiKey - OpenAI API key
   * @param {string} options.googleApiKey - Google Cloud API key
   * @param {string} options.googleCredentials - Path to Google Cloud credentials
   * @param {boolean} options.enableLogging - Enable detailed logging (default: true)
   * @param {Object} options.config - Processor-specific configuration
   */
  constructor(options = {}) {
    // Abstract class check
    if (new.target === BaseMediaProcessor) {
      throw new Error('BaseMediaProcessor is an abstract class and cannot be instantiated directly');
    }

    this.enableLogging = options.enableLogging !== false;
    this.processorType = this.constructor.name;
    
    // Progress tracking
    this.currentProgress = 0;
    this.progressCallback = options.progressCallback || null;
    
    // Initialize OpenAI client
    if (options.openaiApiKey || process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: options.openaiApiKey || process.env.OPENAI_API_KEY
      });
    }
    
    // Base configuration (to be extended by concrete classes)
    this.config = {
      uploadDir: 'uploads',
      tempDir: 'uploads/temp',
      maxFileSize: 500 * 1024 * 1024, // 500MB
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options.config
    };
    
    // Ensure base directories exist
    this.ensureDirectories();
    
    if (this.enableLogging) {
      console.log(`🔧 ${this.processorType} processor initialized`);
    }
  }

  /**
   * Abstract method: Initialize processor-specific clients and services
   * Concrete classes must implement this method
   * 
   * @abstract
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    throw new Error('initialize() method must be implemented by concrete processor classes');
  }

  /**
   * Abstract method: Process media content
   * Concrete classes must implement this method
   * 
   * @abstract
   * @param {string} userId - User ID
   * @param {string} filePath - Path to the media file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results
   */
  async process(userId, filePath, options = {}) {
    throw new Error('process() method must be implemented by concrete processor classes');
  }

  /**
   * Abstract method: Validate media file
   * Concrete classes must implement this method
   * 
   * @abstract
   * @param {string} filePath - Path to the media file
   * @param {string} fileType - MIME type of the file
   * @returns {Promise<boolean>} Validation result
   */
  async validate(filePath, fileType) {
    throw new Error('validate() method must be implemented by concrete processor classes');
  }

  /**
   * Abstract method: Cleanup processor resources
   * Concrete classes must implement this method
   * 
   * @abstract
   * @param {string} userId - User ID (optional, for user-specific cleanup)
   * @returns {Promise<void>}
   */
  async cleanup(userId = null) {
    throw new Error('cleanup() method must be implemented by concrete processor classes');
  }

  /**
   * Abstract method: Get supported file types
   * Concrete classes must implement this method
   * 
   * @abstract
   * @returns {Array<string>} Array of supported file extensions
   */
  getSupportedTypes() {
    throw new Error('getSupportedTypes() method must be implemented by concrete processor classes');
  }

  /**
   * Abstract method: Get processor capabilities
   * Concrete classes must implement this method
   * 
   * @abstract
   * @returns {Object} Processor capabilities and features
   */
  getCapabilities() {
    throw new Error('getCapabilities() method must be implemented by concrete processor classes');
  }

  /**
   * Ensure required directories exist
   * @protected
   */
  ensureDirectories() {
    const dirs = [
      this.config.uploadDir,
      this.config.tempDir
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Update processing progress
   * @protected
   * @param {number} progress - Progress percentage (0-100)
   * @param {string} message - Progress message
   */
  updateProgress(progress, message = '') {
    this.currentProgress = Math.min(100, Math.max(0, progress));
    
    if (this.progressCallback) {
      this.progressCallback(this.currentProgress, message, this.processorType);
    }
    
    if (this.enableLogging && message) {
      console.log(`📊 ${this.processorType} Progress: ${this.currentProgress}% - ${message}`);
    }
  }

  /**
   * Execute with retry logic
   * @protected
   * @param {Function} operation - Operation to execute
   * @param {string} operationName - Name for logging
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>} Operation result
   */
  async executeWithRetry(operation, operationName = 'operation', maxRetries = this.config.maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.enableLogging && attempt > 1) {
          console.log(`🔄 Retrying ${operationName} (attempt ${attempt}/${maxRetries})`);
        }
        
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          if (this.enableLogging) {
            console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, error);
          }
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }
    
    throw lastError;
  }

  /**
   * Validate file existence and accessibility
   * @protected
   * @param {string} filePath - Path to the file
   * @returns {boolean} File validation result
   */
  validateFile(filePath) {
    try {
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path provided');
      }
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      
      const stats = fs.statSync(filePath);
      
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }
      
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${this.config.maxFileSize})`);
      }
      
      return true;
    } catch (error) {
      if (this.enableLogging) {
        console.error(`❌ File validation failed:`, error);
      }
      throw error;
    }
  }

  /**
   * Generate unique temporary file path
   * @protected
   * @param {string} extension - File extension (with dot)
   * @returns {string} Temporary file path
   */
  generateTempPath(extension = '') {
    const filename = `${this.processorType.toLowerCase()}_${uuidv4()}${extension}`;
    return path.join(this.config.tempDir, filename);
  }

  /**
   * Clean up temporary file
   * @protected
   * @param {string} filePath - Path to temporary file
   */
  cleanupTempFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        if (this.enableLogging) {
          console.log(`🗑️ Cleaned up temp file: ${path.basename(filePath)}`);
        }
      }
    } catch (error) {
      if (this.enableLogging) {
        console.error(`⚠️ Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }

  /**
   * Get file metadata
   * @protected
   * @param {string} filePath - Path to the file
   * @returns {Object} File metadata
   */
  getFileMetadata(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath).toLowerCase(),
        basename: path.basename(filePath),
        dirname: path.dirname(filePath)
      };
    } catch (error) {
      if (this.enableLogging) {
        console.error(`❌ Failed to get file metadata:`, error);
      }
      throw error;
    }
  }

  /**
   * Initialize results object with common structure
   * @protected
   * @param {string} userId - User ID
   * @param {string} filePath - File path
   * @param {string} fileType - File type
   * @returns {Object} Initialized results object
   */
  initializeResults(userId, filePath, fileType) {
    return {
      userId,
      filePath,
      fileType,
      processorType: this.processorType,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      metadata: {
        file: this.getFileMetadata(filePath)
      },
      results: {},
      errors: [],
      warnings: [],
      progress: 0,
      status: 'initialized'
    };
  }

  /**
   * Finalize results object
   * @protected
   * @param {Object} results - Results object to finalize
   * @returns {Object} Finalized results object
   */
  finalizeResults(results) {
    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;
    results.progress = 100;
    results.status = results.errors.length > 0 ? 'completed_with_errors' : 'completed';
    
    if (this.enableLogging) {
      console.log(`✅ ${this.processorType} processing completed in ${results.duration}ms`);
    }
    
    return results;
  }

  /**
   * Add error to results
   * @protected
   * @param {Object} results - Results object
   * @param {Error|string} error - Error to add
   * @param {string} context - Error context
   */
  addError(results, error, context = '') {
    const errorObj = {
      message: error.message || error,
      context,
      timestamp: new Date(),
      processor: this.processorType
    };
    
    results.errors.push(errorObj);
    
    if (this.enableLogging) {
      console.error(`❌ ${this.processorType} Error ${context ? `(${context})` : ''}:`, error);
    }
  }

  /**
   * Add warning to results
   * @protected
   * @param {Object} results - Results object
   * @param {string} message - Warning message
   * @param {string} context - Warning context
   */
  addWarning(results, message, context = '') {
    const warningObj = {
      message,
      context,
      timestamp: new Date(),
      processor: this.processorType
    };
    
    results.warnings.push(warningObj);
    
    if (this.enableLogging) {
      console.warn(`⚠️ ${this.processorType} Warning ${context ? `(${context})` : ''}:`, message);
    }
  }

  /**
   * Log processor information
   * @protected
   * @param {string} message - Log message
   * @param {any} data - Additional data to log
   */
  log(message, data = null) {
    if (this.enableLogging) {
      if (data) {
        console.log(`🔧 ${this.processorType}: ${message}`, data);
      } else {
        console.log(`🔧 ${this.processorType}: ${message}`);
      }
    }
  }
}

module.exports = BaseMediaProcessor; 