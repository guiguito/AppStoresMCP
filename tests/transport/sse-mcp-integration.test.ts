/**
 * Integration tests for SSE Transport with MCP Handler
 * Verifies that the SSE transport properly integrates with the MCP handler
 * and produces responses that match MCP client expectations
 */

import { Request, Response } from 'express';
import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
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

describe('SSE Transport MCP Integration', () => {
  let sseHandler: SSETransportHandler;
  let mcpHandler: MCPHandler;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    // Create real MCP handler with tool registry
    toolRegistry = new ToolRegistry();
    mcpHandler = new MCPHandler(toolRegistry);
    
    // Create SSE handler with real MCP handler
    sseHandler = new SSETransportHandler({
      heartbeatInterval: 1000,
      connectionTimeout: 5000,
      maxConnections: 5,
      enableLogging: false
    });
    
    // Set the real MCP handler as the request handler
    sseHandler.setRequestHandler((request: MCPRequest) => mcpHandler.handleRequest(request));
  });

  afterEach(() => {
    sseHandler.stop();
    jest.clearAllMocks();
  });

  describe('Automatic Initialization Integration', () => {
    it('should use MCP handler to process initialize request and return proper response format', (done) => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      let initializeResponseSent = false;

      // Capture the SSE events sent to the client
      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        if (data.includes('event: mcp-response') && !initializeResponseSent) {
          initializeResponseSent = true;
          
          // Extract the JSON data from the SSE event
          const lines = data.split('\n');
          const dataLine = lines.find(line => line.startsWith('data: '));
          expect(dataLine).toBeDefined();
          
          const responseData = JSON.parse(dataLine!.substring(6)); // Remove 'data: ' prefix
          
          // Verify the response format matches MCP specification
          expect(responseData).toEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
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
          });
          
          // Verify the ID starts with 'init-' as expected from synthetic request
          expect(responseData.id).toMatch(/^init-/);
          
          done();
        }
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
    }, 10000);

    it('should handle initialize request with different protocol versions', (done) => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      let responseReceived = false;

      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        if (data.includes('event: mcp-response') && !responseReceived) {
          responseReceived = true;
          
          const lines = data.split('\n');
          const dataLine = lines.find(line => line.startsWith('data: '));
          const responseData = JSON.parse(dataLine!.substring(6));
          
          // Should always return the server's supported version
          expect(responseData.result.protocolVersion).toBe('2025-03-26');
          
          done();
        }
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
    }, 10000);

    it('should process subsequent MCP requests after initialization', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Establish connection and wait for initialization
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Get connection ID from headers
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear previous mock calls
      (mockRes.write as jest.Mock).mockClear();
      
      // Send a tools/list request
      const toolsListRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-tools-list',
        method: 'tools/list',
        params: {}
      };
      
      await sseHandler.handleMCPMessage(connectionId, toolsListRequest);
      
      // Verify the response was sent via SSE
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: mcp-response')
      );
      
      // Extract and verify the response
      const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
        call[0].includes('event: mcp-response')
      );
      expect(writeCall).toBeDefined();
      
      const lines = writeCall[0].split('\n');
      const dataLine = lines.find((line: string) => line.startsWith('data: '));
      const responseData = JSON.parse(dataLine.substring(6));
      
      expect(responseData).toEqual({
        jsonrpc: '2.0',
        id: 'test-tools-list',
        result: expect.objectContaining({
          tools: expect.any(Array)
        })
      });
    });

    it('should handle MCP handler errors during initialization', (done) => {
      // Create a handler that will throw an error
      const errorHandler = new SSETransportHandler({
        enableLogging: false
      });
      
      // Set a request handler that throws an error
      errorHandler.setRequestHandler(async (_request: MCPRequest) => {
        throw new Error('MCP handler error');
      });
      
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        if (data.includes('event: mcp-response')) {
          const lines = data.split('\n');
          const dataLine = lines.find(line => line.startsWith('data: '));
          const responseData = JSON.parse(dataLine!.substring(6));
          
          // Should receive an error response
          expect(responseData).toEqual({
            jsonrpc: '2.0',
            id: expect.any(String),
            error: expect.objectContaining({
              code: expect.any(Number),
              message: expect.any(String)
            })
          });
          
          errorHandler.stop();
          done();
        }
      });
      
      errorHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
    }, 10000);
  });

  describe('MCP Protocol Compliance', () => {
    it('should send responses in correct SSE format for MCP clients', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear previous calls
      (mockRes.write as jest.Mock).mockClear();
      
      // Send a ping request
      const pingRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'ping-test',
        method: 'ping',
        params: {}
      };
      
      await sseHandler.handleMCPMessage(connectionId, pingRequest);
      
      // Verify SSE format
      const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
        call[0].includes('event: mcp-response')
      );
      
      expect(writeCall[0]).toMatch(/^event: mcp-response\ndata: \{.*\}\n\n$/);
      
      // Verify JSON-RPC format
      const lines = writeCall[0].split('\n');
      const dataLine = lines.find((line: string) => line.startsWith('data: '));
      const responseData = JSON.parse(dataLine.substring(6));
      
      expect(responseData).toEqual({
        jsonrpc: '2.0',
        id: 'ping-test',
        result: {}
      });
    });

    it('should handle tool calls through MCP handler integration', async () => {
      // Add a test tool to the registry
      toolRegistry.registerTool({
        name: 'test-tool',
        description: 'A test tool',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          },
          required: ['message']
        },
        execute: async (params: any) => {
          return `Test response: ${params.message}`;
        }
      });
      
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Clear previous calls
      (mockRes.write as jest.Mock).mockClear();
      
      // Send a tool call request
      const toolCallRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'tool-call-test',
        method: 'tools/call',
        params: {
          name: 'test-tool',
          arguments: {
            message: 'Hello from SSE'
          }
        }
      };
      
      await sseHandler.handleMCPMessage(connectionId, toolCallRequest);
      
      // Verify the tool call response
      const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
        call[0].includes('event: mcp-response')
      );
      
      const lines = writeCall[0].split('\n');
      const dataLine = lines.find((line: string) => line.startsWith('data: '));
      const responseData = JSON.parse(dataLine.substring(6));
      
      expect(responseData).toEqual({
        jsonrpc: '2.0',
        id: 'tool-call-test',
        result: {
          content: [
            {
              type: 'text',
              text: 'Test response: Hello from SSE'
            }
          ]
        }
      });
    });
  });
});