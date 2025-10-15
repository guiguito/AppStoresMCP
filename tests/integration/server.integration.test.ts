/**
 * Integration tests for complete server startup and tool registration
 * Tests the full MCP server lifecycle and tool functionality
 */

import request from 'supertest';
import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

// Mock the scraper services to avoid ES module issues
jest.mock('../../src/services/google-play-scraper.service', () => ({
  GooglePlayScraperService: jest.fn().mockImplementation(() => ({
    getAppDetails: jest.fn(),
    getAppReviews: jest.fn(),
    searchApps: jest.fn()
  }))
}));

jest.mock('../../src/services/app-store-scraper.service', () => ({
  AppStoreScraperService: jest.fn().mockImplementation(() => ({
    getAppDetails: jest.fn(),
    getAppReviews: jest.fn(),
    searchApps: jest.fn()
  }))
}));

describe('MCP Server Integration Tests', () => {
  let server: MCPServer;
  let testConfig: ServerConfig;

  beforeAll(() => {
    // Test configuration with different port to avoid conflicts
    testConfig = {
      port: 0, // Use random available port
      logLevel: 'error', // Reduce log noise in tests
      rateLimiting: {
        windowMs: 60000,
        maxRequests: 100
      },
      scraping: {
        timeout: 10000,
        retries: 2
      },
      cors: {
        origins: '*'
      },
      server: {
        requestTimeout: 30000,
        enableLogging: false // Disable logging for cleaner test output
      },
      transport: {
        enableHttp: true,
        enableSSE: true,
        https: {
          enabled: false
        },
        sse: {
          heartbeatInterval: 30000,
          connectionTimeout: 60000,
          maxConnections: 100,
          autoInitialize: true,
          initializationTimeout: 5000
        }
      },
      tools: {
        enabledTools: new Set<string>(),
        disabledTools: new Set<string>()
      }
    };
  });

  beforeEach(async () => {
    server = new MCPServer(testConfig);
  });

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  describe('Server Lifecycle', () => {
    test('should start and stop server successfully', async () => {
      expect(server.isServerRunning()).toBe(false);
      
      await server.start();
      expect(server.isServerRunning()).toBe(true);
      
      await server.stop();
      expect(server.isServerRunning()).toBe(false);
    });

    test('should not allow starting server twice', async () => {
      await server.start();
      
      await expect(server.start()).rejects.toThrow('Server is already running');
      
      await server.stop();
    });

    test('should handle stop when server is not running', async () => {
      expect(server.isServerRunning()).toBe(false);
      
      // Should not throw error
      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('Tool Registration', () => {
    test('should register all expected tools on startup', async () => {
      await server.start();
      
      const toolRegistry = server.getToolRegistry();
      const toolNames = toolRegistry.getToolNames();
      
      // Verify all 19 tools are registered (10 Google Play + 9 App Store)
      expect(toolNames).toHaveLength(19);
      expect(toolNames).toContain('google-play-app-details');
      expect(toolNames).toContain('google-play-app-reviews');
      expect(toolNames).toContain('google-play-search');
      expect(toolNames).toContain('app-store-app-details');
      expect(toolNames).toContain('app-store-app-reviews');
      expect(toolNames).toContain('app-store-search');
      
      await server.stop();
    });

    test('should provide tool discovery through MCP protocol', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list'
        })
        .expect(200);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'google-play-app-details',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            }),
            expect.objectContaining({
              name: 'app-store-search',
              description: expect.any(String),
              inputSchema: expect.any(Object)
            })
          ])
        }
      });
      
      expect(response.body.result.tools).toHaveLength(19); // 10 Google Play + 9 App Store tools
      
      await server.stop();
    });
  });

  describe('HTTP Transport', () => {
    test('should handle health check endpoint', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
      
      await server.stop();
    });

    test('should handle CORS preflight requests', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      await request(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);
      
      await server.stop();
    });

    test('should return 404 for unknown routes', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Route not found')
        }
      });
      
      await server.stop();
    });
  });

  describe('MCP Protocol Handling', () => {
    test('should handle invalid JSON requests', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Invalid JSON')
        }
      });
      
      await server.stop();
    });

    test('should handle invalid MCP requests', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          // Missing required fields
          method: 'tools/list'
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Invalid MCP request format')
        }
      });
      
      await server.stop();
    });

    test('should handle unknown methods', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'unknown/method'
        })
        .expect(404);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: expect.any(Number),
          message: expect.stringContaining("Method 'unknown/method' not found")
        }
      });
      
      await server.stop();
    });

    test('should handle tool calls with missing parameters', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            // Missing name parameter
            arguments: {}
          }
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Tool name is required')
        }
      });
      
      await server.stop();
    });

    test('should handle calls to non-existent tools', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'non-existent-tool',
            arguments: {}
          }
        })
        .expect(404);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: expect.any(Number),
          message: expect.stringContaining("Tool 'non-existent-tool' not found")
        }
      });
      
      await server.stop();
    });
  });

  describe('Tool Execution Integration', () => {
    test('should execute Google Play app details tool with invalid parameters', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'google-play-app-details',
            arguments: {
              // Missing required appId parameter
            }
          }
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: expect.any(Number),
          message: expect.any(String)
        }
      });
      
      await server.stop();
    });

    test('should execute App Store search tool with invalid parameters', async () => {
      await server.start();
      
      const app = server.getHttpTransport()!.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'app-store-search',
            arguments: {
              // Missing required query parameter
            }
          }
        })
        .expect(400);
      
      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: expect.any(Number),
          message: expect.any(String)
        }
      });
      
      await server.stop();
    });
  });

  describe('Configuration Management', () => {
    test('should use provided configuration', async () => {
      const customConfig: ServerConfig = {
        ...testConfig,
        logLevel: 'debug',
        rateLimiting: {
          windowMs: 30000,
          maxRequests: 50
        }
      };
      
      const customServer = new MCPServer(customConfig);
      const serverConfig = customServer.getConfig();
      
      expect(serverConfig.logLevel).toBe('debug');
      expect(serverConfig.rateLimiting.windowMs).toBe(30000);
      expect(serverConfig.rateLimiting.maxRequests).toBe(50);
    });

    test('should provide health status information', async () => {
      await server.start();
      
      const healthStatus = server.getHealthStatus();
      
      expect(healthStatus).toMatchObject({
        status: 'healthy',
        uptime: expect.any(Number),
        tools: 19, // 10 Google Play + 9 App Store tools
        config: expect.any(Object)
      });
      
      await server.stop();
      
      const stoppedHealthStatus = server.getHealthStatus();
      expect(stoppedHealthStatus.status).toBe('stopped');
    });
  });

  describe('Graceful Shutdown', () => {
    test('should support custom shutdown handlers', async () => {
      let handlerCalled = false;
      
      server.addShutdownHandler(async () => {
        handlerCalled = true;
      });
      
      await server.start();
      await server.stop();
      
      expect(handlerCalled).toBe(true);
    });

    test('should handle shutdown handler errors gracefully', async () => {
      server.addShutdownHandler(async () => {
        throw new Error('Shutdown handler error');
      });
      
      await server.start();
      
      // Should not throw despite handler error
      await expect(server.stop()).resolves.not.toThrow();
    });
  });
});