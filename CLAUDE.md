# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Testing
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run all tests (unit and integration)
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests  
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint

### Development
- `npm run dev` - Start development server with ts-node
- `npm start` - Start production server from dist/

### Docker Commands
- `docker-compose up --build` - Build and run with Docker Compose
- `npm run test:integration:docker` - Run integration tests in Docker
- `./scripts/generate-ssl-certs.sh` - Generate SSL certificates for HTTPS

## Architecture Overview

This is a Node.js TypeScript MCP (Model Context Protocol) server that provides app store scraping functionality through multiple transport protocols.

### Core Components

**MCPServer** (`src/server.ts`) - Main orchestrator that manages:
- HTTP and SSE transport handlers
- Tool registry with 19 MCP tools
- Configuration management
- Graceful shutdown handling

**Transport Layer** (`src/transport/`)
- **HTTPTransportHandler** - MCP Streamable HTTP protocol implementation
- **SSETransportHandler** - Server-Sent Events transport for legacy MCP clients with automatic initialization

**Protocol Handler** (`src/protocol/mcp-handler.ts`)
- Processes MCP messages (initialize, tools/list, tools/call)
- Handles tool execution with error handling and retries
- Returns raw data from underlying scraper libraries

**Tool Registry** (`src/registry/tool-registry.ts`)
- Manages 19 MCP tools (10 Google Play, 9 App Store)
- Each tool implements the `MCPTool` interface
- Tools are located in `src/tools/` directory

**Services** (`src/services/`)
- **AppStoreScraperService** - Wraps app-store-scraper library
- **GooglePlayScraperService** - Wraps google-play-scraper library

### Configuration System

Configuration is managed through environment variables via `src/config/server-config.ts`. Key settings:
- Server port, logging, timeouts
- Transport enablement (HTTP/SSE)  
- Rate limiting and CORS
- HTTPS/SSL support
- Scraping configuration

### Tool Architecture

All 19 tools follow the same pattern:
1. Implement `MCPTool` interface from `src/types/mcp.ts`
2. Use corresponding scraper service
3. Validate inputs with `src/utils/validation.ts`
4. Return raw, unmodified data from scraper libraries
5. Support localization (lang/country parameters where applicable)

Tools are organized by platform:
- Google Play: `google-play-*` prefix (app-details, search, reviews, etc.)  
- Apple App Store: `app-store-*` prefix (app-details, search, reviews, etc.)

### Error Handling

Comprehensive error handling through:
- `src/errors/error-handler.ts` - Centralized error processing
- `src/errors/retry-handler.ts` - Retry logic for failed requests
- Structured JSON logging throughout the application

### TypeScript Configuration

- Strict TypeScript configuration in `tsconfig.json`
- Comprehensive type definitions in `src/types/`
- Jest testing with ts-jest preset
- ESLint with TypeScript plugin

### Testing Strategy

- **Unit Tests** - Individual component testing
- **Integration Tests** - End-to-end MCP protocol testing  
- **Transport Tests** - HTTP/SSE transport validation
- **Docker Integration** - Containerized test environments
- Test fixtures and mocks in `tests/fixtures/`

### Key Dependencies

- `express` - HTTP server framework
- `google-play-scraper` - Google Play Store data scraping
- `app-store-scraper` - Apple App Store data scraping  
- `uuid` - Request correlation IDs
- `cors`, `helmet` - Security middleware

## Important Implementation Details

- The server must have HTTP transport enabled (SSE requires HTTP endpoints)
- SSE transport includes automatic MCP initialization to prevent client timeouts
- All tools return raw data models to preserve complete information
- Configuration validation ensures proper transport setup
- Graceful shutdown handling for production deployments
- Rate limiting and security headers configured by default