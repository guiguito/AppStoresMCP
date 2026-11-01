/**
 * JSON-RPC error codes are part of the wire format
 */

import { MCPErrorCode } from '../../src/types/mcp';

describe('MCPErrorCode', () => {
  it('matches the JSON-RPC 2.0 codes', () => {
    expect(MCPErrorCode.PARSE_ERROR).toBe(-32700);
    expect(MCPErrorCode.INVALID_REQUEST).toBe(-32600);
    expect(MCPErrorCode.METHOD_NOT_FOUND).toBe(-32601);
    expect(MCPErrorCode.INVALID_PARAMS).toBe(-32602);
    expect(MCPErrorCode.INTERNAL_ERROR).toBe(-32603);
  });
});
