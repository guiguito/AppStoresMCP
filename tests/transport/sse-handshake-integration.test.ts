/**
 * Integration tests for complete SSE handshake flow
 * Task 8: Create integration tests for complete SSE handshake flow
 * 
 * This test suite verifies:
 * - End-to-end SSE connection establishment and initialization message receipt
 * - Tool discovery after successful initialization
 * - MCP request processing after initialization handshake
 * - Real MCP client behavior simulation and compatibility
 * - Timeout prevention and connection stability
 */

import { Request, Response } from 'express';
import { SSETransportHandler } from '../../src/transport/sse-transport';
import { MCPHandler } from '../../src/protocol/mcp-handler';
import { ToolRegistry } from '../../src/registry/tool-registry';
import { MCPRequest } from '../../src/types/mcp';

// Mock Express Request and Response for SSE connection simulation
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

// Mock tool for testing tool discovery and execution
class MockTestTool {
  name = 'test-tool';
  description = 'A test tool for integration testing';
  inputSchema = {
    type: 'object' as const,
    properties: {
      message: { type: 'string' as const }
    },
    required: ['message']
  };

  async execute(params: any): Promise<string> {
    return `Test response: ${params.message}`;
  }
}

describe('Project Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(jest).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should be able to import TypeScript modules', () => {
    expect(SSETransportHandler).toBeDefined();
    expect(MCPHandler).toBeDefined();
    expect(ToolRegistry).toBeDefined();
  });
});

describe('SSE Handshake Integration Tests', () => {
  let sseHandler: SSETransportHandler;
  let mcpHandler: MCPHandler;
  let toolRegistry: ToolRegistry;

  beforeEach(() => {
    // Suppress console output for cleaner test output
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    
    // Create real MCP components for integration testing
    toolRegistry = new ToolRegistry();
    mcpHandler = new MCPHandler(toolRegistry);
    
    // Register a test tool for tool discovery tests
    toolRegistry.registerTool(new MockTestTool());
    
    // Create SSE handler with real MCP handler
    sseHandler = new SSETransportHandler({
      heartbeatInterval: 1000,
      connectionTimeout: 10000,
      maxConnections: 10,
      enableLogging: true
    });
    
    // Connect SSE handler to real MCP handler
    sseHandler.setRequestHandler((request: MCPRequest) => mcpHandler.handleRequest(request));
  });

  afterEach(() => {
    sseHandler.stop();
    jest.restoreAllMocks();
  });

  describe('End-to-End SSE Connection and Initialization', () => {
    it('should establish SSE connection and verify initialization message is received', (done) => {
      const mockReq = createMockRequest({ 'x-correlation-id': 'e2e-test-correlation' });
      const mockRes = createMockResponse();
      const receivedEvents: Array<{ event: string; data: any }> = [];

      // Capture all SSE events sent to the client
      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        const lines = data.split('\n');
        const eventLine = lines.find(line => line.startsWith('event: '));
        const dataLine = lines.find(line => line.startsWith('data: '));
        
        if (eventLine && dataLine) {
          const event = eventLine.substring(7); // Remove 'event: '
          const eventData = JSON.parse(dataLine.substring(6)); // Remove 'data: '
          receivedEvents.push({ event, data: eventData });
        }
      });

      // Establish SSE connection
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Verify connection establishment and initialization sequence
      setTimeout(() => {
        // Should have received: connection event, mcp-response (initialize), heartbeat
        expect(receivedEvents.length).toBeGreaterThanOrEqual(3);
        
        // Verify connection event
        const connectionEvent = receivedEvents.find(e => e.event === 'connection');
        expect(connectionEvent).toBeDefined();
        expect(connectionEvent!.data).toEqual({
          connectionId: expect.any(String),
          correlationId: 'e2e-test-correlation',
          timestamp: expect.any(String),
          message: 'SSE connection established'
        });

        // Verify initialization response
        const initResponse = receivedEvents.find(e => e.event === 'mcp-response');
        expect(initResponse).toBeDefined();
        expect(initResponse!.data).toEqual({
          jsonrpc: '2.0',
          id: expect.stringMatching(/^init-/),
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

        // Verify heartbeat event
        const heartbeatEvent = receivedEvents.find(e => e.event === 'heartbeat');
        expect(heartbeatEvent).toBeDefined();
        expect(heartbeatEvent!.data).toEqual({
          timestamp: expect.any(String),
          connectionId: expect.any(String)
        });

        done();
      }, 500);
    }, 10000);

    it('should handle multiple concurrent SSE connections with proper initialization', (done) => {
      const connections = [];
      const allReceivedEvents: Array<{ connectionId: string; events: Array<{ event: string; data: any }> }> = [];

      // Create 3 concurrent connections
      for (let i = 0; i < 3; i++) {
        const mockReq = createMockRequest({ 'x-correlation-id': `concurrent-test-${i}` });
        const mockRes = createMockResponse();
        const receivedEvents: Array<{ event: string; data: any }> = [];

        (mockRes.write as jest.Mock).mockImplementation((data: string) => {
          const lines = data.split('\n');
          const eventLine = lines.find(line => line.startsWith('event: '));
          const dataLine = lines.find(line => line.startsWith('data: '));
          
          if (eventLine && dataLine) {
            const event = eventLine.substring(7);
            const eventData = JSON.parse(dataLine.substring(6));
            receivedEvents.push({ event, data: eventData });
          }
        });

        sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
        
        // Extract connection ID from headers
        const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
        const connectionId = headers['X-Connection-ID'];
        
        connections.push({ connectionId, receivedEvents });
        allReceivedEvents.push({ connectionId, events: receivedEvents });
      }

      // Verify all connections are established and initialized
      setTimeout(() => {
        expect(sseHandler.getConnectionCount()).toBe(3);

        // Verify each connection received proper initialization
        allReceivedEvents.forEach(({ connectionId, events }) => {
          const initResponse = events.find(e => e.event === 'mcp-response');
          expect(initResponse).toBeDefined();
          expect(initResponse!.data.result.protocolVersion).toBe('2025-03-26');
          
          const connectionEvent = events.find(e => e.event === 'connection');
          expect(connectionEvent).toBeDefined();
          expect(connectionEvent!.data.connectionId).toBe(connectionId);
        });

        done();
      }, 800);
    }, 10000);
  });

  describe('Tool Discovery After Initialization', () => {
    it('should allow clients to discover tools after successful initialization', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Establish connection
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Extract connection ID
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear previous mock calls to focus on tools/list response
      (mockRes.write as jest.Mock).mockClear();
      
      // Send tools/list request
      const toolsListRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'tools-discovery-test',
        method: 'tools/list',
        params: {}
      };
      
      await sseHandler.handleMCPMessage(connectionId, toolsListRequest);
      
      // Verify tools/list response
      expect(mockRes.write).toHaveBeenCalledWith(
        expect.stringContaining('event: mcp-response')
      );
      
      const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
        call[0].includes('event: mcp-response')
      );
      
      const lines = writeCall[0].split('\n');
      const dataLine = lines.find((line: string) => line.startsWith('data: '));
      const responseData = JSON.parse(dataLine.substring(6));
      
      expect(responseData).toEqual({
        jsonrpc: '2.0',
        id: 'tools-discovery-test',
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-tool',
              description: 'A test tool for integration testing',
              inputSchema: expect.any(Object)
            })
          ])
        }
      });
      
      // Verify the test tool is included in the response
      const testTool = responseData.result.tools.find((tool: any) => tool.name === 'test-tool');
      expect(testTool).toBeDefined();
      expect(testTool.inputSchema).toEqual({
        type: 'object',
        properties: {
          message: { type: 'string' }
        },
        required: ['message']
      });
    });

    it('should handle tool discovery requests before initialization completes', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Establish connection
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      // Extract connection ID
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      // Send tools/list request immediately (before initialization completes)
      const toolsListRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'early-tools-discovery',
        method: 'tools/list',
        params: {}
      };
      
      // This should be queued until initialization completes
      await sseHandler.handleMCPMessage(connectionId, toolsListRequest);
      
      // Wait for initialization and queued request processing
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Verify both initialize and tools/list responses were sent
      const writeCalls = (mockRes.write as jest.Mock).mock.calls.filter(call => 
        call[0].includes('event: mcp-response')
      );
      
      expect(writeCalls.length).toBe(2);
      
      // Verify initialize response
      const initResponseCall = writeCalls[0];
      const initLines = initResponseCall[0].split('\n');
      const initDataLine = initLines.find((line: string) => line.startsWith('data: '));
      const initResponseData = JSON.parse(initDataLine.substring(6));
      
      expect(initResponseData.id).toMatch(/^init-/);
      expect(initResponseData.result.protocolVersion).toBe('2025-03-26');
      
      // Verify tools/list response
      const toolsResponseCall = writeCalls[1];
      const toolsLines = toolsResponseCall[0].split('\n');
      const toolsDataLine = toolsLines.find((line: string) => line.startsWith('data: '));
      const toolsResponseData = JSON.parse(toolsDataLine.substring(6));
      
      expect(toolsResponseData).toEqual({
        jsonrpc: '2.0',
        id: 'early-tools-discovery',
        result: {
          tools: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-tool'
            })
          ])
        }
      });
    });
  });

  describe('MCP Request Processing After Handshake', () => {
    it('should process MCP requests properly after initialization handshake', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      // Establish connection and wait for initialization
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear previous calls
      (mockRes.write as jest.Mock).mockClear();
      
      // Test multiple MCP request types
      const requests = [
        {
          jsonrpc: '2.0',
          id: 'ping-test',
          method: 'ping',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: 'tools-call-test',
          method: 'tools/call',
          params: {
            name: 'test-tool',
            arguments: {
              message: 'Hello from integration test'
            }
          }
        }
      ] as MCPRequest[];
      
      // Send requests sequentially
      for (const request of requests) {
        await sseHandler.handleMCPMessage(connectionId, request);
      }
      
      // Verify responses
      const writeCalls = (mockRes.write as jest.Mock).mock.calls.filter(call => 
        call[0].includes('event: mcp-response')
      );
      
      expect(writeCalls.length).toBe(2);
      
      // Verify ping response
      const pingResponseCall = writeCalls[0];
      const pingLines = pingResponseCall[0].split('\n');
      const pingDataLine = pingLines.find((line: string) => line.startsWith('data: '));
      const pingResponseData = JSON.parse(pingDataLine.substring(6));
      
      expect(pingResponseData).toEqual({
        jsonrpc: '2.0',
        id: 'ping-test',
        result: {}
      });
      
      // Verify tool call response
      const toolCallResponseCall = writeCalls[1];
      const toolCallLines = toolCallResponseCall[0].split('\n');
      const toolCallDataLine = toolCallLines.find((line: string) => line.startsWith('data: '));
      const toolCallResponseData = JSON.parse(toolCallDataLine.substring(6));
      
      expect(toolCallResponseData).toEqual({
        jsonrpc: '2.0',
        id: 'tools-call-test',
        result: {
          content: [
            {
              type: 'text',
              text: 'Test response: Hello from integration test'
            }
          ]
        }
      });
    });

    it('should handle error responses properly after initialization', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];
      
      await new Promise(resolve => setTimeout(resolve, 300));
      (mockRes.write as jest.Mock).mockClear();
      
      // Send invalid tool call request
      const invalidRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'invalid-tool-test',
        method: 'tools/call',
        params: {
          name: 'non-existent-tool',
          arguments: {}
        }
      };
      
      await sseHandler.handleMCPMessage(connectionId, invalidRequest);
      
      // Verify error response
      const writeCall = (mockRes.write as jest.Mock).mock.calls.find(call => 
        call[0].includes('event: mcp-response')
      );
      
      const lines = writeCall[0].split('\n');
      const dataLine = lines.find((line: string) => line.startsWith('data: '));
      const responseData = JSON.parse(dataLine.substring(6));
      
      expect(responseData).toEqual({
        jsonrpc: '2.0',
        id: 'invalid-tool-test',
        error: {
          code: expect.any(Number),
          message: expect.stringContaining("Tool 'non-existent-tool' not found"),
          data: expect.any(Object)
        }
      });
    });
  });

  describe('Real MCP Client Behavior Simulation', () => {
    it('should simulate real MCP client behavior and verify compatibility', async () => {
      const mockReq = createMockRequest({ 
        'user-agent': 'MCP-Client/1.0',
        'accept': 'text/event-stream',
        'cache-control': 'no-cache'
      });
      const mockRes = createMockResponse();
      const clientEvents: Array<{ event: string; data: any; timestamp: number }> = [];

      // Simulate real client event processing
      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        const lines = data.split('\n');
        const eventLine = lines.find(line => line.startsWith('event: '));
        const dataLine = lines.find(line => line.startsWith('data: '));
        
        if (eventLine && dataLine) {
          const event = eventLine.substring(7);
          const eventData = JSON.parse(dataLine.substring(6));
          clientEvents.push({ 
            event, 
            data: eventData, 
            timestamp: Date.now() 
          });
        }
      });

      // Establish connection (simulating client connection)
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];

      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 400));

      // Simulate typical MCP client workflow
      const clientWorkflow = [
        // 1. Client discovers available tools
        {
          jsonrpc: '2.0',
          id: 'client-tools-discovery',
          method: 'tools/list',
          params: {}
        },
        // 2. Client calls a specific tool
        {
          jsonrpc: '2.0',
          id: 'client-tool-execution',
          method: 'tools/call',
          params: {
            name: 'test-tool',
            arguments: {
              message: 'Client workflow test'
            }
          }
        },
        // 3. Client sends ping to verify connection
        {
          jsonrpc: '2.0',
          id: 'client-ping',
          method: 'ping',
          params: {}
        }
      ] as MCPRequest[];

      // Execute client workflow
      for (const request of clientWorkflow) {
        await sseHandler.handleMCPMessage(connectionId, request);
        // Small delay between requests (realistic client behavior)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verify client received all expected events
      const connectionEvent = clientEvents.find(e => e.event === 'connection');
      const initResponse = clientEvents.find(e => e.event === 'mcp-response' && e.data.id?.startsWith('init-'));
      const toolsResponse = clientEvents.find(e => e.event === 'mcp-response' && e.data.id === 'client-tools-discovery');
      const toolCallResponse = clientEvents.find(e => e.event === 'mcp-response' && e.data.id === 'client-tool-execution');
      const pingResponse = clientEvents.find(e => e.event === 'mcp-response' && e.data.id === 'client-ping');
      const heartbeatEvents = clientEvents.filter(e => e.event === 'heartbeat');

      // Verify all expected events were received
      expect(connectionEvent).toBeDefined();
      expect(initResponse).toBeDefined();
      expect(toolsResponse).toBeDefined();
      expect(toolCallResponse).toBeDefined();
      expect(pingResponse).toBeDefined();
      expect(heartbeatEvents.length).toBeGreaterThan(0);

      // Verify event sequence and timing
      expect(connectionEvent!.timestamp).toBeLessThan(initResponse!.timestamp);
      expect(initResponse!.timestamp).toBeLessThan(toolsResponse!.timestamp);
      expect(toolsResponse!.timestamp).toBeLessThan(toolCallResponse!.timestamp);
      expect(toolCallResponse!.timestamp).toBeLessThan(pingResponse!.timestamp);

      // Verify response content matches MCP specification
      expect(initResponse!.data.result.protocolVersion).toBe('2025-03-26');
      expect(toolsResponse!.data.result.tools).toBeInstanceOf(Array);
      expect(toolCallResponse!.data.result.content[0].text).toBe('Test response: Client workflow test');
      expect(pingResponse!.data.result).toEqual({});
    });

    it('should handle client disconnection gracefully', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      let closeHandler: () => void;

      // Set up connection close handler
      (mockReq.on as jest.Mock).mockImplementation((event: string, handler: () => void) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      expect(sseHandler.getConnectionCount()).toBe(1);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate client disconnection
      closeHandler!();

      // Verify connection is cleaned up
      expect(sseHandler.getConnectionCount()).toBe(0);
    });
  });

  describe('Timeout Prevention and Connection Stability', () => {
    it('should prevent connections from hanging indefinitely', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const receivedEvents: Array<{ event: string; data: any; timestamp: number }> = [];

      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        const lines = data.split('\n');
        const eventLine = lines.find(line => line.startsWith('event: '));
        const dataLine = lines.find(line => line.startsWith('data: '));
        
        if (eventLine && dataLine) {
          const event = eventLine.substring(7);
          const eventData = JSON.parse(dataLine.substring(6));
          receivedEvents.push({ 
            event, 
            data: eventData, 
            timestamp: Date.now() 
          });
        }
      });

      const startTime = Date.now();
      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);

      // Wait for multiple heartbeat cycles
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Verify connection remained active and received events
      expect(sseHandler.getConnectionCount()).toBe(1);
      expect(receivedEvents.length).toBeGreaterThan(3); // connection + init + multiple heartbeats

      // Verify initialization completed quickly (within 1 second)
      const initResponse = receivedEvents.find(e => e.event === 'mcp-response');
      expect(initResponse).toBeDefined();
      expect(initResponse!.timestamp - startTime).toBeLessThan(1000);

      // Verify heartbeats are being sent regularly
      const heartbeats = receivedEvents.filter(e => e.event === 'heartbeat');
      expect(heartbeats.length).toBeGreaterThanOrEqual(2);

      // Verify heartbeat timing is consistent (approximately every 1000ms)
      if (heartbeats.length >= 2) {
        const timeBetweenHeartbeats = heartbeats[1]!.timestamp - heartbeats[0]!.timestamp;
        expect(timeBetweenHeartbeats).toBeGreaterThan(800);
        expect(timeBetweenHeartbeats).toBeLessThan(1300);
      }
    });

    it('should handle initialization timeout gracefully', (done) => {
      // Create handler with very short timeout for testing
      const timeoutHandler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 10000,
        maxConnections: 10,
        enableLogging: true
      });

      // Set up request handler that never resolves initialize requests
      timeoutHandler.setRequestHandler(async (request: MCPRequest) => {
        if (request.method === 'initialize') {
          // Return a promise that never resolves to simulate timeout
          return new Promise(() => {});
        }
        return mcpHandler.handleRequest(request);
      });

      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      let timeoutErrorReceived = false;

      (mockRes.write as jest.Mock).mockImplementation((data: string) => {
        if (data.includes('initialization_timeout') || data.includes('timeout')) {
          timeoutErrorReceived = true;
        }
      });

      timeoutHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      expect(timeoutHandler.getConnectionCount()).toBe(1);

      // Wait for timeout to occur (5 second timeout + buffer)
      setTimeout(() => {
        // Verify connection was closed due to timeout
        expect(timeoutHandler.getConnectionCount()).toBe(0);
        expect(mockRes.end).toHaveBeenCalled();
        expect(timeoutErrorReceived).toBe(true);

        timeoutHandler.stop();
        done();
      }, 6000);
    }, 8000);

    it('should maintain connection stability under load', async () => {
      const mockReq = createMockRequest();
      const mockRes = createMockResponse();
      const responseCount = { count: 0 };

      (mockRes.write as jest.Mock).mockImplementation(() => {
        responseCount.count++;
      });

      sseHandler.handleSSEConnection(mockReq as Request, mockRes as Response);
      
      const headers = (mockRes.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId = headers['X-Connection-ID'];

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 300));

      // Send multiple rapid requests to test stability
      const rapidRequests = Array.from({ length: 10 }, (_, i) => ({
        jsonrpc: '2.0',
        id: `load-test-${i}`,
        method: 'ping',
        params: {}
      })) as MCPRequest[];

      // Send all requests rapidly
      const requestPromises = rapidRequests.map(request => 
        sseHandler.handleMCPMessage(connectionId, request)
      );

      await Promise.all(requestPromises);

      // Verify connection remained stable
      expect(sseHandler.getConnectionCount()).toBe(1);
      
      // Verify all responses were sent (init + 10 pings + heartbeats)
      expect(responseCount.count).toBeGreaterThanOrEqual(11);
    });

    it('should handle connection errors without affecting other connections', async () => {
      // Create two connections
      const mockReq1 = createMockRequest({ 'x-correlation-id': 'conn-1' });
      const mockRes1 = createMockResponse();
      const mockReq2 = createMockRequest({ 'x-correlation-id': 'conn-2' });
      const mockRes2 = createMockResponse();

      sseHandler.handleSSEConnection(mockReq1 as Request, mockRes1 as Response);
      sseHandler.handleSSEConnection(mockReq2 as Request, mockRes2 as Response);

      expect(sseHandler.getConnectionCount()).toBe(2);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 300));

      // Simulate error on first connection
      (mockRes1.write as jest.Mock).mockImplementation(() => {
        throw new Error('Connection write error');
      });

      // Try to send message to first connection (should fail and close it)
      try {
        sseHandler.broadcast('test-event', { data: 'test' });
      } catch (error) {
        // Expected to throw due to write error
      }

      // Verify first connection was closed but second remains
      expect(sseHandler.getConnectionCount()).toBe(1);

      // Verify second connection is still functional
      const headers2 = (mockRes2.writeHead as jest.Mock).mock.calls[0][1];
      const connectionId2 = headers2['X-Connection-ID'];

      (mockRes2.write as jest.Mock).mockClear();
      
      const testRequest: MCPRequest = {
        jsonrpc: '2.0',
        id: 'stability-test',
        method: 'ping',
        params: {}
      };

      await sseHandler.handleMCPMessage(connectionId2, testRequest);

      // Verify second connection processed the request successfully
      expect(mockRes2.write).toHaveBeenCalledWith(
        expect.stringContaining('event: mcp-response')
      );
    });
  });
});