/**
 * Unit tests for SSE Transport Handler Configuration Options
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

describe('SSE Transport Configuration Options', () => {
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
    }, 10000);

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
    }, 10000);

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
    }, 10000);
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

      // Wait longer than the timeout to ensure it triggers
      // Timeline: 200ms autoInit delay + 100ms timeout = 300ms total, so wait 400ms
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
      }, 400);
    }, 10000);

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
    }, 10000);

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

      // Wait longer than the timeout to ensure it triggers
      // Timeline: 200ms autoInit delay + 100ms timeout = 300ms total, so wait 400ms
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
      }, 400);
    }, 10000);
  });

  describe('backward compatibility', () => {
    it('should maintain backward compatibility with existing SSE transport configuration', () => {
      // Test that existing configuration options still work
      const handler = new SSETransportHandler({
        heartbeatInterval: 1000,
        connectionTimeout: 5000,
        maxConnections: 10,
        enableLogging: true
      });

      expect(handler).toBeDefined();
      handler.stop();
    });

    it('should work with minimal configuration', () => {
      // Test that handler works with no configuration options
      const handler = new SSETransportHandler();
      expect(handler).toBeDefined();
      handler.stop();
    });

    it('should work with partial configuration', () => {
      // Test that handler works with only some configuration options
      const handler = new SSETransportHandler({
        autoInitialize: false
      });
      expect(handler).toBeDefined();
      handler.stop();
    });
  });

  describe('configuration validation', () => {
    it('should handle invalid initializationTimeout gracefully', () => {
      // The SSE transport should handle invalid timeout values gracefully
      const handler = new SSETransportHandler({
        initializationTimeout: -1 // Invalid negative timeout
      });
      expect(handler).toBeDefined();
      handler.stop();
    });

    it('should handle boolean autoInitialize values correctly', () => {
      const handlerTrue = new SSETransportHandler({
        autoInitialize: true
      });
      expect(handlerTrue).toBeDefined();
      handlerTrue.stop();

      const handlerFalse = new SSETransportHandler({
        autoInitialize: false
      });
      expect(handlerFalse).toBeDefined();
      handlerFalse.stop();
    });
  });
});