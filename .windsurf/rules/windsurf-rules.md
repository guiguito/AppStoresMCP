---
trigger: always_on
---

# App Store MCP Server - Windsurf Rules

## Project Overview
- This is a **TypeScript/Node.js MCP (Model Context Protocol) server** for app store scraping
- Provides 19 MCP tools for Google Play Store and Apple App Store data access
- Uses Express for HTTP server with dual transport support (HTTP and SSE)
- Experimental status project - focus on stability and maintainability over new features

## TypeScript Configuration & Style

### Strict Type Safety
- **Always use strict TypeScript** with all strict mode options enabled
- Never use `any` type - use `unknown` with proper type guards or define specific types
- Enable and respect all strict compiler options: `noImplicitAny`, `noImplicitReturns`, `noImplicitThis`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`
- Use `readonly` for immutable properties and arrays when applicable
- Always declare explicit return types for functions and methods

### Type Definitions
- Create interfaces for all data structures, especially tool input parameters
- Use `JSONSchema7` type from 'json-schema' package for MCP tool schemas
- Follow the pattern: interface for params + JSONSchema7 for input validation
- Group related types in `src/types/` directory

### Code Style
- Use **JSDoc comments** for all public classes, methods, and exported functions
- Include `@param`, `@returns`, `@throws` tags in JSDoc where applicable
- Mark private methods with `@private` JSDoc tag
- Use descriptive variable names with full words (not abbreviations)
- Prefer `const` over `let`, never use `var`

## MCP Tool Implementation Pattern

### Tool Class Structure
When creating new MCP tools, follow this exact pattern:

```typescript
/**
 * [Tool Name] MCP Tool
 * [Brief description of what the tool does]
 */
export class [ToolName]Tool implements MCPTool {
  public readonly name = 'tool-name-kebab-case';
  public readonly description = 'Clear description';
  
  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: { /* schema */ },
    required: ['requiredParam'],
    additionalProperties: false
  };

  async execute(params: [ParamsInterface]): Promise<any> {
    try {
      this.validateParams(params);
      // Execute logic
      return filterAppData(result, params.fullDetail || false);
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  private validateParams(params: any): void {
    // Explicit validation with clear error messages
  }

  private handleError(error: any, context: string): any {
    // Structured error response
  }
}
```

### Tool Implementation Rules
- All tools must implement the `MCPTool` interface from `src/types/mcp`
- Tool names use kebab-case (e.g., 'google-play-search')
- Class names use PascalCase with 'Tool' suffix (e.g., 'GooglePlaySearchTool')
- Always include `fullDetail` boolean parameter for response filtering
- Always call `filterAppData()` on responses when `fullDetail=false`
- Implement comprehensive parameter validation in `validateParams()`
- Return structured error objects with `success: false`, `error.type`, `error.code`, `error.message`

### Required Parameters
- `lang` parameter: 2-letter lowercase ISO 639-1 codes, default 'en', pattern `^[a-z]{2}$`
- `country` parameter: 2-letter lowercase ISO 3166-1 codes, default 'us', pattern `^[a-z]{2}$`
- `fullDetail` parameter: boolean, default false, controls response filtering

## Architecture & Patterns

### Project Structure
- `src/tools/` - Individual MCP tool implementations (one file per tool)
- `src/transport/` - HTTP and SSE transport handlers
- `src/protocol/` - MCP protocol implementation
- `src/registry/` - Tool registry management
- `src/config/` - Environment-based configuration
- `src/services/` - App store scraper service wrappers (deprecated - use direct imports)
- `src/errors/` - Error handling and retry logic utilities
- `src/utils/` - Shared utility functions (response filtering, etc.)
- `src/types/` - TypeScript type definitions and interfaces

### Configuration Management
- All configuration through environment variables (see `src/config/server-config.ts`)
- Use `loadConfig()` function to load validated configuration
- Configuration validation happens at startup with clear error messages
- Support for `.env` file in development
- Docker-friendly environment variable configuration

### Error Handling
- Use structured error responses with consistent format:
  ```typescript
  {
    success: false,
    error: {
      type: 'validation_error' | 'internal_error' | 'network_error',
      code: 'ERROR_CODE',
      message: 'User-friendly message',
      details?: 'Technical details'
    }
  }
  ```
- Catch all errors in tool `execute()` methods
- Provide context-specific error messages
- Use `try-catch-finally` for cleanup operations

### Response Filtering
- **Always use `filterAppData()` utility** from `src/utils/response-filter`
- Filtering reduces token usage by up to 93% for non-detailed responses
- When `fullDetail=true`, return complete unfiltered data
- When `fullDetail=false`, remove verbose fields (description, summary, etc.)

### Transport Layer
- HTTP transport uses MCP Streamable HTTP protocol (primary/recommended)
- SSE transport for legacy compatibility with automatic MCP initialization
- Both transports use the same `MCPHandler` for protocol logic
- SSE includes heartbeat mechanism and connection management
- HTTP transport should always be enabled; SSE is optional

## Testing Standards

### Test Organization
- Unit tests in `tests/unit/` mirroring `src/` structure
- Integration tests in `tests/integration/`
- Test fixtures in `tests/fixtures/`
- Use `.test.ts` suffix for all test files

### Testing Patterns
- Use Jest as testing framework
- Mock external dependencies (google-play-scraper, app-store-scraper)
- Test happy paths and error scenarios
- Test parameter validation thoroughly
- Integration tests should test end-to-end MCP protocol flows
- Use `supertest` for HTTP endpoint testing
- Run integration tests with `--runInBand` to avoid port conflicts

### Test File Structure
```typescript
describe('[ComponentName]', () => {
  describe('[method/feature]', () => {
    it('should [expected behavior]', async () => {
      // Arrange
      // Act  
      // Assert
    });
  });
});
```

## Documentation Standards

### README and Docs
- Keep README.md comprehensive but concise
- Technical details go in `docs/` directory
- Use clear headings and code examples
- Document all environment variables with defaults
- Include troubleshooting sections for common issues

### Code Comments
- Use JSDoc for public API surfaces
- Comment complex logic or non-obvious implementations
- Don't comment obvious code
- Keep comments up-to-date with code changes
- Use TODO comments for future improvements: `// TODO: description`

### API Documentation
- Document request/response examples in `docs/API.md`
- Include all tool parameters and their validation rules
- Show both successful and error response formats
- Update API docs when adding/modifying tools

## Docker & Deployment

### Docker Best Practices
- Use multi-stage builds for smaller images
- Production image should only contain compiled JavaScript
- Use `.dockerignore` to exclude unnecessary files
- Health check endpoint at `/health` must always be available
- Use environment variables for all configuration
- Default to port 3000, allow override via `PORT` env var

### Environment Configuration
- Never commit `.env` files
- Provide `.env.example` with all variables and defaults
- Document all environment variables in README
- Validate required environment variables at startup
- Use sensible defaults for optional variables

## Git & Version Control

### Commit Messages
- Use clear, descriptive commit messages
- Follow conventional commits format: `type(scope): message`
- Types: feat, fix, docs, style, refactor, test, chore
- Keep commits focused on single concerns

### Branch Strategy  
- Main branch is production-ready
- Create feature branches for new work
- Test thoroughly before merging

## Dependencies

### Package Management
- Use exact versions for dependencies (not `^` or `~`) when stability is critical
- Keep dependencies minimal and well-maintained
- Regularly update dependencies for security patches
- Document any peer dependencies or version requirements

### Key Dependencies
- `google-play-scraper` v10.0.1 - Google Play Store data
- `app-store-scraper` v0.18.0 - Apple App Store data  
- `express` v5.1.0 - HTTP server
- Use dynamic imports for scraper libraries: `await new Function('return import("google-play-scraper")')();`

## Security Considerations

- Enable CORS with explicit origins (not `*` in production)
- Use Helmet for security headers
- Implement rate limiting on all endpoints
- HTTPS support for production with proper certificates
- Validate all user inputs thoroughly
- Never expose internal error details to clients
- Environment variables for sensitive configuration

## Performance Optimization

- Response filtering to reduce token usage
- Request timeouts to prevent hanging connections
- Rate limiting to prevent abuse
- Connection pooling for SSE transport
- Heartbeat mechanism to detect stale connections
- Proper cleanup in shutdown handlers

## Experimental Status

- This is an **experimental project** - no ongoing fixes or maintenance planned
- Prioritize stability over new features
- Document known limitations clearly
- Focus on making the codebase forkable and maintainable by others
- Keep dependencies stable and well-documented