# Tool Configuration Guide

This guide explains how to enable or disable specific MCP tools using environment variables, both in local development and Docker deployments.

## Overview

The MCP server supports selective enabling/disabling of tools through environment variables. This allows you to:

- Reduce memory usage by disabling unused tools
- Limit exposed functionality for security reasons
- Create specialized deployments with only specific tools
- Debug issues by isolating specific tools

## Available Tools

### Google Play Store Tools
- `google-play-app-details` - Get detailed app information
- `google-play-app-reviews` - Fetch app reviews and ratings
- `google-play-search` - Search for apps
- `google-play-list` - List apps by category
- `google-play-developer` - Get developer information
- `google-play-suggest` - Get app suggestions
- `google-play-similar` - Find similar apps
- `google-play-permissions` - Get app permissions
- `google-play-datasafety` - Get data safety information
- `google-play-categories` - List available categories

### Apple App Store Tools
- `app-store-app-details` - Get detailed app information
- `app-store-app-reviews` - Fetch app reviews and ratings
- `app-store-search` - Search for apps
- `app-store-list` - List apps by category
- `app-store-developer` - Get developer information
- `app-store-privacy` - Get privacy information
- `app-store-suggest` - Get app suggestions
- `app-store-similar` - Find similar apps
- `app-store-ratings` - Get app ratings breakdown

## Configuration Methods

### 1. Bulk Configuration

#### Disable Multiple Tools
```bash
# Disable specific tools (comma-separated)
DISABLED_TOOLS=google-play-search,app-store-search,google-play-reviews
```

#### Enable Only Specific Tools
```bash
# Enable only these tools (all others will be disabled)
ENABLED_TOOLS=google-play-app-details,app-store-app-details,google-play-search
```

### 2. Individual Tool Control

#### Disable Individual Tools
```bash
# Disable Google Play search tool
DISABLE_TOOL_GOOGLE_PLAY_SEARCH=true

# Disable App Store search tool
DISABLE_TOOL_APP_STORE_SEARCH=true
```

#### Enable Individual Tools (when using ENABLED_TOOLS)
```bash
# Enable specific tool (useful when ENABLED_TOOLS is restrictive)
ENABLE_TOOL_GOOGLE_PLAY_APP_DETAILS=true
```

### 3. Priority Rules

The configuration follows this priority order:

1. **Individual DISABLE_TOOL_* variables** - Highest priority
2. **ENABLED_TOOLS list** - If set, only listed tools are enabled
3. **DISABLED_TOOLS list** - Explicitly disabled tools
4. **Default behavior** - All tools enabled

## Docker Compose Configuration

### Basic Example

```yaml
services:
  app-store-mcp-server:
    environment:
      # Disable specific tools
      - DISABLED_TOOLS=google-play-reviews,app-store-reviews
      
      # Or enable only specific tools
      # - ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
```

### Advanced Example

```yaml
services:
  app-store-mcp-server:
    environment:
      # Disable review-related tools
      - DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews
      
      # Individual tool controls
      - DISABLE_TOOL_GOOGLE_PLAY_PERMISSIONS=true
      - DISABLE_TOOL_GOOGLE_PLAY_DATASAFETY=true
      
      # Keep search and details tools enabled
      - ENABLE_TOOL_GOOGLE_PLAY_SEARCH=true
      - ENABLE_TOOL_APP_STORE_SEARCH=true
```

### Environment-Specific Configuration

```yaml
services:
  # Production - minimal tools
  app-store-mcp-server:
    environment:
      - ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
    profiles:
      - production

  # Development - all tools except reviews
  app-store-mcp-server-dev:
    environment:
      - DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews
    profiles:
      - dev
```

## Use Cases

### 1. Search-Only Deployment
```bash
ENABLED_TOOLS=google-play-search,app-store-search
```

### 2. No Reviews Deployment
```bash
DISABLED_TOOLS=google-play-app-reviews,app-store-app-reviews
```

### 3. Google Play Only
```bash
DISABLED_TOOLS=app-store-app-details,app-store-app-reviews,app-store-search,app-store-list,app-store-developer,app-store-privacy,app-store-suggest,app-store-similar,app-store-ratings
```

### 4. Apple App Store Only
```bash
DISABLED_TOOLS=google-play-app-details,google-play-app-reviews,google-play-search,google-play-list,google-play-developer,google-play-suggest,google-play-similar,google-play-permissions,google-play-datasafety,google-play-categories
```

### 5. Core Tools Only
```bash
ENABLED_TOOLS=google-play-search,app-store-search,google-play-app-details,app-store-app-details
```

## Environment Variable Reference

### Bulk Configuration
- `ENABLED_TOOLS` - Comma-separated list of tools to enable (if set, only these are enabled)
- `DISABLED_TOOLS` - Comma-separated list of tools to disable

### Individual Tool Variables

#### Google Play Tools
- `ENABLE_TOOL_GOOGLE_PLAY_APP_DETAILS=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_APP_REVIEWS=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_SEARCH=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_LIST=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_DEVELOPER=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_SUGGEST=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_SIMILAR=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_PERMISSIONS=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_DATASAFETY=true/false`
- `ENABLE_TOOL_GOOGLE_PLAY_CATEGORIES=true/false`

#### App Store Tools
- `ENABLE_TOOL_APP_STORE_APP_DETAILS=true/false`
- `ENABLE_TOOL_APP_STORE_APP_REVIEWS=true/false`
- `ENABLE_TOOL_APP_STORE_SEARCH=true/false`
- `ENABLE_TOOL_APP_STORE_LIST=true/false`
- `ENABLE_TOOL_APP_STORE_DEVELOPER=true/false`
- `ENABLE_TOOL_APP_STORE_PRIVACY=true/false`
- `ENABLE_TOOL_APP_STORE_SUGGEST=true/false`
- `ENABLE_TOOL_APP_STORE_SIMILAR=true/false`
- `ENABLE_TOOL_APP_STORE_RATINGS=true/false`

Replace `ENABLE_TOOL_` with `DISABLE_TOOL_` for disabling tools.

## Verification

### Check Configuration
The server logs will show which tools are registered and which are skipped:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "type": "tools_registered",
  "message": "Successfully registered 5 MCP tools",
  "registeredTools": ["google-play-search", "app-store-search", "google-play-app-details", "app-store-app-details", "google-play-list"],
  "skippedTools": ["google-play-app-reviews", "app-store-app-reviews"]
}
```

### Health Check
The `/health` endpoint includes tool information:

```json
{
  "status": "healthy",
  "uptime": 123.45,
  "tools": 5,
  "config": {
    "enabledTools": ["google-play-search", "app-store-search"],
    "disabledTools": ["google-play-app-reviews", "app-store-app-reviews"]
  }
}
```

## Best Practices

1. **Use ENABLED_TOOLS for restrictive deployments** - When you want only specific tools
2. **Use DISABLED_TOOLS for permissive deployments** - When you want most tools except a few
3. **Individual controls for fine-tuning** - Override bulk settings for specific tools
4. **Environment-specific configurations** - Different tool sets for dev/staging/production
5. **Document your choices** - Comment your docker-compose.yml with reasoning
6. **Test configurations** - Verify tools are working as expected after changes

## Troubleshooting

### Tool Not Available
- Check tool name spelling (use hyphens, not underscores)
- Verify the tool exists in the available tools list
- Check environment variable syntax

### Unexpected Tool Behavior
- Review priority rules - individual controls override bulk settings
- Check for conflicting ENABLED_TOOLS and DISABLED_TOOLS
- Verify environment variables are properly set in your deployment

### Performance Issues
- Consider disabling unused tools to reduce memory usage
- Monitor tool usage and disable rarely-used tools
- Use health check endpoint to verify tool count