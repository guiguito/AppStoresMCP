/**
 * Core MCP (Model Context Protocol) types and interfaces
 * Based on MCP specification for protocol communication
 */

import { JSONSchema7 } from 'json-schema';

/**
 * MCP Request interface following JSON-RPC 2.0 specification
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

/**
 * MCP Response interface following JSON-RPC 2.0 specification
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

/**
 * MCP Error interface for structured error responses
 */
export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

/**
 * MCP Tool interface defining the structure for executable tools
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema7;
  execute(params: any): Promise<any>;
}

/**
 * MCP Server interface defining core server functionality
 */
export interface MCPServer {
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  registerTool(tool: MCPTool): void;
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
}

/**
 * MCP Message type for general protocol messages
 */
export type MCPMessage = MCPRequest | MCPResponse;

/**
 * Tool discovery response structure
 */
export interface ToolsListResponse {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: JSONSchema7;
  }>;
}

/**
 * Standard MCP error codes
 */
export enum MCPErrorCode {
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  SERVER_ERROR_START = -32099,
  SERVER_ERROR_END = -32000
}