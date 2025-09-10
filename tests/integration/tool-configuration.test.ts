/**
 * Tool Configuration Integration Tests
 */

import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

describe('Tool Configuration Integration', () => {
  let server: MCPServer;

  afterEach(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  });

  describe('Tool Registration with Configuration', () => {
    it('should register only enabled tools when ENABLED_TOOLS is set', async () => {
      const config: ServerConfig = {
        port: 3001,
        logLevel: 'error', // Reduce noise in tests
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        scraping: { timeout: 30000, retries: 3 },
        cors: { origins: '*' },
        server: { requestTimeout: 60000, enableLogging: false },
        transport: {
          enableHttp: true,
          enableSSE: false, // Disable SSE for simpler testing
          https: { enabled: false },
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        },
        tools: {
          enabledTools: new Set(['google-play-search', 'app-store-search']),
          disabledTools: new Set()
        }
      };

      server = new MCPServer(config);
      await server.start();

      const toolRegistry = server.getToolRegistry();
      const registeredTools = toolRegistry.getToolNames();

      expect(registeredTools).toHaveLength(2);
      expect(registeredTools).toContain('google-play-search');
      expect(registeredTools).toContain('app-store-search');
      expect(registeredTools).not.toContain('google-play-app-details');
      expect(registeredTools).not.toContain('app-store-app-details');
    });

    it('should register all tools except disabled ones when DISABLED_TOOLS is set', async () => {
      const config: ServerConfig = {
        port: 3002,
        logLevel: 'error',
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        scraping: { timeout: 30000, retries: 3 },
        cors: { origins: '*' },
        server: { requestTimeout: 60000, enableLogging: false },
        transport: {
          enableHttp: true,
          enableSSE: false,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        },
        tools: {
          enabledTools: new Set(),
          disabledTools: new Set(['google-play-app-reviews', 'app-store-app-reviews'])
        }
      };

      server = new MCPServer(config);
      await server.start();

      const toolRegistry = server.getToolRegistry();
      const registeredTools = toolRegistry.getToolNames();

      // Should have all tools except the 2 disabled ones
      expect(registeredTools).toHaveLength(17); // 19 total - 2 disabled
      expect(registeredTools).toContain('google-play-search');
      expect(registeredTools).toContain('app-store-search');
      expect(registeredTools).toContain('google-play-app-details');
      expect(registeredTools).toContain('app-store-app-details');
      expect(registeredTools).not.toContain('google-play-app-reviews');
      expect(registeredTools).not.toContain('app-store-app-reviews');
    });

    it('should register all tools by default when no configuration is set', async () => {
      const config: ServerConfig = {
        port: 3003,
        logLevel: 'error',
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        scraping: { timeout: 30000, retries: 3 },
        cors: { origins: '*' },
        server: { requestTimeout: 60000, enableLogging: false },
        transport: {
          enableHttp: true,
          enableSSE: false,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        },
        tools: {
          enabledTools: new Set(),
          disabledTools: new Set()
        }
      };

      server = new MCPServer(config);
      await server.start();

      const toolRegistry = server.getToolRegistry();
      const registeredTools = toolRegistry.getToolNames();

      // Should have all 19 tools
      expect(registeredTools).toHaveLength(19);
      expect(registeredTools).toContain('google-play-search');
      expect(registeredTools).toContain('app-store-search');
      expect(registeredTools).toContain('google-play-app-details');
      expect(registeredTools).toContain('app-store-app-details');
      expect(registeredTools).toContain('google-play-app-reviews');
      expect(registeredTools).toContain('app-store-app-reviews');
    });

    it('should prioritize disabled tools over enabled tools', async () => {
      const config: ServerConfig = {
        port: 3004,
        logLevel: 'error',
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        scraping: { timeout: 30000, retries: 3 },
        cors: { origins: '*' },
        server: { requestTimeout: 60000, enableLogging: false },
        transport: {
          enableHttp: true,
          enableSSE: false,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        },
        tools: {
          enabledTools: new Set(['google-play-search', 'app-store-search']),
          disabledTools: new Set(['google-play-search']) // Conflict: enabled and disabled
        }
      };

      server = new MCPServer(config);
      await server.start();

      const toolRegistry = server.getToolRegistry();
      const registeredTools = toolRegistry.getToolNames();

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools).toContain('app-store-search');
      expect(registeredTools).not.toContain('google-play-search'); // Disabled wins
    });
  });

  describe('Health Check with Tool Configuration', () => {
    it('should report correct tool count in health check', async () => {
      const config: ServerConfig = {
        port: 3005,
        logLevel: 'error',
        rateLimiting: { windowMs: 60000, maxRequests: 100 },
        scraping: { timeout: 30000, retries: 3 },
        cors: { origins: '*' },
        server: { requestTimeout: 60000, enableLogging: false },
        transport: {
          enableHttp: true,
          enableSSE: false,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        },
        tools: {
          enabledTools: new Set(['google-play-search', 'app-store-search', 'google-play-app-details']),
          disabledTools: new Set()
        }
      };

      server = new MCPServer(config);
      await server.start();

      const healthStatus = server.getHealthStatus();

      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.tools).toBe(3);
      expect(healthStatus.config.enabledTools).toEqual(['google-play-search', 'app-store-search', 'google-play-app-details']);
      expect(healthStatus.config.disabledTools).toBe('none');
    });
  });
});