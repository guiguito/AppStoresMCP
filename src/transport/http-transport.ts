/**
 * HTTP Transport Layer for MCP Streamable HTTP
 * Implements MCP protocol over HTTP following the Streamable HTTP transport specification
 */

import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { MCPRequest, MCPResponse, MCPError, MCPErrorCode } from '../types/mcp';

/**
 * HTTP Transport configuration options
 */
export interface HTTPTransportConfig {
  port: number;
  corsOrigins?: string | string[];
  enableLogging?: boolean;
  requestTimeout?: number;
  https?: {
    enabled: boolean;
    keyPath?: string | undefined;
    certPath?: string | undefined;
    caPath?: string | undefined;
    passphrase?: string | undefined;
  };
}

/**
 * Extended Request interface with correlation ID
 */
export interface MCPHttpRequest extends Request {
  correlationId: string;
}

/**
 * HTTP Transport Handler for MCP Streamable HTTP
 */
export class HTTPTransportHandler {
  private app: express.Application;
  private server?: http.Server | https.Server;
  private config: HTTPTransportConfig;
  private requestHandler?: (request: MCPRequest) => Promise<MCPResponse>;
  private sseHandler?: any;
  private finalHandlersSetup: boolean = false;

  constructor(config: HTTPTransportConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Create HTTPS options from configuration
   */
  private createHttpsOptions(): https.ServerOptions {
    if (!this.config.https?.enabled) {
      throw new Error('HTTPS is not enabled in configuration');
    }

    const { keyPath, certPath, caPath, passphrase } = this.config.https;

    if (!keyPath || !certPath) {
      throw new Error('HTTPS key and certificate paths are required');
    }

    try {
      const options: https.ServerOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };

      if (caPath) {
        options.ca = fs.readFileSync(caPath);
      }

      if (passphrase) {
        options.passphrase = passphrase;
      }

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'https_config_loaded',
        message: 'HTTPS configuration loaded successfully',
        keyPath,
        certPath,
        caPath: caPath || 'not provided',
        hasPassphrase: !!passphrase
      }));

      return options;
    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'https_config_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        keyPath,
        certPath,
        caPath
      }));
      throw new Error(`Failed to load HTTPS certificates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set up Express middleware for security, CORS, and request processing
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS middleware
    this.app.use(cors({
      origin: this.config.corsOrigins || '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
      credentials: false
    }));

    // Request parsing middleware with error handling
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, _res, buf) => {
        // Store raw body for potential error handling
        (req as any).rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // JSON parsing error handler
    this.app.use(this.jsonErrorHandler);

    // Correlation ID middleware
    this.app.use(this.correlationIdMiddleware);

    // Request logging middleware
    if (this.config.enableLogging !== false) {
      this.app.use(this.requestLoggingMiddleware);
    }

    // Request timeout middleware
    if (this.config.requestTimeout) {
      this.app.use(this.timeoutMiddleware);
    }
  }

  /**
   * Middleware to add correlation ID to each request
   */
  private correlationIdMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const mcpReq = req as MCPHttpRequest;
    mcpReq.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
    res.setHeader('X-Correlation-ID', mcpReq.correlationId);
    next();
  };

  /**
   * Request logging middleware with structured logging
   */
  private requestLoggingMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const mcpReq = req as MCPHttpRequest;
    const startTime = Date.now();
    
    // Log request
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'http_request',
      correlationId: mcpReq.correlationId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length']
    }));

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'http_response',
        correlationId: mcpReq.correlationId,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length')
      }));
    });

    next();
  };

  /**
   * JSON parsing error handler middleware
   */
  private jsonErrorHandler: ErrorRequestHandler = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    if (error instanceof SyntaxError && 'body' in error) {
      const mcpReq = req as MCPHttpRequest;
      res.status(400).json(this.createErrorResponse(
        mcpReq.correlationId || 'unknown',
        MCPErrorCode.PARSE_ERROR,
        'Invalid JSON in request body'
      ));
    } else {
      next(error);
    }
  };

  /**
   * Request timeout middleware
   */
  private timeoutMiddleware: RequestHandler = (_req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json(this.createErrorResponse(
          'timeout',
          MCPErrorCode.INTERNAL_ERROR,
          'Request timeout',
          { timeout: this.config.requestTimeout }
        ));
      }
    }, this.config.requestTimeout);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };

  /**
   * Set up HTTP routes for MCP transport
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // MCP Streamable HTTP endpoint
    this.app.post('/mcp', (req: Request, res: Response) => {
      const mcpReq = req as MCPHttpRequest;
      this.handleMCPRequest(mcpReq, res);
    });

    // Note: Final handlers (404 and error handlers) are set up later
    // after SSE routes are registered (if enabled) or when finalizeRoutes() is called
  }

  /**
   * Set up final route handlers (404 and error handlers)
   */
  private setupFinalHandlers(): void {
    if (this.finalHandlersSetup) {
      return;
    }

    // Handle 404 for unknown routes
    this.app.use((req: Request, res: Response) => {
      const mcpReq = req as MCPHttpRequest;
      res.status(404).json(this.createErrorResponse(
        mcpReq.correlationId,
        MCPErrorCode.METHOD_NOT_FOUND,
        `Route not found: ${req.method} ${req.originalUrl}`
      ));
    });

    // Global error handler
    this.app.use(this.errorHandler);

    this.finalHandlersSetup = true;
  }

  /**
   * Handle MCP Streamable HTTP requests
   */
  private async handleMCPRequest(req: MCPHttpRequest, res: Response): Promise<void> {
    try {
      // Validate request format
      if (!this.isValidMCPRequest(req.body)) {
        // Log the invalid request for debugging
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'invalid_mcp_request',
          correlationId: req.correlationId,
          rawBody: req.body,
          bodyType: typeof req.body,
          bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : 'not-object'
        }));
        
        res.status(400).json(this.createErrorResponse(
          req.correlationId,
          MCPErrorCode.INVALID_REQUEST,
          'Invalid MCP request format'
        ));
        return;
      }

      const mcpRequest: MCPRequest = req.body;

      // Log MCP request
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'mcp_request',
        correlationId: req.correlationId,
        method: mcpRequest.method,
        id: mcpRequest.id,
        params: mcpRequest.params
      }));

      // Process MCP request
      if (!this.requestHandler) {
        res.status(500).json(this.createErrorResponse(
          mcpRequest.id,
          MCPErrorCode.INTERNAL_ERROR,
          'MCP request handler not configured'
        ));
        return;
      }

      const mcpResponse = await this.requestHandler(mcpRequest);

      // Log MCP response
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'mcp_response',
        correlationId: req.correlationId,
        id: mcpResponse?.id,
        hasError: !!mcpResponse?.error,
        errorCode: mcpResponse?.error?.code
      }));

      // Send response with appropriate status code
      const statusCode = mcpResponse?.error ? this.getHttpStatusFromMCPError(mcpResponse.error) : 200;
      res.status(statusCode).json(mcpResponse);

    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'mcp_error',
        correlationId: req.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }));

      res.status(500).json(this.createErrorResponse(
        req.body?.id || req.correlationId,
        MCPErrorCode.INTERNAL_ERROR,
        'Internal server error'
      ));
    }
  }

  /**
   * Validate MCP request format (handles both requests and notifications)
   */
  private isValidMCPRequest(body: any): body is MCPRequest {
    return (
      body &&
      typeof body === 'object' &&
      body.jsonrpc === '2.0' &&
      typeof body.method === 'string' &&
      // id is required for requests, but optional for notifications
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
   * Map MCP error codes to HTTP status codes
   */
  private getHttpStatusFromMCPError(error: MCPError): number {
    switch (error.code) {
      case MCPErrorCode.PARSE_ERROR:
      case MCPErrorCode.INVALID_REQUEST:
      case MCPErrorCode.INVALID_PARAMS:
        return 400;
      case MCPErrorCode.METHOD_NOT_FOUND:
        return 404;
      case MCPErrorCode.INTERNAL_ERROR:
      default:
        return 500;
    }
  }

  /**
   * Global error handler middleware
   */
  private errorHandler: ErrorRequestHandler = (error: Error, req: Request, res: Response): void => {
    const mcpReq = req as MCPHttpRequest;
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'unhandled_error',
      correlationId: mcpReq.correlationId,
      error: error.message,
      stack: error.stack
    }));

    if (!res.headersSent) {
      res.status(500).json(this.createErrorResponse(
        mcpReq.correlationId,
        MCPErrorCode.INTERNAL_ERROR,
        'Internal server error'
      ));
    }
  };

  /**
   * Set the MCP request handler
   */
  public setRequestHandler(handler: (request: MCPRequest) => Promise<MCPResponse>): void {
    this.requestHandler = handler;
  }

  /**
   * Set the SSE handler for SSE transport integration
   */
  public setSSEHandler(sseHandler: any): void {
    this.sseHandler = sseHandler;
    this.setupSSERoutes();
    this.setupFinalHandlers();
  }

  /**
   * Finalize route setup when no SSE transport is configured
   */
  public finalizeRoutes(): void {
    this.setupFinalHandlers();
  }

  /**
   * Set up SSE routes for Server-Sent Events transport
   */
  private setupSSERoutes(): void {
    if (!this.sseHandler) {
      return;
    }

    // SSE connection endpoint
    this.app.get('/sse', (req: Request, res: Response) => {
      this.sseHandler.handleSSEConnection(req, res);
    });

    // SSE message endpoint for receiving messages from clients
    this.app.post('/sse/:connectionId/message', async (req: Request, res: Response) => {
      const connectionId = req.params.connectionId;
      const message = req.body;

      try {
        await this.sseHandler.handleMCPMessage(connectionId, message);
        res.status(200).json({ status: 'message_received' });
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'sse_message_error',
          connectionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        res.status(500).json({ error: 'Failed to process message' });
      }
    });

    // Set up final handlers (404 and error handlers) after all routes are configured
    this.setupFinalHandlers();
  }

  /**
   * Start the HTTP server
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const isHttpsEnabled = this.config.https?.enabled === true;
        
        if (isHttpsEnabled) {
          // HTTPS server setup
          const httpsOptions = this.createHttpsOptions();
          this.server = https.createServer(httpsOptions, this.app);
        } else {
          // HTTP server setup
          this.server = http.createServer(this.app);
        }

        this.server.listen(this.config.port, () => {
          const protocol = isHttpsEnabled ? 'HTTPS' : 'HTTP';
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'server_start',
            message: `MCP ${protocol} transport server started on port ${this.config.port}`,
            protocol: protocol.toLowerCase(),
            port: this.config.port,
            httpsEnabled: isHttpsEnabled
          }));
          resolve();
        });

        this.server.on('error', (error: Error) => {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'server_error',
            error: error.message,
            httpsEnabled: isHttpsEnabled
          }));
          reject(error);
        });
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'server_start_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          httpsEnabled: this.config.https?.enabled
        }));
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server
   */
  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((error?: Error) => {
          if (error && error.message !== 'Server is not running.') {
            console.error(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'error',
              type: 'server_stop_error',
              error: error.message
            }));
            reject(error);
          } else {
            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'info',
              type: 'server_stop',
              message: 'MCP HTTP transport server stopped'
            }));
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the Express app instance (for testing)
   */
  public getApp(): express.Application {
    return this.app;
  }
}