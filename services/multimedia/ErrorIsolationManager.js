/**
 * ErrorIsolationManager - Independent error handling and fault isolation
 * Prevents cascade failures and provides circuit breaker patterns
 */

const EventEmitter = require('events');

class ErrorIsolationManager extends EventEmitter {
    constructor() {
        super();
        this.processors = new Map();
        this.circuitBreakers = new Map();
        this.errorStats = new Map();
        this.recoveryStrategies = new Map();
        this.isolationPolicies = new Map();
        this.healthChecks = new Map();
        this.initialized = false;
    }

    /**
     * Initialize error isolation manager
     */
    async initialize() {
        if (this.initialized) return;

        // Setup default circuit breaker configurations
        this.setupCircuitBreakers();
        
        // Setup recovery strategies
        this.setupRecoveryStrategies();
        
        // Setup isolation policies
        this.setupIsolationPolicies();
        
        // Setup health checks
        this.setupHealthChecks();
        
        // Start monitoring
        this.startMonitoring();
        
        this.initialized = true;
    }

    /**
     * Register a processor with error isolation
     */
    registerProcessor(name, processor, config = {}) {
        const processorConfig = {
            name,
            processor,
            enabled: true,
            lastError: null,
            consecutiveErrors: 0,
            lastSuccess: Date.now(),
            totalRequests: 0,
            totalErrors: 0,
            averageResponseTime: 0,
            responseTimes: [],
            config: {
                maxConsecutiveErrors: config.maxConsecutiveErrors || 5,
                errorThreshold: config.errorThreshold || 0.5, // 50% error rate
                timeWindow: config.timeWindow || 300000, // 5 minutes
                cooldownPeriod: config.cooldownPeriod || 60000, // 1 minute
                retryAttempts: config.retryAttempts || 3,
                retryDelay: config.retryDelay || 1000,
                timeoutMs: config.timeoutMs || 30000,
                enableCircuitBreaker: config.enableCircuitBreaker !== false,
                enableHealthChecks: config.enableHealthChecks !== false,
                ...config
            }
        };

        this.processors.set(name, processorConfig);
        
        // Initialize circuit breaker
        if (processorConfig.config.enableCircuitBreaker) {
            this.initializeCircuitBreaker(name, processorConfig.config);
        }
        
        // Initialize error stats
        this.errorStats.set(name, {
            errors: [],
            successRate: 1.0,
            lastErrorTime: null,
            errorFrequency: 0,
            criticalErrors: 0,
            warningErrors: 0,
            recoveryAttempts: 0,
            lastRecoveryTime: null
        });

        return processorConfig;
    }

    /**
     * Execute processor with error isolation
     */
    async executeWithIsolation(processorName, operation, input, options = {}) {
        const processor = this.processors.get(processorName);
        if (!processor) {
            throw new Error(`Processor ${processorName} not registered`);
        }

        const circuitBreaker = this.circuitBreakers.get(processorName);
        
        // Check circuit breaker state
        if (circuitBreaker && circuitBreaker.state === 'OPEN') {
            if (Date.now() - circuitBreaker.lastFailureTime < processor.config.cooldownPeriod) {
                throw new Error(`Circuit breaker is OPEN for ${processorName}. Service unavailable.`);
            } else {
                // Move to HALF_OPEN state for testing
                circuitBreaker.state = 'HALF_OPEN';
                this.emit('circuitBreakerStateChanged', { processor: processorName, state: 'HALF_OPEN' });
            }
        }

        const startTime = Date.now();
        let attempt = 0;
        let lastError = null;

        while (attempt < processor.config.retryAttempts) {
            try {
                // Execute with timeout
                const result = await this.executeWithTimeout(
                    () => operation.call(processor.processor, input, options),
                    processor.config.timeoutMs
                );

                // Record success
                this.recordSuccess(processorName, Date.now() - startTime);
                
                // Close circuit breaker if it was open
                if (circuitBreaker && circuitBreaker.state !== 'CLOSED') {
                    circuitBreaker.state = 'CLOSED';
                    circuitBreaker.failureCount = 0;
                    this.emit('circuitBreakerStateChanged', { processor: processorName, state: 'CLOSED' });
                }

                return result;

            } catch (error) {
                attempt++;
                lastError = error;
                
                // Classify error
                const errorInfo = this.classifyError(error);
                
                // Record error
                this.recordError(processorName, error, errorInfo);
                
                // Check if we should retry
                if (attempt < processor.config.retryAttempts && errorInfo.retryable) {
                    const delay = this.calculateRetryDelay(attempt, processor.config.retryDelay);
                    await this.sleep(delay);
                    continue;
                }

                // Update circuit breaker
                if (circuitBreaker) {
                    this.updateCircuitBreaker(processorName, error, errorInfo);
                }

                // Attempt recovery if critical error
                if (errorInfo.severity === 'critical') {
                    await this.attemptRecovery(processorName, error, errorInfo);
                }

                break;
            }
        }

        // All retries failed
        const finalError = new Error(`${processorName} failed after ${attempt} attempts: ${lastError.message}`);
        finalError.originalError = lastError;
        finalError.attempts = attempt;
        finalError.processorName = processorName;
        
        throw finalError;
    }

    /**
     * Execute operation with timeout
     */
    async executeWithTimeout(operation, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            Promise.resolve(operation())
                .then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

    /**
     * Classify error type and severity
     */
    classifyError(error) {
        const classification = {
            type: 'unknown',
            severity: 'warning',
            retryable: true,
            category: 'general'
        };

        const message = error.message?.toLowerCase() || '';
        
        // Network errors
        if (message.includes('network') || message.includes('connection') || error.code === 'ECONNREFUSED') {
            classification.type = 'network';
            classification.category = 'connectivity';
            classification.retryable = true;
            classification.severity = 'warning';
        }
        
        // Timeout errors
        else if (message.includes('timeout') || message.includes('timed out')) {
            classification.type = 'timeout';
            classification.category = 'performance';
            classification.retryable = true;
            classification.severity = 'warning';
        }
        
        // Authentication errors
        else if (message.includes('unauthorized') || message.includes('authentication') || error.code === 401) {
            classification.type = 'auth';
            classification.category = 'security';
            classification.retryable = false;
            classification.severity = 'critical';
        }
        
        // Rate limiting
        else if (message.includes('rate limit') || message.includes('quota') || error.code === 429) {
            classification.type = 'rate_limit';
            classification.category = 'quota';
            classification.retryable = true;
            classification.severity = 'warning';
        }
        
        // Resource errors
        else if (message.includes('memory') || message.includes('disk') || message.includes('resource')) {
            classification.type = 'resource';
            classification.category = 'system';
            classification.retryable = false;
            classification.severity = 'critical';
        }
        
        // Validation errors
        else if (message.includes('invalid') || message.includes('validation') || message.includes('format')) {
            classification.type = 'validation';
            classification.category = 'input';
            classification.retryable = false;
            classification.severity = 'error';
        }
        
        // Service unavailable
        else if (message.includes('unavailable') || message.includes('service') || error.code === 503) {
            classification.type = 'service_unavailable';
            classification.category = 'external';
            classification.retryable = true;
            classification.severity = 'critical';
        }

        return classification;
    }

    /**
     * Record successful operation
     */
    recordSuccess(processorName, responseTime) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        
        if (processor && stats) {
            processor.consecutiveErrors = 0;
            processor.lastSuccess = Date.now();
            processor.totalRequests++;
            
            // Update response times
            processor.responseTimes.push(responseTime);
            if (processor.responseTimes.length > 100) {
                processor.responseTimes.shift();
            }
            processor.averageResponseTime = 
                processor.responseTimes.reduce((a, b) => a + b, 0) / processor.responseTimes.length;
            
            // Update success rate
            this.updateSuccessRate(processorName);
            
            this.emit('processorSuccess', { processor: processorName, responseTime });
        }
    }

    /**
     * Record error occurrence
     */
    recordError(processorName, error, errorInfo) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        
        if (processor && stats) {
            processor.consecutiveErrors++;
            processor.totalErrors++;
            processor.totalRequests++;
            processor.lastError = {
                message: error.message,
                stack: error.stack,
                timestamp: Date.now(),
                classification: errorInfo
            };
            
            // Update error stats
            stats.errors.push({
                timestamp: Date.now(),
                error: error.message,
                classification: errorInfo,
                stack: error.stack
            });
            
            // Keep only last 100 errors
            if (stats.errors.length > 100) {
                stats.errors.shift();
            }
            
            stats.lastErrorTime = Date.now();
            
            if (errorInfo.severity === 'critical') {
                stats.criticalErrors++;
            } else if (errorInfo.severity === 'warning') {
                stats.warningErrors++;
            }
            
            // Update success rate
            this.updateSuccessRate(processorName);
            
            this.emit('processorError', { 
                processor: processorName, 
                error: error.message, 
                classification: errorInfo 
            });
        }
    }

    /**
     * Update success rate calculation
     */
    updateSuccessRate(processorName) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        
        if (processor && stats) {
            const successCount = processor.totalRequests - processor.totalErrors;
            stats.successRate = processor.totalRequests > 0 ? successCount / processor.totalRequests : 1.0;
            
            // Calculate error frequency (errors per minute)
            const recentErrors = stats.errors.filter(e => Date.now() - e.timestamp < 60000);
            stats.errorFrequency = recentErrors.length;
        }
    }

    /**
     * Setup circuit breakers for processors
     */
    setupCircuitBreakers() {
        // Default circuit breaker configuration will be applied per processor
    }

    /**
     * Initialize circuit breaker for specific processor
     */
    initializeCircuitBreaker(processorName, config) {
        this.circuitBreakers.set(processorName, {
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            lastFailureTime: null,
            successCount: 0,
            config: {
                failureThreshold: config.maxConsecutiveErrors || 5,
                recoveryTimeout: config.cooldownPeriod || 60000,
                monitoringPeriod: config.timeWindow || 300000
            }
        });
    }

    /**
     * Update circuit breaker state based on error
     */
    updateCircuitBreaker(processorName, error, errorInfo) {
        const circuitBreaker = this.circuitBreakers.get(processorName);
        if (!circuitBreaker) return;

        circuitBreaker.failureCount++;
        circuitBreaker.lastFailureTime = Date.now();

        // Open circuit if failure threshold reached
        if (circuitBreaker.state === 'CLOSED' && 
            circuitBreaker.failureCount >= circuitBreaker.config.failureThreshold) {
            
            circuitBreaker.state = 'OPEN';
            this.emit('circuitBreakerOpened', { 
                processor: processorName, 
                failureCount: circuitBreaker.failureCount 
            });
        }
        
        // If in HALF_OPEN state and still failing, go back to OPEN
        else if (circuitBreaker.state === 'HALF_OPEN') {
            circuitBreaker.state = 'OPEN';
            this.emit('circuitBreakerStateChanged', { processor: processorName, state: 'OPEN' });
        }
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    calculateRetryDelay(attempt, baseDelay) {
        const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
        return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
    }

    /**
     * Sleep for specified duration
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Setup recovery strategies
     */
    setupRecoveryStrategies() {
        this.recoveryStrategies.set('network', async (processorName, error) => {
            // Network recovery: wait and test connectivity
            await this.sleep(5000);
            return await this.testConnectivity(processorName);
        });

        this.recoveryStrategies.set('auth', async (processorName, error) => {
            // Auth recovery: refresh credentials
            return await this.refreshCredentials(processorName);
        });

        this.recoveryStrategies.set('resource', async (processorName, error) => {
            // Resource recovery: trigger garbage collection and wait
            if (global.gc) global.gc();
            await this.sleep(10000);
            return true;
        });

        this.recoveryStrategies.set('service_unavailable', async (processorName, error) => {
            // Service recovery: wait for service to come back online
            await this.sleep(30000);
            return await this.testServiceHealth(processorName);
        });
    }

    /**
     * Attempt recovery for critical errors
     */
    async attemptRecovery(processorName, error, errorInfo) {
        const stats = this.errorStats.get(processorName);
        if (!stats) return;

        stats.recoveryAttempts++;
        stats.lastRecoveryTime = Date.now();

        const strategy = this.recoveryStrategies.get(errorInfo.type);
        if (strategy) {
            try {
                const recovered = await strategy(processorName, error);
                if (recovered) {
                    this.emit('processorRecovered', { processor: processorName, errorType: errorInfo.type });
                    return true;
                }
            } catch (recoveryError) {
                this.emit('recoveryFailed', { 
                    processor: processorName, 
                    originalError: error.message,
                    recoveryError: recoveryError.message 
                });
            }
        }

        return false;
    }

    /**
     * Setup isolation policies
     */
    setupIsolationPolicies() {
        // Policies define how processors should be isolated based on error types
        this.isolationPolicies.set('critical_failure', {
            disableProcessor: true,
            isolationDuration: 300000, // 5 minutes
            requireManualReactivation: true
        });

        this.isolationPolicies.set('high_error_rate', {
            disableProcessor: false,
            reduceCapacity: true,
            capacityReduction: 0.5 // 50% capacity
        });
    }

    /**
     * Setup health checks
     */
    setupHealthChecks() {
        // Health check functions will be implemented per processor type
    }

    /**
     * Test connectivity for network errors
     */
    async testConnectivity(processorName) {
        // Basic connectivity test - can be overridden per processor
        return true;
    }

    /**
     * Refresh credentials for auth errors
     */
    async refreshCredentials(processorName) {
        // Credential refresh logic - can be overridden per processor
        return false;
    }

    /**
     * Test service health
     */
    async testServiceHealth(processorName) {
        // Service health check - can be overridden per processor
        return true;
    }

    /**
     * Start monitoring and health checks
     */
    startMonitoring() {
        // Health check interval
        setInterval(() => {
            this.performHealthChecks();
        }, 60000); // Every minute

        // Error rate monitoring
        setInterval(() => {
            this.monitorErrorRates();
        }, 30000); // Every 30 seconds

        // Circuit breaker monitoring
        setInterval(() => {
            this.monitorCircuitBreakers();
        }, 15000); // Every 15 seconds
    }

    /**
     * Perform health checks on all processors
     */
    async performHealthChecks() {
        for (const [name, processor] of this.processors) {
            if (processor.config.enableHealthChecks && processor.enabled) {
                try {
                    const healthy = await this.checkProcessorHealth(name);
                    if (!healthy) {
                        this.emit('processorUnhealthy', { processor: name });
                    }
                } catch (error) {
                    this.emit('healthCheckFailed', { processor: name, error: error.message });
                }
            }
        }
    }

    /**
     * Check health of specific processor
     */
    async checkProcessorHealth(processorName) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        
        if (!processor || !stats) return false;

        // Check error rate
        if (stats.successRate < 0.5) return false; // Less than 50% success rate
        
        // Check consecutive errors
        if (processor.consecutiveErrors > processor.config.maxConsecutiveErrors) return false;
        
        // Check recent activity
        const timeSinceLastSuccess = Date.now() - processor.lastSuccess;
        if (timeSinceLastSuccess > 600000) return false; // No success in 10 minutes
        
        return true;
    }

    /**
     * Monitor error rates across processors
     */
    monitorErrorRates() {
        for (const [name, processor] of this.processors) {
            const stats = this.errorStats.get(name);
            if (!stats) continue;

            // Check if error rate exceeds threshold
            if (stats.successRate < processor.config.errorThreshold) {
                this.emit('highErrorRate', { 
                    processor: name, 
                    successRate: stats.successRate,
                    threshold: processor.config.errorThreshold 
                });
            }
        }
    }

    /**
     * Monitor circuit breaker states
     */
    monitorCircuitBreakers() {
        for (const [name, circuitBreaker] of this.circuitBreakers) {
            if (circuitBreaker.state === 'OPEN') {
                const timeSinceFailure = Date.now() - circuitBreaker.lastFailureTime;
                if (timeSinceFailure >= circuitBreaker.config.recoveryTimeout) {
                    // Try to move to HALF_OPEN for testing
                    circuitBreaker.state = 'HALF_OPEN';
                    this.emit('circuitBreakerStateChanged', { processor: name, state: 'HALF_OPEN' });
                }
            }
        }
    }

    /**
     * Get error statistics for a processor
     */
    getErrorStats(processorName) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        const circuitBreaker = this.circuitBreakers.get(processorName);

        if (!processor || !stats) {
            return null;
        }

        return {
            processor: processorName,
            enabled: processor.enabled,
            consecutiveErrors: processor.consecutiveErrors,
            totalRequests: processor.totalRequests,
            totalErrors: processor.totalErrors,
            successRate: stats.successRate,
            errorFrequency: stats.errorFrequency,
            criticalErrors: stats.criticalErrors,
            warningErrors: stats.warningErrors,
            recoveryAttempts: stats.recoveryAttempts,
            lastError: processor.lastError,
            lastSuccess: processor.lastSuccess,
            averageResponseTime: processor.averageResponseTime,
            circuitBreakerState: circuitBreaker?.state || 'N/A'
        };
    }

    /**
     * Get overall system health status
     */
    getSystemHealth() {
        const health = {
            overall: 'healthy',
            processors: {},
            totalProcessors: this.processors.size,
            healthyProcessors: 0,
            unhealthyProcessors: 0,
            openCircuits: 0
        };

        for (const [name] of this.processors) {
            const processorHealth = this.checkProcessorHealth(name);
            const stats = this.getErrorStats(name);
            
            health.processors[name] = {
                healthy: processorHealth,
                stats: stats
            };

            if (processorHealth) {
                health.healthyProcessors++;
            } else {
                health.unhealthyProcessors++;
            }

            if (stats?.circuitBreakerState === 'OPEN') {
                health.openCircuits++;
            }
        }

        // Determine overall health
        if (health.unhealthyProcessors > health.healthyProcessors) {
            health.overall = 'critical';
        } else if (health.unhealthyProcessors > 0 || health.openCircuits > 0) {
            health.overall = 'degraded';
        }

        return health;
    }

    /**
     * Reset error stats for a processor
     */
    resetErrorStats(processorName) {
        const processor = this.processors.get(processorName);
        const stats = this.errorStats.get(processorName);
        const circuitBreaker = this.circuitBreakers.get(processorName);

        if (processor && stats) {
            processor.consecutiveErrors = 0;
            processor.totalErrors = 0;
            processor.lastError = null;
            
            stats.errors = [];
            stats.successRate = 1.0;
            stats.lastErrorTime = null;
            stats.errorFrequency = 0;
            stats.criticalErrors = 0;
            stats.warningErrors = 0;
            stats.recoveryAttempts = 0;
            stats.lastRecoveryTime = null;

            if (circuitBreaker) {
                circuitBreaker.state = 'CLOSED';
                circuitBreaker.failureCount = 0;
                circuitBreaker.lastFailureTime = null;
            }

            this.emit('processorReset', { processor: processorName });
        }
    }
}

module.exports = ErrorIsolationManager; 