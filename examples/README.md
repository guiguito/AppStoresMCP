# MCP Client Examples

This directory contains example client implementations for the App Store MCP Server.

## Available Examples

### 1. Basic JavaScript Client (`mcp-client.js`)

A simple Node.js client demonstrating basic MCP tool usage.

**Features:**
- Basic HTTP requests to MCP server
- Simple error handling
- Examples for all 19 MCP tools
- Rate limiting demonstration
- Raw data handling examples

**Usage:**
```bash
# Make sure the MCP server is running
npm start

# In another terminal, run the example
node examples/mcp-client.js
```

### 2. Advanced TypeScript Client (`advanced-mcp-client.ts`)

A comprehensive TypeScript client with advanced features.

### 3. HTTPS Client Example (`https-client-example.js`)

A secure HTTPS client demonstrating SSL/TLS connections to the MCP server.

**Features:**
- HTTPS/SSL support with certificate validation
- Self-signed certificate handling for development
- Custom CA certificate support
- Comprehensive error handling for SSL issues
- Production-ready security configurations

**Usage:**
```bash
# Generate SSL certificates for testing
npm run generate-ssl

# Start the server with HTTPS enabled
HTTPS_ENABLED=true HTTPS_KEY_PATH=./ssl/server.key HTTPS_CERT_PATH=./ssl/server.crt npm start

# In another terminal, run the HTTPS example
node examples/https-client-example.js
```

**Key Features:**
- Certificate validation control
- Custom CA support for enterprise environments
- Detailed SSL error reporting
- Timeout and retry handling

**Features:**
- Full TypeScript type safety
- Request retry logic with exponential backoff
- Response caching
- Batch operations
- App comparison across stores
- Comprehensive app analysis
- Error handling and recovery

**Usage:**
```bash
# Compile TypeScript (if needed)
npx tsc examples/advanced-mcp-client.ts --target ES2020 --module commonjs --esModuleInterop

# Run the example
node examples/advanced-mcp-client.js
```

### 4. Review Filtering Example (`review-filtering-example.js`)

A comprehensive example demonstrating the new review filtering functionality that reduces token consumption by up to 93%.

**Features:**
- Comparison between filtered and full review responses
- Token usage calculation and reduction demonstration
- Essential fields preservation examples
- Both Google Play and App Store review filtering
- Performance impact analysis

**Usage:**
```bash
# Make sure the MCP server is running
npm start

# In another terminal, run the review filtering example
node examples/review-filtering-example.js
```

**Key Demonstrations:**
- Default filtering behavior (fullDetail=false)
- Full detail mode (fullDetail=true)
- Token usage comparison and savings calculation
- Essential vs. removed fields analysis
- Cross-platform filtering differences

### 5. SSE Transport Client (`sse-client-example.js`)

A comprehensive SSE (Server-Sent Events) client demonstrating the fixed SSE transport with automatic MCP initialization.

**Features:**
- SSE connection establishment with automatic initialization
- Request queuing during initialization
- Automatic reconnection with exponential backoff
- Error handling and recovery
- Performance testing examples
- Proper connection cleanup
- Real-time event handling

**Usage:**
```bash
# Install required dependencies
npm install eventsource node-fetch

# Make sure the MCP server is running with SSE transport enabled
SSE_AUTO_INITIALIZE=true npm start

# In another terminal, run the SSE example
node examples/sse-client-example.js
```

**Key Demonstrations:**
- Automatic MCP initialization handling
- Tool discovery and usage via SSE
- Cross-store app comparisons
- Concurrent request processing
- Error scenarios and recovery
- Performance benchmarking

## Example Scenarios

### Basic App Information Retrieval

```javascript
const { MCPClient } = require('./mcp-client');
const client = new MCPClient();

// Get app details
const appDetails = await client.getGooglePlayAppDetails('com.whatsapp');
console.log(appDetails.data.title); // "WhatsApp Messenger"
```

### Cross-Platform App Comparison

```typescript
import AdvancedMCPClient from './advanced-mcp-client';
const client = new AdvancedMCPClient();

// Compare the same app across both stores
const comparison = await client.compareAppAcrossStores(
  'com.spotify.music',  // Google Play ID
  '324684580'           // Apple App Store ID
);

console.log(`Rating difference: ${comparison.comparison?.ratingDifference}`);
```

### Batch Search Operations

```typescript
// Search both stores simultaneously
const results = await client.searchBothStores('photo editor', 10);

console.log('Google Play results:', results.googlePlay.data?.count);
console.log('App Store results:', results.appStore.data?.count);
console.log('Combined unique apps:', results.combined.length);
```

### App Analysis with Reviews

```typescript
// Get comprehensive app analysis including reviews
const analysis = await client.getAppAnalysis('com.instagram.android', 'google-play');

console.log('Recent sentiment:', analysis.analysis.recentReviewsSentiment);
console.log('Common keywords:', analysis.analysis.commonKeywords);
```

### Using New Specialized Tools

```javascript
// Get app permissions (Google Play only)
const permissions = await client.callTool('google-play-permissions', {
  appId: 'com.whatsapp'
});
console.log('App permissions:', permissions);

// Get data safety information (Google Play only)
const dataSafety = await client.callTool('google-play-datasafety', {
  appId: 'com.whatsapp'
});
console.log('Data safety info:', dataSafety);

// Get app ratings breakdown (App Store only)
const ratings = await client.callTool('app-store-ratings', {
  id: '310633997'
});
console.log('Ratings breakdown:', ratings);

// Get apps by developer
const developerApps = await client.callTool('google-play-developer', {
  devId: 'WhatsApp LLC',
  num: 10
});
console.log('Developer apps:', developerApps);
```

### SSE Transport Examples with Automatic Initialization

The SSE transport now includes automatic MCP initialization to prevent timeout issues:

```javascript
// Updated SSE Client Example with Automatic Initialization
class SSEMCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.responseHandlers = new Map();
    this.requestQueue = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('connection', (event) => {
        const data = JSON.parse(event.data);
        this.connectionId = data.connectionId;
        console.log('SSE connected with ID:', this.connectionId);
      });

      this.eventSource.addEventListener('mcp-response', (event) => {
        const response = JSON.parse(event.data);
        
        // Handle automatic initialization response
        if (response.result && response.result.serverInfo && !this.isInitialized) {
          console.log('MCP initialization complete!');
          console.log('Server:', response.result.serverInfo.name);
          this.isInitialized = true;
          this.processQueuedRequests();
          resolve(response.result);
          return;
        }
        
        // Handle regular responses
        const handler = this.responseHandlers.get(response.id);
        if (handler) {
          handler.resolve(response);
          this.responseHandlers.delete(response.id);
        }
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        console.log('Heartbeat:', data.timestamp);
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        reject(error);
      };

      // Timeout if initialization doesn't complete
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Initialization timeout'));
        }
      }, 10000);
    });
  }

  async callTool(toolName, arguments) {
    if (!this.connectionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    const requestId = Date.now().toString();
    const message = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments
      }
    };

    // Queue request if not initialized
    if (!this.isInitialized) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ message, resolve, reject });
      });
    }

    return this.sendMessage(message);
  }

  async sendMessage(message) {
    const responsePromise = new Promise((resolve, reject) => {
      this.responseHandlers.set(message.id, { resolve, reject });
      
      setTimeout(() => {
        if (this.responseHandlers.has(message.id)) {
          this.responseHandlers.delete(message.id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });

    const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return responsePromise;
  }

  async processQueuedRequests() {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    for (const { message, resolve, reject } of queue) {
      try {
        const result = await this.sendMessage(message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connectionId = null;
      this.isInitialized = false;
    }
  }
}

// Usage example with automatic initialization
async function useSSEClient() {
  const sseClient = new SSEMCPClient();
  
  try {
    // Connect and wait for automatic initialization
    const serverInfo = await sseClient.connect();
    console.log('Connected to:', serverInfo.name);
    
    // Now ready to make requests
    const appDetails = await sseClient.callTool('google-play-app-details', {
      appId: 'com.whatsapp'
    });
    console.log('App title:', appDetails.title);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sseClient.disconnect();
  }
}

useSSEClient();
```

**Key Features of the Updated SSE Transport:**

1. **Automatic Initialization**: Server sends MCP initialize response immediately after connection
2. **Request Queuing**: Requests sent before initialization are automatically queued
3. **Timeout Prevention**: Eliminates client timeout issues during handshake
4. **Standard Compatibility**: Works with existing MCP client libraries

## Error Handling Examples

### Handling Invalid App IDs

```javascript
try {
  const result = await client.getGooglePlayAppDetails('invalid.app.id');
} catch (error) {
  if (error.message.includes('not_found')) {
    console.log('App not found in store');
  } else if (error.message.includes('validation_error')) {
    console.log('Invalid app ID format');
  }
}
```

### Rate Limiting Handling

```javascript
// The advanced client automatically handles retries
const client = new AdvancedMCPClient({
  retries: 3,
  retryDelay: 1000 // Start with 1 second, exponential backoff
});

// This will automatically retry on rate limit errors
const results = await client.searchGooglePlay('popular apps');
```

## Configuration Examples

### Custom Client Configuration

```typescript
const client = new AdvancedMCPClient({
  baseUrl: 'http://localhost:3000',
  timeout: 30000,        // 30 second timeout
  retries: 5,            // Retry up to 5 times
  retryDelay: 2000,      // Start with 2 second delay
  enableCache: true,     // Enable response caching
  cacheTimeout: 600000   // Cache for 10 minutes
});
```

### Environment-Specific Configuration

```javascript
const config = {
  baseUrl: process.env.MCP_SERVER_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.MCP_TIMEOUT || '30000'),
  retries: parseInt(process.env.MCP_RETRIES || '3')
};

const client = new AdvancedMCPClient(config);
```

## Testing Your Client

### Basic Connectivity Test

```javascript
async function testConnection() {
  try {
    const tools = await client.listTools();
    console.log(`Connected! Found ${tools.tools.length} tools.`);
    return true;
  } catch (error) {
    console.error('Connection failed:', error.message);
    return false;
  }
}
```

### Tool Availability Test

```javascript
async function testAllTools() {
  const tools = await client.listTools();
  const expectedTools = [
    // Google Play Store tools (10)
    'google-play-app-details',
    'google-play-app-reviews', 
    'google-play-search',
    'google-play-list',
    'google-play-developer',
    'google-play-suggest',
    'google-play-similar',
    'google-play-permissions',
    'google-play-datasafety',
    'google-play-categories',
    // Apple App Store tools (9)
    'app-store-app-details',
    'app-store-app-reviews',
    'app-store-search',
    'app-store-list',
    'app-store-developer',
    'app-store-privacy',
    'app-store-suggest',
    'app-store-similar',
    'app-store-ratings'
  ];

  const availableTools = tools.tools.map(t => t.name);
  const missingTools = expectedTools.filter(t => !availableTools.includes(t));
  
  if (missingTools.length === 0) {
    console.log(`✅ All ${expectedTools.length} expected tools are available`);
  } else {
    console.log('❌ Missing tools:', missingTools);
  }
}
```

## Performance Tips

1. **Use caching** for repeated requests (enabled by default in AdvancedMCPClient)
2. **Batch operations** when possible to reduce round trips
3. **Set appropriate timeouts** based on your use case
4. **Implement retry logic** for production applications
5. **Monitor rate limits** and implement backoff strategies

## Integration Examples

### Express.js API Integration

```javascript
const express = require('express');
const { MCPClient } = require('./examples/mcp-client');

const app = express();
const mcpClient = new MCPClient();

app.get('/api/app/:store/:id', async (req, res) => {
  try {
    const { store, id } = req.params;
    
    let result;
    if (store === 'google-play') {
      result = await mcpClient.getGooglePlayAppDetails(id);
    } else if (store === 'app-store') {
      result = await mcpClient.getAppStoreAppDetails(id);
    } else {
      return res.status(400).json({ error: 'Invalid store' });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('API server running on port 3001');
});
```

### React Component Integration

```typescript
import React, { useState, useEffect } from 'react';
import AdvancedMCPClient from './advanced-mcp-client';

const AppDetails: React.FC<{ appId: string; store: string }> = ({ appId, store }) => {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const client = new AdvancedMCPClient();
    
    const fetchAppData = async () => {
      try {
        setLoading(true);
        
        // Call appropriate tool based on store
        const toolName = store === 'google-play' 
          ? 'google-play-app-details' 
          : 'app-store-app-details';
        
        const params = store === 'google-play' 
          ? { appId } 
          : { appId }; // Both use appId parameter
        
        const result = await client.callTool(toolName, params);
        
        // v2.x returns raw data directly
        setAppData(result);
      } catch (err) {
        // Handle both structured errors and raw errors
        if (err.success === false) {
          setError(err.error?.message || 'Failed to fetch app data');
        } else {
          setError(err.message || 'Unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAppData();
  }, [appId, store]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!appData) return <div>No data available</div>;

  // Handle raw data format differences between stores
  const title = appData.title;
  const developer = appData.developer;
  const rating = store === 'google-play' ? appData.score : appData.score;
  const ratingCount = store === 'google-play' ? appData.ratings : appData.reviews;
  const category = store === 'google-play' ? appData.genre : appData.primaryGenre;

  return (
    <div>
      <h2>{title}</h2>
      <p>Developer: {developer}</p>
      <p>Rating: {rating} ⭐ ({ratingCount?.toLocaleString()} reviews)</p>
      <p>Category: {category}</p>
      {store === 'google-play' && appData.histogram && (
        <div>
          <h3>Rating Distribution:</h3>
          <ul>
            <li>5 stars: {appData.histogram['5']?.toLocaleString()}</li>
            <li>4 stars: {appData.histogram['4']?.toLocaleString()}</li>
            <li>3 stars: {appData.histogram['3']?.toLocaleString()}</li>
            <li>2 stars: {appData.histogram['2']?.toLocaleString()}</li>
            <li>1 star: {appData.histogram['1']?.toLocaleString()}</li>
          </ul>
        </div>
      )}
    </div>
  );
};
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Make sure the MCP server is running on the correct port
2. **Tool not found**: Verify the tool name matches exactly (case-sensitive)
3. **Invalid parameters**: Check the API documentation for required parameter formats
4. **Rate limiting**: Implement proper retry logic and respect rate limits

### Debug Mode

Enable debug logging in your client:

```javascript
// Add debug logging to the basic client
const originalMakeRequest = client.makeRequest;
client.makeRequest = function(method, params) {
  console.log('MCP Request:', { method, params });
  return originalMakeRequest.call(this, method, params)
    .then(result => {
      console.log('MCP Response:', result);
      return result;
    })
    .catch(error => {
      console.error('MCP Error:', error);
      throw error;
    });
};
```

## Contributing

When adding new examples:

1. Follow the existing code style
2. Include comprehensive error handling
3. Add usage documentation
4. Test with the actual MCP server
5. Consider both success and failure scenarios