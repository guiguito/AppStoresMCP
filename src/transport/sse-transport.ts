/**
 * SSE (Server-Sent Events) Transport Layer for MCP
 * Implements MCP protocol over Server-Sent Events for legacy client compatibility
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MCPRequest, MCPResponse, MCPErrorCode } from '../types/mcp';

/**
 * SSE Transport configuration options
 */
export interface SSETransportConfig {
  heartbeatInterval?: number;
  connectionTimeout?: number;
  maxConnections?: number;
  enableLogging?: boolean;
  autoInitialize?: boolean;
  initializationTimeout?: number;
}

/**
 * SSE Connection interface
 */
export interface SSEConnection {
  id: string;
  response: Response;
  lastActivity: number;
  isAlive: boolean;
  correlationId: string;
  isInitialized: boolean;
  requestQueue?: MCPRequest[];
}

/**
 * SSE Transport Handler for MCP over Server-Sent Events
 */
export class SSETransportHandler {
  private config: SSETransportConfig;
  private connections: Map<string, SSEConnection> = new Map();
  private requestHandler?: (request: MCPRequest) => Promise<MCPResponse>;
  private heartbeatTimer?: NodeJS.Timeout | undefined;
  private cleanupTimer?: NodeJS.Timeout | undefined;

  constructor(config: SSETransportConfig = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout || 300000, // 5 minutes
      maxConnections: config.maxConnections || 100,
      enableLogging: config.enableLogging !== false,
      autoInitialize: config.autoInitialize !== false, // Default: true
      initializationTimeout: config.initializationTimeout || 5000 // Default: 5 seconds
    };

    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Handle SSE connection establishment
   */
  public handleSSEConnection(req: Request, res: Response): void {
    // Check connection limit
    if (this.connections.size >= this.config.maxConnections!) {
      res.status(503).json({
        error: 'Maximum connections exceeded',
        maxConnections: this.config.maxConnections
      });
      return;
    }

    const connectionId = uuidv4();
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

    // Set SSE headers with additional compatibility headers for Trae
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, X-Correlation-ID, User-Agent, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'X-Connection-ID': connectionId,
      'X-Correlation-ID': correlationId,
      // Additional headers that some SSE clients expect
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Transfer-Encoding': 'chunked'
    });

    // Create connection object
    const connection: SSEConnection = {
      id: connectionId,
      response: res,
      lastActivity: Date.now(),
      isAlive: true,
      correlationId,
      isInitialized: false
    };

    // Store connection
    this.connections.set(connectionId, connection);

    // Send connection established event immediately
    try {
      this.sendEvent(connectionId, 'connection', {
        connectionId,
        correlationId,
        timestamp: new Date().toISOString(),
        message: 'SSE connection established'
      });
    } catch (error) {
      // Connection event send failed, connection already closed by sendEvent
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_connection_event_failed',
          connectionId,
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
      return; // Exit early, connection is already cleaned up
    }

    // Enhanced structured logging when SSE connection is established
    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_connection_established',
        connectionId,
        correlationId,
        totalConnections: this.connections.size,
        clientIP: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        headers: {
          'x-correlation-id': req.headers['x-correlation-id'],
          'content-type': req.headers['content-type'],
          'accept': req.headers['accept']
        },
        message: 'SSE connection established successfully, preparing for MCP initialization',
        phase: 'connection_established'
      }));
    }

    // Handle connection close
    req.on('close', () => {
      this.closeConnection(connectionId);
    });

    req.on('error', (error) => {
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_connection_error',
          connectionId,
          correlationId,
          error: error.message
        }));
      }
      this.closeConnection(connectionId);
    });

    // Handle response close/finish events (only if res has event emitter methods)
    if (typeof res.on === 'function') {
      res.on('close', () => {
        this.closeConnection(connectionId);
      });

      res.on('error', (error) => {
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_response_error',
            connectionId,
            correlationId,
            error: error.message
          }));
        }
        this.closeConnection(connectionId);
      });
    }

    // Send automatic initialization message before heartbeat (if enabled)
    if (this.config.autoInitialize) {
      setTimeout(async () => {
        // Log that initialization is about to begin
        if (this.config.enableLogging) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'sse_initialization_scheduled',
            connectionId,
            correlationId,
            message: 'MCP initialization scheduled to begin',
            phase: 'initialization_scheduled'
          }));
        }
        
        await this.sendInitializationMessage(connectionId);
        // Send heartbeat after initialization
        this.sendHeartbeat(connectionId);
      }, 200); // Increased delay to give clients more time to set up event listeners
    } else {
      // If auto-initialization is disabled, just send heartbeat
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          type: 'sse_auto_initialization_disabled',
          connectionId,
          correlationId,
          message: 'Auto-initialization disabled, skipping MCP initialization',
          phase: 'initialization_skipped'
        }));
      }
      
      setTimeout(() => {
        this.sendHeartbeat(connectionId);
      }, 100);
    }
  }

  /**
   * Handle MCP message from client
   */
  public async handleMCPMessage(connectionId: string, message: any): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive) {
      throw new Error(`Connection ${connectionId} not found or closed`);
    }

    // Update last activity
    connection.lastActivity = Date.now();

    try {
      // Validate MCP request format
      if (!this.isValidMCPRequest(message)) {
        const errorResponse = this.createErrorResponse(
          message?.id || 'unknown',
          MCPErrorCode.INVALID_REQUEST,
          'Invalid MCP request format'
        );
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
        return;
      }

      const mcpRequest: MCPRequest = message;

      // Check if connection is initialized before processing requests
      if (!connection.isInitialized) {
        // Initialize request queue if it doesn't exist
        if (!connection.requestQueue) {
          connection.requestQueue = [];
        }

        // Add request to queue
        connection.requestQueue.push(mcpRequest);

        if (this.config.enableLogging) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'sse_mcp_request_queued',
            connectionId,
            correlationId: connection.correlationId,
            method: mcpRequest.method,
            id: mcpRequest.id,
            queueLength: connection.requestQueue.length,
            message: 'MCP request queued - connection not yet initialized'
          }));
        }

        return;
      }

      // Log MCP request
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          type: 'sse_mcp_request',
          connectionId,
          correlationId: connection.correlationId,
          method: mcpRequest.method,
          id: mcpRequest.id,
          params: mcpRequest.params
        }));
      }

      // Process MCP request
      await this.processMCPRequest(connectionId, mcpRequest);

    } catch (error) {
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_mcp_error',
          connectionId,
          correlationId: connection.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }));
      }

      const errorResponse = this.createErrorResponse(
        message?.id || 'unknown',
        MCPErrorCode.INTERNAL_ERROR,
        'Internal server error'
      );
      this.sendEvent(connectionId, 'mcp-response', errorResponse);
    }
  }

  /**
   * Send SSE event to a specific connection
   */
  private sendEvent(connectionId: string, event: string, data: any, updateActivity: boolean = true): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive) {
      return;
    }

    try {
      // Format SSE event with proper line endings and optional retry directive
      let eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n`;
      
      // Add retry directive for connection events to help clients reconnect
      if (event === 'connection') {
        eventData += `retry: 5000\n`;
      }
      
      eventData += '\n';
      
      connection.response.write(eventData);
      if (updateActivity) {
        connection.lastActivity = Date.now();
      }
    } catch (error) {
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_send_error',
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
      this.closeConnection(connectionId);
      // Re-throw the error so calling code can handle it appropriately
      throw error;
    }
  }

  /**
   * Send automatic initialization message to establish MCP handshake
   */
  private async sendInitializationMessage(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive || connection.isInitialized) {
      return;
    }

    const initializationStartTime = Date.now();
    let initializeRequest: MCPRequest | undefined;

    // Set up timeout for initialization process
    const initializationTimeout = setTimeout(() => {
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_initialization_timeout',
          connectionId,
          correlationId: connection.correlationId,
          timeout: this.config.initializationTimeout,
          duration: Date.now() - initializationStartTime,
          message: 'Initialization process timed out, closing connection',
          phase: 'timeout_handling'
        }));
      }

      // Send timeout error response
      const timeoutErrorResponse = this.createInitializationErrorResponse(
        initializeRequest?.id || 'init-timeout-' + connectionId,
        'initialization_timeout',
        'Initialization process timed out',
        { timeout: this.config.initializationTimeout, phase: 'timeout' }
      );
      
      try {
        this.sendEvent(connectionId, 'mcp-response', timeoutErrorResponse);
      } catch (sendError) {
        // Log send error but continue with cleanup
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_timeout_response_send_error',
            connectionId,
            correlationId: connection.correlationId,
            error: sendError instanceof Error ? sendError.message : 'Unknown error'
          }));
        }
      }

      // Clean up connection after timeout
      this.closeConnection(connectionId);
    }, this.config.initializationTimeout!);

    try {
      // Create synthetic initialize request
      initializeRequest = this.createInitializeRequest();

      // Log initialization attempt with detailed request information
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          type: 'sse_initialization_start',
          connectionId,
          correlationId: connection.correlationId,
          message: 'Starting automatic MCP initialization process',
          phase: 'initialization_begin'
        }));

        // Log the synthetic initialize request being created
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          type: 'sse_initialize_request_created',
          connectionId,
          correlationId: connection.correlationId,
          requestId: initializeRequest.id,
          method: initializeRequest.method,
          protocolVersion: initializeRequest.params.protocolVersion,
          clientInfo: initializeRequest.params.clientInfo,
          capabilities: initializeRequest.params.capabilities,
          message: 'Synthetic initialize request created',
          phase: 'request_creation'
        }));
      }

      // Validate MCP handler availability
      if (!this.requestHandler) {
        const errorMessage = 'MCP request handler not configured';
        
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_initialization_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: initializeRequest.id,
            error: errorMessage,
            errorCode: MCPErrorCode.INTERNAL_ERROR,
            phase: 'handler_validation',
            message: 'Initialization failed: MCP handler not available'
          }));
        }

        const errorResponse = this.createInitializationErrorResponse(
          initializeRequest.id,
          'handler_unavailable',
          errorMessage,
          { phase: 'handler_validation' }
        );
        
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
        this.closeConnection(connectionId);
        return;
      }

      // Log that we're processing the initialize request
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          type: 'sse_initialize_request_processing',
          connectionId,
          correlationId: connection.correlationId,
          requestId: initializeRequest.id,
          message: 'Processing synthetic initialize request through MCP handler',
          phase: 'request_processing'
        }));
      }

      // Process initialize request through MCP handler with error handling
      let initializeResponse: MCPResponse;
      try {
        initializeResponse = await this.requestHandler(initializeRequest);
      } catch (handlerError) {
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_initialization_handler_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: initializeRequest.id,
            error: handlerError instanceof Error ? handlerError.message : 'Unknown handler error',
            errorType: handlerError instanceof Error ? handlerError.constructor.name : 'UnknownError',
            stack: handlerError instanceof Error ? handlerError.stack : undefined,
            phase: 'request_processing',
            message: 'MCP handler failed to process initialize request'
          }));
        }

        const errorResponse = this.createInitializationErrorResponse(
          initializeRequest.id,
          'request_processing',
          'MCP handler failed to process initialize request',
          { 
            phase: 'request_processing',
            originalError: handlerError instanceof Error ? handlerError.message : 'Unknown error'
          }
        );
        
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
        this.closeConnection(connectionId);
        return;
      }

      // Validate initialize response format
      if (!initializeResponse || typeof initializeResponse !== 'object') {
        const errorMessage = 'Invalid initialize response format from MCP handler';
        
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_initialization_response_validation_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: initializeRequest.id,
            error: errorMessage,
            responseType: typeof initializeResponse,
            phase: 'response_validation',
            message: 'Initialize response validation failed'
          }));
        }

        const errorResponse = this.createInitializationErrorResponse(
          initializeRequest.id,
          'response_validation',
          errorMessage,
          { 
            phase: 'response_validation',
            responseType: typeof initializeResponse
          }
        );
        
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
        this.closeConnection(connectionId);
        return;
      }

      // Check if the response contains an error
      if (initializeResponse.error) {
        const responseError = initializeResponse.error;
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_initialization_response_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: initializeRequest.id,
            responseId: initializeResponse.id,
            errorCode: responseError.code,
            errorMessage: responseError.message,
            errorData: responseError.data,
            phase: 'response_error_handling',
            message: 'Initialize response contains error'
          }));
        }

        // Forward the error response and close connection
        this.sendEvent(connectionId, 'mcp-response', initializeResponse);
        this.closeConnection(connectionId);
        return;
      }

      // Log the initialize response being sent to the client
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          type: 'sse_initialize_response_sending',
          connectionId,
          correlationId: connection.correlationId,
          requestId: initializeRequest.id,
          responseId: initializeResponse.id,
          hasError: !!initializeResponse.error,
          errorCode: initializeResponse.error ? (initializeResponse.error as any).code : undefined,
          serverInfo: initializeResponse.result?.serverInfo,
          capabilities: initializeResponse.result?.capabilities ? Object.keys(initializeResponse.result.capabilities) : undefined,
          protocolVersion: initializeResponse.result?.protocolVersion,
          message: 'Sending initialize response to client via SSE',
          phase: 'response_sending'
        }));
      }

      // Send initialize response via SSE with error handling
      try {
        this.sendEvent(connectionId, 'mcp-response', initializeResponse);
      } catch (sendError) {
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_initialization_send_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: initializeRequest.id,
            error: sendError instanceof Error ? sendError.message : 'Unknown send error',
            errorType: sendError instanceof Error ? sendError.constructor.name : 'UnknownError',
            phase: 'response_sending',
            message: 'Failed to send initialize response via SSE'
          }));
        }

        // Clean up connection if we can't send the response
        this.closeConnection(connectionId);
        return;
      }

      // Clear timeout since initialization succeeded
      clearTimeout(initializationTimeout);

      // Mark connection as initialized
      connection.isInitialized = true;

      // Log successful completion of the initialization handshake
      if (this.config.enableLogging) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          type: 'sse_initialization_complete',
          connectionId,
          correlationId: connection.correlationId,
          requestId: initializeRequest.id,
          responseId: initializeResponse.id,
          duration: Date.now() - initializationStartTime,
          message: 'MCP initialization handshake completed successfully',
          phase: 'initialization_complete',
          status: 'success'
        }));
      }

      // Process any queued requests after successful initialization
      await this.processQueuedRequests(connectionId);

    } catch (error) {
      // Clear timeout on any error
      clearTimeout(initializationTimeout);

      // Enhanced error logging for initialization failures with detailed error information
      if (this.config.enableLogging) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_initialization_error',
          connectionId,
          correlationId: connection.correlationId,
          requestId: initializeRequest?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - initializationStartTime,
          phase: 'initialization_failure',
          message: 'MCP initialization process failed with error',
          status: 'failed'
        }));
      }

      // Send specific error response for initialization failures
      const errorResponse = this.createInitializationErrorResponse(
        initializeRequest?.id || 'init-error-' + connectionId,
        'initialization_error',
        'Initialization failed due to unexpected error',
        { 
          phase: 'initialization_failure',
          originalError: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
        }
      );
      
      try {
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
      } catch (sendError) {
        // Log send error but continue with cleanup
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_error_response_send_error',
            connectionId,
            correlationId: connection.correlationId,
            error: sendError instanceof Error ? sendError.message : 'Unknown error'
          }));
        }
      }

      // Ensure connection is properly cleaned up after initialization failure
      this.closeConnection(connectionId);
    }
  }

  /**
   * Process a single MCP request
   */
  private async processMCPRequest(connectionId: string, mcpRequest: MCPRequest): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive) {
      return;
    }

    // Process MCP request
    if (!this.requestHandler) {
      const errorResponse = this.createErrorResponse(
        mcpRequest.id,
        MCPErrorCode.INTERNAL_ERROR,
        'MCP request handler not configured'
      );
      this.sendEvent(connectionId, 'mcp-response', errorResponse);
      return;
    }

    const mcpResponse = await this.requestHandler(mcpRequest);

    // Log MCP response
    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_mcp_response',
        connectionId,
        correlationId: connection.correlationId,
        id: mcpResponse?.id,
        hasError: !!mcpResponse?.error,
        errorCode: mcpResponse?.error?.code
      }));
    }

    // Send response via SSE
    this.sendEvent(connectionId, 'mcp-response', mcpResponse);
  }

  /**
   * Process queued requests after initialization completes
   */
  private async processQueuedRequests(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive || !connection.isInitialized) {
      return;
    }

    // Check if there are queued requests
    if (!connection.requestQueue || connection.requestQueue.length === 0) {
      return;
    }

    const queuedRequests = [...connection.requestQueue];
    connection.requestQueue = []; // Clear the queue

    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_processing_queued_requests',
        connectionId,
        correlationId: connection.correlationId,
        queueLength: queuedRequests.length,
        message: 'Processing queued MCP requests after initialization'
      }));
    }

    // Process each queued request
    for (const queuedRequest of queuedRequests) {
      try {
        if (this.config.enableLogging) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'sse_mcp_queued_request_processing',
            connectionId,
            correlationId: connection.correlationId,
            method: queuedRequest.method,
            id: queuedRequest.id,
            message: 'Processing queued MCP request'
          }));
        }

        await this.processMCPRequest(connectionId, queuedRequest);
      } catch (_error) {
        if (this.config.enableLogging) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'sse_queued_request_error',
            connectionId,
            correlationId: connection.correlationId,
            requestId: queuedRequest.id,
            method: queuedRequest.method,
            error: _error instanceof Error ? _error.message : 'Unknown error',
            stack: _error instanceof Error ? _error.stack : undefined
          }));
        }

        // Send error response for this specific request
        const errorResponse = this.createErrorResponse(
          queuedRequest.id,
          MCPErrorCode.INTERNAL_ERROR,
          'Error processing queued request'
        );
        this.sendEvent(connectionId, 'mcp-response', errorResponse);
      }
    }

    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_queued_requests_processed',
        connectionId,
        correlationId: connection.correlationId,
        processedCount: queuedRequests.length,
        message: 'Completed processing all queued MCP requests'
      }));
    }
  }

  /**
   * Create synthetic MCP initialize request
   */
  private createInitializeRequest(): MCPRequest {
    return {
      jsonrpc: '2.0',
      id: 'init-' + uuidv4(),
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {
          roots: {
            listChanged: false
          },
          sampling: {}
        },
        clientInfo: {
          name: 'sse-transport-client',
          version: '1.0.0'
        }
      }
    };
  }

  /**
   * Send heartbeat to a specific connection
   */
  private sendHeartbeat(connectionId: string): void {
    this.sendEvent(connectionId, 'heartbeat', {
      timestamp: new Date().toISOString(),
      connectionId
    }, false); // Don't update lastActivity for heartbeats
  }

  /**
   * Send heartbeat to all connections
   */
  private sendHeartbeatToAll(): void {
    for (const connectionId of this.connections.keys()) {
      this.sendHeartbeat(connectionId);
    }
  }

  /**
   * Close a specific connection
   */
  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    connection.isAlive = false;
    
    // Clean up request queue if it exists
    const queuedRequestCount = connection.requestQueue?.length || 0;
    if (connection.requestQueue && connection.requestQueue.length > 0) {
      connection.requestQueue = [];
    }
    
    try {
      if (!connection.response.destroyed) {
        connection.response.end();
      }
    } catch {
      // Ignore errors when closing response
    }

    this.connections.delete(connectionId);

    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_connection_closed',
        connectionId,
        correlationId: connection.correlationId,
        totalConnections: this.connections.size,
        wasInitialized: connection.isInitialized,
        queuedRequestsDiscarded: queuedRequestCount,
        message: 'SSE connection closed and cleaned up'
      }));
    }
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeatToAll();
    }, this.config.heartbeatInterval);
    
    // Allow Node.js to exit even if timer is active
    this.heartbeatTimer.unref();
  }

  /**
   * Start cleanup timer for stale connections
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const staleConnections: string[] = [];

      for (const [connectionId, connection] of this.connections.entries()) {
        if (now - connection.lastActivity > this.config.connectionTimeout!) {
          staleConnections.push(connectionId);
        }
      }

      for (const connectionId of staleConnections) {
        if (this.config.enableLogging) {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'sse_connection_timeout',
            connectionId,
            message: 'Closing stale connection'
          }));
        }
        this.closeConnection(connectionId);
      }
    }, this.config.heartbeatInterval);
    
    // Allow Node.js to exit even if timer is active
    this.cleanupTimer.unref();
  }

  /**
   * Validate MCP request format
   */
  private isValidMCPRequest(body: any): body is MCPRequest {
    return (
      body &&
      typeof body === 'object' &&
      body.jsonrpc === '2.0' &&
      typeof body.method === 'string' &&
      (body.id === undefined || typeof body.id === 'string' || typeof body.id === 'number')
    );
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(id: string | number, code: number, message: string, data?: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
  }

  /**
   * Create specific error response for initialization failures
   */
  private createInitializationErrorResponse(
    id: string | number, 
    type: string, 
    message: string, 
    data?: any
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: MCPErrorCode.INTERNAL_ERROR,
        message,
        data: {
          type: 'initialization_error',
          errorType: type,
          ...data
        }
      }
    };
  }

  /**
   * Set the MCP request handler
   */
  public setRequestHandler(handler: (request: MCPRequest) => Promise<MCPResponse>): void {
    this.requestHandler = handler;
  }

  /**
   * Get the number of active connections
   */
  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection information for monitoring
   */
  public getConnectionInfo(): Array<{ id: string; lastActivity: number; correlationId: string }> {
    return Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      lastActivity: conn.lastActivity,
      correlationId: conn.correlationId
    }));
  }

  /**
   * Stop the SSE transport handler
   */
  public stop(): void {
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Close all connections
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      this.closeConnection(connectionId);
    }

    if (this.config.enableLogging) {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'sse_transport_stopped',
        message: 'SSE transport handler stopped'
      }));
    }
  }

  /**
   * Broadcast message to all connections
   */
  public broadcast(event: string, data: any): void {
    for (const connectionId of this.connections.keys()) {
      this.sendEvent(connectionId, event, data);
    }
  }
}