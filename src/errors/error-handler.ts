/**
 * Minimal error helpers: readable message extraction and single-line JSON error logs
 */

import { MCPErrorCode, MCPResponse } from '../types/mcp';

/**
 * Human-readable message for any thrown value, keeping `error.data` (e.g. validation details)
 */
export function errorMessage(error: unknown): string {
  const e = error as { name?: string; message?: string; data?: unknown } | string | null | undefined;
  if (typeof e === 'string') {
    return e;
  }
  // Library error classes (NotFoundError, RateLimitError, BlockedError, ValidationError, ...) tell the caller what to do next
  const typed = e?.name && e.name !== 'Error' ? `${e.name}: ` : '';
  const message = typed + (e?.message || 'Unknown error');
  return e?.data !== undefined ? `${message}: ${JSON.stringify(e.data)}` : message;
}

/**
 * Log one failure as a single JSON line
 */
export function logError(type: string, error: unknown, context?: Record<string, unknown>): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    type,
    ...context,
    error: errorMessage(error),
    stack: error instanceof Error ? error.stack : undefined
  }));
}

/**
 * Build a JSON-RPC error response
 */
export function errorResponse(id: string | number | null, code: MCPErrorCode, message: string): MCPResponse {
  return { jsonrpc: '2.0', id, error: { code, message } };
}
