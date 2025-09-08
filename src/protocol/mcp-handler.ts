/**
 * MCP Protocol Handler for processing MCP messages and tool execution
 */

import { MCPRequest, MCPResponse, MCPError } from '../types/mcp';
import { ToolRegistry } from '../registry/tool-registry';
import { validateToolParams } from '../utils/validation';
import { ErrorHandler } from '../errors/error-handler';
import { RetryHandler } from '../errors/retry-handler';
import { v4 as uuidv4 } from 'uuid';

/**
 * MCP Protocol Handler class processes MCP messages and manages tool execution
 */
export class MCPHandler {
  private toolRegistry: ToolRegistry;
  private errorHandler: ErrorHandler;
  private retryHandler: RetryHandler;

  constructor(toolRegistry: ToolRegistry) {
    this.toolRegistry = toolRegistry;
    this.errorHandler = ErrorHandler.getInstance();
    this.retryHandler = new RetryHandler();
  }

  /**
   * Handle incoming MCP requests
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const correlationId = uuidv4();
    const context = { 
      method: (request as any)?.method || 'unknown',
      requestId: (request as any)?.id || 'unknown'
    };

    try {
      // Validate basic request structure
      if (!this.isValidRequest(request)) {
        const errorResponse = this.errorHandler.handleError(
          new Error('Invalid request format'),
          correlationId,
          context
        );
        return this.createMCPErrorResponse((request as any)?.id || null, errorResponse);
      }

      // Route request based on method
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request, correlationId);
        
        case 'notifications/initialized':
          return this.handleNotificationInitialized(request, correlationId);
        
        case 'ping':
          return this.handlePing(request, correlationId);
        
        case 'tools/list':
          return this.handleToolsList(request, correlationId);
        
        case 'tools/call':
          return await this.handleToolCall(request, correlationId);
        
        default:
          const methodNotFoundError = this.errorHandler.handleError(
            new Error(`Method '${request.method}' not found`),
            correlationId,
            context
          );
          return this.createMCPErrorResponse(request.id, methodNotFoundError);
      }
    } catch (error) {
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        context
      );
      return this.createMCPErrorResponse((request as any)?.id || null, errorResponse);
    }
  }

  /**
   * Handle initialize requests for MCP protocol handshake
   */
  private handleInitialize(request: MCPRequest, correlationId: string): MCPResponse {
    try {
      const params = request.params || {};
      
      // Validate protocol version if provided
      const protocolVersion = params.protocolVersion;
      const supportedVersion = '2025-03-26'; // MCP protocol version we support
      
      if (protocolVersion && protocolVersion !== supportedVersion) {
        console.warn(`Client requested protocol version ${protocolVersion}, but server supports ${supportedVersion}`);
      }

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: supportedVersion,
          capabilities: {
            tools: {},
            logging: {}
          },
          serverInfo: {
            name: 'app-store-mcp-server',
            version: '1.0.0'
          }
        }
      };
    } catch (error) {
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        { method: 'initialize', requestId: request.id }
      );
      return this.createMCPErrorResponse(request.id, errorResponse);
    }
  }

  /**
   * Handle notifications/initialized - sent by client after successful initialization
   */
  private handleNotificationInitialized(request: MCPRequest, correlationId: string): MCPResponse {
    try {
      // This is a notification, so we don't send a response back
      // Just log that the client has been initialized
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'client_initialized',
        correlationId: correlationId,
        message: 'MCP client has been initialized successfully'
      }));

      // For notifications, we return a response but the transport layer should not send it
      // However, our current HTTP transport expects a response, so we return an empty one
      return {
        jsonrpc: '2.0',
        id: request.id || 0,
        result: {}
      };
    } catch (error) {
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        { method: 'notifications/initialized', requestId: request.id }
      );
      return this.createMCPErrorResponse(request.id || null, errorResponse);
    }
  }

  /**
   * Handle ping requests for connection health checks
   */
  private handlePing(request: MCPRequest, correlationId: string): MCPResponse {
    try {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {}
      };
    } catch (error) {
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        { method: 'ping', requestId: request.id }
      );
      return this.createMCPErrorResponse(request.id, errorResponse);
    }
  }

  /**
   * Handle tools/list requests for tool discovery
   */
  private handleToolsList(request: MCPRequest, correlationId: string): MCPResponse {
    try {
      const toolsList = this.toolRegistry.getToolsList();
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: toolsList
      };
    } catch (error) {
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        { method: 'tools/list', requestId: request.id }
      );
      return this.createMCPErrorResponse(request.id, errorResponse);
    }
  }

  /**
   * Handle tools/call requests for tool execution
   */
  private async handleToolCall(request: MCPRequest, correlationId: string): Promise<MCPResponse> {
    const context = { 
      method: 'tools/call', 
      requestId: request.id,
      toolName: request.params?.name || 'unknown'
    };

    try {
      // Validate call parameters
      if (!request.params || typeof request.params !== 'object') {
        const errorResponse = this.errorHandler.handleError(
          new Error('Tool call requires parameters object'),
          correlationId,
          context
        );
        return this.createMCPErrorResponse(request.id, errorResponse);
      }

      const { name, arguments: toolArgs } = request.params;

      if (!name || typeof name !== 'string') {
        const errorResponse = this.errorHandler.handleError(
          new Error('Tool name is required and must be a string'),
          correlationId,
          context
        );
        return this.createMCPErrorResponse(request.id, errorResponse);
      }

      // Get the tool
      const tool = this.toolRegistry.getTool(name);
      if (!tool) {
        const errorResponse = this.errorHandler.handleError(
          new Error(`Tool '${name}' not found`),
          correlationId,
          { ...context, toolName: name }
        );
        return this.createMCPErrorResponse(request.id, errorResponse);
      }

      // Validate tool arguments against schema
      try {
        validateToolParams(toolArgs || {}, tool.inputSchema);
      } catch (validationError) {
        const errorResponse = this.errorHandler.handleError(
          validationError,
          correlationId,
          { ...context, toolName: name, validationTarget: 'parameters' }
        );
        return this.createMCPErrorResponse(request.id, errorResponse);
      }

      // Execute the tool with retry logic for retryable errors
      const result = await this.retryHandler.executeWithRetryThrow(
        () => tool.execute(toolArgs || {}),
        correlationId,
        { ...context, toolName: name, operation: 'execute' }
      );

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      // Handle tool execution errors with comprehensive error handling
      const errorResponse = this.errorHandler.handleError(
        error,
        correlationId,
        { ...context, operation: 'execute' }
      );
      return this.createMCPErrorResponse(request.id, errorResponse);
    }
  }

  /**
   * Validate basic request structure (handles both requests and notifications)
   */
  private isValidRequest(request: any): request is MCPRequest {
    return (
      request &&
      typeof request === 'object' &&
      request.jsonrpc === '2.0' &&
      typeof request.method === 'string' &&
      // id is required for requests, but optional for notifications
      (request.id === undefined || typeof request.id === 'string' || typeof request.id === 'number')
    );
  }



  /**
   * Create MCP error response from structured error response
   */
  private createMCPErrorResponse(
    id: string | number | null,
    errorResponse: { error: MCPError; errorInfo: any }
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: id || 0,
      error: errorResponse.error
    };
  }
}