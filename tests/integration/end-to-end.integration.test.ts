/**
 * End-to-end integration tests for complete MCP request/response flow over HTTP
 * Tests the entire system from HTTP request to final response
 */

import request from 'supertest';
import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

describe('End-to-End MCP Integration Tests', () => {
  let server: MCPServer;
  let testConfig: ServerConfig;
  let app: any;

  beforeAll(async () => {
    testConfig = {
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

    server = new MCPServer(testConfig);
    await server.start();
    app = server.getHttpTransport()!.getApp();
  }, 30000);

  afterAll(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  }, 10000);

  describe('Complete MCP Protocol Flow', () => {
    // Skip this test if external API tests are disabled (calls real Google Play API)
    const testOrSkip = process.env.SKIP_EXTERNAL_API_TESTS === 'true' ? test.skip : test;
    
    testOrSkip('should handle complete tool discovery and execution flow', async () => {
      // Step 1: Discover available tools
      const discoveryResponse = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'discovery-1',
          method: 'tools/list'
        })
        .expect(200);

      expect(discoveryResponse.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'discovery-1',
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: expect.any(String),
              description: expect.any(String),
              inputSchema: expect.any(Object)
            })
          ])
        }
      });

      const tools = discoveryResponse.body.result.tools;
      expect(tools).toHaveLength(19); // 10 Google Play + 9 App Store tools

      // Step 2: Get schema for a specific tool
      const googlePlayTool = tools.find((tool: any) => tool.name === 'google-play-search');
      expect(googlePlayTool).toBeDefined();
      expect(googlePlayTool.inputSchema).toMatchObject({
        type: 'object',
        properties: expect.any(Object),
        required: expect.any(Array)
      });

      // Step 3: Execute the tool with valid parameters
      const executionResponse = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'execution-1',
          method: 'tools/call',
          params: {
            name: 'google-play-search',
            arguments: {
              query: 'calculator',
              num: 3
            }
          }
        })
        .expect(200);

      expect(executionResponse.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'execution-1',
        result: {
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'text',
              text: expect.any(String)
            })
          ])
        }
      });

      // Step 4: Verify the response contains valid data
      const resultText = executionResponse.body.result.content[0].text;
      expect(() => JSON.parse(resultText)).not.toThrow();
      
      const searchResults = JSON.parse(resultText);
      expect(Array.isArray(searchResults)).toBe(true);
    }, 30000);

    test('should handle error propagation through complete flow', async () => {
      // Step 1: Try to execute non-existent tool
      const nonExistentToolResponse = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'error-1',
          method: 'tools/call',
          params: {
            name: 'non-existent-tool',
            arguments: {}
          }
        })
        .expect(404);

      expect(nonExistentToolResponse.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'error-1',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining("Tool 'non-existent-tool' not found")
        }
      });

      // Step 2: Try to execute tool with invalid parameters
      const invalidParamsResponse = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'error-2',
          method: 'tools/call',
          params: {
            name: 'google-play-app-details',
            arguments: {
              // Missing required appId parameter
            }
          }
        })
        .expect(400);

      expect(invalidParamsResponse.body).toMatchObject({
        jsonrpc: '2.0',
        id: 'error-2',
        error: {
          code: expect.any(Number),
          message: expect.any(String)
        }
      });

      // Step 3: Try invalid JSON-RPC request
      const invalidJsonRpcResponse = await request(app)
        .post('/mcp')
        .send({
          // Missing required jsonrpc field
          id: 'error-3',
          method: 'tools/list'
        })
        .expect(400);

      expect(invalidJsonRpcResponse.body).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Invalid MCP request format')
        }
      });
    });

    test('should maintain request correlation across multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        id: `concurrent-${i}`,
        method: 'tools/list'
      }));

      const responses = await Promise.all(
        requests.map(req =>
          request(app)
            .post('/mcp')
            .send({
              jsonrpc: '2.0',
              ...req
            })
        )
      );

      // Verify all requests completed successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(requests[index]!.id);
        expect(response.body.result.tools).toHaveLength(19); // 10 Google Play + 9 App Store tools
      });
    });

    // Skip this test if external API tests are disabled (calls real Google Play API)
    testOrSkip('should handle mixed successful and failed requests in sequence', async () => {
      const testSequence = [
        {
          id: 'seq-1',
          method: 'tools/list',
          expectedStatus: 200
        },
        {
          id: 'seq-2',
          method: 'tools/call',
          params: {
            name: 'google-play-search',
            arguments: { query: 'test', num: 1 }
          },
          expectedStatus: 200
        },
        {
          id: 'seq-3',
          method: 'tools/call',
          params: {
            name: 'invalid-tool',
            arguments: {}
          },
          expectedStatus: 404
        },
        {
          id: 'seq-4',
          method: 'tools/call',
          params: {
            name: 'app-store-search',
            arguments: { query: 'test', num: 1 }
          },
          expectedStatus: 200
        }
      ];

      for (const testCase of testSequence) {
        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            ...testCase
          })
          .expect(testCase.expectedStatus);

        expect(response.body.id).toBe(testCase.id);

        if (testCase.expectedStatus === 200) {
          expect(response.body.result).toBeDefined();
        } else {
          expect(response.body.error).toBeDefined();
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }, 30000);
  });

  describe('HTTP Transport Layer Integration', () => {
    test('should handle various HTTP headers correctly', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .set('User-Agent', 'MCP-Test-Client/1.0')
        .set('X-Request-ID', 'test-request-123')
        .send({
          jsonrpc: '2.0',
          id: 'headers-test',
          method: 'tools/list'
        })
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body.id).toBe('headers-test');
    });

    test('should handle CORS preflight and actual requests', async () => {
      // Preflight request
      await request(app)
        .options('/mcp')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      // Actual CORS request
      const response = await request(app)
        .post('/mcp')
        .set('Origin', 'http://localhost:3000')
        .send({
          jsonrpc: '2.0',
          id: 'cors-test',
          method: 'tools/list'
        })
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.body.id).toBe('cors-test');
    });

    test('should handle large request payloads', async () => {
      const largeQuery = 'a'.repeat(1000); // 1KB query string

      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'large-payload',
          method: 'tools/call',
          params: {
            name: 'google-play-search',
            arguments: {
              query: largeQuery,
              num: 1
            }
          }
        });

      // Should either succeed or fail gracefully
      expect([200, 400, 500]).toContain(response.status);
      expect(response.body.id).toBe('large-payload');
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        jsonrpc: '2.0',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining('Invalid JSON')
        }
      });
    });
  });

  describe('Server Health and Monitoring', () => {
    test('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // HTTP transport health endpoint only returns basic info
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
    });

    test('should handle health check during high load', async () => {
      // Create multiple concurrent requests
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: `load-${i}`,
            method: 'tools/list'
          })
      );

      // Health check during load
      const healthPromise = request(app).get('/health');

      const [healthResponse, ...mcpResponses] = await Promise.all([
        healthPromise,
        ...concurrentRequests
      ]);

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('healthy');

      // Verify all MCP requests also completed
      mcpResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.id).toBe(`load-${index}`);
      });
    });
  });

  describe('Rate Limiting Integration', () => {
    test('should handle rate limiting gracefully', async () => {
      // This test depends on the rate limiting configuration
      // Make requests up to the limit
      const requests = Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: `rate-limit-${i}`,
            method: 'tools/list'
          })
      );

      const responses = await Promise.all(requests);

      // Most requests should succeed, but some might be rate limited
      const successfulResponses = responses.filter(r => r.status === 200);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successfulResponses.length).toBeGreaterThan(0);
      
      // If rate limiting is active, we should see some 429 responses
      if (rateLimitedResponses.length > 0) {
        rateLimitedResponses.forEach(response => {
          expect(response.body).toMatchObject({
            jsonrpc: '2.0',
            error: {
              code: expect.any(Number),
              message: expect.stringContaining('rate limit')
            }
          });
        });
      }
    }, 15000);
  });

  describe('Graceful Shutdown Integration', () => {
    test('should handle requests during shutdown gracefully', async () => {
      // Create a separate server instance for this test
      const shutdownTestServer = new MCPServer(testConfig);
      await shutdownTestServer.start();
      const shutdownApp = shutdownTestServer.getHttpTransport()!.getApp();

      // Start a long-running request
      const longRunningRequest = request(shutdownApp)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 'shutdown-test',
          method: 'tools/call',
          params: {
            name: 'google-play-search',
            arguments: { query: 'test', num: 5 }
          }
        });

      // Initiate shutdown after a short delay
      setTimeout(async () => {
        await shutdownTestServer.stop();
      }, 100);

      // The request should either complete successfully or fail gracefully
      try {
        const response = await longRunningRequest;
        expect([200, 500, 503]).toContain(response.status);
      } catch (error) {
        // Connection might be closed during shutdown - this is acceptable
        expect(error).toBeDefined();
      }
    }, 10000);
  });
});