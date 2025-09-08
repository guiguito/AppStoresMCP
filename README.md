# App Store MCP Server

> **⚠️ Experimental Status**: This MCP server is experimental and provided as-is. No ongoing fixes or maintenance are planned at this time. Feel free to fork and improve the project for your own needs.

A comprehensive Node.js TypeScript MCP (Model Context Protocol) server that provides complete app store scraping functionality through multiple transport protocols. This server integrates with Google Play Store and Apple App Store scraping libraries to offer full access to all available scraping methods, returning raw data models to preserve complete information.

## Features

- **Dual Transport Support**: Implements both MCP Streamable HTTP and SSE (Server-Sent Events) transport protocols
- **Fixed SSE Transport**: SSE transport now includes automatic MCP initialization to prevent client timeout issues
- **Comprehensive Coverage**: 19 MCP tools covering all available functionality from both app store scraping libraries
- **Raw Data Models**: Returns complete, unmodified responses from underlying scraping libraries
- **Dual Platform Support**: Complete access to both Google Play Store and Apple App Store data
- **TypeScript**: Full type safety and modern JavaScript features
- **Docker Ready**: Containerized deployment with multi-stage builds
- **Production Ready**: Comprehensive error handling, logging, and health checks
- **Rate Limiting**: Built-in protection against API abuse
- **Configurable**: Environment-based configuration management
- **Legacy Compatibility**: SSE transport for older MCP clients with automatic initialization

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd app-store-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Start the server**
   ```bash
   npm start
   ```

The server will start on port 3000 by default. You can verify it's running by visiting `http://localhost:3000/health`.

### Docker Deployment

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

2. **Or build and run manually**
   ```bash
   docker build -t app-store-mcp-server .
   docker run -p 3000:3000 app-store-mcp-server
   ```

## Available MCP Tools

The server exposes 19 comprehensive MCP tools for complete app store data access:

### Google Play Store Tools (10 tools)

1. **`google-play-app-details`** - Get detailed app information including metadata, ratings, and descriptions
2. **`google-play-app-reviews`** - Fetch app reviews with pagination and sorting options
3. **`google-play-search`** - Search for apps with customizable result count and localization
4. **`google-play-list`** - Get app lists from collections (TOP_FREE, TOP_PAID, NEW_FREE, etc.) and categories
5. **`google-play-developer`** - Get all apps by a specific developer with pagination
6. **`google-play-suggest`** - Get search suggestions for app discovery
7. **`google-play-similar`** - Find apps similar to a given app
8. **`google-play-permissions`** - Get detailed app permissions information
9. **`google-play-datasafety`** - Get app data safety and privacy information
10. **`google-play-categories`** - Get list of available app categories

### Apple App Store Tools (9 tools)

1. **`app-store-app-details`** - Get detailed app information including metadata, ratings, and descriptions
2. **`app-store-app-reviews`** - Fetch app reviews with pagination and sorting options
3. **`app-store-search`** - Search for apps with customizable result count and region options
4. **`app-store-list`** - Get app lists from collections and categories
5. **`app-store-developer`** - Get all apps by a specific developer
6. **`app-store-privacy`** - Get detailed app privacy information and policies
7. **`app-store-suggest`** - Get search suggestions for app discovery
8. **`app-store-similar`** - Find apps similar to a given app
9. **`app-store-ratings`** - Get detailed ratings breakdown and statistics

All tools return raw, unmodified data from the underlying scraping libraries to preserve complete information and metadata.

## Localization and Regional Support

The MCP tools support localization and regional customization through optional parameters:

### Language Support (Google Play Store)
- **Parameter**: `lang` (optional)
- **Format**: ISO 639-1 two-letter lowercase language codes (e.g., 'en', 'fr', 'es', 'de')
- **Default**: 'en' (English)
- **Supported Tools**: All Google Play Store tools that retrieve content

### Country Support (Both Stores)
- **Parameter**: `country` (optional)
- **Format**: ISO 3166-1 alpha-2 two-letter lowercase country codes (e.g., 'us', 'ca', 'gb', 'fr')
- **Default**: 'us' (United States)
- **Supported Tools**: Most tools from both app stores

### Usage Examples

```json
// Google Play app details with French language and Canadian region
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "google-play-app-details",
    "arguments": {
      "appId": "com.whatsapp",
      "lang": "fr",
      "country": "ca"
    }
  }
}

// App Store app reviews with Canadian region
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "app-store-app-reviews",
    "arguments": {
      "appId": "310633997",
      "country": "ca",
      "page": 1
    }
  }
}
```

### Parameter Validation
- Language and country codes are validated using regex patterns
- Invalid codes return descriptive error messages
- Parameters are optional and backward compatible

## Configuration

The server can be configured using environment variables:

### Core Settings
- `PORT` - Server port (default: 3000)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `NODE_ENV` - Environment: development, production, test (default: development)

### Rate Limiting
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (default: 900000 - 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

### Scraping Configuration
- `SCRAPING_TIMEOUT` - Request timeout in milliseconds (default: 30000)
- `SCRAPING_RETRIES` - Number of retry attempts (default: 3)

### Transport Configuration
- `ENABLE_HTTP_TRANSPORT` - Enable HTTP transport (default: true)
- `ENABLE_SSE_TRANSPORT` - Enable SSE transport (default: true)
- `SSE_HEARTBEAT_INTERVAL` - SSE heartbeat interval in milliseconds (default: 30000)
- `SSE_CONNECTION_TIMEOUT` - SSE connection timeout in milliseconds (default: 300000)
- `SSE_MAX_CONNECTIONS` - Maximum concurrent SSE connections (default: 100)
- `SSE_AUTO_INITIALIZE` - Enable automatic MCP initialization for SSE connections (default: true)
- `SSE_INITIALIZATION_TIMEOUT` - SSE initialization timeout in milliseconds (default: 5000)

### CORS and Security
- `CORS_ORIGINS` - Allowed CORS origins, comma-separated (default: *)
- `REQUEST_TIMEOUT` - HTTP request timeout in milliseconds (default: 60000)
- `ENABLE_LOGGING` - Enable request logging (default: true)

### HTTPS Configuration
- `HTTPS_ENABLED` - Enable HTTPS/SSL support (default: false)
- `HTTPS_KEY_PATH` - Path to SSL private key file (required if HTTPS enabled)
- `HTTPS_CERT_PATH` - Path to SSL certificate file (required if HTTPS enabled)
- `HTTPS_CA_PATH` - Path to Certificate Authority file (optional)
- `HTTPS_PASSPHRASE` - Private key passphrase (optional)

### Example Configuration

Create a `.env` file:
```env
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SCRAPING_TIMEOUT=30000
SCRAPING_RETRIES=3
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# HTTPS Configuration (optional)
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./ssl/server.key
HTTPS_CERT_PATH=./ssl/server.crt
```

## HTTPS Setup

The MCP server supports HTTPS for secure connections. You can enable HTTPS in two ways:

### Option 1: Generate Self-Signed Certificates (Development)

For development and testing, you can generate self-signed certificates:

```bash
# Generate SSL certificates (creates ssl/ directory, not tracked in git)
./scripts/generate-ssl-certs.sh

# Enable HTTPS with generated certificates
export HTTPS_ENABLED=true
export HTTPS_KEY_PATH=./ssl/server.key
export HTTPS_CERT_PATH=./ssl/server.crt

# Start the server
npm start
```

### Option 2: Use Production Certificates

For production deployments, use certificates from a trusted Certificate Authority:

```bash
# Set environment variables for your production certificates
export HTTPS_ENABLED=true
export HTTPS_KEY_PATH=/path/to/your/private.key
export HTTPS_CERT_PATH=/path/to/your/certificate.crt
export HTTPS_CA_PATH=/path/to/your/ca-bundle.crt  # Optional

# If your private key has a passphrase
export HTTPS_PASSPHRASE=your_passphrase

# Start the server
npm start
```

### HTTPS Client Configuration

When using HTTPS, update your MCP client configuration to use `https://` URLs:

```json
{
  "mcpServers": {
    "app-store-secure": {
      "transport": "http",
      "url": "https://your-domain.com/mcp",
      "timeout": 60000
    }
  }
}
```

**Note**: For self-signed certificates, clients may need to disable certificate verification or add the certificate to their trust store.

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── config/          # Configuration management
├── errors/          # Error handling utilities
├── protocol/        # MCP protocol implementation
├── registry/        # Tool registry management
├── services/        # App store scraper services
├── tools/           # MCP tool implementations
├── transport/       # HTTP transport layer
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── index.ts         # Application entry point
└── server.ts        # Main server class

tests/
├── integration/     # Integration tests
├── unit/           # Unit tests by component
└── fixtures/       # Test data and mocks
```

### Adding New Tools

1. Create a new tool class implementing the `MCPTool` interface
2. Register the tool in `src/server.ts`
3. Add comprehensive tests
4. Update documentation

## Transport Usage

### HTTP Transport (Recommended)

The HTTP transport uses MCP Streamable HTTP protocol for modern MCP clients:

```bash
# MCP endpoint
POST http://localhost:3000/mcp

# Health check
GET http://localhost:3000/health
```

### SSE Transport (Enhanced Compatibility)

The SSE transport provides compatibility with MCP clients and includes **automatic MCP initialization** with enhanced client compatibility features:

```bash
# Establish SSE connection
GET http://localhost:3000/sse

# Send MCP messages to specific connection
POST http://localhost:3000/sse/{connectionId}/message
```

#### Key Features

- **Automatic Initialization**: Server automatically sends MCP initialization messages upon connection
- **Timeout Prevention**: Eliminates client timeout issues during handshake
- **Standard MCP Compatibility**: Works with existing MCP client libraries without modifications
- **Request Queuing**: Queues incoming requests until initialization completes
- **Comprehensive Logging**: Detailed logging for troubleshooting connection issues

#### SSE Connection Example

```javascript
// Establish SSE connection
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onopen = function(event) {
  console.log('SSE connection established');
};

eventSource.addEventListener('connection', function(event) {
  const data = JSON.parse(event.data);
  console.log('Connection ID:', data.connectionId);
  window.sseConnectionId = data.connectionId;
});

// Handle automatic initialization response
eventSource.addEventListener('mcp-response', function(event) {
  const response = JSON.parse(event.data);
  
  if (response.result && response.result.serverInfo) {
    console.log('MCP initialization complete:', response.result.serverInfo);
    console.log('Server capabilities:', response.result.capabilities);
    
    // Now ready to send MCP requests
    sendToolRequest();
  } else {
    console.log('MCP Response:', response);
  }
});

eventSource.addEventListener('heartbeat', function(event) {
  const data = JSON.parse(event.data);
  console.log('Heartbeat received:', data.timestamp);
});

// Send MCP request after initialization
function sendToolRequest() {
  fetch(`http://localhost:3000/sse/${window.sseConnectionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: {
        name: 'google-play-app-details',
        arguments: { appId: 'com.whatsapp' }
      }
    })
  });
}
```

#### SSE Configuration Options

The SSE transport can be configured with the following environment variables:

```bash
# SSE Transport Configuration
SSE_AUTO_INITIALIZE=true              # Enable automatic initialization (default: true)
SSE_INITIALIZATION_TIMEOUT=5000       # Initialization timeout in ms (default: 5000)
SSE_HEARTBEAT_INTERVAL=30000          # Heartbeat interval in ms (default: 30000)
SSE_CONNECTION_TIMEOUT=300000         # Connection timeout in ms (default: 300000)
SSE_MAX_CONNECTIONS=100               # Maximum concurrent connections (default: 100)
```



## MCP Client Setup

To connect MCP clients like Cursor or Windsurf to this server, see [MCP_CLIENT_SETUP.md](./docs/MCP_CLIENT_SETUP.md).

## API Documentation

For detailed API documentation including request/response examples, see [API.md](./docs/API.md).

## Troubleshooting

For common issues and solutions, see [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Docker Documentation

For detailed Docker deployment instructions, see [DOCKER.md](./docs/DOCKER.md).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Additional Resources

### App Store Optimization (ASO) Guides

The `docs/aso/` directory contains comprehensive guides for manual App Store Optimization:

- **`appstore_keywords.md`** - Advanced iOS App Store keyword optimization guide
- **`playstore_keywords.md`** - Step-by-step Google Play Store keyword optimization
- **`appstore_page.md`** - iOS App Store page optimization strategies  
- **`playstore_page.md`** - Google Play Store listing optimization
- **`guide_traffic_difficulty.md`** - Traffic analysis and keyword difficulty assessment

These guides complement the MCP server by providing strategies for optimizing app store listings using the data you can gather through the server's tools.

## Support

- Create an issue for bug reports or feature requests
- Check existing issues before creating new ones
- Provide detailed information including logs and configuration