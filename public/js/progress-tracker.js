/**
 * Progress Tracker - Frontend Progress Indicators
 * 
 * Provides real-time progress updates for long-running operations
 * like YouTube video processing, AI analysis, etc.
 */

class ProgressTracker {
    constructor() {
        this.ws = null;
        this.activeOperations = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        this.init();
    }

    init() {
        this.connect();
        this.createProgressContainer();
    }

    connect() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/progress`;
            
            console.log('📡 Connecting to progress WebSocket:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('✅ Progress WebSocket connected');
                this.reconnectAttempts = 0;
                this.showConnectionStatus('Connected', 'success');
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('❌ Failed to parse WebSocket message:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('📡 Progress WebSocket disconnected');
                this.showConnectionStatus('Disconnected', 'warning');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('❌ Progress WebSocket error:', error);
                this.showConnectionStatus('Connection Error', 'error');
            };
            
        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('❌ Max reconnect attempts reached');
            this.showConnectionStatus('Connection Failed', 'error');
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'connection':
                console.log('📱 WebSocket connection established:', data.clientId);
                break;
                
            case 'progress':
                this.updateProgress(data);
                break;
                
            case 'completed':
                this.completeProgress(data);
                break;
                
            case 'error':
                this.errorProgress(data);
                break;
                
            case 'pong':
                // Heartbeat response
                break;
                
            default:
                console.log('📨 Unknown message type:', data.type);
        }
    }

    subscribeToOperation(operationId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                operationId
            }));
            console.log(`📡 Subscribed to operation: ${operationId}`);
        } else {
            console.warn('⚠️ WebSocket not connected, cannot subscribe');
        }
    }

    unsubscribeFromOperation(operationId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                operationId
            }));
            console.log(`📡 Unsubscribed from operation: ${operationId}`);
        }
    }

    createProgressContainer() {
        // Create progress container if it doesn't exist
        if (!document.getElementById('progress-container')) {
            const container = document.createElement('div');
            container.id = 'progress-container';
            container.className = 'progress-container';
            container.innerHTML = `
                <div class="progress-header">
                    <h5>📊 Processing Status</h5>
                    <span id="connection-status" class="badge badge-secondary">Connecting...</span>
                </div>
                <div id="progress-list" class="progress-list"></div>
            `;
            
            // Add CSS styles
            const style = document.createElement('style');
            style.textContent = `
                .progress-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 15px;
                    min-width: 300px;
                    max-width: 400px;
                    z-index: 9999;
                    display: none;
                }
                
                .progress-header {
                    display: flex;
                    justify-content: between;
                    align-items: center;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 8px;
                }
                
                .progress-header h5 {
                    margin: 0;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .progress-item {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #e3e6f0;
                    border-radius: 6px;
                    background: #f8f9fc;
                }
                
                .progress-url {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 5px;
                    word-break: break-all;
                }
                
                .progress-stage {
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 5px;
                }
                
                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background-color: #e9ecef;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 5px;
                }
                
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #007bff, #0056b3);
                    transition: width 0.3s ease;
                    border-radius: 4px;
                }
                
                .progress-details {
                    font-size: 11px;
                    color: #6c757d;
                }
                
                .progress-completed {
                    background: #d4edda !important;
                    border-color: #c3e6cb !important;
                }
                
                .progress-error {
                    background: #f8d7da !important;
                    border-color: #f5c6cb !important;
                }
                
                #connection-status.badge-success { background-color: #28a745; }
                #connection-status.badge-warning { background-color: #ffc107; }
                #connection-status.badge-danger { background-color: #dc3545; }
            `;
            document.head.appendChild(style);
            
            // Insert container into body
            document.body.appendChild(container);
        }
    }

    showProgressContainer() {
        const container = document.getElementById('progress-container');
        if (container) {
            container.style.display = 'block';
        }
    }

    hideProgressContainer() {
        const container = document.getElementById('progress-container');
        if (container && this.activeOperations.size === 0) {
            container.style.display = 'none';
        }
    }

    showConnectionStatus(status, type) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `badge badge-${type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'danger'}`;
        }
    }

    updateProgress(data) {
        const { operationId, stage, percentage, message, details, url } = data;
        
        this.showProgressContainer();
        
        let progressItem = document.getElementById(`progress-${operationId}`);
        if (!progressItem) {
            progressItem = this.createProgressItem(operationId, url || 'Processing...');
        }
        
        // Update progress content
        const stageElement = progressItem.querySelector('.progress-stage');
        const barFill = progressItem.querySelector('.progress-bar-fill');
        const detailsElement = progressItem.querySelector('.progress-details');
        
        if (stageElement) stageElement.textContent = `${stage}: ${message}`;
        if (barFill) barFill.style.width = `${percentage}%`;
        if (detailsElement) {
            const elapsed = data.elapsed ? `${Math.round(data.elapsed / 1000)}s` : '';
            const wordCount = details?.wordCount ? `${details.wordCount} words` : '';
            const info = [elapsed, wordCount].filter(Boolean).join(' • ');
            detailsElement.textContent = `${percentage}% ${info}`;
        }
        
        this.activeOperations.set(operationId, data);
    }

    createProgressItem(operationId, url) {
        const progressList = document.getElementById('progress-list');
        if (!progressList) return null;
        
        const progressItem = document.createElement('div');
        progressItem.id = `progress-${operationId}`;
        progressItem.className = 'progress-item';
        progressItem.innerHTML = `
            <div class="progress-url">${this.truncateUrl(url)}</div>
            <div class="progress-stage">Initializing...</div>
            <div class="progress-bar">
                <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
            <div class="progress-details">0%</div>
        `;
        
        progressList.appendChild(progressItem);
        return progressItem;
    }

    completeProgress(data) {
        const { operationId } = data;
        const progressItem = document.getElementById(`progress-${operationId}`);
        
        if (progressItem) {
            progressItem.classList.add('progress-completed');
            
            const stageElement = progressItem.querySelector('.progress-stage');
            const barFill = progressItem.querySelector('.progress-bar-fill');
            const detailsElement = progressItem.querySelector('.progress-details');
            
            if (stageElement) stageElement.textContent = '✅ Completed successfully!';
            if (barFill) barFill.style.width = '100%';
            if (detailsElement) {
                const duration = data.duration ? `${Math.round(data.duration / 1000)}s` : '';
                detailsElement.textContent = `100% • ${duration}`;
            }
            
            // Remove after delay
            setTimeout(() => {
                if (progressItem.parentNode) {
                    progressItem.parentNode.removeChild(progressItem);
                }
                this.activeOperations.delete(operationId);
                this.hideProgressContainer();
            }, 3000);
        }
    }

    errorProgress(data) {
        const { operationId, message, error } = data;
        const progressItem = document.getElementById(`progress-${operationId}`);
        
        if (progressItem) {
            progressItem.classList.add('progress-error');
            
            const stageElement = progressItem.querySelector('.progress-stage');
            const detailsElement = progressItem.querySelector('.progress-details');
            
            if (stageElement) stageElement.textContent = `❌ Error: ${message}`;
            if (detailsElement) detailsElement.textContent = error || 'Processing failed';
            
            // Remove after longer delay
            setTimeout(() => {
                if (progressItem.parentNode) {
                    progressItem.parentNode.removeChild(progressItem);
                }
                this.activeOperations.delete(operationId);
                this.hideProgressContainer();
            }, 8000);
        }
    }

    truncateUrl(url) {
        if (!url) return 'Processing...';
        if (url.length <= 50) return url;
        return url.substring(0, 25) + '...' + url.substring(url.length - 20);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.progressTracker = new ProgressTracker();
    console.log('🚀 Progress Tracker initialized');
});

// Auto-subscribe to operations when they start
document.addEventListener('operationStarted', (event) => {
    const { operationId } = event.detail;
    if (window.progressTracker) {
        window.progressTracker.subscribeToOperation(operationId);
    }
});
