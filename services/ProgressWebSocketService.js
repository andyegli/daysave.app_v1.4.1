/**
 * Progress WebSocket Service
 * 
 * Provides real-time progress updates via WebSocket for long-running operations
 * like YouTube video processing, AI analysis, etc.
 */

const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class ProgressWebSocketService {
    constructor(server) {
        this.wss = new WebSocket.Server({ 
            server,
            path: '/progress'
        });
        
        this.clients = new Map(); // clientId -> { ws, subscriptions }
        this.activeOperations = new Map(); // operationId -> operation data
        
        this.setupWebSocketServer();
        console.log('📡 Progress WebSocket Service initialized on /progress');
    }

    setupWebSocketServer() {
        this.wss.on('connection', (ws, req) => {
            const clientId = uuidv4();
            console.log(`📱 Client connected: ${clientId}`);
            
            this.clients.set(clientId, {
                ws,
                subscriptions: new Set(),
                connectedAt: new Date()
            });

            // Send welcome message
            ws.send(JSON.stringify({
                type: 'connection',
                clientId,
                message: 'Connected to progress updates',
                timestamp: new Date().toISOString()
            }));

            // Handle incoming messages
            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(clientId, data);
                } catch (error) {
                    console.error('❌ Invalid WebSocket message:', error);
                }
            });

            // Handle client disconnect
            ws.on('close', () => {
                console.log(`📱 Client disconnected: ${clientId}`);
                this.clients.delete(clientId);
            });

            // Handle WebSocket errors
            ws.on('error', (error) => {
                console.error(`❌ WebSocket error for client ${clientId}:`, error);
                this.clients.delete(clientId);
            });
        });
    }

    handleClientMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        switch (data.type) {
            case 'subscribe':
                // Subscribe to specific operation updates
                if (data.operationId) {
                    client.subscriptions.add(data.operationId);
                    console.log(`📱 Client ${clientId} subscribed to operation: ${data.operationId}`);
                    
                    // Send current status if operation exists
                    const operation = this.activeOperations.get(data.operationId);
                    if (operation) {
                        this.sendToClient(clientId, {
                            type: 'progress',
                            operationId: data.operationId,
                            ...operation.lastProgress
                        });
                    }
                }
                break;
                
            case 'unsubscribe':
                if (data.operationId) {
                    client.subscriptions.delete(data.operationId);
                    console.log(`📱 Client ${clientId} unsubscribed from operation: ${data.operationId}`);
                }
                break;
                
            case 'ping':
                this.sendToClient(clientId, {
                    type: 'pong',
                    timestamp: new Date().toISOString()
                });
                break;
        }
    }

    sendToClient(clientId, data) {
        const client = this.clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Start tracking a new operation
     */
    startOperation(operationId, initialData = {}) {
        this.activeOperations.set(operationId, {
            id: operationId,
            startTime: Date.now(),
            lastProgress: {
                stage: 'initialization',
                percentage: 0,
                message: 'Starting operation...',
                ...initialData
            }
        });
        
        console.log(`🔄 Started tracking operation: ${operationId}`);
    }

    /**
     * Update operation progress and broadcast to subscribed clients
     */
    updateProgress(operationId, progressData) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) {
            console.warn(`⚠️ Operation not found: ${operationId}`);
            return;
        }

        // Update operation progress
        operation.lastProgress = {
            ...progressData,
            operationId,
            timestamp: new Date().toISOString()
        };

        // Broadcast to subscribed clients
        this.clients.forEach((client, clientId) => {
            if (client.subscriptions.has(operationId)) {
                this.sendToClient(clientId, {
                    type: 'progress',
                    operationId,
                    ...operation.lastProgress
                });
            }
        });

        // Log progress for debugging
        console.log(`🔄 [${operationId}] ${progressData.percentage}% - ${progressData.stage}: ${progressData.message}`);
    }

    /**
     * Complete an operation
     */
    completeOperation(operationId, finalData = {}) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        const completionData = {
            stage: 'completed',
            percentage: 100,
            message: 'Operation completed successfully',
            ...finalData,
            operationId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - operation.startTime
        };

        // Send completion to subscribed clients
        this.clients.forEach((client, clientId) => {
            if (client.subscriptions.has(operationId)) {
                this.sendToClient(clientId, {
                    type: 'completed',
                    operationId,
                    ...completionData
                });
            }
        });

        // Clean up operation after delay
        setTimeout(() => {
            this.activeOperations.delete(operationId);
        }, 30000); // Keep for 30 seconds for late subscribers

        console.log(`✅ Operation completed: ${operationId} (${completionData.duration}ms)`);
    }

    /**
     * Error in operation
     */
    errorOperation(operationId, error) {
        const operation = this.activeOperations.get(operationId);
        if (!operation) return;

        const errorData = {
            stage: 'error',
            percentage: 0,
            message: `Operation failed: ${error.message}`,
            error: error.message,
            operationId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - operation.startTime
        };

        // Send error to subscribed clients
        this.clients.forEach((client, clientId) => {
            if (client.subscriptions.has(operationId)) {
                this.sendToClient(clientId, {
                    type: 'error',
                    operationId,
                    ...errorData
                });
            }
        });

        // Clean up operation
        setTimeout(() => {
            this.activeOperations.delete(operationId);
        }, 60000); // Keep errors longer for debugging

        console.error(`❌ Operation failed: ${operationId} - ${error.message}`);
    }

    /**
     * Get active operations status
     */
    getActiveOperations() {
        return Array.from(this.activeOperations.values()).map(op => ({
            id: op.id,
            startTime: op.startTime,
            duration: Date.now() - op.startTime,
            lastProgress: op.lastProgress
        }));
    }

    /**
     * Get connected clients count
     */
    getConnectedClientsCount() {
        return this.clients.size;
    }
}

module.exports = ProgressWebSocketService;
