/**
 * Unit tests for SSE Transport Handler
 */

import { Request, Response } from 'express';
import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPRequest, MCPResponse } from '../../src/types/mcp';

// Mock Express Request and Response
const createMockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
  headers,
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' } as any,
  on: jest.fn()
});

const createMockResponse = (): Partial<Response> => {
  const mockResponse = {
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    destroyed: false
  };
  return mockResponse;
};

describe('SSETransportHandler', () => {
  let sseHandler: SSETransportHandler;
  let mockRequestHandler: jest.Mock;

  beforeEach(() => {
    mockRequestHandler = jest.fn();
    sseHandler = new SSETransportHandler({
      heartbeatInterval: 100, // Short interval for testing
      connectionTimeout: 1000,
      maxConnections: 5,
      enableLogging: false
    });
    sseHandler.setRequestHandler(mockRequestHandler);
  });

  afterEach(() => {
    sseHandler.stop();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish SSE connection with proper headers', () => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Correlation-ID': 'test-correlation'
      }));

      expect(sseHandler.getConnectionCount()).toBe(1);
    });

    it('should generate correlation ID if not provided', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
        'X-Correlation-ID': expect.any(String)
      }));
    });

    it('should reject connections when max limit is reached', () => {
      const mockReq = createMockRequest();
      
      // Fill up to max connections
      for (let i = 0; i < 5; i++) {
        const mockRes = createMockResponse();
        sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      }

      // Try to add one more
      const mockRes = createMockResponse();
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Maximum connections exceeded',
        maxConnections: 5
      });
    });

    it('should send connection established event', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: connection\ndata:')
      );
    });

    it('should handle connection close event', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      let closeHandler: () => void;

      (mockReq.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      expect(sseHandler.getConnectionCount()).toBe(1);

      // Simulate connection close
      closeHandler!();
      expect(sseHandler.getConnectionCount()).toBe(0);
    });
  });

  describe('Message Handling', () => {
    let connectionId: string;

    beforeEach(() => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Extract connection ID from the writeHead call
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      connectionId = headers['X-Connection-ID'];
    });

    it('should handle valid MCP request after initialization', (done) => {
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

      // Mock request handler to handle both initialize and tools/list
      mockRequestHandler.mockImplementation((request: MCPRequest) => {
        if (request.method === 'initialize') {
          return Promise.resolve({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          });
        }
        return Promise.resolve(mcpResponse);
      });

      // Wait for initialization to complete, then send MCP request
      setTimeout(async () => {
        await sseHandler.handleMCPMessage(connectionId, mcpRequest);
        
        // Should have been called twice: once for initialize, once for tools/list
        expect(mockRequestHandler).toHaveBeenCalledTimes(2);
        expect(mockRequestHandler).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'initialize' })
        );
        expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
        done();
      }, 200);
    });

    it('should queue MCP requests before initialization completes', (done) => {
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

      // Mock request handler to handle both initialize and tools/list
      mockRequestHandler.mockImplementation((request: MCPRequest) => {
        if (request.method === 'initialize') {
          return Promise.resolve({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          });
        }
        return Promise.resolve(mcpResponse);
      });

      // Send MCP request immediately (before initialization completes)
      sseHandler.handleMCPMessage(connectionId, mcpRequest);

      // Request should be queued, not processed immediately
      expect(mockRequestHandler).not.toHaveBeenCalledWith(mcpRequest);

      // Wait for initialization to complete and queued requests to be processed
      setTimeout(() => {
        // Should have been called twice: once for initialize, once for queued tools/list
        expect(mockRequestHandler).toHaveBeenCalledTimes(2);
        expect(mockRequestHandler).toHaveBeenCalledWith(
          expect.objectContaining({ method: 'initialize' })
        );
        expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
        done();
      }, 300);
    });

    it('should handle invalid MCP request format', async () => {
      const invalidRequest = {
        method: 'test',
        // Missing jsonrpc and id
      };

      await sseHandler.handleMCPMessage(connectionId, invalidRequest);

      expect(mockRequestHandler).not.toHaveBeenCalled();
    });

    it('should handle request handler errors after initialization', (done) => {
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'tools/list',
        params: {}
      };

      // Mock request handler to handle both initialize and tools/list
      mockRequestHandler.mockImplementation((request: MCPRequest) => {
        if (request.method === 'initialize') {
          return Promise.resolve({
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          });
        }
        return Promise.reject(new Error('Handler error'));
      });

      // Wait for initialization to complete, then send MCP request
      setTimeout(async () => {
        await sseHandler.handleMCPMessage(connectionId, mcpRequest);
        
        // Should have been called twice: once for initialize, once for tools/list
        expect(mockRequestHandler).toHaveBeenCalledTimes(2);
        expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
        done();
      }, 200);
    });

    it('should throw error for non-existent connection', async () => {
      const mcpRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'tools/list',
        params: {}
      };

      await expect(
        sseHandler.handleMCPMessage('non-existent', mcpRequest)
      ).rejects.toThrow('Connection non-existent not found or closed');
    });

    it('should handle missing request handler during initialization', (done) => {
      const handlerWithoutRequestHandler = new SSETransportHandler({
        enableLogging: false
      });

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      handlerWithoutRequestHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Wait for initialization to fail due to missing handler
      setTimeout(() => {
        // Should send error response via SSE during initialization
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('MCP request handler not configured')
        );

        handlerWithoutRequestHandler.stop();
        done();
      }, 200);
    });
  });

  describe('Heartbeat and Cleanup', () => {
    it('should send heartbeat to all connections', (done) => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Wait for heartbeat
      setTimeout(() => {
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('event: heartbeat\ndata:')
        );
        done();
      }, 150);
    });

    it('should clean up stale connections', () => {
      // Create a handler with very short timeout for testing
      const testHandler = new SSETransportHandler({
        heartbeatInterval: 50,
        connectionTimeout: 100, // Very short timeout
        maxConnections: 5,
        enableLogging: false
      });

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      testHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      expect(testHandler.getConnectionCount()).toBe(1);

      return new Promise<void>((resolve) => {
        // Wait for cleanup to occur
        setTimeout(() => {
          expect(testHandler.getConnectionCount()).toBe(0);
          testHandler.stop();
          resolve();
        }, 200); // Wait longer than timeout + heartbeat interval
      });
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast message to all connections', () => {
      const mockReq1 = createMockRequest();
      const mockRes1 = createMockResponse();
      const mockReq2 = createMockRequest();
      const mockRes2 = createMockResponse();

      sseHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);
      sseHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

      sseHandler.broadcast('test-event', { message: 'broadcast test' });

      expect(mockRes1.write).toHaveBeenCalledWith(
        expect.stringContaining('event: test-event\ndata:')
      );
      expect(mockRes2.write).toHaveBeenCalledWith(
        expect.stringContaining('event: test-event\ndata:')
      );
    });
  });

  describe('Connection Information', () => {
    it('should provide connection information', () => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      const connectionInfo = sseHandler.getConnectionInfo();
      expect(connectionInfo).toHaveLength(1);
      expect(connectionInfo[0]).toEqual({
        id: expect.any(String),
        lastActivity: expect.any(Number),
        correlationId: 'test-correlation'
      });
    });
  });

  describe('Automatic Initialization', () => {
    it('should send initialization message automatically after connection', (done) => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      // Mock the request handler to capture initialize request
      mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          expect(request.jsonrpc).toBe('2.0');
          expect(request.method).toBe('initialize');
          expect(request.params).toEqual({
            protocolVersion: '2025-03-26',
            capabilities: {
              roots: {
                listChanged: false
              },
              sampling: {}
            },
            clientInfo: {
              name: 'sse-transport-client',
              version: '1.0.0'
            }
          });

          // Return a proper initialize response
          const response: MCPResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
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

          // Verify that the response is sent via SSE
          setTimeout(() => {
            expect(mockRes.write).toHaveBeenCalledWith(
              expect.stringContaining('event: mcp-response')
            );
            done();
          }, 50);

          return response;
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
    }, 10000);

    it('should mark connection as initialized after successful initialization', (done) => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();

      mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Check that connection is marked as initialized after a short delay
      setTimeout(() => {
        const connectionInfo = sseHandler.getConnectionInfo();
        expect(connectionInfo).toHaveLength(1);
        // Note: We can't directly check isInitialized as it's not exposed in getConnectionInfo
        // But we can verify the initialization request was called
        expect(mockRequestHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'initialize'
          })
        );
        done();
      }, 200);
    }, 10000);
  });

  describe('Stop Functionality', () => {
    it('should close all connections when stopped', () => {
      const mockReq1 = createMockRequest();
      const mockRes1 = createMockResponse();
      const mockReq2 = createMockRequest();
      const mockRes2 = createMockResponse();

      sseHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);
      sseHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

      expect(sseHandler.getConnectionCount()).toBe(2);

      sseHandler.stop();

      expect(sseHandler.getConnectionCount()).toBe(0);
      expect(mockRes1.end).toHaveBeenCalled();
      expect(mockRes2.end).toHaveBeenCalled();
    });
  });

  describe('Comprehensive Logging', () => {
    let consoleSpy: jest.SpyInstance;
    let loggingHandler: SSETransportHandler;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
      
      loggingHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true // Enable logging for these tests
      });
      
      loggingHandler.setRequestHandler(mockRequestHandler);
    });

    afterEach(() => {
      loggingHandler.stop();
      consoleSpy.mockRestore();
      jest.restoreAllMocks();
    });

    it('should log structured information when SSE connection is established', () => {
      const mockReq = createMockRequest({ 
        'x-correlation-id': 'test-correlation',
        'user-agent': 'test-client/1.0'
      });
      const mockRes = createMockResponse();

      loggingHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Verify connection establishment logging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"sse_connection_established"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"correlationId":"test-correlation"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"phase":"connection_established"')
      );
    });

    it('should log initialization process comprehensively', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      loggingHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify initialization scheduled logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_scheduled"')
        );

        // Verify initialization start logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_start"')
        );

        // Verify synthetic request creation logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialize_request_created"')
        );

        // Verify request processing logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialize_request_processing"')
        );

        // Verify response sending logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialize_response_sending"')
        );

        // Verify successful completion logging
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_complete"')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('"status":"success"')
        );

        done();
      }, 300);
    }, 10000);

    it('should log initialization errors with detailed information', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();
      const consoleErrorSpy = jest.spyOn(console, 'error');

      mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          throw new Error('Test initialization error');
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      loggingHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify handler error logging with correlation ID and detailed information
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_handler_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"correlationId":"test-correlation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Test initialization error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"request_processing"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorType":"Error"')
        );

        done();
      }, 300);
    }, 10000);

    it('should log when MCP handler is not configured', (done) => {
      const handlerWithoutMCP = new SSETransportHandler({
        enableLogging: true
      });

      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();
      const consoleErrorSpy = jest.spyOn(console, 'error');

      handlerWithoutMCP.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify handler validation error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"handler_validation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"MCP request handler not configured"')
        );

        handlerWithoutMCP.stop();
        done();
      }, 300);
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Mock write to throw error
      (mockRes.write as jest.Mock).mockImplementation(() => {
        throw new Error('Write error');
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Should not throw and should close connection
      expect(() => {
        sseHandler.broadcast('test', { data: 'test' });
      }).not.toThrow();

      expect(sseHandler.getConnectionCount()).toBe(0);
    });

    it('should handle response end errors gracefully', () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Mock end to throw error
      (mockRes.end as jest.Mock).mockImplementation(() => {
        throw new Error('End error');
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Should not throw when stopping
      expect(() => {
        sseHandler.stop();
      }).not.toThrow();
    });
  });

  describe('SSE Initialization Configuration', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('autoInitialize configuration option', () => {
      it('should automatically initialize when autoInitialize is true (default)', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          autoInitialize: true,
          enableLogging: true
        });
        handler.setRequestHandler(mockRequestHandler);

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"type":"sse_initialization_scheduled"')
          );
          handler.stop();
          done();
        }, 200);
      });

      it('should skip initialization when autoInitialize is false', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          autoInitialize: false,
          enableLogging: true
        });
        handler.setRequestHandler(mockRequestHandler);

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).not.toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('"type":"sse_auto_initialization_disabled"')
          );
          handler.stop();
          done();
        }, 200);
      });

      it('should default to true when autoInitialize is not specified', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          enableLogging: false
        });
        handler.setRequestHandler(mockRequestHandler);

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );
          handler.stop();
          done();
        }, 200);
      });
    });

    describe('initializationTimeout configuration option', () => {
      it('should timeout initialization after specified duration', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          autoInitialize: true,
          initializationTimeout: 100, // Very short timeout for testing
          enableLogging: true
        });
        handler.setRequestHandler(mockRequestHandler);

        // Mock handler to never resolve (simulate hanging)
        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return new Promise(() => {}); // Never resolves
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('"type":"sse_initialization_timeout"')
          );
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('"timeout":100')
          );
          expect(handler.getConnectionCount()).toBe(0); // Connection should be closed
          handler.stop();
          done();
        }, 200);
      });

      it('should use default timeout when not specified', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          autoInitialize: true,
          enableLogging: false
        });
        handler.setRequestHandler(mockRequestHandler);

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        // Should complete successfully within default timeout (5000ms)
        setTimeout(() => {
          expect(handler.getConnectionCount()).toBe(1); // Connection should still be alive
          handler.stop();
          done();
        }, 200);
      });

      it('should send timeout error response when initialization times out', (done) => {
        const mockRequestHandler = jest.fn();
        const handler = new SSETransportHandler({
          autoInitialize: true,
          initializationTimeout: 100,
          enableLogging: true
        });
        handler.setRequestHandler(mockRequestHandler);

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return new Promise(() => {}); // Never resolves
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        handler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Should send timeout error response via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_timeout')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('Initialization process timed out')
          );
          handler.stop();
          done();
        }, 200);
      });
    });
  });

  describe('SSE Initialization Functionality', () => {
    let initHandler: SSETransportHandler;
    let mockRequestHandler: jest.Mock;
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRequestHandler = jest.fn();
      initHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true
      });
      initHandler.setRequestHandler(mockRequestHandler);
    });

    afterEach(() => {
      initHandler.stop();
      jest.restoreAllMocks();
    });

    describe('Automatic Initialization Message Sending', () => {
      it('should send initialization message automatically on connection establishment', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            expect(request).toEqual({
              jsonrpc: '2.0',
              id: expect.stringMatching(/^init-/),
              method: 'initialize',
              params: {
                protocolVersion: '2025-03-26',
                capabilities: {
                  roots: {
                    listChanged: false
                  },
                  sampling: {}
                },
                clientInfo: {
                  name: 'sse-transport-client',
                  version: '1.0.0'
                }
              }
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'initialize',
              jsonrpc: '2.0',
              params: expect.objectContaining({
                protocolVersion: '2025-03-26'
              })
            })
          );
          done();
        }, 200);
      }, 10000);

      it('should send initialization message before heartbeat messages', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        const writeCallOrder: string[] = [];

        // Track the order of write calls
        (mockRes.write as jest.Mock).mockImplementation((data: string) => {
          if (data.includes('event: connection')) {
            writeCallOrder.push('connection');
          } else if (data.includes('event: mcp-response')) {
            writeCallOrder.push('mcp-response');
          } else if (data.includes('event: heartbeat')) {
            writeCallOrder.push('heartbeat');
          }
        });

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(writeCallOrder).toEqual(['connection', 'mcp-response', 'heartbeat']);
          done();
        }, 300);
      }, 10000);

      it('should only initialize once per connection', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Should only be called once for initialization
          const initializeCalls = mockRequestHandler.mock.calls.filter(
            call => call[0].method === 'initialize'
          );
          expect(initializeCalls).toHaveLength(1);
          done();
        }, 300);
      }, 10000);
    });

    describe('Synthetic Initialize Request Creation', () => {
      it('should create synthetic initialize request with proper format and parameters', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            // Verify the synthetic request has all required fields
            expect(request.jsonrpc).toBe('2.0');
            expect(request.id).toMatch(/^init-/);
            expect(request.method).toBe('initialize');
            expect(request.params).toEqual({
              protocolVersion: '2025-03-26',
              capabilities: {
                roots: {
                  listChanged: false
                },
                sampling: {}
              },
              clientInfo: {
                name: 'sse-transport-client',
                version: '1.0.0'
              }
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledTimes(1);
          done();
        }, 200);
      }, 10000);

      it('should generate unique request IDs for synthetic initialize requests', (done) => {
        const mockReq1 = createMockRequest();
        const mockRes1 = createMockResponse();
        const mockReq2 = createMockRequest();
        const mockRes2 = createMockResponse();
        const requestIds: string[] = [];

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            requestIds.push(request.id as string);
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);
        initHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

        setTimeout(() => {
          expect(requestIds).toHaveLength(2);
          expect(requestIds[0]).not.toBe(requestIds[1]);
          expect(requestIds[0]).toMatch(/^init-/);
          expect(requestIds[1]).toMatch(/^init-/);
          done();
        }, 300);
      }, 10000);

      it('should set appropriate default values for protocol version and client info', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            expect(request.params.protocolVersion).toBe('2025-03-26');
            expect(request.params.clientInfo).toEqual({
              name: 'sse-transport-client',
              version: '1.0.0'
            });
            expect(request.params.capabilities).toEqual({
              roots: {
                listChanged: false
              },
              sampling: {}
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                protocolVersion: '2025-03-26',
                clientInfo: {
                  name: 'sse-transport-client',
                  version: '1.0.0'
                }
              })
            })
          );
          done();
        }, 200);
      }, 10000);
    });

    describe('Integration with MCP Handler', () => {
      it('should use existing MCP handler handleRequest method for processing initialize requests', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            // Verify this is called through the standard MCP handler interface
            expect(request).toEqual({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'initialize',
              params: expect.any(Object)
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
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
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'initialize'
            })
          );
          done();
        }, 200);
      }, 10000);

      it('should ensure initialize response includes proper server capabilities and information', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
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
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify the response was sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('event: mcp-response')
          );
          
          // Extract the response data from the SSE write call
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.result).toEqual({
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {},
              logging: {}
            },
            serverInfo: {
              name: 'app-store-mcp-server',
              version: '1.0.0'
            }
          });
          
          done();
        }, 200);
      }, 10000);

      it('should verify response format matches what MCP clients expect for SSE transport', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify SSE event format
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const sseData = writeCall[0];
          expect(sseData).toMatch(/^event: mcp-response\ndata: /);
          expect(sseData).toMatch(/\n\n$/);
          
          // Verify JSON-RPC format
          const responseData = sseData.split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.jsonrpc).toBe('2.0');
          expect(response.id).toMatch(/^init-/);
          expect(response.result).toBeDefined();
          expect(response.error).toBeUndefined();
          
          done();
        }, 200);
      }, 10000);
    });

    describe('Error Handling During Initialization', () => {
      it('should handle MCP handler unavailable error gracefully', (done) => {
        const handlerWithoutMCP = new SSETransportHandler({
          enableLogging: true
        });

        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        handlerWithoutMCP.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('handler_unavailable')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(handlerWithoutMCP.getConnectionCount()).toBe(0);

          handlerWithoutMCP.stop();
          done();
        }, 300);
      }, 10000);

      it('should handle MCP handler processing failure', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            throw new Error('Handler processing failed');
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('request_processing')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle malformed initialize response', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return null; // Invalid response format
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('response_validation')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle initialize response with error', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32603,
                message: 'Internal error during initialization',
                data: { details: 'Server configuration invalid' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response is forwarded via SSE
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.error).toEqual({
            code: -32603,
            message: 'Internal error during initialization',
            data: { details: 'Server configuration invalid' }
          });

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle timeout during initialization process', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        // Mock handler that never resolves to simulate timeout
        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return new Promise(() => {}); // Never resolves
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify timeout error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_timeout')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 6000); // Wait longer than the 5 second timeout
      }, 10000);

      it('should clean up connections properly if initialization fails', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            throw new Error('Initialization failed');
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
        expect(initHandler.getConnectionCount()).toBe(1);

        setTimeout(() => {
          // Verify connection is cleaned up after failure
          expect(initHandler.getConnectionCount()).toBe(0);
          expect(mockRes.end).toHaveBeenCalled();
          done();
        }, 300);
      }, 10000);
    });

    describe('Initialization State Management', () => {
      it('should track initialization status properly', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        // Extract connection ID
        const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
        const connectionId = headers['X-Connection-ID'];

        // Send a regular MCP request immediately (should be queued)
        const mcpRequest: MCPRequest = {
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'tools/list',
          params: {}
        };

        initHandler.handleMCPMessage(connectionId, mcpRequest);

        setTimeout(() => {
          // Should have been called twice: once for initialize, once for queued request
          expect(mockRequestHandler).toHaveBeenCalledTimes(2);
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );
          expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
          done();
        }, 300);
      }, 10000);

      it('should prevent duplicate initialization', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Should only have one initialize call despite multiple potential triggers
          const initializeCalls = mockRequestHandler.mock.calls.filter(
            call => call[0].method === 'initialize'
          );
          expect(initializeCalls).toHaveLength(1);
          done();
        }, 500);
      }, 10000);

      it('should queue requests before initialization completes and process them after', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        let initializeResolve: (value: any) => void;

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            // Return a promise that we can control
            return new Promise((resolve) => {
              initializeResolve = resolve;
            });
          }
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { method: request.method }
          };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        // Extract connection ID
        const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
        const connectionId = headers['X-Connection-ID'];

        // Send multiple requests immediately (should be queued)
        const requests = [
          { jsonrpc: '2.0', id: 'test-1', method: 'tools/list', params: {} },
          { jsonrpc: '2.0', id: 'test-2', method: 'tools/call', params: {} }
        ] as MCPRequest[];

        requests.forEach(req => {
          initHandler.handleMCPMessage(connectionId, req);
        });

        // At this point, only initialize should have been called
        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledTimes(1);
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );

          // Now resolve the initialize request
          initializeResolve({
            jsonrpc: '2.0',
            id: 'init-test',
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          });

          // Wait for queued requests to be processed
          setTimeout(() => {
            // Should now have been called 3 times: initialize + 2 queued requests
            expect(mockRequestHandler).toHaveBeenCalledTimes(3);
            requests.forEach(req => {
              expect(mockRequestHandler).toHaveBeenCalledWith(req);
            });
            done();
          }, 100);
        }, 100);
      }, 10000);
    });
  });

  describe('Initialization Error Handling', () => {
    let errorHandler: SSETransportHandler;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'log').mockImplementation();
      
      errorHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true
      });
    });

    afterEach(() => {
      errorHandler.stop();
      jest.restoreAllMocks();
    });

    it('should handle MCP handler unavailable error', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      // Don't set request handler to simulate unavailable handler
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"handler_validation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"MCP request handler not configured"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('handler_unavailable')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle MCP handler processing failure', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          throw new Error('Handler processing failed');
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify handler error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_handler_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"request_processing"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Handler processing failed"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('request_processing')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle malformed initialize response', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return null; // Invalid response format
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify response validation error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_response_validation_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_validation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Invalid initialize response format from MCP handler"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('response_validation')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle initialize response with error', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Internal error during initialization',
              data: { details: 'Server configuration invalid' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify response error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_response_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_error_handling"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorCode":-32603')
        );

        // Verify error response is forwarded via SSE
        const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
          call[0].includes('event: mcp-response')
        );
        expect(writeCall).toBeDefined();
        
        const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
        const response = JSON.parse(responseData);
        
        expect(response.error).toEqual({
          code: -32603,
          message: 'Internal error during initialization',
          data: { details: 'Server configuration invalid' }
        });

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);
  });
});

      it('should generate unique request IDs for synthetic initialize requests', (done) => {
        const mockReq1 = createMockRequest();
        const mockRes1 = createMockResponse();
        const mockReq2 = createMockRequest();
        const mockRes2 = createMockResponse();
        const requestIds: string[] = [];

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            requestIds.push(request.id as string);
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);
        initHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

        setTimeout(() => {
          expect(requestIds).toHaveLength(2);
          expect(requestIds[0]).not.toBe(requestIds[1]);
          expect(requestIds[0]).toMatch(/^init-/);
          expect(requestIds[1]).toMatch(/^init-/);
          done();
        }, 300);
      }, 10000);

      it('should set appropriate default values for protocol version and client info', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            expect(request.params.protocolVersion).toBe('2025-03-26');
            expect(request.params.clientInfo).toEqual({
              name: 'sse-transport-client',
              version: '1.0.0'
            });
            expect(request.params.capabilities).toEqual({
              roots: {
                listChanged: false
              },
              sampling: {}
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                protocolVersion: '2025-03-26',
                clientInfo: {
                  name: 'sse-transport-client',
                  version: '1.0.0'
                }
              })
            })
          );
          done();
        }, 200);
      }, 10000);
    });

    describe('Integration with MCP Handler', () => {
      it('should use existing MCP handler handleRequest method for processing initialize requests', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            // Verify this is called through the standard MCP handler interface
            expect(request).toEqual({
              jsonrpc: '2.0',
              id: expect.any(String),
              method: 'initialize',
              params: expect.any(Object)
            });

            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
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
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'initialize'
            })
          );
          done();
        }, 200);
      }, 10000);

      it('should ensure initialize response includes proper server capabilities and information', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
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
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify the response was sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('event: mcp-response')
          );
          
          // Extract the response data from the SSE write call
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.result).toEqual({
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {},
              logging: {}
            },
            serverInfo: {
              name: 'app-store-mcp-server',
              version: '1.0.0'
            }
          });
          
          done();
        }, 200);
      }, 10000);

      it('should verify response format matches what MCP clients expect for SSE transport', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify SSE event format
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const sseData = writeCall[0];
          expect(sseData).toMatch(/^event: mcp-response\ndata: /);
          expect(sseData).toMatch(/\n\n$/);
          
          // Verify JSON-RPC format
          const responseData = sseData.split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.jsonrpc).toBe('2.0');
          expect(response.id).toMatch(/^init-/);
          expect(response.result).toBeDefined();
          expect(response.error).toBeUndefined();
          
          done();
        }, 200);
      }, 10000);
    });

    describe('Error Handling During Initialization', () => {
      it('should handle MCP handler unavailable error gracefully', (done) => {
        const handlerWithoutMCP = new SSETransportHandler({
          enableLogging: true
        });

        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        handlerWithoutMCP.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('handler_unavailable')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(handlerWithoutMCP.getConnectionCount()).toBe(0);

          handlerWithoutMCP.stop();
          done();
        }, 300);
      }, 10000);

      it('should handle MCP handler processing failure', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            throw new Error('Handler processing failed');
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('request_processing')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle malformed initialize response', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return null; // Invalid response format
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_error')
          );
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('response_validation')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle initialize response with error', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              error: {
                code: -32603,
                message: 'Internal error during initialization',
                data: { details: 'Server configuration invalid' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify error response is forwarded via SSE
          const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
            call[0].includes('event: mcp-response')
          );
          expect(writeCall).toBeDefined();
          
          const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
          const response = JSON.parse(responseData);
          
          expect(response.error).toEqual({
            code: -32603,
            message: 'Internal error during initialization',
            data: { details: 'Server configuration invalid' }
          });

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 300);
      }, 10000);

      it('should handle timeout during initialization process', (done) => {
        const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
        const mockRes = createMockResponse();

        // Mock handler that never resolves to simulate timeout
        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return new Promise(() => {}); // Never resolves
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Verify timeout error response sent via SSE
          expect(mockRes.write).toHaveBeenCalledWith(
            expect.stringContaining('initialization_timeout')
          );

          // Verify connection is closed
          expect(mockRes.end).toHaveBeenCalled();
          expect(initHandler.getConnectionCount()).toBe(0);

          done();
        }, 6000); // Wait longer than the 5 second timeout
      }, 10000);

      it('should clean up connections properly if initialization fails', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            throw new Error('Initialization failed');
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
        expect(initHandler.getConnectionCount()).toBe(1);

        setTimeout(() => {
          // Verify connection is cleaned up after failure
          expect(initHandler.getConnectionCount()).toBe(0);
          expect(mockRes.end).toHaveBeenCalled();
          done();
        }, 300);
      }, 10000);
    });

    describe('Initialization State Management', () => {
      it('should track initialization status properly', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        // Extract connection ID
        const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
        const connectionId = headers['X-Connection-ID'];

        // Send a regular MCP request immediately (should be queued)
        const mcpRequest: MCPRequest = {
          jsonrpc: '2.0',
          id: 'test-1',
          method: 'tools/list',
          params: {}
        };

        initHandler.handleMCPMessage(connectionId, mcpRequest);

        setTimeout(() => {
          // Should have been called twice: once for initialize, once for queued request
          expect(mockRequestHandler).toHaveBeenCalledTimes(2);
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );
          expect(mockRequestHandler).toHaveBeenCalledWith(mcpRequest);
          done();
        }, 300);
      }, 10000);

      it('should prevent duplicate initialization', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            return {
              jsonrpc: '2.0',
              id: request.id,
              result: {
                protocolVersion: '2025-03-26',
                capabilities: { tools: {}, logging: {} },
                serverInfo: { name: 'test-server', version: '1.0.0' }
              }
            };
          }
          return { jsonrpc: '2.0', id: request.id, result: {} };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        setTimeout(() => {
          // Should only have one initialize call despite multiple potential triggers
          const initializeCalls = mockRequestHandler.mock.calls.filter(
            call => call[0].method === 'initialize'
          );
          expect(initializeCalls).toHaveLength(1);
          done();
        }, 500);
      }, 10000);

      it('should queue requests before initialization completes and process them after', (done) => {
        const mockReq = createMockRequest();
        const mockRes = createMockResponse();
        let initializeResolve: (value: any) => void;

        mockRequestHandler.mockImplementation(async (request: MCPRequest) => {
          if (request.method === 'initialize') {
            // Return a promise that we can control
            return new Promise((resolve) => {
              initializeResolve = resolve;
            });
          }
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: { method: request.method }
          };
        });

        initHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

        // Extract connection ID
        const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
        const connectionId = headers['X-Connection-ID'];

        // Send multiple requests immediately (should be queued)
        const requests = [
          { jsonrpc: '2.0', id: 'test-1', method: 'tools/list', params: {} },
          { jsonrpc: '2.0', id: 'test-2', method: 'tools/call', params: {} }
        ] as MCPRequest[];

        requests.forEach(req => {
          initHandler.handleMCPMessage(connectionId, req);
        });

        // At this point, only initialize should have been called
        setTimeout(() => {
          expect(mockRequestHandler).toHaveBeenCalledTimes(1);
          expect(mockRequestHandler).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'initialize' })
          );

          // Now resolve the initialize request
          initializeResolve({
            jsonrpc: '2.0',
            id: 'init-test',
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          });

          // Wait for queued requests to be processed
          setTimeout(() => {
            // Should now have been called 3 times: initialize + 2 queued requests
            expect(mockRequestHandler).toHaveBeenCalledTimes(3);
            requests.forEach(req => {
              expect(mockRequestHandler).toHaveBeenCalledWith(req);
            });
            done();
          }, 100);
        }, 100);
      }, 10000);
    });
  });

  describe('Initialization Error Handling', () => {
    let errorHandler: SSETransportHandler;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      jest.spyOn(console, 'log').mockImplementation();
      
      errorHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true
      });
    });

    afterEach(() => {
      errorHandler.stop();
      jest.restoreAllMocks();
    });

    it('should handle MCP handler unavailable error', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      // Don't set request handler to simulate unavailable handler
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"handler_validation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"MCP request handler not configured"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('handler_unavailable')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle MCP handler processing failure', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          throw new Error('Handler processing failed');
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify handler error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_handler_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"request_processing"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Handler processing failed"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('request_processing')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle malformed initialize response', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return null; // Invalid response format
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify response validation error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_response_validation_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_validation"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Invalid initialize response format from MCP handler"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('response_validation')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle initialize response with error', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Internal error during initialization',
              data: { details: 'Server configuration invalid' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify response error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_response_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_error_handling"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorCode":-32603')
        );

        // Verify error response is forwarded via SSE
        const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
          call[0].includes('event: mcp-response')
        );
        expect(writeCall).toBeDefined();
        
        const responseData = writeCall[0].split('data: ')[1].split('\n\n')[0];
        const response = JSON.parse(responseData);
        
        expect(response.error).toEqual({
          code: -32603,
          message: 'Internal error during initialization',
          data: { details: 'Server configuration invalid' }
        });

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle initialization response errors gracefully', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: -32603,
              message: 'Internal error during initialization'
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_response_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_error_handling"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorCode":-32603')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorMessage":"Internal error during initialization"')
        );

        // Verify error response forwarded via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('Internal error during initialization')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle SSE send errors during initialization', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      // Mock write to throw error on second call (after connection event)
      let writeCallCount = 0;
      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        writeCallCount++;
        if (writeCallCount > 1 && data.includes('mcp-response')) {
          throw new Error('SSE send error');
        }
      });

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify send error logging (the sendEvent method logs as sse_send_error, then it's caught and logged as initialization_send_error)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_send_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"response_sending"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"SSE send error"')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle initialization timeout', (done) => {
      // Create handler with very short timeout for testing
      const timeoutHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true
      });

      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      // Mock request handler to hang (never resolve)
      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          // Return a promise that never resolves to simulate timeout
          return new Promise(() => {});
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      timeoutHandler.setRequestHandler(mockRequestHandler);
      timeoutHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Wait for timeout to occur (5 seconds + buffer)
      setTimeout(() => {
        // Verify timeout error logging
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_timeout"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"timeout_handling"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"timeout":5000')
        );

        // Verify timeout error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_timeout')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('Initialization process timed out')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(timeoutHandler.getConnectionCount()).toBe(0);

        timeoutHandler.stop();
        done();
      }, 5500); // Wait for timeout + buffer
    }, 10000);

    it('should handle unexpected errors during initialization', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          // Simulate unexpected error (not from handler, but from transport logic)
          throw new TypeError('Unexpected type error');
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify handler error logging (this error is caught by the handler error handling)
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_handler_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"phase":"request_processing"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"error":"Unexpected type error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"errorType":"TypeError"')
        );

        // Verify error response sent via SSE
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('initialization_error')
        );
        expect(mockRes.write).toHaveBeenCalledWith(
          expect.stringContaining('request_processing')
        );

        // Verify connection is closed
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should handle errors when sending error responses', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'test-correlation' });
      const mockRes = createMockResponse();

      // Mock write to always throw error
      (mockRes.write as jest.Mock).mockImplementation(() => {
        throw new Error('Write always fails');
      });

      // Don't set request handler to trigger handler unavailable error
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      setTimeout(() => {
        // Verify that both the original error and the send error are logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_initialization_error"')
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('"type":"sse_error_response_send_error"')
        );

        // Verify connection is still closed despite send error
        expect(mockRes.end).toHaveBeenCalled();
        expect(errorHandler.getConnectionCount()).toBe(0);

        done();
      }, 300);
    }, 10000);

    it('should properly clean up connections after initialization failures', (done) => {
      const mockReq1 = createMockRequest({ 'x-correlation-id': 'test-correlation-1' });
      const mockRes1 = createMockResponse();
      const mockReq2 = createMockRequest({ 'x-correlation-id': 'test-correlation-2' });
      const mockRes2 = createMockResponse();

      // Set up one successful connection
      const mockRequestHandler = jest.fn().mockImplementation(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              protocolVersion: '2025-03-26',
              capabilities: { tools: {}, logging: {} },
              serverInfo: { name: 'test-server', version: '1.0.0' }
            }
          };
        }
        return { jsonrpc: '2.0', id: request.id, result: {} };
      });

      errorHandler.setRequestHandler(mockRequestHandler);
      errorHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);

      // Set up one failing connection (remove handler)
      const failingHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 5,
        enableLogging: true
      });
      
      failingHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

      setTimeout(() => {
        // Verify successful connection is still active
        expect(errorHandler.getConnectionCount()).toBe(1);
        
        // Verify failing connection was cleaned up
        expect(failingHandler.getConnectionCount()).toBe(0);
        expect(mockRes2.end).toHaveBeenCalled();

        failingHandler.stop();
        done();
      }, 300);
    }, 10000);
  });
});