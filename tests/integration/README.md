# Integration Tests

This directory contains comprehensive integration tests for the App Store MCP Server. These tests verify the complete functionality of the system with real API calls to app store scraping libraries.

## Test Structure

### Test Files

- **`end-to-end.integration.test.ts`** - Complete MCP request/response flow tests
- **`mcp-tools.integration.test.ts`** - Individual tool integration tests with real API calls (legacy)
- **`comprehensive-tools.integration.test.ts`** - Comprehensive tests for all 19 MCP tools with SSE transport
- **`server.integration.test.ts`** - Server lifecycle and configuration tests
- **`transport-routing.integration.test.ts`** - Transport layer routing and SSE integration tests

### Test Fixtures

- **`../fixtures/app-store-responses.ts`** - Mock data and test utilities for consistent testing

## Running Integration Tests

### Local Execution

```bash
# Run all integration tests locally
npm run test:integration:local

# Run comprehensive tests for all 19 tools
npm run test:integration:comprehensive

# Run specific integration test file
npx jest tests/integration/end-to-end.integration.test.ts --runInBand

# Run with verbose output
npx jest tests/integration/ --runInBand --verbose
```

### Docker-based Execution

```bash
# Run integration tests in Docker environment
npm run test:integration:docker

# Run comprehensive tests in Docker (all 19 tools)
./scripts/run-integration-tests.sh --comprehensive

# Run with custom script (more control)
./scripts/run-integration-tests.sh

# Run without cleanup (for debugging)
./scripts/run-integration-tests.sh --no-cleanup
```

## Rate Limiting

Integration tests implement rate limiting to avoid overwhelming app store APIs:

- **Delay between requests**: 2 seconds
- **Sequential execution**: Tests run one at a time (`--runInBand`)
- **Request queuing**: Automatic queuing for concurrent requests
- **Timeout handling**: 30-60 second timeouts for real API calls

## Test Configuration

### Environment Variables

- `NODE_ENV=test` - Test environment
- `MCP_SERVER_URL` - Server URL for Docker tests
- `INTEGRATION_TEST_MODE=true` - Enable integration test mode
- `RATE_LIMIT_DELAY=2000` - Delay between requests in ms

### Test Data

Tests use real app IDs that should be stable:

**Google Play Store:**
- Valid App: `com.whatsapp` (WhatsApp)
- Search Query: `whatsapp`

**Apple App Store:**
- Valid App: `310633997` (WhatsApp Messenger)
- Search Query: `whatsapp`

## Test Categories

### 1. End-to-End Flow Tests

- Complete MCP protocol flow (discovery → execution)
- Error propagation through all layers
- Request correlation across multiple requests
- HTTP transport layer integration
- CORS handling
- Rate limiting behavior
- Graceful shutdown handling

### 2. Tool Integration Tests

**Legacy Tool Tests (mcp-tools.integration.test.ts):**
- Basic Google Play Store tools (3 tools)
- Basic Apple App Store tools (3 tools)
- Cross-platform compatibility tests

**Comprehensive Tool Tests (comprehensive-tools.integration.test.ts):**
- **All 10 Google Play Store Tools:**
  - `google-play-app-details` - App details with raw data preservation
  - `google-play-app-reviews` - Reviews with pagination
  - `google-play-search` - App search functionality
  - `google-play-list` - App lists from collections/categories
  - `google-play-developer` - Apps by developer
  - `google-play-suggest` - Search suggestions
  - `google-play-similar` - Similar apps
  - `google-play-permissions` - App permissions
  - `google-play-datasafety` - Data safety information
  - `google-play-categories` - Available categories

- **All 9 Apple App Store Tools:**
  - `app-store-app-details` - App details with raw data preservation
  - `app-store-app-reviews` - Reviews with pagination
  - `app-store-search` - App search functionality
  - `app-store-list` - App lists from collections/categories
  - `app-store-developer` - Apps by developer
  - `app-store-privacy` - Privacy information
  - `app-store-suggest` - Search suggestions
  - `app-store-similar` - Similar apps
  - `app-store-ratings` - App ratings breakdown

**SSE Transport Tests:**
- SSE connection establishment and management
- Tool discovery via SSE transport
- Tool execution via SSE transport
- Heartbeat message handling
- Connection lifecycle management

**Raw Data Preservation Tests:**
- Verification of complete response structures
- Field presence validation for all tools
- Data integrity across transport types

### 3. Server Integration Tests

- Server lifecycle (start/stop)
- Tool registration verification
- Health check functionality
- Configuration management
- Graceful shutdown handling

## Docker Environment

The Docker-based integration test environment provides:

- **Isolated testing environment**
- **Consistent dependencies**
- **Real network conditions**
- **Container health monitoring**
- **Automatic cleanup**

### Docker Services

- `mcp-server-test` - Main MCP server instance
- `integration-test-runner` - Test execution container
- `test-monitor` - Optional monitoring (Prometheus)

## Troubleshooting

### Common Issues

1. **Rate Limiting Errors**
   - Increase `RATE_LIMIT_DELAY` in test configuration
   - Ensure tests run sequentially with `--runInBand`

2. **Timeout Errors**
   - Check network connectivity
   - Increase test timeouts in Jest configuration
   - Verify app store API availability

3. **Docker Issues**
   - Ensure Docker is running
   - Check port conflicts (default: 3001)
   - Verify Docker Compose file syntax

4. **Test Data Issues**
   - Verify test app IDs are still valid
   - Update fixtures if app store data changes
   - Check for app store API changes

### Debugging

```bash
# Run with debug output
DEBUG=* npm run test:integration:local

# Check Docker logs
docker-compose -f docker/docker-compose.integration.yml logs

# Run single test with verbose output
npx jest tests/integration/end-to-end.integration.test.ts --runInBand --verbose --detectOpenHandles
```

## Performance Considerations

- Tests are designed to run sequentially to respect rate limits
- Each test includes appropriate delays between API calls
- Timeouts are set generously to account for network latency
- Mock responses are used where possible to reduce API calls

## Maintenance

### Updating Test Data

1. Verify app IDs are still valid in app stores
2. Update fixture data if app information changes
3. Add new test cases for new tools or features
4. Review and update rate limiting configuration

### Adding New Tests

1. Follow existing patterns for rate limiting
2. Use appropriate test fixtures
3. Include both success and error scenarios
4. Add proper cleanup in `afterEach`/`afterAll` hooks
5. Document any special requirements or dependencies