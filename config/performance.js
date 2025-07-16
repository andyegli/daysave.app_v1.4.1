/**
 * Performance Configuration
 * 
 * This file contains configuration settings for the performance optimization
 * and monitoring systems in the modular architecture.
 */

const os = require('os');

module.exports = {
  // Performance Optimizer Settings
  optimizer: {
    // Memory management
    maxMemoryUsage: process.env.MAX_MEMORY_USAGE || 512 * 1024 * 1024, // 512MB default
    
    // Concurrency settings
    maxConcurrentJobs: process.env.MAX_CONCURRENT_JOBS || Math.min(os.cpus().length, 4),
    
    // Caching settings
    cacheSize: process.env.CACHE_SIZE || 100,
    
    // Garbage collection
    gcInterval: process.env.GC_INTERVAL || 30000, // 30 seconds
    
    // File streaming threshold
    streamThreshold: process.env.STREAM_THRESHOLD || 50 * 1024 * 1024, // 50MB
    
    // Worker threads
    enableWorkerThreads: process.env.ENABLE_WORKER_THREADS !== 'false',
    
    // Clustering
    enableClustering: process.env.ENABLE_CLUSTERING === 'true',
    
    // Monitoring interval
    monitoringInterval: process.env.MONITORING_INTERVAL || 5000, // 5 seconds
  },
  
  // Performance Monitor Settings
  monitor: {
    // Metrics collection interval
    metricsInterval: process.env.METRICS_INTERVAL || 5000, // 5 seconds
    
    // Alert thresholds
    alertThresholds: {
      memoryUsage: parseInt(process.env.MEMORY_ALERT_THRESHOLD) || 80, // 80%
      cpuUsage: parseInt(process.env.CPU_ALERT_THRESHOLD) || 85, // 85%
      processingTime: parseInt(process.env.PROCESSING_TIME_THRESHOLD) || 30000, // 30 seconds
      errorRate: parseInt(process.env.ERROR_RATE_THRESHOLD) || 5, // 5%
      queueSize: parseInt(process.env.QUEUE_SIZE_THRESHOLD) || 50
    },
    
    // History settings
    historySize: process.env.HISTORY_SIZE || 1000,
    
    // Alerting
    enableAlerts: process.env.ENABLE_ALERTS !== 'false',
    
    // Logging
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  
  // Database Performance Settings
  database: {
    // Connection pooling
    connectionPool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 30000,
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
    },
    
    // Query optimization
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1 second
    
    // Batch operations
    batchSize: parseInt(process.env.DB_BATCH_SIZE) || 100
  },
  
  // Cache Configuration
  cache: {
    // Redis settings (if using Redis)
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      ttl: parseInt(process.env.REDIS_TTL) || 3600 // 1 hour default
    },
    
    // Memory cache settings
    memory: {
      enabled: process.env.MEMORY_CACHE_ENABLED !== 'false',
      maxSize: parseInt(process.env.MEMORY_CACHE_SIZE) || 100,
      ttl: parseInt(process.env.MEMORY_CACHE_TTL) || 3600 // 1 hour default
    }
  },
  
  // Feature toggles for performance features
  features: {
    // Performance optimization features
    enablePerformanceOptimization: process.env.ENABLE_PERFORMANCE_OPTIMIZATION !== 'false',
    enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING !== 'false',
    
    // Specific optimizations
    enableResultCaching: process.env.ENABLE_RESULT_CACHING !== 'false',
    enableStreamProcessing: process.env.ENABLE_STREAM_PROCESSING !== 'false',
    enableConcurrentProcessing: process.env.ENABLE_CONCURRENT_PROCESSING !== 'false',
    
    // Advanced features
    enableAutoScaling: process.env.ENABLE_AUTO_SCALING === 'true',
    enablePredictiveScaling: process.env.ENABLE_PREDICTIVE_SCALING === 'true'
  },
  
  // Auto-scaling settings (if enabled)
  autoScaling: {
    // CPU-based scaling
    cpuScaleUpThreshold: parseInt(process.env.CPU_SCALE_UP_THRESHOLD) || 70,
    cpuScaleDownThreshold: parseInt(process.env.CPU_SCALE_DOWN_THRESHOLD) || 30,
    
    // Memory-based scaling
    memoryScaleUpThreshold: parseInt(process.env.MEMORY_SCALE_UP_THRESHOLD) || 80,
    memoryScaleDownThreshold: parseInt(process.env.MEMORY_SCALE_DOWN_THRESHOLD) || 40,
    
    // Queue-based scaling
    queueScaleUpThreshold: parseInt(process.env.QUEUE_SCALE_UP_THRESHOLD) || 20,
    queueScaleDownThreshold: parseInt(process.env.QUEUE_SCALE_DOWN_THRESHOLD) || 5,
    
    // Scaling limits
    minInstances: parseInt(process.env.MIN_INSTANCES) || 1,
    maxInstances: parseInt(process.env.MAX_INSTANCES) || 10,
    
    // Scaling behavior
    scaleUpCooldown: parseInt(process.env.SCALE_UP_COOLDOWN) || 300000, // 5 minutes
    scaleDownCooldown: parseInt(process.env.SCALE_DOWN_COOLDOWN) || 600000 // 10 minutes
  },
  
  // Development and debugging settings
  development: {
    // Enable detailed performance logging
    enableDetailedLogging: process.env.NODE_ENV === 'development',
    
    // Enable performance profiling
    enableProfiling: process.env.ENABLE_PROFILING === 'true',
    
    // Enable performance testing hooks
    enableTestingHooks: process.env.NODE_ENV === 'test'
  },
  
  // Production optimizations
  production: {
    // Enable all performance optimizations in production
    enableAllOptimizations: process.env.NODE_ENV === 'production',
    
    // Aggressive memory management
    aggressiveGC: process.env.NODE_ENV === 'production',
    
    // Disable debug features
    disableDebugFeatures: process.env.NODE_ENV === 'production'
  }
};

// Helper function to get environment-specific configuration
function getEnvironmentConfig() {
  const config = module.exports;
  const env = process.env.NODE_ENV || 'development';
  
  // Apply environment-specific overrides
  switch (env) {
    case 'production':
      return {
        ...config,
        optimizer: {
          ...config.optimizer,
          maxConcurrentJobs: Math.min(os.cpus().length, 8), // More aggressive in production
          gcInterval: 15000, // More frequent GC
          monitoringInterval: 10000 // Less frequent monitoring to reduce overhead
        },
        monitor: {
          ...config.monitor,
          metricsInterval: 10000,
          historySize: 500 // Smaller history in production
        }
      };
      
    case 'test':
      return {
        ...config,
        optimizer: {
          ...config.optimizer,
          maxConcurrentJobs: 2, // Limited concurrency for testing
          cacheSize: 10, // Smaller cache for testing
          enableWorkerThreads: false // Disable for simpler testing
        },
        monitor: {
          ...config.monitor,
          enableAlerts: false, // No alerts during testing
          metricsInterval: 1000 // Faster metrics for testing
        }
      };
      
    default: // development
      return config;
  }
}

// Export environment-specific configuration
module.exports = getEnvironmentConfig(); 