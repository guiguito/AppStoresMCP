# Migration Guide

This guide helps you migrate from previous versions of the App Store MCP Server to the latest version with enhanced functionality.

## Version 2.x Migration Guide

### Overview of Changes

Version 2.x introduces significant enhancements:

- **19 comprehensive MCP tools** (up from 6 basic tools)
- **Raw data model responses** (no more data transformation)
- **SSE transport support** (in addition to HTTP transport)
- **Complete library coverage** (all methods from both scraping libraries)
- **Enhanced configuration options** (transport-specific settings)

### Breaking Changes

#### 1. Tool Response Format Changes

**Before (v1.x)**: Structured, transformed responses
```json
{
  "success": true,
  "data": {
    "id": "com.whatsapp",
    "title": "WhatsApp Messenger",
    "rating": 4.2,
    "developer": "WhatsApp LLC"
  },
  "metadata": {
    "source": "google-play-store",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**After (v2.x)**: Raw data from scraping libraries
```json
{
  "appId": "com.whatsapp",
  "title": "WhatsApp Messenger",
  "summary": "Simple. Reliable. Secure.",
  "score": 4.2,
  "scoreText": "4.2",
  "ratings": 15000000,
  "reviews": 2500000,
  "histogram": { "1": 500000, "2": 300000, "3": 700000, "4": 2000000, "5": 12000000 },
  "developer": "WhatsApp LLC",
  "developerId": "5700313618786177705",
  "developerEmail": "android-support@whatsapp.com",
  "privacyPolicy": "https://www.whatsapp.com/legal/#privacy-policy",
  // ... complete raw response with all available fields
}
```

#### 2. Error Response Format Changes

**Before (v1.x)**: Wrapped error responses
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Invalid app ID"
  }
}
```

**After (v2.x)**: Direct error responses or raw library errors
```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "code": "INVALID_PARAMS",
    "message": "appId is required and must be a string",
    "appId": "invalid-id"
  }
}
```

#### 3. New Tools Available

**v1.x Tools (6 total)**:
- google-play-app-details
- google-play-app-reviews  
- google-play-search
- app-store-app-details
- app-store-app-reviews
- app-store-search

**v2.x Tools (19 total)**:

**Google Play Store (10 tools)**:
- google-play-app-details
- google-play-app-reviews
- google-play-search
- google-play-list *(new)*
- google-play-developer *(new)*
- google-play-suggest *(new)*
- google-play-similar *(new)*
- google-play-permissions *(new)*
- google-play-datasafety *(new)*
- google-play-categories *(new)*

**Apple App Store (9 tools)**:
- app-store-app-details
- app-store-app-reviews
- app-store-search
- app-store-list *(new)*
- app-store-developer *(new)*
- app-store-privacy *(new)*
- app-store-suggest *(new)*
- app-store-similar *(new)*
- app-store-ratings *(new)*

### Migration Steps

#### Step 1: Update Client Code for Raw Data Responses

**Before**: Accessing structured data
```javascript
const response = await callMCPTool('google-play-app-details', { appId: 'com.whatsapp' });
if (response.success) {
  const appTitle = response.data.title;
  const appRating = response.data.rating;
  const appDeveloper = response.data.developer;
}
```

**After**: Accessing raw data
```javascript
const response = await callMCPTool('google-play-app-details', { appId: 'com.whatsapp' });
// Response is now the raw data directly
const appTitle = response.title;
const appRating = response.score; // Note: field name changed
const appDeveloper = response.developer;
const appId = response.appId;
const detailedRatings = response.histogram; // New detailed data available
```

#### Step 2: Update Error Handling

**Before**: Checking success field
```javascript
const response = await callMCPTool('google-play-app-details', { appId: 'invalid' });
if (!response.success) {
  console.error('Error:', response.error.message);
}
```

**After**: Handle raw responses and errors
```javascript
try {
  const response = await callMCPTool('google-play-app-details', { appId: 'invalid' });
  // Success - response contains raw data
  console.log('App data:', response);
} catch (error) {
  // Error handling - may be raw library error or structured error
  if (error.success === false) {
    console.error('Structured error:', error.error.message);
  } else {
    console.error('Raw error:', error.message);
  }
}
```

#### Step 3: Leverage New Tools

Replace generic tools with specialized ones where appropriate:

**Before**: Using search for developer apps
```javascript
const apps = await callMCPTool('google-play-search', { 
  query: 'WhatsApp LLC',
  num: 50 
});
```

**After**: Using dedicated developer tool
```javascript
const apps = await callMCPTool('google-play-developer', { 
  devId: 'WhatsApp LLC',
  num: 50,
  fullDetail: true
});
```

#### Step 4: Configure Transport Options

**Before**: Only HTTP transport
```env
PORT=3000
```

**After**: Configure both transports
```env
PORT=3000
ENABLE_HTTP_TRANSPORT=true
ENABLE_SSE_TRANSPORT=true
SSE_HEARTBEAT_INTERVAL=30000
SSE_CONNECTION_TIMEOUT=300000
SSE_MAX_CONNECTIONS=100
SSE_AUTO_INITIALIZE=true
SSE_INITIALIZATION_TIMEOUT=5000
```

#### Step 5: Update Tool Discovery Logic

**Before**: Expecting 6 tools
```javascript
const tools = await callMCPTool('tools/list');
console.log(`Found ${tools.result.tools.length} tools`); // Expected: 6
```

**After**: Expecting 19 tools
```javascript
const tools = await callMCPTool('tools/list');
console.log(`Found ${tools.result.tools.length} tools`); // Expected: 19
```

### Configuration Migration

#### Environment Variables

**New variables in v2.x**:
```env
# Transport configuration
ENABLE_HTTP_TRANSPORT=true
ENABLE_SSE_TRANSPORT=true
SSE_HEARTBEAT_INTERVAL=30000
SSE_CONNECTION_TIMEOUT=300000
SSE_MAX_CONNECTIONS=100
SSE_AUTO_INITIALIZE=true
SSE_INITIALIZATION_TIMEOUT=5000
```

**Existing variables** (no changes required):
```env
PORT=3000
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
SCRAPING_TIMEOUT=30000
SCRAPING_RETRIES=3
CORS_ORIGINS=*
```

### Common Migration Issues

#### Issue 1: Field Name Changes

Some field names in raw responses differ from v1.x structured responses:

| v1.x Field | v2.x Field (Google Play) | v2.x Field (App Store) |
|------------|-------------------------|------------------------|
| `rating` | `score` | `score` |
| `ratingCount` | `ratings` | `reviews` |
| `id` | `appId` | `id` or `appId` |
| `category` | `genre` | `primaryGenre` |

#### Issue 2: Response Structure

**v1.x**: Always wrapped in success/data structure
**v2.x**: Direct raw data or error objects

#### Issue 3: New Required Parameters

Some tools now have additional optional parameters that provide more control:

```javascript
// v2.x - More granular control
await callMCPTool('google-play-list', {
  collection: 'TOP_FREE',
  category: 'COMMUNICATION',
  age: 'AGE_RANGE1',
  num: 20,
  fullDetail: true
});
```

### Testing Your Migration

#### 1. Verify Tool Count
```javascript
const tools = await callMCPTool('tools/list');
assert(tools.result.tools.length === 19, 'Expected 19 tools');
```

#### 2. Test Raw Data Access
```javascript
const app = await callMCPTool('google-play-app-details', { appId: 'com.whatsapp' });
assert(app.appId === 'com.whatsapp', 'Raw data should have appId field');
assert(typeof app.score === 'number', 'Score should be a number');
assert(Array.isArray(app.screenshots), 'Screenshots should be an array');
```

#### 3. Test New Tools
```javascript
const categories = await callMCPTool('google-play-categories');
assert(Array.isArray(categories), 'Categories should return an array');

const permissions = await callMCPTool('google-play-permissions', { appId: 'com.whatsapp' });
assert(Array.isArray(permissions), 'Permissions should return an array');
```

#### 4. Test SSE Transport (if enabled)
```javascript
const eventSource = new EventSource('http://localhost:3000/sse');
eventSource.addEventListener('connection', function(event) {
  const data = JSON.parse(event.data);
  assert(data.connectionId, 'Should receive connection ID');
});
```

### Rollback Plan

If you need to rollback to v1.x:

1. **Backup your current configuration**
2. **Revert to v1.x Docker image or codebase**
3. **Update client code to use v1.x response format**
4. **Remove v2.x specific environment variables**

### Support and Resources

- **API Documentation**: See [API.md](./API.md) for complete tool reference
- **Configuration Guide**: See [README.md](./README.md) for setup instructions
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues
- **Examples**: See [examples/](./examples/) directory for usage examples

### Benefits of Migration

After migration, you'll have access to:

1. **Complete data access** - No information loss through transformation
2. **13 additional tools** - Comprehensive app store functionality
3. **Better performance** - Direct raw data without processing overhead
4. **Legacy client support** - SSE transport for older MCP clients
5. **Enhanced flexibility** - More granular control over requests
6. **Future-proof architecture** - Easy to add new tools as libraries evolve

The migration effort is worthwhile for the significant functionality and data access improvements in v2.x.