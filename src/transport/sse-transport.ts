/**
 * Legacy MCP HTTP+SSE transport (protocol 2024-11-05)
 *
 * GET  /sse                       → event stream; first event is `endpoint` with the POST URL
 * POST /sse/:connectionId/message → 202 Accepted; the JSON-RPC response is sent on the stream as `event: message`
 */

import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { MCPRequest, MCPResponse, MCPErrorCode } from '../types/mcp';
import { isValidMCPRequest } from '../protocol/mcp-handler';
import { errorResponse, logError } from '../errors/error-handler';

export interface SSETransportConfig {
  heartbeatInterval?: number;
  maxConnections?: number;
  enableLogging?: boolean;
}

export type MCPRequestHandler = (request: MCPRequest) => Promise<MCPResponse | undefined>;

export class SSETransportHandler {
  private connections = new Map<string, Response>();
  private heartbeatInterval: number;
  private maxConnections: number;

  constructor(private config: SSETransportConfig, private requestHandler: MCPRequestHandler) {
    this.heartbeatInterval = config.heartbeatInterval ?? 30000;
    this.maxConnections = config.maxConnections ?? 100;
  }

  /**
   * GET /sse — open the event stream and announce the message endpoint
   */
  public handleSSEConnection = (_req: Request, res: Response): void => {
    if (this.connections.size >= this.maxConnections) {
      res.status(503).json(errorResponse(null, MCPErrorCode.INTERNAL_ERROR, 'Maximum SSE connections reached'));
      return;
    }

    const connectionId = randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(`event: endpoint\ndata: /sse/${connectionId}/message\n\n`);
    this.connections.set(connectionId, res);
    this.log('sse_connected', connectionId);

    // Comment line keeps proxies from closing an idle stream
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), this.heartbeatInterval);
    heartbeat.unref();

    res.on('close', () => {
      clearInterval(heartbeat);
      this.connections.delete(connectionId);
      this.log('sse_disconnected', connectionId);
    });
  };

  /**
   * POST /sse/:connectionId/message — accept the message, answer on the stream
   */
  public handleMessage = async (req: Request, res: Response): Promise<void> => {
    const connectionId = String(req.params.connectionId);
    const stream = this.connections.get(connectionId);
    if (!stream) {
      res.status(404).json(errorResponse(null, MCPErrorCode.INVALID_REQUEST, 'Unknown SSE connection'));
      return;
    }
    if (!isValidMCPRequest(req.body)) {
      res.status(400).json(errorResponse(null, MCPErrorCode.INVALID_REQUEST, 'Invalid MCP request format'));
      return;
    }

    res.status(202).end();

    try {
      const response = await this.requestHandler(req.body);
      if (response && this.connections.has(connectionId)) {
        stream.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
      }
    } catch (error) {
      logError('sse_message_error', error, { connectionId });
    }
  };

  public getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close every open stream
   */
  public stop(): void {
    for (const res of this.connections.values()) {
      res.end();
    }
    this.connections.clear();
  }

  private log(type: string, connectionId: string): void {
    if (this.config.enableLogging !== false) {
      console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', type, connectionId, connections: this.connections.size }));
    }
  }
}
