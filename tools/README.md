# MCP Tools

- `mcp-http-proxy.js` - stdio ↔ HTTP bridge for MCP clients that only speak stdio (e.g. Claude Desktop). It reads newline-delimited JSON-RPC from stdin, POSTs each message to the server's `/mcp` endpoint and writes responses to stdout. Notifications get no reply. Logs go to stderr.

```bash
MCP_SERVER_URL=http://localhost:3000/mcp node tools/mcp-http-proxy.js
# self-signed HTTPS in development only:
MCP_SERVER_URL=https://localhost:3443/mcp NODE_TLS_REJECT_UNAUTHORIZED=0 node tools/mcp-http-proxy.js
```

Clients that support Streamable HTTP natively can connect to `http://<host>:3000/mcp` directly instead.
