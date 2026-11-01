# App Store MCP Server

> **⚠️ Experimental Status**: This MCP server is experimental and provided as-is. No ongoing fixes or maintenance are planned at this time. Feel free to fork and improve the project for your own needs.

A comprehensive Node.js TypeScript MCP (Model Context Protocol) server that provides complete app store scraping functionality through multiple transport protocols. This server integrates with Google Play Store and Apple App Store scraping libraries to offer full access to all available scraping methods, returning raw data models to preserve complete information.

## Features

- **Dual Transport Support**: Implements both MCP Streamable HTTP and SSE (Server-Sent Events) transport protocols
- **Comprehensive Coverage**: 20 MCP tools covering all available functionality from both app store scraping libraries
- **Response Filtering**: Automatic filtering of verbose fields (descriptions, summaries) to reduce token usage by up to 93%
- **Raw Data Models**: Returns complete, unmodified responses from underlying scraping libraries (when fullDetail=true)
- **Dual Platform Support**: Complete access to both Google Play Store and Apple App Store data
- **TypeScript**: Full type safety and modern JavaScript features
- **Docker Ready**: Containerized deployment with multi-stage builds
- **Production Ready**: Comprehensive error handling, logging, and health checks
- **Configurable**: Environment-based configuration management
- **Legacy Compatibility**: Standard MCP HTTP+SSE transport (protocol 2024-11-05) for older MCP clients

## Quick Start

### Prerequisites

- Node.js 20.18+
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

### Google Play Store Tools (11 tools)

1. **`google-play-app-details`** - Get detailed app information including metadata, ratings, and descriptions
2. **`google-play-app-reviews`** - Fetch app reviews with pagination, sorting, and star-rating/device filters
3. **`google-play-search`** - Search for apps (up to 250 results; most queries return Play's first page of ~30)
4. **`google-play-list`** - Get app lists from collections (TOP_FREE, TOP_PAID, GROSSING) and categories (up to 500 results)
5. **`google-play-developer`** - Get all apps by a developer (pass the `developerId` from app details)
6. **`google-play-suggest`** - Get search suggestions for app discovery
7. **`google-play-similar`** - Find apps similar to a given app
8. **`google-play-permissions`** - Get detailed app permissions information
9. **`google-play-datasafety`** - Get app data safety and privacy information
10. **`google-play-availability`** - Check in which countries an app is offered
11. **`google-play-categories`** - Get list of available app categories

### Apple App Store Tools (9 tools)

1. **`app-store-app-details`** - Get detailed app information including metadata, ratings, and descriptions; optionally the subtitle and top in-app purchases with prices
2. **`app-store-app-reviews`** - Fetch app reviews with pagination and sorting options
3. **`app-store-search`** - Search for apps (paginated via `page`)
4. **`app-store-list`** - Get app lists from collections and categories (up to 200 results)
5. **`app-store-developer`** - Get all apps by a specific developer
6. **`app-store-privacy`** - Get detailed app privacy information and policies
7. **`app-store-suggest`** - Get search suggestions for app discovery
8. **`app-store-similar`** - Find apps similar to a given app
9. **`app-store-ratings`** - Get detailed ratings breakdown and statistics

All tools return raw, unmodified data from the underlying scraping libraries to preserve complete information and metadata.

App Store `app-details`, `search`, `list` (with `fullDetail`), `developer` and `similar` accept `subtitle: true` to also return each app's App Store subtitle (one extra request to Apple per 99 apps).

## Tool Configuration

The MCP server supports selective enabling/disabling of tools through environment variables, allowing you to:

- Reduce memory usage by disabling unused tools
- Limit exposed functionality for security reasons
- Create specialized deployments with only specific tools
- Debug issues by isolating specific tools

### Configuration Methods

#### 1. Bulk Configuration

**Disable Multiple Tools:**
```bash
# Disable specific tools (comma-separated)
DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews,google-play-permissions
```

**Enable Only Specific Tools:**
```bash
# Enable only these tools (all others will be disabled)
ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
```

#### 2. Individual Tool Control

```bash
# Disable individual tools
DISABLE_TOOL_GOOGLE_PLAY_SEARCH=true
DISABLE_TOOL_APP_STORE_REVIEWS=true

# Enable individual tools (when using restrictive ENABLED_TOOLS)
ENABLE_TOOL_GOOGLE_PLAY_APP_DETAILS=true
```

#### 3. Docker Compose Configuration

```yaml
services:
  app-store-mcp-server:
    environment:
      # Disable review tools
      - DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews
      
      # Or enable only search and details tools
      # - ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
      
      # Individual controls
      - DISABLE_TOOL_GOOGLE_PLAY_PERMISSIONS=true
```

### Configuration Helper

Use the included configuration helper script to generate tool configurations:

```bash
# List all available tools
node scripts/configure-tools.js list

# Generate configuration for specific tools
node scripts/configure-tools.js enable google-play-search app-store-search

# Generate configuration by category
node scripts/configure-tools.js category search

# Use presets for common configurations
node scripts/configure-tools.js preset search-only
node scripts/configure-tools.js preset no-reviews
node scripts/configure-tools.js preset core
```

### Common Use Cases

- **Search Only**: `ENABLED_TOOLS=google-play-search,app-store-search`
- **No Reviews**: `DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews`
- **Google Play Only**: Disable all `app-store-*` tools
- **Core Tools**: `ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details`

For detailed configuration documentation, see [TOOL_CONFIGURATION.md](./docs/TOOL_CONFIGURATION.md).

For information about response filtering and token usage optimization, see [RESPONSE_FILTERING.md](./docs/RESPONSE_FILTERING.md).

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
- `NODE_ENV` - Environment: development, production, test (default: development)

### Transport Configuration
- `ENABLE_SSE_TRANSPORT` - Enable SSE transport (default: true)
- `SSE_HEARTBEAT_INTERVAL` - SSE heartbeat interval in milliseconds (default: 30000)
- `SSE_MAX_CONNECTIONS` - Maximum concurrent SSE connections (default: 100)

### CORS and Security
- `CORS_ORIGINS` - Allowed browser origins, comma-separated, or `*` for any. Default: none — no CORS headers are sent and any request carrying an `Origin` header that is not listed is rejected with 403 on `/mcp` and `/sse`. Requests without an `Origin` header (CLI/desktop MCP clients) are always accepted.
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per client IP per window on `/mcp` and `/sse` (default: `100`, `0` disables). Over the limit: HTTP 429 with a JSON-RPC error.
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in ms (default: `60000`)
- `TRUST_PROXY` - Express `trust proxy` value (e.g. `1` for one reverse proxy hop). Set it behind a proxy/load balancer, otherwise every client shares the proxy's IP and therefore one rate-limit bucket.
- `REQUEST_TIMEOUT` - `/mcp` request timeout in milliseconds; slower requests get HTTP 408 (default: 60000)
- `ENABLE_LOGGING` - Enable request logging (default: true)

### HTTPS Configuration
- `HTTPS_ENABLED` - Enable HTTPS/SSL support (default: false)
- `HTTPS_KEY_PATH` - Path to SSL private key file (required if HTTPS enabled)
- `HTTPS_CERT_PATH` - Path to SSL certificate file (required if HTTPS enabled)
- `HTTPS_CA_PATH` - Path to Certificate Authority file (optional)
- `HTTPS_PASSPHRASE` - Private key passphrase (optional)

### Tool Configuration
- `ENABLED_TOOLS` - Comma-separated list of tools to enable (if set, only these are enabled)
- `DISABLED_TOOLS` - Comma-separated list of tools to disable
- `ENABLE_TOOL_<TOOL_NAME>` - Enable specific tool (e.g., `ENABLE_TOOL_GOOGLE_PLAY_SEARCH=true`)
- `DISABLE_TOOL_<TOOL_NAME>` - Disable specific tool (e.g., `DISABLE_TOOL_APP_STORE_REVIEWS=true`)

### Example Configuration

Create a `.env` file:
```env
PORT=3000
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# HTTPS Configuration (optional)
HTTPS_ENABLED=true
HTTPS_KEY_PATH=./ssl/server.key
HTTPS_CERT_PATH=./ssl/server.crt

# Tool Configuration (optional)
# DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews
# ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
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

The HTTP transport uses the MCP Streamable HTTP protocol (JSON responses, no streaming) for modern MCP clients:

```bash
# MCP endpoint
POST http://localhost:3000/mcp

# Health check
GET http://localhost:3000/health
```

- Requests get HTTP 200 with a JSON-RPC response — including JSON-RPC errors (e.g. `-32601` unknown method, `-32602` unknown tool).
- Notifications (messages without `id`, e.g. `notifications/initialized`) get `202 Accepted` with an empty body.
- Tool failures (invalid arguments, upstream store errors) are returned as a normal result with `isError: true` and the error message in `content[0].text`.
- Unparseable JSON or an invalid JSON-RPC envelope gets HTTP 400; request bodies are limited to 1 MB.
- `initialize` supports protocol versions `2025-03-26` and `2024-11-05` (the client's version is echoed when supported).

### SSE Transport (Legacy)

Standard MCP HTTP+SSE transport (protocol 2024-11-05), as implemented by the official SDKs' `SSEClientTransport`:

```bash
# 1. Open the event stream; the first event is `endpoint`
GET http://localhost:3000/sse
#   event: endpoint
#   data: /sse/<connectionId>/message

# 2. POST JSON-RPC messages to that endpoint → 202 Accepted
POST http://localhost:3000/sse/<connectionId>/message

# 3. Responses arrive on the stream
#   event: message
#   data: {"jsonrpc":"2.0","id":1,"result":{...}}
```

The client performs the usual `initialize` / `notifications/initialized` handshake. Notifications get no response; an unknown connection id gets 404; a `: heartbeat` comment line is sent every `SSE_HEARTBEAT_INTERVAL` ms. See [examples/sse-client-example.js](./examples/sse-client-example.js).

```bash
ENABLE_SSE_TRANSPORT=true      # default: true
SSE_HEARTBEAT_INTERVAL=30000   # default: 30000
SSE_MAX_CONNECTIONS=100        # default: 100 (further connections get 503)
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