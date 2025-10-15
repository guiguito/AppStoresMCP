/**
 * Main MCP Server Application
 * Orchestrates HTTP transport, tool registry, and MCP protocol handling
 */

import { HTTPTransportHandler } from './transport/http-transport';
import { SSETransportHandler } from './transport/sse-transport';
import { MCPHandler } from './protocol/mcp-handler';
import { ToolRegistry } from './registry/tool-registry';
import { ServerConfig, loadConfig, getConfigSummary, isToolEnabled } from './config/server-config';

// Import all MCP tools
import { GooglePlayAppDetailsTool } from './tools/google-play-app-details.tool';
import { GooglePlayAppReviewsTool } from './tools/google-play-app-reviews.tool';
import { GooglePlaySearchTool } from './tools/google-play-search.tool';
import { GooglePlayListTool } from './tools/google-play-list.tool';
import { GooglePlayDeveloperTool } from './tools/google-play-developer.tool';
import { GooglePlaySuggestTool } from './tools/google-play-suggest.tool';
import { GooglePlaySimilarTool } from './tools/google-play-similar.tool';
import { GooglePlayPermissionsTool } from './tools/google-play-permissions.tool';
import { GooglePlayDataSafetyTool } from './tools/google-play-datasafety.tool';
import { GooglePlayCategoriesTool } from './tools/google-play-categories.tool';
import { AppStoreAppDetailsTool } from './tools/app-store-app-details.tool';
import { AppStoreAppReviewsTool } from './tools/app-store-app-reviews.tool';
import { AppStoreSearchTool } from './tools/app-store-search.tool';
import { AppStoreListTool } from './tools/app-store-list.tool';
import { AppStoreDeveloperTool } from './tools/app-store-developer.tool';
import { AppStorePrivacyTool } from './tools/app-store-privacy.tool';
import { AppStoreSuggestTool } from './tools/app-store-suggest.tool';
import { AppStoreSimilarTool } from './tools/app-store-similar.tool';
import { AppStoreRatingsTool } from './tools/app-store-ratings.tool';

/**
 * Main MCP Server class that manages the entire application lifecycle
 */
export class MCPServer {
  private config: ServerConfig;
  private httpTransport?: HTTPTransportHandler;
  private sseTransport?: SSETransportHandler;
  private mcpHandler: MCPHandler;
  private toolRegistry: ToolRegistry;
  private isRunning: boolean = false;
  private shutdownHandlers: Array<() => Promise<void>> = [];
  private static processListenersSetup: boolean = false;

  constructor(config?: ServerConfig) {
    this.config = config || loadConfig();
    
    // Validate configuration even if explicitly provided
    if (config) {
      this.validateExplicitConfig(config);
    }
    
    this.toolRegistry = new ToolRegistry();
    this.mcpHandler = new MCPHandler(this.toolRegistry);
    
    // Initialize transports based on configuration
    this.initializeTransports();

    // Set up graceful shutdown handling
    this.setupGracefulShutdown();
  }

  /**
   * Validate explicitly provided configuration
   */
  private validateExplicitConfig(config: ServerConfig): void {
    // Validate transport configuration
    if (!config.transport.enableHttp) {
      throw new Error('HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.');
    }

    // Validate SSE configuration only if SSE transport is enabled
    if (config.transport.enableSSE) {
      if (config.transport.sse.heartbeatInterval < 1000) {
        throw new Error(`SSE heartbeat interval too small: ${config.transport.sse.heartbeatInterval}ms. Must be at least 1000ms.`);
      }

      if (config.transport.sse.connectionTimeout <= config.transport.sse.heartbeatInterval) {
        throw new Error(`SSE connection timeout must be greater than heartbeat interval`);
      }

      if (config.transport.sse.maxConnections < 1) {
        throw new Error(`SSE max connections too small: ${config.transport.sse.maxConnections}. Must be at least 1.`);
      }
    }
  }

  /**
   * Initialize transport handlers based on configuration
   */
  private initializeTransports(): void {
    // Initialize HTTP transport if enabled
    if (this.config.transport.enableHttp) {
      this.httpTransport = new HTTPTransportHandler({
        port: this.config.port,
        corsOrigins: this.config.cors.origins,
        enableLogging: this.config.server.enableLogging,
        requestTimeout: this.config.server.requestTimeout,
        https: this.config.transport.https
      });

      // Set up MCP request handler for HTTP transport
      this.httpTransport.setRequestHandler(
        (request) => this.mcpHandler.handleRequest(request)
      );
    }

    // Initialize SSE transport if enabled
    if (this.config.transport.enableSSE) {
      this.sseTransport = new SSETransportHandler({
        heartbeatInterval: this.config.transport.sse.heartbeatInterval,
        connectionTimeout: this.config.transport.sse.connectionTimeout,
        maxConnections: this.config.transport.sse.maxConnections,
        enableLogging: this.config.server.enableLogging,
        autoInitialize: this.config.transport.sse.autoInitialize,
        initializationTimeout: this.config.transport.sse.initializationTimeout
      });

      // Set up MCP request handler for SSE transport
      this.sseTransport.setRequestHandler(
        (request) => this.mcpHandler.handleRequest(request)
      );
    }

    // Integrate SSE transport with HTTP transport for routing if both are enabled
    if (this.httpTransport && this.sseTransport) {
      this.httpTransport.setSSEHandler(this.sseTransport);
    } else if (this.httpTransport && !this.sseTransport) {
      // Finalize routes when only HTTP transport is enabled
      this.httpTransport.finalizeRoutes();
    }
  }

  /**
   * Initialize and register all MCP tools
   */
  private async initializeTools(): Promise<void> {
    try {
      const availableTools = [
        // Google Play Store tools
        { name: 'google-play-app-details', class: GooglePlayAppDetailsTool },
        { name: 'google-play-app-reviews', class: GooglePlayAppReviewsTool },
        { name: 'google-play-search', class: GooglePlaySearchTool },
        { name: 'google-play-list', class: GooglePlayListTool },
        { name: 'google-play-developer', class: GooglePlayDeveloperTool },
        { name: 'google-play-suggest', class: GooglePlaySuggestTool },
        { name: 'google-play-similar', class: GooglePlaySimilarTool },
        { name: 'google-play-permissions', class: GooglePlayPermissionsTool },
        { name: 'google-play-datasafety', class: GooglePlayDataSafetyTool },
        { name: 'google-play-categories', class: GooglePlayCategoriesTool },
        
        // Apple App Store tools
        { name: 'app-store-app-details', class: AppStoreAppDetailsTool },
        { name: 'app-store-app-reviews', class: AppStoreAppReviewsTool },
        { name: 'app-store-search', class: AppStoreSearchTool },
        { name: 'app-store-list', class: AppStoreListTool },
        { name: 'app-store-developer', class: AppStoreDeveloperTool },
        { name: 'app-store-privacy', class: AppStorePrivacyTool },
        { name: 'app-store-suggest', class: AppStoreSuggestTool },
        { name: 'app-store-similar', class: AppStoreSimilarTool },
        { name: 'app-store-ratings', class: AppStoreRatingsTool }
      ];

      const registeredTools: string[] = [];
      const skippedTools: string[] = [];

      // Register tools based on configuration
      for (const tool of availableTools) {
        if (isToolEnabled(tool.name, this.config)) {
          this.toolRegistry.registerTool(new tool.class());
          registeredTools.push(tool.name);
        } else {
          skippedTools.push(tool.name);
        }
      }

      const toolCount = this.toolRegistry.size();

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'tools_registered',
        message: `Successfully registered ${toolCount} MCP tools`,
        registeredTools,
        skippedTools: skippedTools.length > 0 ? skippedTools : undefined
      }));

    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'tool_registration_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }));
      throw error;
    }
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    // Validate that at least HTTP transport is enabled (SSE requires HTTP)
    if (!this.httpTransport) {
      throw new Error('HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.');
    }

    try {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'server_starting',
        message: 'Starting App Store MCP Server',
        config: getConfigSummary(this.config)
      }));

      // Initialize and register tools
      await this.initializeTools();

      // Start HTTP transport if enabled
      if (this.httpTransport) {
        await this.httpTransport.start();
      }

      this.isRunning = true;

      // Build endpoints object based on enabled transports
      const endpoints: Record<string, string> = {};
      if (this.httpTransport) {
        endpoints.mcp = '/mcp';
        endpoints.health = '/health';
        
        if (this.sseTransport) {
          endpoints.sse = '/sse';
          endpoints.sseMessage = '/sse/:connectionId/message';
        }
      }

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'server_started',
        message: `App Store MCP Server started successfully on port ${this.config.port}`,
        transports: {
          http: !!this.httpTransport,
          sse: !!this.sseTransport
        },
        endpoints
      }));

    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'server_start_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }));
      throw error;
    }
  }

  /**
   * Stop the MCP server gracefully
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'server_stopping',
        message: 'Stopping App Store MCP Server'
      }));

      // Execute shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          console.error(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'error',
            type: 'shutdown_handler_error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      }

      // Stop SSE transport if enabled
      if (this.sseTransport) {
        this.sseTransport.stop();
      }

      // Stop HTTP transport if enabled
      if (this.httpTransport) {
        await this.httpTransport.stop();
      }

      this.isRunning = false;

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'server_stopped',
        message: 'App Store MCP Server stopped successfully'
      }));

    } catch (error) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'server_stop_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }));
      throw error;
    }
  }

  /**
   * Add a shutdown handler
   */
  public addShutdownHandler(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Set up graceful shutdown handling for process signals
   */
  private setupGracefulShutdown(): void {
    // Only set up process listeners once to avoid MaxListenersExceededWarning
    if (MCPServer.processListenersSetup) {
      return;
    }
    MCPServer.processListenersSetup = true;

    const gracefulShutdown = async (signal: string) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'shutdown_signal',
        message: `Received ${signal}, initiating graceful shutdown`
      }));

      try {
        // In production, exit the process
        if (process.env.NODE_ENV !== 'test') {
          process.exit(0);
        }
      } catch (error) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'shutdown_error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
        if (process.env.NODE_ENV !== 'test') {
          process.exit(1);
        }
      }
    };

    // Handle various shutdown signals (only in production)
    if (process.env.NODE_ENV !== 'test') {
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
      process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

      // Handle uncaught exceptions and unhandled rejections
      process.on('uncaughtException', (error: Error) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'uncaught_exception',
          error: error.message,
          stack: error.stack
        }));
        
        process.exit(1);
      });

      process.on('unhandledRejection', (reason: any) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          type: 'unhandled_rejection',
          reason: reason instanceof Error ? reason.message : String(reason),
          stack: reason instanceof Error ? reason.stack : undefined
        }));
        
        process.exit(1);
      });
    }
  }

  /**
   * Check if the server is running
   */
  public isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get server configuration
   */
  public getConfig(): ServerConfig {
    return { ...this.config };
  }

  /**
   * Get tool registry (for testing)
   */
  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Get HTTP transport handler (for testing)
   */
  public getHttpTransport(): HTTPTransportHandler | undefined {
    return this.httpTransport;
  }

  /**
   * Get SSE transport handler (for testing)
   */
  public getSSETransport(): SSETransportHandler | undefined {
    return this.sseTransport;
  }

  /**
   * Health check method
   */
  public getHealthStatus(): { status: string; uptime: number; tools: number; sseConnections: number; config: any } {
    return {
      status: this.isRunning ? 'healthy' : 'stopped',
      uptime: process.uptime(),
      tools: this.toolRegistry.size(),
      sseConnections: this.sseTransport ? this.sseTransport.getConnectionCount() : 0,
      config: getConfigSummary(this.config)
    };
  }
}