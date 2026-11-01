/**
 * Core MCP (Model Context Protocol) types — JSON-RPC 2.0 envelopes and tool shape
 */

import { JSONSchema7 } from 'json-schema';

/**
 * JSON-RPC 2.0 request; a message without `id` is a notification
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 response; `id` is null when the request id could not be determined
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  /** Raw library data, serialized as JSON text by the protocol handler */
  // Each tool narrows `params` to its own type; mcp-handler validates args against inputSchema before calling.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute(params: any): Promise<unknown>;
}

export interface ToolsListResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema7;
  }>;
}

export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603
}
