/**
 * Unit tests for SSE Transport Handler Initialization Functionality
 * Tests for task 7: Write unit tests for SSE initialization functionality
 */

import { Request, Response } from 'express';
import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPRequest } from '../../src/types/mcp';

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

describe('SSE Initialization Functionality', () => {
  let initHandler: SSETransportHandler;
  let mockRequestHandler: jest.Mock;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
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
          (call: any) => call[0].method === 'initialize'
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
        const writeCall = (mockRes.write as jest.Mock).mock.calls.find((call: any) => 
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
        const writeCall = (mockRes.write as jest.Mock).mock.calls.find((call: any) => 
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
        const writeCall = (mockRes.write as jest.Mock).mock.calls.find((call: any) => 
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
      expect(initHandler.getConnectionCount()).toBe(1);

      setTimeout(() => {
        // Verify connection is closed after timeout
        expect(mockRes.end).toHaveBeenCalled();
        expect(initHandler.getConnectionCount()).toBe(0);

        done();
      }, 6000); // Wait longer than the 5 second timeout
    }, 8000);

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
          (call: any) => call[0].method === 'initialize'
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
      // Wait for initialization to start (200ms delay) + processing time
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
      }, 300); // Account for 200ms initialization delay
    }, 10000);
  });
});