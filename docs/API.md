# API Documentation

This document provides detailed information about all 19 MCP tools available in the App Store MCP Server, including request/response formats and examples for both HTTP and SSE transport protocols.

## MCP Protocol Overview

The server implements the Model Context Protocol (MCP) over multiple transport protocols. All requests follow the JSON-RPC 2.0 specification:

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "tools/call",
  "params": {
    "name": "tool-name",
    "arguments": {
      // Tool-specific parameters
    }
  }
}
```

## Transport Protocols

### HTTP Transport (Recommended)

**Base URL**: `http://localhost:3000/mcp`

All HTTP requests use POST method with JSON body.

### SSE Transport (Legacy Support)

**Connection URL**: `http://localhost:3000/sse`
**Message URL**: `http://localhost:3000/sse/{connectionId}/message`

SSE transport requires establishing a connection first, then sending messages via separate HTTP calls.

## Authentication

No authentication is required. The server uses CORS for access control.

## Error Handling

Arguments are validated against each tool's `inputSchema` before the tool runs. Invalid arguments (wrong type, value outside an enum/pattern/range, missing required or unknown properties) are returned as a tool result with `isError: true` whose text lists every problem, e.g. `Invalid parameters: {"validationErrors":["root: Unknown property 'foo'"]}`, so the model can correct the call. Calling an unknown tool is a JSON-RPC error (code `-32602`).

Failures from the stores themselves (app not found, network errors, upstream validation) are not wrapped by the tools: the library error message is returned as a tool result with `isError: true`, for example `Request failed: 404 Not Found` (Google Play) or `App not found (404)` (App Store).

Language codes accept `xx`, `xx-YY` or `xx_yy` forms (e.g. `en`, `pt-BR`, `en_us`); country codes are two lowercase letters.

## Google Play Store Tools

### google-play-app-details

Get detailed information about a Google Play Store app.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Google Play package name (e.g., "com.example.app") |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "google-play-app-details",
    "arguments": {
      "appId": "com.whatsapp",
      "lang": "en",
      "country": "us"
    }
  }
}
```

#### Example Response (Raw Data)

```json
{
  "appId": "com.whatsapp",
  "title": "WhatsApp Messenger",
  "summary": "Simple. Reliable. Secure.",
  "installs": "5,000,000,000+",
  "minInstalls": 5000000000,
  "maxInstalls": 5000000000,
  "score": 4.2,
  "scoreText": "4.2",
  "ratings": 15000000,
  "reviews": 2500000,
  "histogram": {
    "1": 500000,
    "2": 300000,
    "3": 700000,
    "4": 2000000,
    "5": 12000000
  },
  "price": 0,
  "free": true,
  "currency": "USD",
  "priceText": "Free",
  "offersIAP": false,
  "size": "65M",
  "androidVersion": "4.1",
  "androidVersionText": "4.1 and up",
  "developer": "WhatsApp LLC",
  "developerId": "5700313618786177705",
  "developerEmail": "android-support@whatsapp.com",
  "developerWebsite": "https://www.whatsapp.com/",
  "developerAddress": "WhatsApp LLC\n1601 Willow Rd.\nMenlo Park, CA 94025",
  "privacyPolicy": "https://www.whatsapp.com/legal/#privacy-policy",
  "developerInternalID": "5700313618786177705",
  "genre": "Communication",
  "genreId": "COMMUNICATION",
  "familyGenre": undefined,
  "familyGenreId": undefined,
  "icon": "https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN",
  "headerImage": "https://play-lh.googleusercontent.com/...",
  "screenshots": [
    "https://play-lh.googleusercontent.com/...",
    "https://play-lh.googleusercontent.com/..."
  ],
  "video": undefined,
  "videoImage": undefined,
  "contentRating": "Everyone",
  "contentRatingDescription": undefined,
  "adSupported": false,
  "released": "May 3, 2009",
  "updated": 1704067200000,
  "version": "2.23.24.14",
  "recentChanges": "• Bug fixes and other improvements",
  "comments": [],
  "editorsChoice": false,
  "features": [],
  "url": "https://play.google.com/store/apps/details?id=com.whatsapp"
}
```

### google-play-app-reviews

Get reviews for a Google Play Store app with pagination support.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Google Play package name |
| `num` | integer | No | Number of reviews to fetch (default: 100, max: 150) |
| `nextPaginationToken` | string | No | Pagination token from previous response for getting next batch of reviews |
| `sort` | string | No | Sort order: "newest", "rating", "helpfulness" (default: "newest") |
| `fullDetail` | boolean | No | Return full review details (default: false). When false, only essential fields are returned: id, userName, date, score, text, version |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "google-play-app-reviews",
    "arguments": {
      "appId": "com.whatsapp",
      "sort": "newest",
      "num": 10
    }
  }
}
```

#### Example Response (Raw Data)

```json
{
  "data": [
    {
      "id": "gp:AOqpTOFmAVORqfWGcaqfF39ftwFjGkjecjvjXnC8_rKzOqbFouduSoZjGzz_5wcAiDdCuyWuopUn8wuLHCM",
      "userName": "John D.",
      "userImage": "https://play-lh.googleusercontent.com/a-/AOh14GhqjW...",
      "date": "2024-01-10T00:00:00.000Z",
      "score": 5,
      "scoreText": "5",
      "url": "https://play.google.com/store/apps/details?id=com.whatsapp&reviewId=gp:AOqpTOFmAVORqfWGcaqfF39ftwFjGkjecjvjXnC8_rKzOqbFouduSoZjGzz_5wcAiDdCuyWuopUn8wuLHCM",
      "title": "Great app!",
      "text": "Works perfectly for staying in touch with family and friends. The interface is clean and easy to use.",
      "replyDate": null,
      "replyText": null,
      "version": "2.23.24.14",
      "thumbsUp": 12,
      "criterias": []
    }
  ],
  "nextPaginationToken": "CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ-HESltoGbgsCuKhk10ejIR7OuGu_MLQjpgkT6myAGLeo91cVdIrjzePqVzeQjXxIZ0PMFrTOXz07byRAmt5r7nrnU5IJjzcjei1xMVUmWhzm1hJ6dHe_PMV3m7hS9-mUkcADZLNg7Q21pfV_NUVjk94OBklhayMHzNRq4jdAJdU8j2Q9m_4AY4czYuagxa1hSptLzCVubtmwvqKT6BSiB8_fDBg"
}
```

#### Pagination Example

To get the next batch of reviews, use the `nextPaginationToken` from the previous response:

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "google-play-app-reviews",
    "arguments": {
      "appId": "com.whatsapp",
      "num": 10,
      "nextPaginationToken": "CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ-HESltoGbgsCuKhk10ejIR7OuGu_MLQjpgkT6myAGLeo91cVdIrjzePqVzeQjXxIZ0PMFrTOXz07byRAmt5r7nrnU5IJjzcjei1xMVUmWhzm1hJ6dHe_PMV3m7hS9-mUkcADZLNg7Q21pfV_NUVjk94OBklhayMHzNRq4jdAJdU8j2Q9m_4AY4czYuagxa1hSptLzCVubtmwvqKT6BSiB8_fDBg"
    }
  }
}
```

**Note**: When there are no more reviews to fetch, the `nextPaginationToken` field will be `null` or omitted from the response.

### google-play-search

Search for apps in the Google Play Store. Returns up to 30 results per query (Google Play serves no more; no pagination).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (minimum 2 characters) |
| `num` | integer | No | Number of results (1-30, default: 30). Google Play serves at most 30 results per query and has no further pages. |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |
| `fullDetail` | boolean | No | Return full app details (default: false) |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "google-play-search",
    "arguments": {
      "query": "messaging apps",
      "num": 5,
      "fullDetail": false
    }
  }
}
```

#### Example Response (Raw Data)

```json
[
  {
    "appId": "com.whatsapp",
    "title": "WhatsApp Messenger",
    "summary": "Simple. Reliable. Secure.",
    "developer": "WhatsApp LLC",
    "developerId": "5700313618786177705",
    "icon": "https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN",
    "score": 4.2,
    "scoreText": "4.2",
    "priceText": "Free",
    "free": true,
    "url": "https://play.google.com/store/apps/details?id=com.whatsapp"
  }
]
```

### google-play-list

Get app lists from Google Play Store charts and categories. Returns up to 500 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | No | Collection type. Available values: `TOP_FREE` (default), `TOP_PAID`, `GROSSING` |
| `category` | string | No | Category name for filtering apps. Popular categories: `GAME`, `BUSINESS`, `EDUCATION`, `ENTERTAINMENT`, `FINANCE`, `HEALTH_AND_FITNESS`, `LIFESTYLE`, `MUSIC_AND_AUDIO`, `NEWS_AND_MAGAZINES`, `PHOTOGRAPHY`, `PRODUCTIVITY`, `SHOPPING`, `SOCIAL`, `SPORTS`, `TOOLS`, `TRAVEL_AND_LOCAL`, `WEATHER`. Full list includes 54 categories including game subcategories like `GAME_ACTION`, `GAME_ADVENTURE`, etc. |
| `age` | string | No | Age rating filter. Available values: `FIVE_UNDER` (5 and under), `SIX_EIGHT` (6-8 years), `NINE_UP` (9+ years), or the raw values `AGE_RANGE1`/`AGE_RANGE2`/`AGE_RANGE3` |
| `num` | integer | No | Number of results (1-500, default: 50). No pagination available - increase this value to get more results. |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |
| `fullDetail` | boolean | No | Return full app details (default: false) |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/call",
  "params": {
    "name": "google-play-list",
    "arguments": {
      "collection": "TOP_FREE",
      "category": "GAME",
      "num": 5
    }
  }
}
```

#### Example with Age Filter

```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "tools/call",
  "params": {
    "name": "google-play-list",
    "arguments": {
      "collection": "TOP_PAID",
      "category": "EDUCATION",
      "age": "FIVE_UNDER",
      "num": 10
    }
  }
}
```

### google-play-developer

Get apps by a specific developer (returns a plain array, no pagination).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `devId` | string | Yes | Developer ID: numeric ID or developer name as in the Play Store URL (e.g., "Google LLC") |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |
| `num` | integer | No | Maximum number of apps (1-100, default: 50) |
| `fullDetail` | boolean | No | Return full app details (default: false) |

### google-play-suggest

Get search suggestions for app discovery.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `term` | string | Yes | Search term for suggestions |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |

### google-play-similar

Find apps similar to a given app.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Google Play package name |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |
| `fullDetail` | boolean | No | Return full app details (default: false) |

### google-play-permissions

Get detailed app permissions information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Google Play package name |
| `lang` | string | No | Language code (default: "en") |
| `short` | boolean | No | Return short permission descriptions (default: false) |

### google-play-datasafety

Get app data safety and privacy information.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Google Play package name |
| `lang` | string | No | Language code (default: "en") |

### google-play-categories

Get list of available app categories.

#### Parameters

No parameters required.

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "10",
  "method": "tools/call",
  "params": {
    "name": "google-play-categories",
    "arguments": {}
  }
}
```

## Apple App Store Tools

### app-store-app-details

Get detailed information about an Apple App Store app.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Numeric App Store ID (e.g., "310633997") or bundle ID (e.g., "net.whatsapp.WhatsApp") |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code for localized metadata (e.g., "fr", "en_us") |
| `ratings` | boolean | No | Also fetch the ratings histogram and merge `ratings` and `histogram` into the result (one extra request, default: false) |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/call",
  "params": {
    "name": "app-store-app-details",
    "arguments": {
      "appId": "310633997",
      "country": "us"
    }
  }
}
```

#### Example Response (Raw Data)

```json
{
  "id": 310633997,
  "appId": "310633997",
  "title": "WhatsApp Messenger",
  "url": "https://apps.apple.com/us/app/whatsapp-messenger/id310633997",
  "description": "WhatsApp Messenger is a FREE messaging app available for iPhone and other smartphones. WhatsApp uses your phone's Internet connection (4G/3G/2G/EDGE or Wi-Fi, as available) to message and call friends and family.",
  "icon": "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/4c/6b/8f/4c6b8f4c-1234-5678-9abc-def123456789/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/512x512bb.jpg",
  "genres": ["Social Networking"],
  "genreIds": ["6005"],
  "primaryGenre": "Social Networking",
  "primaryGenreId": 6005,
  "contentRating": "4+",
  "languages": ["EN", "AR", "CA", "ZH", "HR", "CS", "DA", "NL", "FI", "FR", "DE", "EL", "HE", "HI", "HU", "ID", "IT", "JA", "KO", "MS", "NB", "PL", "PT", "RO", "RU", "SK", "ES", "SV", "TH", "TR", "UK", "VI"],
  "size": "200540160",
  "requiredOsVersion": "12.0",
  "released": "2009-05-03T07:00:00Z",
  "updated": "2024-01-10T08:00:00Z",
  "version": "23.24.79",
  "releaseNotes": "This version contains bug fixes and performance improvements.",
  "price": 0,
  "currency": "USD",
  "free": true,
  "developerId": 310633997,
  "developer": "WhatsApp Inc.",
  "developerUrl": "https://apps.apple.com/us/developer/whatsapp-inc/id310633997",
  "developerWebsite": "https://www.whatsapp.com/",
  "score": 4.1,
  "reviews": 2500000,
  "currentVersionScore": 4.1,
  "currentVersionReviews": 125000,
  "screenshots": [
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/...",
    "https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/..."
  ],
  "ipadScreenshots": [],
  "appletvScreenshots": [],
  "supportedDevices": [
    "iPhone5s-iPhone5s",
    "iPadAir-iPadAir",
    "iPhone6-iPhone6",
    "iPhone6Plus-iPhone6Plus"
  ]
}
```

### app-store-app-reviews

Get reviews for an Apple App Store app. Apple serves at most 10 pages of about 50 reviews each.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Numeric App Store ID or bundle ID |
| `page` | integer | No | Page number, 1-10 (default: 1) |
| `sort` | string | No | Sort order: "newest" (most recent) or "helpfulness" (most helpful) (default: "newest") |
| `country` | string | No | Country code (default: "us") |
| `fullDetail` | boolean | No | Return full review details (default: false). When false, only essential fields are returned: id, version, userName, score, title, text, updated |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "tools/call",
  "params": {
    "name": "app-store-app-reviews",
    "arguments": {
      "appId": "310633997",
      "sort": "newest"
    }
  }
}
```

#### Example Response (Raw Data)

```json
[
  {
    "id": "10677050",
    "userName": "AppUser123",
    "userUrl": "https://apps.apple.com/us/reviews/id10677050",
    "version": "23.24.79",
    "score": 4,
    "title": "Good messaging app",
    "text": "Easy to use and reliable for staying in touch with family and friends.",
    "url": "https://apps.apple.com/us/app/whatsapp-messenger/id310633997?see-all=reviews"
  }
]
```

#### Pagination Example

To get the next page of reviews, increment the `page` parameter (up to 10):

```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "method": "tools/call",
  "params": {
    "name": "app-store-app-reviews",
    "arguments": {
      "appId": "310633997",
      "page": 2
    }
  }
}
```

**Note**: When there are no more reviews on a page, an empty array `[]` is returned. Pages above 10 are rejected.

### app-store-search

Search for apps in the Apple App Store. Use `num` as the page size and `page` to fetch further pages. Results are trimmed to essential fields (id, appId, title, url, price, score, reviews, primaryGenre, developer, developerId, icon, free).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (minimum 2 characters) |
| `num` | integer | No | Results per page (1-100, default: 50) |
| `page` | integer | No | Page number (default: 1); page N returns results (N-1)*num+1 to N*num |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code (e.g., "en-us") |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "method": "tools/call",
  "params": {
    "name": "app-store-search",
    "arguments": {
      "query": "messaging",
      "num": 5,
      "country": "us"
    }
  }
}
```

#### Example Response (Raw Data)

```json
[
  {
    "id": 310633997,
    "appId": "310633997",
    "title": "WhatsApp Messenger",
    "url": "https://apps.apple.com/us/app/whatsapp-messenger/id310633997",
    "description": "WhatsApp Messenger is a FREE messaging app available for iPhone and other smartphones...",
    "icon": "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/4c/6b/8f/4c6b8f4c-1234-5678-9abc-def123456789/AppIcon-0-0-1x_U007emarketing-0-0-0-7-0-0-sRGB-0-0-0-GLES2_U002c0-512MB-85-220-0-0.png/512x512bb.jpg",
    "genres": ["Social Networking"],
    "genreIds": ["6005"],
    "primaryGenre": "Social Networking",
    "primaryGenreId": 6005,
    "contentRating": "4+",
    "languages": ["EN", "AR", "CA", "ZH", "HR", "CS", "DA", "NL", "FI", "FR", "DE", "EL", "HE", "HI", "HU", "ID", "IT", "JA", "KO", "MS", "NB", "PL", "PT", "RO", "RU", "SK", "ES", "SV", "TH", "TR", "UK", "VI"],
    "size": "200540160",
    "requiredOsVersion": "12.0",
    "released": "2009-05-03T07:00:00Z",
    "updated": "2024-01-10T08:00:00Z",
    "version": "23.24.79",
    "price": 0,
    "currency": "USD",
    "free": true,
    "developerId": 310633997,
    "developer": "WhatsApp Inc.",
    "developerUrl": "https://apps.apple.com/us/developer/whatsapp-inc/id310633997",
    "developerWebsite": "https://www.whatsapp.com/",
    "score": 4.1,
    "reviews": 2500000,
    "currentVersionScore": 4.1,
    "currentVersionReviews": 125000,
    "screenshots": ["https://is1-ssl.mzstatic.com/image/thumb/PurpleSource126/v4/..."],
    "ipadScreenshots": [],
    "appletvScreenshots": [],
    "supportedDevices": ["iPhone5s-iPhone5s", "iPadAir-iPadAir", "iPhone6-iPhone6", "iPhone6Plus-iPhone6Plus"]
  }
]
```

### app-store-list

Get app lists from Apple App Store collections and categories. Returns up to 200 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | No | Collection type. Available values: `topmacapps`, `topfreemacapps`, `topgrossingmacapps`, `toppaidmacapps`, `newapplications`, `newfreeapplications`, `newpaidapplications`, `topfreeapplications` (default), `topfreeipadapplications`, `topgrossingapplications`, `topgrossingipadapplications`, `toppaidapplications`, `toppaidipadapplications` |
| `category` | string | No | Category constant name. Popular categories: `GAMES` (6014), `BUSINESS` (6000), `EDUCATION` (6017), `ENTERTAINMENT` (6016), `FINANCE` (6015), `HEALTH_AND_FITNESS` (6013), `LIFESTYLE` (6012), `MUSIC` (6011), `NEWS` (6009), `PHOTO_AND_VIDEO` (6008), `PRODUCTIVITY` (6007), `SOCIAL_NETWORKING` (6005), `SPORTS` (6004), `TRAVEL` (6003), `UTILITIES` (6002), `WEATHER` (6001) |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code (default: "en") |
| `num` | integer | No | Number of results (1-200, default: 50). No pagination available - increase this value to get more results. |
| `fullDetail` | boolean | No | Return full app details (default: false) |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "11",
  "method": "tools/call",
  "params": {
    "name": "app-store-list",
    "arguments": {
      "collection": "topfreeapplications",
      "category": "GAMES",
      "num": 10
    }
  }
}
```

### app-store-developer

Get all apps by a specific developer.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `devId` | string | Yes | Numeric developer (artist) ID, e.g. "284882218" (the `developerId` field of app results). Names are not supported. |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code (default: "en") |

### app-store-privacy

Get detailed app privacy information and policies.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Apple App Store numeric ID |
| `country` | string | No | Country code (default: "us") |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "13",
  "method": "tools/call",
  "params": {
    "name": "app-store-privacy",
    "arguments": {
      "id": "310633997"
    }
  }
}
```

### app-store-suggest

Get search suggestions for app discovery.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `term` | string | Yes | Search term for suggestions |
| `country` | string | No | Country code (default: "us") |

### app-store-similar

Find apps similar to a given app.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Numeric App Store ID or bundle ID |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code for localized metadata |

### app-store-ratings

Get the ratings histogram for an app (numeric ID only; use `app-store-app-details` with `ratings: true` for bundle IDs).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Apple App Store numeric ID |
| `country` | string | No | Country code (default: "us") |

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": "16",
  "method": "tools/call",
  "params": {
    "name": "app-store-ratings",
    "arguments": {
      "id": "310633997",
      "country": "us"
    }
  }
}
```

## SSE Transport (legacy HTTP+SSE, protocol 2024-11-05)

Prefer Streamable HTTP (`POST /mcp`). Use SSE only for clients that still need the older transport. The official SDK supports both (see `examples/sdk-client.js`).

1. `GET /sse` opens the stream. The first event tells you where to POST:
   ```
   event: endpoint
   data: /sse/<connectionId>/message
   ```
2. POST JSON-RPC messages to that path. The server replies `202 Accepted` right away.
3. Each response arrives on the stream as `event: message` with the JSON-RPC response as `data`. Notifications (no `id`) get nothing.
4. The client sends `initialize` itself, as with any MCP transport.
5. The stream carries `: heartbeat` comment lines every `SSE_HEARTBEAT_INTERVAL` ms.
6. Errors:
   - unknown or closed connection id → `404`
   - more than `SSE_MAX_CONNECTIONS` open streams → `503`
   - request from a browser origin not allowed by `CORS_ORIGINS` → `403`

```javascript
const { EventSource } = require('eventsource'); // npm install eventsource (v2: require('eventsource'))
const base = 'http://localhost:3000';
const es = new EventSource(`${base}/sse`);
let postUrl;

es.addEventListener('endpoint', (e) => {
  postUrl = base + e.data;
  send({ jsonrpc: '2.0', id: 1, method: 'initialize',
         params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'demo', version: '1.0.0' } } });
});

es.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id === 1) {
    send({ jsonrpc: '2.0', method: 'notifications/initialized' });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  } else {
    console.log(msg);
  }
});

function send(message) {
  return fetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });
}
```

A complete runnable version is in `examples/sse-client-example.js`.

## Tool Discovery

`tools/list` returns all enabled tools (19 unless `ENABLED_TOOLS` or `DISABLED_TOOLS` is set), each with its JSON `inputSchema`. Every schema sets `additionalProperties: false`.

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
```

## Rate Limiting

`/mcp` and `/sse` are limited per client IP: `RATE_LIMIT_MAX_REQUESTS` (default `100`, `0` disables) per `RATE_LIMIT_WINDOW_MS` (default `60000`). Responses carry the IETF `RateLimit` and `RateLimit-Policy` headers. Over the limit the server returns HTTP `429` with a JSON-RPC error:

```json
{ "jsonrpc": "2.0", "id": null, "error": { "code": -32603, "message": "Rate limit exceeded, retry later" } }
```

Behind a reverse proxy, set `TRUST_PROXY` (e.g. `1`). Otherwise all clients share the proxy's IP and therefore one limit.

## Health Check

`GET /health` is not rate-limited and needs no Origin:

```json
{ "status": "healthy", "timestamp": "2026-11-01T20:00:00.000Z", "version": "1.0.0" }
```

## Best Practices

1. **Use appropriate pagination** - `google-play-app-reviews` uses `nextPaginationToken`; `app-store-app-reviews` (pages 1-10) and `app-store-search` use `page`. Other list/search tools have no pagination: raise `num` up to the tool's limit (Play search 30, Play list 500, App Store list 200).
2. **Handle raw data responses** - All tools return unmodified data from scraping libraries
3. **Respect rate limits** - Implement backoff strategies and monitor rate limit headers
4. **Cache responses** - App store data doesn't change frequently, cache when possible
5. **Use specific app IDs** - More reliable than search when you know the exact app
6. **Set appropriate timeouts** - Network requests to app stores can be slow
7. **Choose the right transport** - Use HTTP transport for modern clients, SSE for legacy support
8. **Monitor SSE connections** - Close unused SSE connections to free server resources
9. **Handle connection failures** - Reconnect SSE streams; the old connection id is gone (404) after a reconnect
10. **Validate input parameters** - Use the provided JSON schemas to validate inputs before sending requests

## Raw Data Model Information

All tools return complete, unmodified responses from the underlying scraping libraries:

- **Google Play Store tools** return data exactly as provided by `google-play-scraper` library
- **Apple App Store tools** return data exactly as provided by `app-store-scraper` library
- **No data transformation** is performed to preserve all available information
- **Field availability** may vary based on app store policies and data availability
- **Response structure** follows the original library specifications

This approach ensures you have access to all available data fields and metadata without any information loss through transformation layers.