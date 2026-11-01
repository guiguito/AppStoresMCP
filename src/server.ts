/**
 * Main MCP Server Application
 * Orchestrates HTTP transport, tool registry, and MCP protocol handling
 */

import { HTTPTransportHandler } from './transport/http-transport';
import { SSETransportHandler } from './transport/sse-transport';
import { MCPHandler } from './protocol/mcp-handler';
import { ToolRegistry } from './registry/tool-registry';
import { ServerConfig, loadConfig, getConfigSummary, isToolEnabled } from './config/server-config';
import { MCPRequest, MCPResponse } from './types/mcp';

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
  private httpTransport: HTTPTransportHandler;
  private sseTransport?: SSETransportHandler;
  private mcpHandler: MCPHandler;
  private toolRegistry: ToolRegistry;
  private isRunning: boolean = false;

  constructor(config?: ServerConfig) {
    this.config = config || loadConfig();
    this.toolRegistry = new ToolRegistry();
    this.mcpHandler = new MCPHandler(this.toolRegistry);
    const handleRequest = (request: MCPRequest): Promise<MCPResponse | undefined> => this.mcpHandler.handleRequest(request);

    if (this.config.transport.enableSSE) {
      this.sseTransport = new SSETransportHandler({
        heartbeatInterval: this.config.transport.sse.heartbeatInterval,
        maxConnections: this.config.transport.sse.maxConnections,
        enableLogging: this.config.server.enableLogging
      }, handleRequest);
    }

    this.httpTransport = new HTTPTransportHandler({
      port: this.config.port,
      corsOrigins: this.config.cors.origins,
      enableLogging: this.config.server.enableLogging,
      requestTimeout: this.config.server.requestTimeout,
      trustProxy: this.config.server.trustProxy,
      rateLimit: this.config.rateLimit,
      https: this.config.transport.https
    }, handleRequest, this.sseTransport);
  }

  /**
   * Initialize and register all MCP tools
   */
  private initializeTools(): void {
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

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'tools_registered',
      message: `Successfully registered ${this.toolRegistry.size()} MCP tools`,
      registeredTools,
      skippedTools: skippedTools.length > 0 ? skippedTools : undefined
    }));
  }

  /**
   * Start the MCP server
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'server_starting',
      message: 'Starting App Store MCP Server',
      config: getConfigSummary(this.config)
    }));

    this.initializeTools();
    await this.httpTransport.start();
    this.isRunning = true;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'server_started',
      message: `App Store MCP Server started successfully on port ${this.config.port}`,
      endpoints: {
        mcp: '/mcp',
        health: '/health',
        ...(this.sseTransport && { sse: '/sse', sseMessage: '/sse/:connectionId/message' })
      }
    }));
  }

  /**
   * Stop the MCP server gracefully
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    this.sseTransport?.stop();
    await this.httpTransport.stop();
    this.isRunning = false;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'server_stopped',
      message: 'App Store MCP Server stopped'
    }));
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }

  public getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  public getHttpTransport(): HTTPTransportHandler {
    return this.httpTransport;
  }
}
