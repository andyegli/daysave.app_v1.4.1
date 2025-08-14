const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { AdminSetting } = require('../models');
const StorageUsageTracker = require('./storageUsageTracker');

/**
 * FileUploadService
 * 
 * Handles file uploads with Google Cloud Storage integration
 * and admin-configurable validation settings
 */
class FileUploadService {
  constructor() {
    this.initializeStorage();
    this.storageTracker = new StorageUsageTracker();
    this.defaultSettings = {
      maxFileSize: 25 * 1024 * 1024, // 25MB default
      allowedFileTypes: [
        // Images
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
        'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff',
        // Audio
        'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a', 
        'audio/aac', 'audio/ogg', 'audio/flac', 'audio/wma',
        // Video
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 
        'video/flv', 'video/webm', 'video/mkv',
        // Documents
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ],
      bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'daysave-v141-2-uploads'
    };
  }

  /**
   * Initialize Google Cloud Storage
   */
  initializeStorage() {
    try {
      // Check if we have minimum Google Cloud configuration
      const hasProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID && process.env.GOOGLE_CLOUD_PROJECT_ID.trim();
      const hasBucket = process.env.GOOGLE_CLOUD_STORAGE_BUCKET && process.env.GOOGLE_CLOUD_STORAGE_BUCKET.trim();
      const hasCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      
      if (!hasProjectId || !hasBucket) {
        console.log('📁 Using local storage (Google Cloud not configured)');
        console.log('💡 To enable Google Cloud Storage, set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_STORAGE_BUCKET in .env');
        this.storage = null;
        return;
      }

      if (!hasCredentials) {
        console.log('📁 Using local storage (Google Cloud credentials not configured)');
        console.log('💡 To enable Google Cloud Storage, set GOOGLE_APPLICATION_CREDENTIALS in .env');
        this.storage = null;
        return;
      }

      const storageOptions = {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      };

      try {
        this.storage = new Storage(storageOptions);
        console.log('✅ Google Cloud Storage initialized with project:', process.env.GOOGLE_CLOUD_PROJECT_ID);
        
        // Test connection (but don't fail if it doesn't work)
        this.testGCSConnection();
      } catch (storageError) {
        console.log('⚠️ Google Cloud Storage initialization failed, using local storage:', storageError.message);
        console.log('💡 Check your GOOGLE_APPLICATION_CREDENTIALS file path and permissions');
        this.storage = null;
      }
    } catch (error) {
      console.error('❌ Error initializing Google Cloud Storage, falling back to local storage:', error.message);
      this.storage = null;
    }
  }

  /**
   * Test Google Cloud Storage connection without throwing errors
   */
  async testGCSConnection() {
    try {
      if (!this.storage) return;
      
      const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
      const bucket = this.storage.bucket(bucketName);
      
      // Test if bucket exists and is accessible
      const [exists] = await bucket.exists();
      if (exists) {
        console.log('✅ Google Cloud Storage bucket accessible:', bucketName);
      } else {
        console.log('⚠️ Google Cloud Storage bucket not found:', bucketName);
        console.log('💡 Create the bucket in Google Cloud Console or check permissions');
      }
    } catch (error) {
      console.log('⚠️ Google Cloud Storage connection test failed:', error.message);
      console.log('💡 App will continue using local storage for file uploads');
    }
  }

  /**
   * Get MIME type for a file
   * @param {string} filePath - Path to the file
   * @returns {string} - MIME type
   */
  static async getMimeType(filePath) {
    const path = require('path');
    const mime = require('mime-types');
    
    // Get MIME type from file extension
    const mimeType = mime.lookup(filePath);
    
    if (mimeType) {
      return mimeType;
    }
    
    // Fallback based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Get current upload settings from admin configuration
   */
  async getUploadSettings() {
    try {
      const settings = await AdminSetting.findOne({
        where: { user_id: null } // Global settings
      });

      if (settings) {
        return {
          maxFileSize: parseInt(settings.max_file_size) || this.defaultSettings.maxFileSize,
          allowedFileTypes: settings.file_types ? settings.file_types.split(',') : this.defaultSettings.allowedFileTypes,
          bucketName: this.defaultSettings.bucketName
        };
      }

      return this.defaultSettings;
    } catch (error) {
      console.error('Error fetching upload settings:', error);
      return this.defaultSettings;
    }
  }

  /**
   * Create multer upload middleware with admin-configurable settings
   */
  async createUploadMiddleware() {
    const settings = await this.getUploadSettings();

    const storage = multer.memoryStorage(); // Use memory storage for cloud uploads

    return multer({
      storage,
      limits: {
        fileSize: settings.maxFileSize,
        files: 10 // Max 10 files at once
      },
      fileFilter: async (req, file, cb) => {
        try {
          // Re-fetch settings for each file (in case they changed)
          const currentSettings = await this.getUploadSettings();
          
          // Check file type
          const isAllowed = currentSettings.allowedFileTypes.includes(file.mimetype);
          
          if (!isAllowed) {
            // Try to detect from extension as fallback
            const ext = path.extname(file.originalname).toLowerCase();
            const extToMime = {
              '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', 
              '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp',
              '.svg': 'image/svg+xml', '.tiff': 'image/tiff', '.tif': 'image/tiff',
              '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/m4a',
              '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.flac': 'audio/flac',
              '.wma': 'audio/wma', '.mp4': 'video/mp4', '.avi': 'video/avi',
              '.mov': 'video/mov', '.wmv': 'video/wmv', '.flv': 'video/flv',
              '.webm': 'video/webm', '.mkv': 'video/mkv', '.pdf': 'application/pdf',
              '.txt': 'text/plain', '.csv': 'text/csv', '.doc': 'application/msword',
              '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };

            if (extToMime[ext] && currentSettings.allowedFileTypes.includes(extToMime[ext])) {
              file.mimetype = extToMime[ext];
              return cb(null, true);
            }

            return cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${currentSettings.allowedFileTypes.join(', ')}`), false);
          }

          cb(null, true);
        } catch (error) {
          cb(error, false);
        }
      }
    });
  }

  /**
   * Upload file to Google Cloud Storage or local storage
   */
  async uploadFile(file, userId, options = {}) {
    const fileId = uuidv4();
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    const fileName = `${userId}/${timestamp}_${fileId}${extension}`;

    // Ensure userId is passed to storage methods for tracking
    const uploadOptions = {
      ...options,
      userId: userId,
      fileId: fileId,
      uploadStartTime: Date.now()
    };

    // Try Google Cloud Storage first if available
    if (this.storage) {
      try {
        console.log('📤 Attempting Google Cloud Storage upload for:', file.originalname);
        return await this.uploadToCloudStorage(file, fileName, uploadOptions);
      } catch (gcsError) {
        console.log('⚠️ Google Cloud Storage upload failed, falling back to local storage:', gcsError.message);
        // Fallback to local storage
        try {
          return await this.uploadToLocalStorage(file, fileName, uploadOptions);
        } catch (localError) {
          console.error('❌ Both Google Cloud Storage and local storage failed:', localError.message);
          throw new Error(`Upload failed: ${localError.message}`);
        }
      }
    } else {
      // Use local storage directly
      try {
        console.log('📁 Using local storage for:', file.originalname);
        return await this.uploadToLocalStorage(file, fileName, uploadOptions);
      } catch (localError) {
        console.error('❌ Local storage upload failed:', localError.message);
        throw new Error(`Upload failed: ${localError.message}`);
      }
    }
  }

  /**
   * Upload to Google Cloud Storage
   */
  async uploadToCloudStorage(file, fileName, options = {}) {
    const settings = await this.getUploadSettings();
    const bucket = this.storage.bucket(settings.bucketName);
    const gcsFile = bucket.file(fileName);

    const stream = gcsFile.createWriteStream({
      metadata: {
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...options.metadata
        }
      },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('Upload stream error:', error);
        reject(error);
      });

      stream.on('finish', async () => {
        try {
          // Make file publicly readable if specified
          if (options.makePublic) {
            await gcsFile.makePublic();
          }

          const publicUrl = options.makePublic 
            ? `https://storage.googleapis.com/${settings.bucketName}/${fileName}`
            : null;

          const uploadResult = {
            fileName,
            filePath: `gs://${settings.bucketName}/${fileName}`,
            publicUrl,
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname,
            storage: 'gcs'
          };

          // Track storage usage if user info is provided
          if (options.userId) {
            try {
              await this.storageTracker.trackFileUpload({
                userId: options.userId,
                filePath: uploadResult.filePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                contentId: options.contentId || null,
                fileId: options.fileId || null,
                processingJobId: options.processingJobId || null,
                storageProvider: 'google_cloud_storage',
                bucketName: settings.bucketName,
                storageClass: 'standard', // Default to standard class
                sessionId: options.sessionId || null,
                uploadDurationMs: options.uploadStartTime ? Date.now() - options.uploadStartTime : null,
                metadata: {
                  originalFileName: file.originalname,
                  uploadMethod: 'web_interface',
                  fileCategory: this.storageTracker.getFileTypeFromMimeType(file.mimetype),
                  makePublic: options.makePublic || false
                }
              });
            } catch (trackingError) {
              console.warn('Failed to track storage usage for upload:', trackingError.message);
              // Don't fail the upload due to tracking issues
            }
          }

          resolve(uploadResult);
        } catch (error) {
          reject(error);
        }
      });

      stream.end(file.buffer);
    });
  }

  /**
   * Upload to local storage (fallback)
   */
  async uploadToLocalStorage(file, fileName, options = {}) {
    const uploadsDir = path.join(__dirname, '../uploads');
    const filePath = path.join(uploadsDir, fileName);
    const directory = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    const uploadResult = {
      fileName,
      filePath: `/uploads/${fileName}`,
      publicUrl: `/uploads/${fileName}`,
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
      storage: 'local'
    };

    // Track storage usage for local storage if user info is provided
    if (options.userId) {
      try {
        await this.storageTracker.trackFileUpload({
          userId: options.userId,
          filePath: uploadResult.filePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          contentId: options.contentId || null,
          fileId: options.fileId || null,
          processingJobId: options.processingJobId || null,
          storageProvider: 'local',
          bucketName: null,
          storageClass: 'standard',
          sessionId: options.sessionId || null,
          uploadDurationMs: options.uploadStartTime ? Date.now() - options.uploadStartTime : null,
          metadata: {
            originalFileName: file.originalname,
            uploadMethod: 'web_interface',
            fileCategory: this.storageTracker.getFileTypeFromMimeType(file.mimetype),
            localPath: filePath
          }
        });
      } catch (trackingError) {
        console.warn('Failed to track storage usage for local upload:', trackingError.message);
        // Don't fail the upload due to tracking issues
      }
    }

    return uploadResult;
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath) {
    try {
      if (filePath.startsWith('gs://')) {
        // Delete from Google Cloud Storage
        // Extract bucket name and object path from the full GCS URL
        const gcsPath = filePath.replace('gs://', '');
        const [bucketName, ...pathParts] = gcsPath.split('/');
        const objectName = pathParts.join('/');
        
        console.log(`🗑️ Deleting GCS file: bucket="${bucketName}", object="${objectName}"`);
        
        if (!bucketName || !objectName) {
          throw new Error(`Invalid GCS path format: ${filePath}`);
        }
        
        if (!this.storage) {
          throw new Error('Google Cloud Storage not initialized');
        }
        
        const bucket = this.storage.bucket(bucketName);
        await bucket.file(objectName).delete();
        console.log(`✅ Deleted file from GCS: gs://${bucketName}/${objectName}`);
      } else {
        // Delete from local storage
        const localPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`✅ Deleted local file: ${localPath}`);
        } else {
          console.log(`⚠️ Local file not found, skipping: ${localPath}`);
        }
      }
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get file URL for serving - Enhanced with fallback logic
   */
  async getFileUrl(filePath, options = {}) {
    try {
      // Handle GCS URLs (both gs:// and https:// storage.googleapis.com)
      if (filePath.startsWith('gs://') || filePath.includes('storage.googleapis.com')) {
        if (this.storage) {
          try {
            let fileName;
            if (filePath.startsWith('gs://')) {
              fileName = filePath.replace(`gs://${this.defaultSettings.bucketName}/`, '');
            } else {
              // Extract file path from storage.googleapis.com URL
              const urlParts = filePath.split('/');
              const bucketIndex = urlParts.findIndex(part => part === this.defaultSettings.bucketName);
              if (bucketIndex !== -1) {
                fileName = urlParts.slice(bucketIndex + 1).join('/');
              } else {
                throw new Error('Cannot extract file path from GCS URL');
              }
            }

            const settings = await this.getUploadSettings();
            const bucket = this.storage.bucket(settings.bucketName);
            const file = bucket.file(fileName);

            // Check if file exists in GCS
            const [exists] = await file.exists();
            if (exists) {
              const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + (options.expiresIn || 60 * 60 * 1000) // 1 hour default
              });
              return url;
            } else {
              console.warn(`⚠️ File not found in GCS: ${fileName}, attempting local fallback`);
              // Try to find local fallback
              const localFallback = await this.findLocalFallback(fileName);
              if (localFallback) {
                return localFallback;
              }
            }
          } catch (gcsError) {
            console.warn(`⚠️ GCS error for ${filePath}: ${gcsError.message}, attempting local fallback`);
            // Try to find local fallback
            const fileName = filePath.split('/').pop();
            const localFallback = await this.findLocalFallback(fileName);
            if (localFallback) {
              return localFallback;
            }
          }
        } else {
          console.warn('⚠️ GCS not available, attempting local fallback for:', filePath);
          // Extract filename and try local fallback
          const fileName = filePath.split('/').pop();
          const localFallback = await this.findLocalFallback(fileName);
          if (localFallback) {
            return localFallback;
          }
        }
      }

      // Handle GCS file paths (without gs:// or full URL)
      if (!filePath.startsWith('uploads/') && filePath.includes('/')) {
        if (this.storage) {
          try {
            const settings = await this.getUploadSettings();
            const bucket = this.storage.bucket(settings.bucketName);
            const file = bucket.file(filePath);

            // Check if file exists in GCS
            const [exists] = await file.exists();
            if (exists) {
              const [url] = await file.getSignedUrl({
                action: 'read',
                expires: Date.now() + (options.expiresIn || 60 * 60 * 1000)
              });
              return url;
            } else {
              console.warn(`⚠️ GCS file not found: ${filePath}, attempting local fallback`);
              const localFallback = await this.findLocalFallback(path.basename(filePath));
              if (localFallback) {
                return localFallback;
              }
            }
          } catch (gcsError) {
            console.warn(`⚠️ GCS error for ${filePath}: ${gcsError.message}, attempting local fallback`);
            const localFallback = await this.findLocalFallback(path.basename(filePath));
            if (localFallback) {
              return localFallback;
            }
          }
        }
      }

      // Handle local file paths
      const pathParts = filePath.split('/');
      if (pathParts.length >= 2) {
        const userId = pathParts[pathParts.length - 2]; // Second to last part
        const filename = pathParts[pathParts.length - 1]; // Last part
        
        // Return secure file serving URL
        return `/files/serve/${userId}/${filename}`;
      } else {
        // Single filename, try to find user context or use direct path
        return `/files/serve/unknown/${filePath}`;
      }
      
    } catch (error) {
      console.error('Error getting file URL:', error);
      // Final fallback
      const filename = filePath.split('/').pop();
      return `/files/serve/unknown/${filename}`;
    }
  }

  /**
   * Find local fallback file for GCS files
   */
  async findLocalFallback(filename) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      // Common local fallback locations
      const possiblePaths = [
        `uploads/${filename}`,
        `uploads/thumbnails/${filename}`,
        `uploads/temp/${filename}`
      ];
      
      for (const possiblePath of possiblePaths) {
        const fullPath = path.resolve(possiblePath);
        if (fs.existsSync(fullPath)) {
          console.log(`📁 Found local fallback: ${possiblePath} for file: ${filename}`);
          
          // Extract potential user ID from file structure
          const pathParts = possiblePath.split('/');
          if (pathParts.length >= 2) {
            const dir = pathParts[pathParts.length - 2];
            if (dir === 'thumbnails' || dir === 'temp') {
              return `/files/serve/system/${filename}`;
            } else {
              return `/files/serve/${dir}/${filename}`;
            }
          }
          return `/files/serve/system/${filename}`;
        }
      }
      
      // Try to find by searching upload directories
      const uploadBase = path.resolve('uploads');
      if (fs.existsSync(uploadBase)) {
        const found = await this.searchForFile(uploadBase, filename);
        if (found) {
          // Extract user ID from path if possible
          const relativePath = path.relative(uploadBase, found);
          const pathParts = relativePath.split(path.sep);
          if (pathParts.length >= 2) {
            const userId = pathParts[0];
            return `/files/serve/${userId}/${filename}`;
          }
          return `/files/serve/system/${filename}`;
        }
      }
      
    } catch (error) {
      console.error(`Error finding local fallback for ${filename}:`, error);
    }
    
    return null;
  }

  /**
   * Recursively search for a file in directory
   */
  async searchForFile(directory, filename) {
    const fs = require('fs');
    const path = require('path');
    
    try {
      if (!fs.existsSync(directory)) {
        return null;
      }
      
      const items = fs.readdirSync(directory);
      
      for (const item of items) {
        const itemPath = path.join(directory, item);
        
        try {
          const stats = fs.statSync(itemPath);
          
          if (stats.isFile() && item === filename) {
            return itemPath;
          } else if (stats.isDirectory() && !item.startsWith('.')) {
            const found = await this.searchForFile(itemPath, filename);
            if (found) {
              return found;
            }
          }
        } catch (statError) {
          // Skip files we can't stat (permissions, etc.)
          continue;
        }
      }
    } catch (error) {
      // Ignore errors during search
    }
    
    return null;
  }

  /**
   * Validate file before upload
   */
  async validateFile(file) {
    const settings = await this.getUploadSettings();
    const errors = [];

    // Check file size
    if (file.size > settings.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size ${(settings.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
    }

    // Check file type
    if (!settings.allowedFileTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} is not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Download file from Google Cloud Storage for local processing
   * @param {string} bucketName - GCS bucket name
   * @param {string} objectName - Object path in bucket
   * @param {string} localPath - Local file path to save to
   * @returns {Promise<void>}
   */
  async downloadFromGCS(bucketName, objectName, localPath) {
    try {
      if (!this.storage) {
        throw new Error('Google Cloud Storage not initialized');
      }

      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(objectName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File not found in GCS: gs://${bucketName}/${objectName}`);
      }

      // Download file to local path
      await file.download({ destination: localPath });
      
      console.log(`✅ Downloaded gs://${bucketName}/${objectName} to ${localPath}`);
      return { success: true, localPath };
      
    } catch (error) {
      console.error(`❌ GCS download failed:`, error);
      throw error;
    }
  }

  /**
   * Get upload statistics
   */
  async getUploadStats(userId = null) {
    try {
      const { File } = require('../models');
      const whereClause = userId ? { user_id: userId } : {};

      const stats = await File.findAll({
        where: whereClause,
        attributes: [
          [File.sequelize.fn('COUNT', File.sequelize.col('id')), 'totalFiles'],
          [File.sequelize.fn('SUM', File.sequelize.literal('JSON_EXTRACT(metadata, "$.size")')), 'totalSize'],
          [File.sequelize.fn('COUNT', File.sequelize.literal('CASE WHEN file_path LIKE "gs://%" THEN 1 END')), 'cloudFiles'],
          [File.sequelize.fn('COUNT', File.sequelize.literal('CASE WHEN file_path NOT LIKE "gs://%" THEN 1 END')), 'localFiles']
        ],
        raw: true
      });

      return stats[0] || {
        totalFiles: 0,
        totalSize: 0,
        cloudFiles: 0,
        localFiles: 0
      };
    } catch (error) {
      console.error('Error getting upload stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        cloudFiles: 0,
        localFiles: 0
      };
    }
  }
}

module.exports = new FileUploadService(); 