/**
 * MCP Protocol Handler: routes JSON-RPC messages and executes tools
 */

import { MCPRequest, MCPResponse, MCPErrorCode } from '../types/mcp';
import { ToolRegistry } from '../registry/tool-registry';
import { validateToolParams } from '../utils/validation';
import { errorMessage, errorResponse, logError } from '../errors/error-handler';

export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-03-26', '2024-11-05'];

/**
 * Validate the JSON-RPC envelope (requests and notifications)
 */
export function isValidMCPRequest(value: unknown): value is MCPRequest {
  const body = value as Record<string, unknown> | null;
  return (
    !!body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    body.jsonrpc === '2.0' &&
    typeof body.method === 'string' &&
    (body.id === undefined || typeof body.id === 'string' || typeof body.id === 'number')
  );
}

export class MCPHandler {
  constructor(private toolRegistry: ToolRegistry) {}

  /**
   * Handle a valid JSON-RPC message. Returns undefined for notifications (no response must be sent).
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse | undefined> {
    // ponytail: notifications (initialized, cancelled, ...) need no server-side action, so they are all ignored
    if (request.id === undefined) {
      return undefined;
    }
    const id = request.id;

    switch (request.method) {
      case 'initialize': {
        const requested = request.params?.protocolVersion;
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: typeof requested === 'string' && SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
            capabilities: { tools: {} },
            serverInfo: { name: 'app-store-mcp-server', version: '1.0.0' }
          }
        };
      }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: this.toolRegistry.getToolsList() };
      case 'tools/call':
        return this.handleToolCall(id, request.params);
      default:
        return errorResponse(id, MCPErrorCode.METHOD_NOT_FOUND, `Method '${request.method}' not found`);
    }
  }

  /**
   * Unknown tool → JSON-RPC error; bad arguments or tool failure → result with isError
   */
  private async handleToolCall(id: string | number, params: MCPRequest['params']): Promise<MCPResponse> {
    const name = params?.name;
    const tool = typeof name === 'string' ? this.toolRegistry.getTool(name) : undefined;
    if (!tool) {
      return errorResponse(id, MCPErrorCode.INVALID_PARAMS, `Unknown tool: ${String(name)}`);
    }

    const args = (params?.arguments as Record<string, unknown> | undefined) || {};
    try {
      validateToolParams(args, tool.inputSchema);
      const result = await tool.execute(args);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result ?? null, null, 2) }]
        }
      };
    } catch (error) {
      logError('tool_error', error, { tool: name, requestId: id });
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: errorMessage(error) }], isError: true }
      };
    }
  }
}
