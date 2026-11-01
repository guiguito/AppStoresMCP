/**
 * Tests for the minimal error helpers
 */

import { errorMessage, errorResponse, logError } from '../../src/errors/error-handler';
import { MCPErrorCode } from '../../src/types/mcp';

describe('errorMessage', () => {
  it('extracts messages from errors, strings and objects', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage({ message: 'obj' })).toBe('obj');
    expect(errorMessage(undefined)).toBe('Unknown error');
    // Library error classes keep their name so the caller can tell a 404 from a rate limit or a captcha block
    class RateLimitError extends Error { override name = 'RateLimitError'; }
    expect(errorMessage(new RateLimitError('Request failed: 429'))).toBe('RateLimitError: Request failed: 429');
  });

  it('keeps error.data such as validation details', () => {
    const error = { code: MCPErrorCode.INVALID_PARAMS, message: 'Invalid parameters', data: { validationErrors: ['appId is required'] } };
    expect(errorMessage(error)).toBe('Invalid parameters: {"validationErrors":["appId is required"]}');
  });
});

describe('logError', () => {
  it('writes a single JSON line', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logError('tool_error', new Error('boom'), { tool: 'x' });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]![0] as string;
    expect(line).not.toContain('\n');
    expect(JSON.parse(line)).toMatchObject({ level: 'error', type: 'tool_error', tool: 'x', error: 'boom' });
    spy.mockRestore();
  });
});

describe('errorResponse', () => {
  it('builds a JSON-RPC error envelope', () => {
    expect(errorResponse(null, MCPErrorCode.INVALID_REQUEST, 'bad')).toEqual({
      jsonrpc: '2.0', id: null, error: { code: -32600, message: 'bad' }
    });
  });
});
