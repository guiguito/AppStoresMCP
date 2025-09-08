/**
 * Comprehensive integration tests for MCP tools with real scraper library calls
 * Tests each tool with actual app store data while implementing rate limiting
 */

import request from 'supertest';
import { MCPServer } from '../../src/server';
import { ServerConfig } from '../../src/config/server-config';

// Rate limiting configuration to avoid overwhelming app store APIs
const RATE_LIMIT_DELAY = 2000; // 2 seconds between requests
const MAX_CONCURRENT_TESTS = 1; // Run tests sequentially

// Test data fixtures - real app IDs that should be stable
const TEST_FIXTURES = {
  googlePlay: {
    validAppId: 'com.whatsapp',
    validSearchQuery: 'whatsapp',
    invalidAppId: 'com.nonexistent.app.12345',
    invalidSearchQuery: 'xyzabc123nonexistent'
  },
  appStore: {
    validAppId: '310633997', // WhatsApp Messenger
    validSearchQuery: 'whatsapp',
    invalidAppId: '999999999',
    invalidSearchQuery: 'xyzabc123nonexistent'
  }
};

describe('MCP Tools Integration Tests', () => {
  let server: MCPServer;
  let testConfig: ServerConfig;
  let app: any;

  beforeAll(async () => {
    // Test configuration optimized for integration testing
    testConfig = {
      port: 0, // Use random available port
      logLevel: 'error', // Reduce log noise
      rateLimiting: {
        windowMs: 60000,
        maxRequests: 10 // Lower limit for integration tests
      },
      scraping: {
        timeout: 15000, // Longer timeout for real API calls
        retries: 1 // Fewer retries to speed up tests
      },
      cors: {
        origins: '*'
      },
      server: {
        requestTimeout: 30000,
        enableLogging: false
      }
    };

    server = new MCPServer(testConfig);
    await server.start();
    app = server.getHttpTransport().getApp();
  }, 30000); // Longer timeout for server startup

  afterAll(async () => {
    if (server && server.isServerRunning()) {
      await server.stop();
    }
  }, 10000);

  // Helper function to add delay between tests for rate limiting
  const rateLimitDelay = () => new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

  describe('Google Play Store Tools Integration', () => {
    describe('google-play-app-details tool', () => {
      test('should fetch real app details successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'google-play-app-details',
              arguments: {
                appId: TEST_FIXTURES.googlePlay.validAppId
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('WhatsApp')
              })
            ])
          }
        });

        // Verify the response contains expected app details structure
        const resultText = response.body.result.content[0].text;
        const appDetails = JSON.parse(resultText);
        
        expect(appDetails).toMatchObject({
          appId: TEST_FIXTURES.googlePlay.validAppId,
          title: expect.any(String),
          developer: expect.any(String),
          score: expect.any(Number),
          url: expect.stringContaining('play.google.com')
        });
      }, 20000);

      test('should handle non-existent app gracefully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'google-play-app-details',
              arguments: {
                appId: TEST_FIXTURES.googlePlay.invalidAppId
              }
            }
          })
          .expect(500);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 2,
          error: {
            code: expect.any(Number),
            message: expect.any(String)
          }
        });
      }, 20000);
    });

    describe('google-play-app-reviews tool', () => {
      test('should fetch real app reviews successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 3,
            method: 'tools/call',
            params: {
              name: 'google-play-app-reviews',
              arguments: {
                appId: TEST_FIXTURES.googlePlay.validAppId,
                num: 5
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 3,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.any(String)
              })
            ])
          }
        });

        // Verify the response contains reviews data
        const resultText = response.body.result.content[0].text;
        const reviews = JSON.parse(resultText);
        
        expect(Array.isArray(reviews)).toBe(true);
        if (reviews.length > 0) {
          expect(reviews[0]).toMatchObject({
            id: expect.any(String),
            userName: expect.any(String),
            score: expect.any(Number),
            text: expect.any(String)
          });
        }
      }, 20000);

      test('should handle pagination parameters', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
              name: 'google-play-app-reviews',
              arguments: {
                appId: TEST_FIXTURES.googlePlay.validAppId,
                num: 2,
                sort: 'newest'
              }
            }
          })
          .expect(200);

        const resultText = response.body.result.content[0].text;
        const reviews = JSON.parse(resultText);
        
        expect(Array.isArray(reviews)).toBe(true);
        expect(reviews.length).toBeLessThanOrEqual(2);
      }, 20000);
    });

    describe('google-play-search tool', () => {
      test('should search for apps successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 5,
            method: 'tools/call',
            params: {
              name: 'google-play-search',
              arguments: {
                query: TEST_FIXTURES.googlePlay.validSearchQuery,
                num: 5
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 5,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.any(String)
              })
            ])
          }
        });

        // Verify the response contains search results
        const resultText = response.body.result.content[0].text;
        const searchResults = JSON.parse(resultText);
        
        expect(Array.isArray(searchResults)).toBe(true);
        if (searchResults.length > 0) {
          expect(searchResults[0]).toMatchObject({
            appId: expect.any(String),
            title: expect.any(String),
            developer: expect.any(String),
            url: expect.stringContaining('play.google.com')
          });
        }
      }, 20000);

      test('should handle empty search results', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 6,
            method: 'tools/call',
            params: {
              name: 'google-play-search',
              arguments: {
                query: TEST_FIXTURES.googlePlay.invalidSearchQuery,
                num: 5
              }
            }
          })
          .expect(200);

        const resultText = response.body.result.content[0].text;
        const searchResults = JSON.parse(resultText);
        
        expect(Array.isArray(searchResults)).toBe(true);
        // Should return empty array or very few results
        expect(searchResults.length).toBeLessThanOrEqual(1);
      }, 20000);
    });
  });

  describe('Apple App Store Tools Integration', () => {
    describe('app-store-app-details tool', () => {
      test('should fetch real app details successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 7,
            method: 'tools/call',
            params: {
              name: 'app-store-app-details',
              arguments: {
                appId: TEST_FIXTURES.appStore.validAppId
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 7,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('WhatsApp')
              })
            ])
          }
        });

        // Verify the response contains expected app details structure
        const resultText = response.body.result.content[0].text;
        const appDetails = JSON.parse(resultText);
        
        expect(appDetails).toMatchObject({
          id: expect.any(Number),
          title: expect.any(String),
          developer: expect.any(String),
          score: expect.any(Number),
          url: expect.stringContaining('apps.apple.com')
        });
      }, 20000);

      test('should handle non-existent app gracefully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 8,
            method: 'tools/call',
            params: {
              name: 'app-store-app-details',
              arguments: {
                appId: TEST_FIXTURES.appStore.invalidAppId
              }
            }
          })
          .expect(500);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 8,
          error: {
            code: expect.any(Number),
            message: expect.any(String)
          }
        });
      }, 20000);
    });

    describe('app-store-app-reviews tool', () => {
      test('should fetch real app reviews successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 9,
            method: 'tools/call',
            params: {
              name: 'app-store-app-reviews',
              arguments: {
                appId: TEST_FIXTURES.appStore.validAppId,
                page: 1
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 9,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.any(String)
              })
            ])
          }
        });

        // Verify the response contains reviews data
        const resultText = response.body.result.content[0].text;
        const reviews = JSON.parse(resultText);
        
        expect(Array.isArray(reviews)).toBe(true);
        if (reviews.length > 0) {
          expect(reviews[0]).toMatchObject({
            id: expect.any(String),
            userName: expect.any(String),
            rating: expect.any(Number),
            title: expect.any(String),
            text: expect.any(String)
          });
        }
      }, 20000);
    });

    describe('app-store-search tool', () => {
      test('should search for apps successfully', async () => {
        await rateLimitDelay();

        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 10,
            method: 'tools/call',
            params: {
              name: 'app-store-search',
              arguments: {
                query: TEST_FIXTURES.appStore.validSearchQuery,
                num: 5
              }
            }
          })
          .expect(200);

        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 10,
          result: {
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.any(String)
              })
            ])
          }
        });

        // Verify the response contains search results
        const resultText = response.body.result.content[0].text;
        const searchResults = JSON.parse(resultText);
        
        expect(Array.isArray(searchResults)).toBe(true);
        if (searchResults.length > 0) {
          expect(searchResults[0]).toMatchObject({
            id: expect.any(Number),
            title: expect.any(String),
            developer: expect.any(String),
            url: expect.stringContaining('apps.apple.com')
          });
        }
      }, 20000);
    });
  });

  describe('Cross-Platform Integration Tests', () => {
    test('should handle concurrent requests to different platforms', async () => {
      await rateLimitDelay();

      // Make concurrent requests to both platforms
      const [googlePlayResponse, appStoreResponse] = await Promise.all([
        request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 11,
            method: 'tools/call',
            params: {
              name: 'google-play-search',
              arguments: {
                query: 'messenger',
                num: 3
              }
            }
          }),
        request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 12,
            method: 'tools/call',
            params: {
              name: 'app-store-search',
              arguments: {
                query: 'messenger',
                num: 3
              }
            }
          })
      ]);

      expect(googlePlayResponse.status).toBe(200);
      expect(appStoreResponse.status).toBe(200);

      expect(googlePlayResponse.body.id).toBe(11);
      expect(appStoreResponse.body.id).toBe(12);
    }, 30000);

    test('should maintain request correlation across tools', async () => {
      await rateLimitDelay();

      const requests = [
        { id: 13, tool: 'google-play-app-details', args: { appId: TEST_FIXTURES.googlePlay.validAppId } },
        { id: 14, tool: 'app-store-app-details', args: { appId: TEST_FIXTURES.appStore.validAppId } },
        { id: 15, tool: 'google-play-search', args: { query: 'test', num: 1 } }
      ];

      const responses = await Promise.all(
        requests.map(req =>
          request(app)
            .post('/mcp')
            .send({
              jsonrpc: '2.0',
              id: req.id,
              method: 'tools/call',
              params: {
                name: req.tool,
                arguments: req.args
              }
            })
        )
      );

      // Verify each response has correct correlation ID
      responses.forEach((response, index) => {
        expect(response.body.id).toBe(requests[index].id);
      });
    }, 30000);
  });

  describe('Error Handling Integration', () => {
    test('should handle network timeouts gracefully', async () => {
      await rateLimitDelay();

      // This test might be flaky depending on network conditions
      // but it tests the timeout handling mechanism
      const response = await request(app)
        .post('/mcp')
        .send({
          jsonrpc: '2.0',
          id: 16,
          method: 'tools/call',
          params: {
            name: 'google-play-app-details',
            arguments: {
              appId: 'com.test.timeout.app'
            }
          }
        });

      // Should either succeed or fail with a proper error structure
      if (response.status === 200) {
        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 16,
          result: expect.any(Object)
        });
      } else {
        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 16,
          error: {
            code: expect.any(Number),
            message: expect.any(String)
          }
        });
      }
    }, 25000);

    test('should handle malformed app IDs consistently', async () => {
      await rateLimitDelay();

      const malformedRequests = [
        { tool: 'google-play-app-details', args: { appId: '' } },
        { tool: 'app-store-app-details', args: { appId: 'not-a-number' } },
        { tool: 'google-play-app-details', args: { appId: null } }
      ];

      for (let i = 0; i < malformedRequests.length; i++) {
        const req = malformedRequests[i];
        const response = await request(app)
          .post('/mcp')
          .send({
            jsonrpc: '2.0',
            id: 17 + i,
            method: 'tools/call',
            params: {
              name: req.tool,
              arguments: req.args
            }
          });

        // Should return validation error
        expect(response.status).toBe(400);
        expect(response.body).toMatchObject({
          jsonrpc: '2.0',
          id: 17 + i,
          error: {
            code: expect.any(Number),
            message: expect.any(String)
          }
        });

        await rateLimitDelay();
      }
    }, 45000);
  });
});