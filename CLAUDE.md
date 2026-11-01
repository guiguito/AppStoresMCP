# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Testing
- `npm run build` - Build TypeScript to JavaScript
- `npm run test` - Run all tests (unit and integration)
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests (scrapers mocked)
- `npm run test:live` - Build and call all 19 tools against the real stores (catches store/library drift; unit tests mock the scrapers)
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint on `src`, `scripts`, `tools` and `examples`

CI (`.github/workflows/ci.yml`) runs lint, build and tests on Node 20/22/24 for pushes and PRs to `main`. `.github/workflows/live.yml` runs `npm run test:live` every Monday and on demand.

### Development
- `npm run dev` - Start development server with ts-node
- `npm start` - Start production server from dist/

### Docker Commands
- `docker-compose up --build` - Build and run with Docker Compose
- `npm run test:integration:docker` - Build the Docker image and run the live check inside it
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
- **SSETransportHandler** - Standard MCP HTTP+SSE transport (2024-11-05): `endpoint` event, 202 on POST, responses as `message` events

**Protocol Handler** (`src/protocol/mcp-handler.ts`)
- Processes MCP messages (initialize, tools/list, tools/call)
- Tool failures (validation or library errors) are returned as `isError: true` results; no server-side retries (the scraper libraries retry 429/5xx themselves)
- Returns raw data from underlying scraper libraries

**Tool Registry** (`src/registry/tool-registry.ts`)
- Manages 19 MCP tools (10 Google Play, 9 App Store)
- Each tool implements the `MCPTool` interface
- Tools are located in `src/tools/` directory

### Configuration System

Configuration is managed through environment variables via `src/config/server-config.ts`. Key settings:
- Server port, logging, timeouts
- Transport enablement (HTTP/SSE)  
- CORS / Origin allow-list (`CORS_ORIGINS`, empty by default)
- Per-IP rate limit on `/mcp` and `/sse` (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`, `TRUST_PROXY`)
- HTTPS/SSL support
- Tool enable/disable (`ENABLED_TOOLS`, `DISABLED_TOOLS`)

### Tool Architecture

All 19 tools follow the same pattern:
1. Implement `MCPTool` interface from `src/types/mcp.ts`
2. Call the scraper library directly (shared schemas in `src/tools/common.ts`)
3. Inputs are validated against `inputSchema` (incl. `additionalProperties: false`) by `mcp-handler` before `execute` — tools don't re-validate
4. Return raw, unmodified data from scraper libraries
5. Support localization (lang/country parameters where applicable)

Tools are organized by platform:
- Google Play: `google-play-*` prefix (app-details, search, reviews, etc.)  
- Apple App Store: `app-store-*` prefix (app-details, search, reviews, etc.)

### Error Handling

Comprehensive error handling through:
- `src/errors/error-handler.ts` - Centralized error processing
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
- Scraper mocks in `tests/__mocks__/` re-export the real libraries' `constants`; `tests/tools/tools.test.ts` checks every tool enum against them

### Key Dependencies

- `express` - HTTP server framework
- `google-play-scraper-ts` - Google Play Store data scraping
- `app-store-scraper-ts` - Apple App Store data scraping  
- `cors`, `helmet`, `express-rate-limit` - Security middleware

## Important Implementation Details

- The server must have HTTP transport enabled (SSE requires HTTP endpoints)
- All tools return raw data models to preserve complete information
- Configuration validation ensures proper transport setup
- Graceful shutdown handling for production deployments
- Security headers (helmet) and per-IP rate limiting (express-rate-limit) configured by default