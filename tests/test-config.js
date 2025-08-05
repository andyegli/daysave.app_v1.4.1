/**
 * Test Configuration
 * 
 * Configuration for different test environments and scenarios
 */

module.exports = {
  // Test environments
  environments: {
    development: {
      timeouts: {
        short: 30000,      // 30 seconds
        medium: 60000,     // 1 minute
        long: 180000,      // 3 minutes
        extended: 300000   // 5 minutes
      },
      maxConcurrentTests: 1,
      skipSlowTests: false,
      enableDetailedLogging: true
    },
    
    staging: {
      timeouts: {
        short: 45000,      // 45 seconds
        medium: 90000,     // 1.5 minutes
        long: 240000,      // 4 minutes
        extended: 420000   // 7 minutes
      },
      maxConcurrentTests: 2,
      skipSlowTests: false,
      enableDetailedLogging: true
    },
    
    production: {
      timeouts: {
        short: 60000,      // 1 minute
        medium: 120000,    // 2 minutes
        long: 300000,      // 5 minutes
        extended: 600000   // 10 minutes
      },
      maxConcurrentTests: 3,
      skipSlowTests: true,
      enableDetailedLogging: false
    }
  },

  // Test content URLs for different scenarios
  testContent: {
    reliable: {
      // Known working URLs for consistent testing
      youtube: {
        short: 'https://www.youtube.com/shorts/P8LeyCTibms',
        medium: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        long: 'https://www.youtube.com/watch?v=kyphLGnSz6Q'
      },
      facebook: {
        video: 'https://www.facebook.com/share/v/1CVGdGppmi/',
        reel: 'https://www.facebook.com/share/r/1E4xcMSJYQ/'
      }
    },
    
    edge_cases: {
      // URLs for testing edge cases
      private: 'https://www.youtube.com/watch?v=private-video-id',
      invalid: 'https://invalid-url-that-does-not-exist.com/video/123',
      timeout: 'https://very-slow-loading-content.example.com/video'
    },
    
    platforms: {
      // Platform-specific test content
      youtube: [
        'https://www.youtube.com/shorts/P8LeyCTibms',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      ],
      facebook: [
        'https://www.facebook.com/share/v/1CVGdGppmi/',
        'https://www.facebook.com/share/v/1D7YKBHJx9/'
      ],
      instagram: [
        'https://www.instagram.com/reel/DMPtr24vjNr/'
      ],
      tiktok: [
        'https://www.tiktok.com/@user/video/example'
      ],
      vimeo: [
        'https://vimeo.com/169599296'
      ]
    }
  },

  // Feature validation criteria
  validation: {
    transcription: {
      minLength: 10,
      maxLength: 500000,
      requiredLanguages: ['en'],
      qualityThresholds: {
        wordCount: 5,
        sentenceCount: 1
      }
    },
    
    summary: {
      minLength: 50,
      maxLength: 5000,
      qualityThresholds: {
        sentenceCount: 2,
        wordCount: 20
      }
    },
    
    title: {
      minLength: 10,
      maxLength: 200,
      qualityThresholds: {
        wordCount: 3,
        hasCapitalization: true
      }
    },
    
    tags: {
      minCount: 1,
      maxCount: 20,
      qualityThresholds: {
        relevantTags: 0.7 // 70% of tags should be relevant
      }
    },
    
    thumbnails: {
      minCount: 1,
      maxCount: 10,
      requiredFormats: ['jpg', 'jpeg', 'png'],
      minSize: 1024, // 1KB
      maxSize: 5242880 // 5MB
    }
  },

  // Performance benchmarks
  performance: {
    targets: {
      // Processing time targets by content type
      youtube_short: 45000,    // 45 seconds
      youtube_medium: 90000,   // 1.5 minutes
      youtube_long: 180000,    // 3 minutes
      facebook_video: 60000,   // 1 minute
      instagram_reel: 45000,   // 45 seconds
      document: 30000,         // 30 seconds
      image: 15000            // 15 seconds
    },
    
    memory: {
      maxHeapUsage: 512 * 1024 * 1024, // 512MB
      maxRSS: 1024 * 1024 * 1024       // 1GB
    },
    
    concurrent: {
      maxConcurrentProcessing: 5,
      queueTimeout: 300000 // 5 minutes
    }
  },

  // Error scenarios to test
  errorScenarios: {
    network: {
      timeout: 'Network timeout during download',
      connectionRefused: 'Connection refused',
      dns: 'DNS resolution failed'
    },
    
    content: {
      unavailable: 'Content no longer available',
      private: 'Content is private',
      geoblocked: 'Content not available in region',
      format: 'Unsupported content format'
    },
    
    processing: {
      transcription: 'Speech-to-text service failed',
      vision: 'Computer vision service failed',
      storage: 'File storage service failed',
      database: 'Database operation failed'
    }
  },

  // Test data cleanup
  cleanup: {
    retainSuccessfulTests: false,
    retainFailedTests: true,
    maxTestDataAge: 24 * 60 * 60 * 1000, // 24 hours
    cleanupOnExit: true
  }
};