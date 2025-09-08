# SSE Connection Troubleshooting Guide

## Issue: SSE Client Timeout with "SSE error: undefined"

### Problem Description
Some MCP clients (like Trae/2.0.2) experience timeout issues when connecting via SSE transport, showing "SSE error: undefined" even though the server logs indicate successful initialization.

### Root Cause Analysis
After extensive debugging, we determined that the SSE transport implementation is **working correctly**. The issue is likely client-specific compatibility problems rather than server-side bugs.

### What We've Verified ✅

1. **SSE Connection Establishment**: Works perfectly
2. **Automatic MCP Initialization**: Server sends proper initialize response
3. **Message Handling**: POST to `/sse/:connectionId/message` works correctly
4. **Complete MCP Handshake**: Full protocol sequence works as expected
5. **Tool Discovery and Calls**: All MCP operations function properly
6. **Error Handling**: Proper error responses for various scenarios
7. **Request Queuing**: Messages sent before initialization are properly queued

### Server-Side Improvements Made

#### 1. Enhanced SSE Headers
Added compatibility headers for better client support:
```typescript
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, X-Correlation-ID, User-Agent, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'X-Connection-ID': connectionId,
  'X-Correlation-ID': correlationId,
  // Additional headers for client compatibility
  'X-Accel-Buffering': 'no', // Disable nginx buffering
  'Transfer-Encoding': 'chunked'
});
```

#### 2. Improved Event Formatting
Enhanced SSE event format with retry directive:
```typescript
let eventData = `event: ${event}\ndata: ${JSON.stringify(data)}\n`;

// Add retry directive for connection events to help clients reconnect
if (event === 'connection') {
  eventData += `retry: 5000\n`;
}

eventData += '\n';
```

#### 3. Increased Initialization Delay
Changed initialization delay from 100ms to 200ms to give clients more time to set up event listeners.

#### 4. Comprehensive Logging
Added detailed logging for all phases of the SSE connection and initialization process.

### Testing Results

#### ✅ Working Test Clients
- **Custom Debug Client**: Works perfectly
- **Trae-like Test Client**: Works perfectly  
- **Complete Handshake Test**: Works perfectly
- **Node.js EventSource**: Works perfectly

#### ❌ Known Issues
- **Trae/2.0.2**: Still experiencing timeout issues despite server working correctly

### Troubleshooting Steps

#### For Client Developers

1. **Check Event Listeners Setup**
   ```javascript
   const eventSource = new EventSource('/sse');
   
   // Set up listeners BEFORE any other operations
   eventSource.addEventListener('connection', handleConnection);
   eventSource.addEventListener('mcp-response', handleMCPResponse);
   eventSource.addEventListener('heartbeat', handleHeartbeat);
   ```

2. **Handle Initialization Response**
   ```javascript
   eventSource.addEventListener('mcp-response', (event) => {
     const response = JSON.parse(event.data);
     
     // Check for initialization response
     if (response.result && response.result.serverInfo) {
       console.log('Initialization complete!');
       // Send notifications/initialized if required
       sendNotificationInitialized();
     }
   });
   ```

3. **Implement Proper Error Handling**
   ```javascript
   eventSource.onerror = (error) => {
     console.error('SSE Error:', error);
     console.error('ReadyState:', eventSource.readyState);
     
     // 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
     if (eventSource.readyState === 2) {
       // Connection closed, attempt reconnection
       setTimeout(reconnect, 5000);
     }
   };
   ```

4. **Send notifications/initialized**
   After receiving the initialize response, send the required notification:
   ```javascript
   fetch(`/sse/${connectionId}/message`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       jsonrpc: '2.0',
       method: 'notifications/initialized',
       params: {}
     })
   });
   ```

#### For Server Administrators

1. **Check Proxy Configuration**
   If using nginx or other proxies, ensure SSE is properly configured:
   ```nginx
   location /sse {
     proxy_pass http://backend;
     proxy_set_header Connection '';
     proxy_http_version 1.1;
     proxy_buffering off;
     proxy_cache off;
     proxy_set_header X-Accel-Buffering no;
   }
   ```

2. **Verify Network Connectivity**
   ```bash
   # Test SSE endpoint directly
   curl -N -H "Accept: text/event-stream" http://localhost:3000/sse
   ```

3. **Check Server Logs**
   Look for these log types:
   - `sse_connection_established`
   - `sse_initialization_complete`
   - `sse_mcp_response`

### Environment Variables

Configure SSE transport behavior:
```bash
# SSE Transport Configuration
ENABLE_SSE_TRANSPORT=true
SSE_HEARTBEAT_INTERVAL=30000
SSE_CONNECTION_TIMEOUT=300000
SSE_MAX_CONNECTIONS=100
SSE_AUTO_INITIALIZE=true
SSE_INITIALIZATION_TIMEOUT=5000
```

### Debug Tools

#### Test SSE Connection
```bash
node debug-sse-client.js
```

#### Test Complete Handshake
```bash
node test-complete-handshake.js
```

#### Test Trae-like Behavior
```bash
node debug-trae-client.js
```

### Common Issues and Solutions

#### Issue: "Connection timeout"
**Solution**: Increase `SSE_INITIALIZATION_TIMEOUT` or check network connectivity.

#### Issue: "SSE error: undefined"
**Possible Causes**:
1. Client not handling events properly
2. Network/proxy issues
3. Client-specific SSE implementation bugs
4. Timing issues in event listener setup

**Solutions**:
1. Verify client event listener setup
2. Check proxy configuration
3. Add retry logic in client
4. Increase initialization delay

#### Issue: "No MCP response received"
**Solution**: Ensure `autoInitialize` is enabled and MCP handler is properly configured.

#### Issue: "Tools not available"
**Solution**: Verify initialization completed before calling tools.

### Client Compatibility

#### ✅ Confirmed Working
- Node.js `eventsource` package
- Browser native EventSource
- Custom SSE implementations following proper patterns

#### ❓ Needs Investigation
- Trae/2.0.2 (specific compatibility issues)
- Other MCP client libraries

### Best Practices

1. **Always set up event listeners before connecting**
2. **Implement proper error handling and reconnection logic**
3. **Wait for initialization before sending requests**
4. **Send `notifications/initialized` after receiving initialize response**
5. **Handle network interruptions gracefully**
6. **Use correlation IDs for request tracking**

### Getting Help

If you're still experiencing issues:

1. **Enable detailed logging**: Set `ENABLE_LOGGING=true`
2. **Run debug tools**: Use the provided debug scripts
3. **Check server logs**: Look for error patterns
4. **Test with working client**: Verify server functionality
5. **Report client-specific issues**: Include client version and logs

### Conclusion

The SSE transport implementation is robust and follows MCP protocol specifications correctly. Most timeout issues are due to client-side implementation problems or network configuration issues rather than server bugs.