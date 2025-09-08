# Implementation Plan

- [x] 1. Set up project structure and core dependencies
  - Initialize Node.js TypeScript project with proper tsconfig.json
  - Install core dependencies: express, cors, helmet for HTTP server
  - Install scraping libraries: google-play-scraper, app-store-scraper
  - Install development dependencies: jest, supertest, @types packages
  - Create directory structure: src/, tests/, docker/
  - _Requirements: 4.1, 4.3_

- [x] 2. Implement core MCP protocol types and interfaces
  - Create TypeScript interfaces for MCPRequest, MCPResponse, MCPError
  - Define MCPTool interface with name, description, inputSchema, execute method
  - Create MCPServer interface with start, stop, registerTool, handleRequest methods
  - Implement JSON Schema validation utilities for input parameters
  - _Requirements: 4.3, 5.2_

- [x] 3. Create HTTP transport layer for MCP Streamable HTTP
  - Implement Express.js server with CORS and security middleware
  - Create HTTP route handler for MCP Streamable HTTP transport
  - Implement request/response processing following MCP HTTP transport specs
  - Add request logging and correlation ID generation
  - Write unit tests for HTTP transport layer
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Implement MCP protocol handler and tool registry
  - Create tool registry class to manage MCP tool registration and discovery
  - Implement MCP message processing for tool discovery requests
  - Create tool execution handler with parameter validation
  - Implement error handling and response formatting for MCP protocol
  - Write unit tests for protocol handler and tool registry
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Create Google Play Store scraper service wrapper
  - Implement GooglePlayScraperService class wrapping google-play-scraper library
  - Create methods for getAppDetails, getAppReviews, searchApps
  - Add input validation and error handling for Google Play operations
  - Implement data transformation to standardized AppDetails, Review, SearchResult models
  - Write unit tests with mocked google-play-scraper responses
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 6. Create Apple App Store scraper service wrapper
  - Implement AppStoreScraperService class wrapping app-store-scraper library
  - Create methods for getAppDetails, getAppReviews, searchApps
  - Add input validation and error handling for App Store operations
  - Implement data transformation to standardized AppDetails, Review, SearchResult models
  - Write unit tests with mocked app-store-scraper responses
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Implement Google Play Store MCP tools
- [x] 7.1 Create google-play-app-details MCP tool
  - Implement MCPTool for Google Play app details with JSON schema validation
  - Integrate with GooglePlayScraperService.getAppDetails method
  - Add comprehensive error handling and response formatting
  - Write unit tests for tool execution with various input scenarios
  - _Requirements: 1.1, 1.2, 5.2_

- [x] 7.2 Create google-play-app-reviews MCP tool
  - Implement MCPTool for Google Play app reviews with pagination support
  - Integrate with GooglePlayScraperService.getAppReviews method
  - Add input validation for app ID and pagination parameters
  - Write unit tests for review fetching and pagination
  - _Requirements: 1.1, 1.3, 5.2_

- [x] 7.3 Create google-play-search MCP tool
  - Implement MCPTool for Google Play app search functionality
  - Integrate with GooglePlayScraperService.searchApps method
  - Add input validation for search query and result limit parameters
  - Write unit tests for search functionality with various queries
  - _Requirements: 1.1, 1.4, 5.2_

- [x] 8. Implement Apple App Store MCP tools
- [x] 8.1 Create app-store-app-details MCP tool
  - Implement MCPTool for Apple App Store app details with JSON schema validation
  - Integrate with AppStoreScraperService.getAppDetails method
  - Add comprehensive error handling and response formatting
  - Write unit tests for tool execution with various input scenarios
  - _Requirements: 2.1, 2.2, 5.2_

- [x] 8.2 Create app-store-app-reviews MCP tool
  - Implement MCPTool for Apple App Store app reviews with pagination support
  - Integrate with AppStoreScraperService.getAppReviews method
  - Add input validation for app ID and pagination parameters
  - Write unit tests for review fetching and pagination
  - _Requirements: 2.1, 2.3, 5.2_

- [x] 8.3 Create app-store-search MCP tool
  - Implement MCPTool for Apple App Store app search functionality
  - Integrate with AppStoreScraperService.searchApps method
  - Add input validation for search query and result limit parameters
  - Write unit tests for search functionality with various queries
  - _Requirements: 2.1, 2.4, 5.2_

- [x] 9. Implement comprehensive error handling system
  - Create centralized error handler with structured error responses
  - Implement error categorization (validation, not found, rate limiting, network, internal)
  - Add retry logic with exponential backoff for transient failures
  - Create error logging with correlation IDs and structured format
  - Write unit tests for error handling scenarios
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Create main server application and configuration
  - Implement main server class that initializes HTTP transport and registers all tools
  - Create configuration management with environment variable support
  - Add graceful shutdown handling for the server
  - Implement health check endpoint for container monitoring
  - Write integration tests for complete server startup and tool registration
  - _Requirements: 3.1, 4.2, 5.4, 7.3_

- [x] 11. Add Docker containerization support
  - Create Dockerfile with multi-stage build for TypeScript compilation
  - Configure Docker image with Node.js Alpine base and proper security settings
  - Create docker-compose.yml for local development and testing
  - Add .dockerignore file to optimize build context
  - Configure environment variable support for container deployment
  - Write documentation for Docker deployment
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Create comprehensive integration tests
  - Write end-to-end tests for complete MCP request/response flow over HTTP
  - Create integration tests for each MCP tool with real scraper library calls
  - Implement rate-limited integration tests to avoid overwhelming app store APIs
  - Add Docker-based integration test environment
  - Create test data fixtures and mock responses for consistent testing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2_

- [x] 13. Add project documentation and examples
  - Create comprehensive README.md with setup, usage, and deployment instructions
  - Write API documentation for all MCP tools with example requests/responses
  - Create example MCP client code demonstrating tool usage
  - Add troubleshooting guide for common deployment and usage issues
  - Document environment variable configuration options
  - _Requirements: 9.4_

## Enhancement Tasks

- [x] 14. Implement SSE (Server-Sent Events) transport support
  - Create SSE transport handler class implementing SSETransportHandler interface
  - Add SSE endpoint route that establishes persistent connection with clients
  - Implement message sending and connection management for SSE transport
  - Add proper CORS and security headers for SSE connections
  - Write unit tests for SSE transport functionality
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 15. Refactor existing tools to return raw data models
- [x] 15.1 Update Google Play Store tools to return raw responses
  - Modify google-play-app-details tool to return complete google-play-scraper.app() response
  - Modify google-play-app-reviews tool to return complete google-play-scraper.reviews() response
  - Modify google-play-search tool to return complete google-play-scraper.search() response
  - Remove data transformation logic and preserve all fields from original responses
  - Update unit tests to verify raw data preservation
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 15.2 Update Apple App Store tools to return raw responses
  - Modify app-store-app-details tool to return complete app-store-scraper.app() response
  - Modify app-store-app-reviews tool to return complete app-store-scraper.reviews() response
  - Modify app-store-search tool to return complete app-store-scraper.search() response
  - Remove data transformation logic and preserve all fields from original responses
  - Update unit tests to verify raw data preservation
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 16. Add missing Google Play Store tools for comprehensive coverage
- [x] 16.1 Implement google-play-list tool
  - Create MCP tool for google-play-scraper.list() method with collection and category parameters
  - Add JSON schema validation for collection, category, age, num, lang, country, fullDetail parameters
  - Integrate with GooglePlayScraperService.list method
  - Write unit tests for list functionality with various collections and categories
  - _Requirements: 8.1, 8.3_

- [x] 16.2 Implement google-play-developer tool
  - Create MCP tool for google-play-scraper.developer() method with developer ID parameter
  - Add JSON schema validation for devId, lang, country, num, fullDetail parameters
  - Integrate with GooglePlayScraperService.developer method
  - Write unit tests for developer app listing functionality
  - _Requirements: 8.1, 8.3_

- [x] 16.3 Implement google-play-suggest tool
  - Create MCP tool for google-play-sc  ``raper.suggest() method with search term parameter
  - Add JSON schema validation for term, lang, country parameters
  - Integrate with GooglePlayScraperService.suggest method
  - Write unit tests for search suggestion functionality
  - _Requirements: 8.1, 8.3_

- [x] 16.4 Implement google-play-similar tool
  - Create MCP tool for google-play-scraper.similar() method with app ID parameter
  - Add JSON schema validation for appId, lang, country, fullDetail parameters
  - Integrate with GooglePlayScraperService.similar method
  - Write unit tests for similar apps functionality
  - _Requirements: 8.1, 8.3_

- [x] 16.5 Implement google-play-permissions tool
  - Create MCP tool for google-play-scraper.permissions() method with app ID parameter
  - Add JSON schema validation for appId, lang, short parameters
  - Integrate with GooglePlayScraperService.permissions method
  - Write unit tests for app permissions functionality
  - _Requirements: 8.1, 8.3_

- [x] 16.6 Implement google-play-datasafety tool
  - Create MCP tool for google-play-scraper.datasafety() method with app ID parameter
  - Add JSON schema validation for appId, lang parameters
  - Integrate with GooglePlayScraperService.datasafety method
  - Write unit tests for data safety information functionality
  - _Requirements: 8.1, 8.3_

- [x] 16.7 Implement google-play-categories tool
  - Create MCP tool for google-play-scraper.categories() method with no parameters
  - Add simple tool definition without parameter validation
  - Integrate with GooglePlayScraperService.categories method
  - Write unit tests for categories listing functionality
  - _Requirements: 8.1, 8.3_

- [x] 17. Add missing Apple App Store tools for comprehensive coverage
- [x] 17.1 Implement app-store-list tool
  - Create MCP tool for app-store-scraper.list() method with collection and category parameters
  - Add JSON schema validation for collection, category, country, lang, num, fullDetail parameters
  - Integrate with AppStoreScraperService.list method
  - Write unit tests for list functionality with various collections and categories
  - _Requirements: 8.2, 8.3_

- [x] 17.2 Implement app-store-developer tool
  - Create MCP tool for app-store-scraper.developer() method with developer ID parameter
  - Add JSON schema validation for devId, country, lang parameters
  - Integrate with AppStoreScraperService.developer method
  - Write unit tests for developer app listing functionality
  - _Requirements: 8.2, 8.3_

- [x] 17.3 Implement app-store-privacy tool
  - Create MCP tool for app-store-scraper.privacy() method with app ID parameter
  - Add JSON schema validation for id parameter
  - Integrate with AppStoreScraperService.privacy method
  - Write unit tests for privacy information functionality
  - _Requirements: 8.2, 8.3_

- [x] 17.4 Implement app-store-suggest tool
  - Create MCP tool for app-store-scraper.suggest() method with search term parameter
  - Add JSON schema validation for term parameter
  - Integrate with AppStoreScraperService.suggest method
  - Write unit tests for search suggestion functionality
  - _Requirements: 8.2, 8.3_

- [x] 17.5 Implement app-store-similar tool
  - Create MCP tool for app-store-scraper.similar() method with app ID parameter
  - Add JSON schema validation for id, appId parameters
  - Integrate with AppStoreScraperService.similar method
  - Write unit tests for similar apps functionality
  - _Requirements: 8.2, 8.3_

- [x] 17.6 Implement app-store-ratings tool
  - Create MCP tool for app-store-scraper.ratings() method with app ID parameter
  - Add JSON schema validation for id, appId, country parameters
  - Integrate with AppStoreScraperService.ratings method
  - Write unit tests for app ratings functionality
  - _Requirements: 8.2, 8.3_

- [x] 18. Update server configuration and transport routing
  - Modify main server application to support both HTTP and SSE transport endpoints
  - Add configuration options for enabling/disabling transport types
  - Update tool registry to work with both transport types
  - Add proper routing for SSE endpoint alongside existing HTTP endpoint
  - Write integration tests for both transport types
  - _Requirements: 3.1, 3.3, 3.5, 8.4_

- [x] 19. Update comprehensive integration tests for all tools
  - Create integration tests for all 19 MCP tools (10 Google Play + 9 App Store)
  - Add SSE transport integration tests alongside existing HTTP transport tests
  - Test raw data preservation by verifying complete response structures
  - Add rate-limited integration tests for new tools to avoid overwhelming APIs
  - Update Docker-based integration test environment for comprehensive testing
  - _Requirements: 7.4, 8.1, 8.2, 8.3_

- [x] 20. Update documentation for enhanced functionality
  - Update README.md with SSE transport setup and usage instructions
  - Document all 19 available MCP tools with parameter schemas and example responses
  - Add examples for both HTTP and SSE transport usage
  - Update API documentation with raw data model information
  - Create migration guide for users upgrading from previous versions
  - _Requirements: 3.5, 7.4, 8.3, 8.4_
- [x] 21. Add missing country and language parameters to MCP tools
  - Update app-store-app-reviews tool to support optional country parameter
  - Update google-play-app-reviews tool to support optional lang and country parameters
  - Update app-store-similar tool to support optional country parameter
  - Update app-store-suggest tool to support optional country parameter
  - Ensure all tools pass these parameters to underlying scraping libraries
  - Update corresponding unit tests to verify parameter handling
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 8.1, 8.2_