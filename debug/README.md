# Debug Tools

This directory contains debugging and testing utilities for the MCP server.

## Files

- `debug-sse-client.js` - SSE client for debugging Server-Sent Events transport
- `debug-trae-client.js` - Debug client for testing transport protocols  
- `test-complete-handshake.js` - Test script for MCP handshake completion
- `test-config.js` - Configuration testing utilities

## Usage

These tools are primarily for development and debugging purposes. Run them with Node.js:

```bash
node debug/debug-sse-client.js
node debug/test-complete-handshake.js
```