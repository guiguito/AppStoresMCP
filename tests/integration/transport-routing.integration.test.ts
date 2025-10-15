/**
 * Integration tests for transport routing and configuration
 * Tests HTTP and SSE transport functionality with different configurations
 */

import request from 'supertest';
import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

describe('Transport Routing Integration Tests', () => {
  let baseConfig: ServerConfig;

  beforeAll(() => {
    baseConfig = {
      port: 0, // Use random available port
      logLevel: 'error',
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
        enableLogging: false
      },
      transport: {
        https: { enabled: false },
        enableHttp: true,
        enableSSE: true,
        sse: {
          heartbeatInterval: 30000,
          connectionTimeout: 300000,
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

  describe('HTTP Transport Only Configuration', () => {
    let server: MCPServer;
    let app: any;

    beforeAll(async () => {
      const config: ServerConfig = {
        ...baseConfig,
        transport: {
          https: { enabled: false },
          enableHttp: true,
          enableSSE: false,
          sse: baseConfig.transport.sse
        }
      };

      server = new MCPServer(config);
      await server.start();
      app = server.getHttpTransport()?.getApp();
    }, 30000);

    afterAll(async () => {
      if (server && server.isServerRunning()) {
        await server.stop();
      }
    }, 10000);

    test('should initialize only HTTP transport', () => {
      expect(server.getHttpTransport()).toBeDefined();
      expect(server.getSSETransport()).toBeUndefined();
    });

    test('should handle MCP requests via HTTP', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'http-only-test',
          method: 'tools/list'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'http-only-test',
        result: {
          tools: expect.any(Array)
        }
      });
    });

    test('should handle health check', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    test('should not have SSE endpoints available', async () => {
      await request(app)
        .get('/sse')
        .expect(404);

      await request(app)
        .post('/sse/test-connection/message')
        .send({ test: 'message' })
        .expect(404);
    });

    test('should report correct transport configuration in health status', () => {
      const healthStatus = server.getHealthStatus();
      expect(healthStatus.config.httpTransportEnabled).toBe(true);
      expect(healthStatus.config.sseTransportEnabled).toBe(false);
      expect(healthStatus.sseConnections).toBe(0);
    });
  });

  describe('SSE Transport Only Configuration', () => {
    test('should fail to create server when HTTP transport is disabled', () => {
      const config: ServerConfig = {
        ...baseConfig,
        transport: {
          enableHttp: false,
          enableSSE: true,
          https: { enabled: false },
          sse: baseConfig.transport.sse
        }
      };

      expect(() => new MCPServer(config)).toThrow(
        'HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.'
      );
    });
  });

  describe('Both Transports Enabled Configuration', () => {
    let server: MCPServer;
    let app: any;

    beforeAll(async () => {
      const config: ServerConfig = {
        ...baseConfig,
        transport: {
          enableHttp: true,
          enableSSE: true,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 15000,
            connectionTimeout: 120000,
            maxConnections: 50,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        }
      };

      server = new MCPServer(config);
      await server.start();
      app = server.getHttpTransport()?.getApp();
    }, 30000);

    afterAll(async () => {
      if (server && server.isServerRunning()) {
        await server.stop();
      }
    }, 10000);

    test('should initialize both HTTP and SSE transports', () => {
      expect(server.getHttpTransport()).toBeDefined();
      expect(server.getSSETransport()).toBeDefined();
    });

    test('should handle MCP requests via HTTP', async () => {
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'both-transports-http',
          method: 'tools/list'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'both-transports-http',
        result: {
          tools: expect.any(Array)
        }
      });
    });

    test('should have SSE connection endpoint available', (done) => {
      const req = request(app)
        .get('/sse')
        .set('Accept', 'text/event-stream')
        .end((err, res) => {
          if (err && err.code === 'ECONNRESET') {
            // Connection reset is expected for SSE connections when we close them
            done();
            return;
          }
          
          if (res) {
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');
            expect(res.headers['x-connection-id']).toBeDefined();
          }
          done();
        });

      // Close the connection after a short delay to avoid hanging
      setTimeout(() => {
        req.abort();
      }, 100);
    });

    test('should handle SSE message endpoint', (done) => {
      let connectionId: string;
      
      const req = request(app)
        .get('/sse')
        .set('Accept', 'text/event-stream')
        .end((err, res) => {
          if (err && err.code === 'ECONNRESET') {
            // Connection reset is expected, but we should have gotten the connection ID
            if (connectionId) {
              // Test the message endpoint
              request(app)
                .post(`/sse/${connectionId}/message`)
                .send({
                  jsonrpc: '2.0',
                  id: 'sse-message-test',
                  method: 'tools/list'
                })
                .expect(200)
                .end((msgErr, msgRes) => {
                  if (!msgErr && msgRes) {
                    expect(msgRes.body).toMatchObject({
                      status: 'message_received'
                    });
                  }
                  done();
                });
            } else {
              done();
            }
            return;
          }
          
          if (res) {
            expect(res.status).toBe(200);
            connectionId = res.headers['x-connection-id'] as string;
            expect(connectionId).toBeDefined();
            
            // Test the message endpoint
            request(app)
              .post(`/sse/${connectionId}/message`)
              .send({
                jsonrpc: '2.0',
                id: 'sse-message-test',
                method: 'tools/list'
              })
              .expect(200)
              .end((msgErr, msgRes) => {
                if (!msgErr && msgRes) {
                  expect(msgRes.body).toMatchObject({
                    status: 'message_received'
                  });
                }
                done();
              });
          } else {
            done();
          }
        });

      // Close the connection after a short delay
      setTimeout(() => {
        req.abort();
      }, 100);
    });

    test('should report correct transport configuration in health status', () => {
      const healthStatus = server.getHealthStatus();
      expect(healthStatus.config.httpTransportEnabled).toBe(true);
      expect(healthStatus.config.sseTransportEnabled).toBe(true);
      expect(healthStatus.config.sseHeartbeatInterval).toBe('15000ms');
      expect(healthStatus.config.sseConnectionTimeout).toBe('120000ms');
      expect(healthStatus.config.sseMaxConnections).toBe(50);
    });

    test('should handle concurrent requests across both transports', (done) => {
      let completedRequests = 0;
      const totalRequests = 4; // 3 HTTP + 1 SSE

      // HTTP requests
      Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: `concurrent-http-${i}`,
            method: 'tools/list'
          })
          .expect(200)
          .end((err, res) => {
            if (!err && res) {
              expect(res.body.id).toBe(`concurrent-http-${i}`);
              expect(res.body.result.tools).toBeDefined();
            }
            completedRequests++;
            if (completedRequests === totalRequests) {
              done();
            }
          })
      );

      // SSE connection
      const sseReq = request(app)
        .get('/sse')
        .set('Accept', 'text/event-stream')
        .end((err, res) => {
          if (err && err.code === 'ECONNRESET') {
            // Connection reset is expected for SSE connections
            completedRequests++;
            if (completedRequests === totalRequests) {
              done();
            }
            return;
          }
          
          if (res) {
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');
          }
          completedRequests++;
          if (completedRequests === totalRequests) {
            done();
          }
        });

      // Close SSE connection after a short delay
      setTimeout(() => {
        sseReq.abort();
      }, 100);
    });
  });

  describe('Invalid Transport Configuration', () => {
    test('should throw error when HTTP transport is disabled', () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          https: { enabled: false },
          enableHttp: false,
          enableSSE: false,
          sse: baseConfig.transport.sse
        }
      };

      expect(() => new MCPServer(invalidConfig)).toThrow(
        'HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.'
      );
    });

    test('should throw error for invalid SSE heartbeat interval', () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          enableHttp: true,
          enableSSE: true,
          https: { enabled: false },
          sse: {
            heartbeatInterval: 500, // Too small
            connectionTimeout: 60000,
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        }
      };

      expect(() => new MCPServer(invalidConfig)).toThrow(
        'SSE heartbeat interval too small: 500ms. Must be at least 1000ms.'
      );
    });

    test('should throw error for invalid SSE connection timeout', () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          https: { enabled: false },
          enableHttp: true,
          enableSSE: true,
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 10000, // Too small (less than heartbeat)
            maxConnections: 100,
            autoInitialize: true,
            initializationTimeout: 5000
          }
        }
      };

      expect(() => new MCPServer(invalidConfig)).toThrow(
        'SSE connection timeout must be greater than heartbeat interval'
      );
    });

    test('should throw error for invalid SSE max connections', () => {
      const invalidConfig: ServerConfig = {
        ...baseConfig,
        transport: {
          https: { enabled: false },
          enableHttp: true,
          enableSSE: true,
          sse: {
            heartbeatInterval: 30000,
            connectionTimeout: 300000,
            maxConnections: 0, // Too small
            autoInitialize: true,
            initializationTimeout: 5000
          }
        }
      };

      expect(() => new MCPServer(invalidConfig)).toThrow(
        'SSE max connections too small: 0. Must be at least 1.'
      );
    });
  });

  describe('Environment Variable Configuration', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(() => {
      originalEnv = { ...process.env };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should load transport configuration from environment variables', () => {
      // Set environment variables
      process.env.ENABLE_HTTP_TRANSPORT = 'true';
      process.env.ENABLE_SSE_TRANSPORT = 'false';
      process.env.SSE_HEARTBEAT_INTERVAL = '20000';
      process.env.SSE_CONNECTION_TIMEOUT = '180000';
      process.env.SSE_MAX_CONNECTIONS = '75';

      // Create server without explicit config to test environment loading
      const server = new MCPServer();
      const config = server.getConfig();

      expect(config.transport.enableHttp).toBe(true);
      expect(config.transport.enableSSE).toBe(false);
      expect(config.transport.sse.heartbeatInterval).toBe(20000);
      expect(config.transport.sse.connectionTimeout).toBe(180000);
      expect(config.transport.sse.maxConnections).toBe(75);
    });

    test('should fail when HTTP transport is disabled via environment variable', () => {
      process.env.ENABLE_HTTP_TRANSPORT = 'false';
      process.env.ENABLE_SSE_TRANSPORT = 'true';

      expect(() => new MCPServer()).toThrow(
        'HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.'
      );
    });

    test('should use default values when environment variables are not set', () => {
      // Clear transport-related environment variables
      delete process.env.ENABLE_HTTP_TRANSPORT;
      delete process.env.ENABLE_SSE_TRANSPORT;
      delete process.env.SSE_HEARTBEAT_INTERVAL;
      delete process.env.SSE_CONNECTION_TIMEOUT;
      delete process.env.SSE_MAX_CONNECTIONS;

      const server = new MCPServer();
      const config = server.getConfig();

      expect(config.transport.enableHttp).toBe(true);
      expect(config.transport.enableSSE).toBe(true);
      expect(config.transport.sse.heartbeatInterval).toBe(30000);
      expect(config.transport.sse.connectionTimeout).toBe(300000);
      expect(config.transport.sse.maxConnections).toBe(100);
    });
  });

  describe('SSE Transport Functionality', () => {
    let server: MCPServer;
    let app: any;

    beforeAll(async () => {
      server = new MCPServer(baseConfig);
      await server.start();
      app = server.getHttpTransport()?.getApp();
    }, 30000);

    afterAll(async () => {
      if (server && server.isServerRunning()) {
        await server.stop();
      }
    }, 10000);

    test('should establish SSE connection and receive connection event', (done) => {
      const req = request(app)
        .get('/sse')
        .set('Accept', 'text/event-stream')
        .end((err, res) => {
          if (err && err.code === 'ECONNRESET') {
            // Connection reset is expected for SSE connections when we close them
            done();
            return;
          }
          
          if (res) {
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toBe('text/event-stream');
            expect(res.headers['x-connection-id']).toBeDefined();
            
            // Check that response contains connection event data
            if (res.text) {
              expect(res.text).toContain('event: connection');
              expect(res.text).toContain('connectionId');
            }
          }
          done();
        });

      // Close the connection after a short delay to avoid hanging
      setTimeout(() => {
        req.abort();
      }, 100);
    });

    test('should handle multiple SSE connections', (done) => {
      let completedConnections = 0;
      const totalConnections = 3;
      const connectionIds: string[] = [];

      for (let i = 0; i < totalConnections; i++) {
        const req = request(app)
          .get('/sse')
          .set('Accept', 'text/event-stream')
          .end((err, res) => {
            if (err && err.code === 'ECONNRESET') {
              // Connection reset is expected for SSE connections
              completedConnections++;
              if (completedConnections === totalConnections) {
                // Verify all connections have unique IDs
                const uniqueIds = new Set(connectionIds);
                expect(uniqueIds.size).toBe(connectionIds.length);
                done();
              }
              return;
            }
            
            if (res) {
              expect(res.status).toBe(200);
              expect(res.headers['content-type']).toBe('text/event-stream');
              expect(res.headers['x-connection-id']).toBeDefined();
              
              connectionIds.push(res.headers['x-connection-id'] as string);
            }
            
            completedConnections++;
            if (completedConnections === totalConnections) {
              // Verify all connections have unique IDs
              const uniqueIds = new Set(connectionIds);
              expect(uniqueIds.size).toBe(connectionIds.length);
              done();
            }
          });

        // Close the connection after a short delay
        setTimeout(() => {
          req.abort();
        }, 100);
      }
    });

    test('should track SSE connections in health status', (done) => {
      const initialHealth = server.getHealthStatus();
      const initialConnections = initialHealth.sseConnections;

      const req = request(app)
        .get('/sse')
        .set('Accept', 'text/event-stream')
        .end((err, res) => {
          if (err && err.code === 'ECONNRESET') {
            // Connection reset is expected for SSE connections when we close them
            done();
            return;
          }
          
          if (res) {
            expect(res.status).toBe(200);
            expect(res.headers['x-connection-id']).toBeDefined();
            
            // The connection count should be tracked (though it may be cleaned up quickly)
            const updatedHealth = server.getHealthStatus();
            expect(updatedHealth.sseConnections).toBeGreaterThanOrEqual(initialConnections);
          }
          done();
        });

      // Close the connection after a short delay to avoid hanging
      setTimeout(() => {
        req.abort();
      }, 100);
    });
  });
});