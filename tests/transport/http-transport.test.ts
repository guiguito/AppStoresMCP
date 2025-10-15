/**
 * Unit tests for HTTP Transport Layer
 * Tests MCP Streamable HTTP transport functionality
 */

import request from 'supertest';
import { HTTPTransportHandler, HTTPTransportConfig } from '../../src/transport/http-transport';
import { MCPRequest, MCPResponse, MCPErrorCode } from '../../src/types/mcp';

describe('HTTPTransportHandler', () => {
  let transportHandler: HTTPTransportHandler;
  let mockRequestHandler: jest.Mock;

  const defaultConfig: HTTPTransportConfig = {
    port: 0, // Use port 0 to let OS assign a random available port
    enableLogging: false, // Disable logging for tests
    requestTimeout: 5000
  };

  beforeEach(() => {
    mockRequestHandler = jest.fn();
    transportHandler = new HTTPTransportHandler(defaultConfig);
    transportHandler.setRequestHandler(mockRequestHandler);
    // Finalize routes to set up 404 and error handlers (since no SSE in unit tests)
    transportHandler.finalizeRoutes();
  });

  afterEach(async () => {
    await transportHandler.stop();
  });

  describe('Server Setup', () => {
    it('should create Express app with proper middleware', () => {
      const app = transportHandler.getApp();
      expect(app).toBeDefined();
    });

    it('should start and stop server successfully', async () => {
      await expect(transportHandler.start()).resolves.toBeUndefined();
      await expect(transportHandler.stop()).resolves.toBeUndefined();
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return health status', async () => {
      const app = transportHandler.getApp();
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String)
      });
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include CORS headers', async () => {
      const app = transportHandler.getApp();
      const response = await request(app)
        .options('/mcp')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should include security headers', async () => {
      const app = transportHandler.getApp();
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    });
  });

  describe('Correlation ID Handling', () => {
    it('should generate correlation ID when not provided', async () => {
      const app = transportHandler.getApp();
      const response = await request(app)
        .get('/health');

      expect(response.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should use provided correlation ID', async () => {
      const app = transportHandler.getApp();
      const correlationId = 'test-correlation-id';
      
      const response = await request(app)
        .get('/health')
        .set('X-Correlation-ID', correlationId);

      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });

  describe('MCP Request Handling', () => {
    it('should handle valid MCP request successfully', async () => {
      const app = transportHandler.getApp();
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'tools/list',
        params: {}
      };

      const mcpResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: { tools: [] }
      };

      mockRequestHandler.mockResolvedValue(mcpResponse);

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(response.body).toEqual(mcpResponse);
      expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
    });

    it('should reject invalid MCP request format', async () => {
      const app = transportHandler.getApp();
      const invalidRequest = {
        method: 'test',
        // Missing required fields
      };

      const response = await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: expect.any(String), // correlation ID
        error: {
          code: MCPErrorCode.INVALID_REQUEST,
          message: 'Invalid MCP request format'
        }
      });

      expect(mockRequestHandler).not.toHaveBeenCalled();
    });

    it('should handle missing jsonrpc field', async () => {
      const app = transportHandler.getApp();
      const invalidRequest = {
        id: 'test-1',
        method: 'test'
        // Missing jsonrpc field
      };

      await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle missing id field (notifications)', async () => {
      const app = transportHandler.getApp();
      const notificationRequest = {
        jsonrpc: '2.0',
        method: 'test'
        // Missing id field - this is valid for notifications
      };

      const mcpErrorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 0, // Default id for notifications
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: "Method 'test' not found"
        }
      };

      mockRequestHandler.mockResolvedValue(mcpErrorResponse);

      // Notifications without id should be processed (though method 'test' will return method not found)
      await request(app)
        .post('/mcp')
        .send(notificationRequest)
        .expect(404); // Method 'test' not found, but request format is valid
    });

    it('should handle missing method field', async () => {
      const app = transportHandler.getApp();
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 'test-1'
        // Missing method field
      };

      await request(app)
        .post('/mcp')
        .send(invalidRequest)
        .expect(400);
    });
  });

  describe('Error Response Handling', () => {
    it('should return MCP error with appropriate HTTP status', async () => {
      const app = transportHandler.getApp();
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'unknown/method'
      };

      const mcpErrorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: 'Method not found'
        }
      };

      mockRequestHandler.mockResolvedValue(mcpErrorResponse);

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(404);

      expect(response.body).toEqual(mcpErrorResponse);
    });

    it('should handle request handler throwing error', async () => {
      const app = transportHandler.getApp();
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'test/method'
      };

      mockRequestHandler.mockRejectedValue(new Error('Handler error'));

      const response = await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(500);

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 'test-1',
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: 'Internal server error'
        }
      });
    });

    it('should handle missing request handler', async () => {
      const handlerWithoutRequestHandler = new HTTPTransportHandler(defaultConfig);
      
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'test/method'
      };

      const response = await request(handlerWithoutRequestHandler.getApp())
        .post('/mcp')
        .send(mcpRequest)
        .expect(500);

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: 'test-1',
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: 'MCP request handler not configured'
        }
      });
    });
  });

  describe('HTTP Status Code Mapping', () => {
    const testCases = [
      { mcpCode: MCPErrorCode.PARSE_ERROR, httpStatus: 400 },
      { mcpCode: MCPErrorCode.INVALID_REQUEST, httpStatus: 400 },
      { mcpCode: MCPErrorCode.INVALID_PARAMS, httpStatus: 400 },
      { mcpCode: MCPErrorCode.METHOD_NOT_FOUND, httpStatus: 404 },
      { mcpCode: MCPErrorCode.INTERNAL_ERROR, httpStatus: 500 },
      { mcpCode: -32001, httpStatus: 500 } // Custom server error
    ];

    testCases.forEach(({ mcpCode, httpStatus }) => {
      it(`should map MCP error code ${mcpCode} to HTTP status ${httpStatus}`, async () => {
        const app = transportHandler.getApp();
        const mcpRequest: MCPRequest = {
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'test/method'
        };

        const mcpErrorResponse: MCPResponse = {
          jsonrpc: '2.0',
          id: 'test-1',
          error: {
            code: mcpCode,
            message: 'Test error'
          }
        };

        mockRequestHandler.mockResolvedValue(mcpErrorResponse);

        await request(app)
          .post('/mcp')
          .send(mcpRequest)
          .expect(httpStatus);
      });
    });
  });

  describe('Route Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const app = transportHandler.getApp();
      
      const response = await request(app)
        .get('/unknown-route')
        .expect(404);

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: expect.any(String), // correlation ID
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: 'Route not found: GET /unknown-route'
        }
      });
    });

    it('should handle POST requests to unknown routes', async () => {
      const app = transportHandler.getApp();
      
      const response = await request(app)
        .post('/unknown-route')
        .send({ test: 'data' })
        .expect(404);

      expect(response.body).toEqual({
        jsonrpc: '2.0',
        id: expect.any(String),
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: expect.stringContaining('POST /unknown-route')
        }
      });
    });
  });

  describe('Request Body Parsing', () => {
    it('should parse JSON request body', async () => {
      const app = transportHandler.getApp();
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'test/method',
        params: { key: 'value' }
      };

      const mcpResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: 'test-1',
        result: { success: true }
      };

      mockRequestHandler.mockResolvedValue(mcpResponse);

      await request(app)
        .post('/mcp')
        .send(mcpRequest)
        .expect(200);

      expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
    });

    it('should handle malformed JSON', async () => {
      const app = transportHandler.getApp();
      
      const response = await request(app)
        .post('/mcp')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    it('should respect CORS origins configuration', async () => {
      const configWithCors: HTTPTransportConfig = {
        ...defaultConfig,
        corsOrigins: 'https://example.com'
      };
      
      const handler = new HTTPTransportHandler(configWithCors);
      const app = handler.getApp();

      const response = await request(app)
        .options('/mcp')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
    });

    it('should handle array of CORS origins', async () => {
      const configWithCors: HTTPTransportConfig = {
        ...defaultConfig,
        corsOrigins: ['https://example.com', 'https://test.com']
      };
      
      const handler = new HTTPTransportHandler(configWithCors);
      const app = handler.getApp();

      const response = await request(app)
        .options('/mcp')
        .set('Origin', 'https://example.com');

      // CORS middleware should handle the array properly
      expect(response.status).toBe(204);
      
      await handler.stop();
    });
  });
});