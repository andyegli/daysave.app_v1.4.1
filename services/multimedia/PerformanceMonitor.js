/**
 * Performance Monitor for Modular Architecture
 * 
 * This service provides comprehensive performance monitoring including:
 * - Real-time metrics collection and reporting
 * - Performance alerts and thresholds
 * - Historical performance tracking
 * - Resource utilization monitoring
 * - Automatic performance tuning recommendations
 */

const EventEmitter = require('events');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');

class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      metricsInterval: options.metricsInterval || 10000, // 10 seconds (reduced frequency)
      alertThresholds: {
        memoryUsage: options.memoryThreshold || 90, // 90% (more lenient)
        cpuUsage: options.cpuThreshold || 95, // 95% (more lenient)
        processingTime: options.processingTimeThreshold || 60000, // 60 seconds
        errorRate: options.errorRateThreshold || 10, // 10%
        queueSize: options.queueThreshold || 100
      },
      historySize: options.historySize || 1000,
      enableAlerts: options.enableAlerts !== false,
      logLevel: options.logLevel || 'info',
      ...options
    };
    
    // Metrics storage
    this.metrics = {
      system: {
        memory: { used: 0, free: 0, total: 0, percentage: 0 },
        cpu: { usage: 0, cores: os.cpus().length },
        load: { 1: 0, 5: 0, 15: 0 },
        uptime: 0
      },
      application: {
        totalJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        queuedJobs: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        throughput: 0 // jobs per minute
      },
      processors: new Map(),
      cache: {
        hitRate: 0,
        size: 0,
        evictions: 0
      },
      database: {
        connections: 0,
        activeQueries: 0,
        averageQueryTime: 0
      }
    };
    
    // Historical data
    this.history = [];
    this.alerts = [];
    this.lastSnapshot = null;
    
    // Performance baselines
    this.baselines = {
      memoryUsage: 0,
      cpuUsage: 0,
      processingTime: 0,
      throughput: 0
    };
    
    // Alert state tracking
    this.alertStates = new Map();
    
    this.initialize();
  }
  
  /**
   * Initialize performance monitoring
   */
  initialize() {
    console.log('📊 Initializing Performance Monitor...');
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Set up alert monitoring
    if (this.options.enableAlerts) {
      this.startAlertMonitoring();
    }
    
    // Initialize baselines
    this.initializeBaselines();
    
    console.log('✅ Performance Monitor initialized');
  }
  
  /**
   * Start collecting metrics
   */
  startMetricsCollection() {
    const collectMetrics = async () => {
      try {
        await this.collectSystemMetrics();
        await this.collectApplicationMetrics();
        
        // Store snapshot in history
        this.storeSnapshot();
        
        // Emit metrics event
        this.emit('metrics', this.getMetrics());
        
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    };
    
    // Initial collection
    collectMetrics();
    
    // Set up interval
    this.metricsInterval = setInterval(collectMetrics, this.options.metricsInterval);
  }
  
  /**
   * Collect system-level metrics
   */
  async collectSystemMetrics() {
    // Memory metrics
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    this.metrics.system.memory = {
      used: memUsage.heapUsed,
      free: freeMem,
      total: totalMem,
      percentage: ((totalMem - freeMem) / totalMem) * 100,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    };
    
    // CPU metrics
    this.metrics.system.cpu = {
      usage: await this.getCPUUsage(),
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
      processUsage: await this.getProcessCPUUsage() // Separate process-specific CPU usage
    };
    
    // Load average
    const loadAvg = os.loadavg();
    this.metrics.system.load = {
      1: loadAvg[0],
      5: loadAvg[1],
      15: loadAvg[2]
    };
    
    // Uptime
    this.metrics.system.uptime = process.uptime();
  }
  
  /**
   * Get CPU usage percentage using load average (more accurate for system-wide usage)
   */
  async getCPUUsage() {
    // Use OS load average for system-wide CPU usage estimation
    // Load average represents the average load over 1, 5, and 15 minutes
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    
    // Use 1-minute load average and normalize by CPU count
    // Convert to percentage (load of 1.0 = 100% of one CPU core)
    const systemLoad = (loadAvg[0] / cpuCount) * 100;
    
    // Cap at 100% and ensure it's not negative
    return Math.max(0, Math.min(100, systemLoad));
  }

  /**
   * Get Node.js process specific CPU usage (for debugging purposes)
   */
  async getProcessCPUUsage() {
    if (!this.lastCpuUsage) {
      // First call - initialize baseline
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = process.hrtime();
      return 0;
    }

    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = process.hrtime(this.lastCpuTime);
    
    // Update baselines for next measurement
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = process.hrtime();
    
    // Convert to milliseconds
    const totalTime = currentTime[0] * 1000 + currentTime[1] / 1000000;
    const totalCPUTime = (currentUsage.user + currentUsage.system) / 1000;
    
    // Calculate percentage and cap at reasonable values
    const percentage = (totalCPUTime / totalTime) * 100;
    return Math.max(0, Math.min(200, percentage)); // Cap at 200% for multi-core
  }
  
  /**
   * Collect application-level metrics
   */
  async collectApplicationMetrics() {
    // Application metrics are updated by external services
    // Calculate derived metrics
    
    const totalJobs = this.metrics.application.completedJobs + this.metrics.application.failedJobs;
    if (totalJobs > 0) {
      this.metrics.application.errorRate = (this.metrics.application.failedJobs / totalJobs) * 100;
    }
    
    // Calculate throughput (jobs per minute)
    if (this.lastSnapshot) {
      const timeDiff = (Date.now() - this.lastSnapshot.timestamp) / 1000 / 60; // minutes
      const jobDiff = totalJobs - this.lastSnapshot.totalJobs;
      if (timeDiff > 0) {
        this.metrics.application.throughput = jobDiff / timeDiff;
      }
    }
  }
  
  /**
   * Update application metrics from external sources
   */
  updateApplicationMetrics(updates) {
    Object.assign(this.metrics.application, updates);
  }
  
  /**
   * Update processor metrics
   */
  updateProcessorMetrics(processorName, metrics) {
    this.metrics.processors.set(processorName, {
      ...this.metrics.processors.get(processorName),
      ...metrics,
      lastUpdated: Date.now()
    });
  }
  
  /**
   * Update cache metrics
   */
  updateCacheMetrics(cacheMetrics) {
    Object.assign(this.metrics.cache, cacheMetrics);
  }
  
  /**
   * Update database metrics
   */
  updateDatabaseMetrics(dbMetrics) {
    Object.assign(this.metrics.database, dbMetrics);
  }
  
  /**
   * Store snapshot in history
   */
  storeSnapshot() {
    const snapshot = {
      timestamp: Date.now(),
      ...JSON.parse(JSON.stringify(this.metrics)),
      totalJobs: this.metrics.application.completedJobs + this.metrics.application.failedJobs
    };
    
    this.history.push(snapshot);
    this.lastSnapshot = snapshot;
    
    // Limit history size
    if (this.history.length > this.options.historySize) {
      this.history.shift();
    }
  }
  
  /**
   * Start alert monitoring
   */
  startAlertMonitoring() {
    const checkAlerts = () => {
      this.checkMemoryAlerts();
      this.checkCPUAlerts();
      this.checkProcessingTimeAlerts();
      this.checkErrorRateAlerts();
      this.checkQueueAlerts();
    };
    
    // Check alerts on each metrics collection
    this.on('metrics', checkAlerts);
  }
  
  /**
   * Check memory usage alerts
   */
  checkMemoryAlerts() {
    const memoryPercentage = this.metrics.system.memory.percentage;
    const threshold = this.options.alertThresholds.memoryUsage;
    
    if (memoryPercentage > threshold) {
      this.triggerAlert('memory_high', {
        current: memoryPercentage,
        threshold,
        severity: memoryPercentage > threshold * 1.2 ? 'critical' : 'warning'
      });
    } else {
      this.clearAlert('memory_high');
    }
  }
  
  /**
   * Check CPU usage alerts
   */
  checkCPUAlerts() {
    const cpuUsage = this.metrics.system.cpu.usage;
    const threshold = this.options.alertThresholds.cpuUsage;
    
    if (cpuUsage > threshold) {
      this.triggerAlert('cpu_high', {
        current: cpuUsage,
        threshold,
        severity: cpuUsage > threshold * 1.2 ? 'critical' : 'warning'
      });
    } else {
      this.clearAlert('cpu_high');
    }
  }
  
  /**
   * Check processing time alerts
   */
  checkProcessingTimeAlerts() {
    const avgProcessingTime = this.metrics.application.averageProcessingTime;
    const threshold = this.options.alertThresholds.processingTime;
    
    if (avgProcessingTime > threshold) {
      this.triggerAlert('processing_slow', {
        current: avgProcessingTime,
        threshold,
        severity: avgProcessingTime > threshold * 1.5 ? 'critical' : 'warning'
      });
    } else {
      this.clearAlert('processing_slow');
    }
  }
  
  /**
   * Check error rate alerts
   */
  checkErrorRateAlerts() {
    const errorRate = this.metrics.application.errorRate;
    const threshold = this.options.alertThresholds.errorRate;
    
    if (errorRate > threshold) {
      this.triggerAlert('error_rate_high', {
        current: errorRate,
        threshold,
        severity: errorRate > threshold * 2 ? 'critical' : 'warning'
      });
    } else {
      this.clearAlert('error_rate_high');
    }
  }
  
  /**
   * Check queue size alerts
   */
  checkQueueAlerts() {
    const queueSize = this.metrics.application.queuedJobs;
    const threshold = this.options.alertThresholds.queueSize;
    
    if (queueSize > threshold) {
      this.triggerAlert('queue_large', {
        current: queueSize,
        threshold,
        severity: queueSize > threshold * 2 ? 'critical' : 'warning'
      });
    } else {
      this.clearAlert('queue_large');
    }
  }
  
  /**
   * Trigger an alert
   */
  triggerAlert(alertType, details) {
    const existingAlert = this.alertStates.get(alertType);
    
    if (!existingAlert || existingAlert.severity !== details.severity) {
      const alert = {
        type: alertType,
        timestamp: Date.now(),
        ...details
      };
      
      this.alertStates.set(alertType, alert);
      this.alerts.push(alert);
      
      // Limit alerts history
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
      
      this.emit('alert', alert);
      this.logAlert(alert);
    }
  }
  
  /**
   * Clear an alert
   */
  clearAlert(alertType) {
    if (this.alertStates.has(alertType)) {
      const clearedAlert = {
        type: alertType,
        timestamp: Date.now(),
        severity: 'resolved'
      };
      
      this.alertStates.delete(alertType);
      this.alerts.push(clearedAlert);
      
      this.emit('alertResolved', clearedAlert);
    }
  }
  
  /**
   * Log alert
   */
  logAlert(alert) {
    const severity = alert.severity.toUpperCase();
    const message = `${severity} ALERT: ${alert.type} - Current: ${alert.current}, Threshold: ${alert.threshold}`;
    
    switch (alert.severity) {
      case 'critical':
        console.error(`🚨 ${message}`);
        break;
      case 'warning':
        console.warn(`⚠️ ${message}`);
        break;
      default:
        console.info(`ℹ️ ${message}`);
    }
  }
  
  /**
   * Initialize performance baselines
   */
  async initializeBaselines() {
    // Collect baseline metrics over initial period
    setTimeout(async () => {
      const recentHistory = this.history.slice(-10); // Last 10 snapshots
      
      if (recentHistory.length > 0) {
        this.baselines.memoryUsage = this.calculateAverage(recentHistory, 'system.memory.percentage');
        this.baselines.cpuUsage = this.calculateAverage(recentHistory, 'system.cpu.usage');
        this.baselines.processingTime = this.calculateAverage(recentHistory, 'application.averageProcessingTime');
        this.baselines.throughput = this.calculateAverage(recentHistory, 'application.throughput');
        
        console.log('📊 Performance baselines established:', this.baselines);
      }
    }, 60000); // After 1 minute
  }
  
  /**
   * Calculate average from history
   */
  calculateAverage(history, path) {
    const values = history.map(snapshot => this.getNestedValue(snapshot, path)).filter(v => v != null);
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }
  
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }
  
  /**
   * Generate performance report
   */
  generateReport(timeRange = 3600000) { // 1 hour default
    const now = Date.now();
    const relevantHistory = this.history.filter(snapshot => 
      now - snapshot.timestamp <= timeRange
    );
    
    if (relevantHistory.length === 0) {
      return { error: 'No data available for the specified time range' };
    }
    
    const report = {
      timeRange: `${timeRange / 1000 / 60} minutes`,
      dataPoints: relevantHistory.length,
      summary: {
        memory: {
          average: this.calculateAverage(relevantHistory, 'system.memory.percentage'),
          peak: Math.max(...relevantHistory.map(s => s.system.memory.percentage)),
          trend: this.calculateTrend(relevantHistory, 'system.memory.percentage')
        },
        cpu: {
          average: this.calculateAverage(relevantHistory, 'system.cpu.usage'),
          peak: Math.max(...relevantHistory.map(s => s.system.cpu.usage)),
          trend: this.calculateTrend(relevantHistory, 'system.cpu.usage')
        },
        application: {
          totalJobs: relevantHistory[relevantHistory.length - 1]?.totalJobs || 0,
          averageProcessingTime: this.calculateAverage(relevantHistory, 'application.averageProcessingTime'),
          errorRate: this.calculateAverage(relevantHistory, 'application.errorRate'),
          throughput: this.calculateAverage(relevantHistory, 'application.throughput')
        }
      },
      recommendations: this.generateRecommendations(relevantHistory),
      alerts: this.alerts.filter(alert => now - alert.timestamp <= timeRange)
    };
    
    return report;
  }
  
  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  calculateTrend(history, path) {
    if (history.length < 2) return 0;
    
    const values = history.map(snapshot => this.getNestedValue(snapshot, path));
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100; // Percentage change
  }
  
  /**
   * Generate performance recommendations
   */
  generateRecommendations(history) {
    const recommendations = [];
    
    // Memory recommendations
    const avgMemory = this.calculateAverage(history, 'system.memory.percentage');
    if (avgMemory > 70) {
      recommendations.push({
        category: 'memory',
        priority: avgMemory > 85 ? 'high' : 'medium',
        message: 'Consider increasing available memory or optimizing memory usage',
        details: `Average memory usage: ${avgMemory.toFixed(1)}%`
      });
    }
    
    // CPU recommendations
    const avgCPU = this.calculateAverage(history, 'system.cpu.usage');
    if (avgCPU > 70) {
      recommendations.push({
        category: 'cpu',
        priority: avgCPU > 85 ? 'high' : 'medium',
        message: 'Consider scaling horizontally or optimizing CPU-intensive operations',
        details: `Average CPU usage: ${avgCPU.toFixed(1)}%`
      });
    }
    
    // Processing time recommendations
    const avgProcessingTime = this.calculateAverage(history, 'application.averageProcessingTime');
    if (avgProcessingTime > 15000) { // 15 seconds
      recommendations.push({
        category: 'performance',
        priority: avgProcessingTime > 30000 ? 'high' : 'medium',
        message: 'Processing times are higher than optimal - consider optimization',
        details: `Average processing time: ${(avgProcessingTime / 1000).toFixed(1)} seconds`
      });
    }
    
    // Throughput recommendations
    const avgThroughput = this.calculateAverage(history, 'application.throughput');
    if (avgThroughput < 1) { // Less than 1 job per minute
      recommendations.push({
        category: 'throughput',
        priority: 'medium',
        message: 'Low throughput detected - consider parallel processing improvements',
        details: `Average throughput: ${avgThroughput.toFixed(2)} jobs/minute`
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      processors: Object.fromEntries(this.metrics.processors),
      timestamp: Date.now()
    };
  }
  
  /**
   * Get alerts
   */
  getAlerts() {
    return {
      active: Array.from(this.alertStates.values()),
      recent: this.alerts.slice(-10),
      total: this.alerts.length
    };
  }
  
  /**
   * Get historical data
   */
  getHistory(limit = 100) {
    return this.history.slice(-limit);
  }
  
  /**
   * Reset metrics
   */
  reset() {
    this.metrics.application = {
      totalJobs: 0,
      activeJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      queuedJobs: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      throughput: 0
    };
    
    this.history = [];
    this.alerts = [];
    this.alertStates.clear();
  }
  
  /**
   * Cleanup
   */
  async cleanup() {
    console.log('🧹 Cleaning up Performance Monitor...');
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.removeAllListeners();
  }
}

module.exports = PerformanceMonitor; 