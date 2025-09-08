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

All tools return a consistent error format:

```json
{
  "success": false,
  "error": {
    "type": "error_category",
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error information"
  }
}
```

### Error Types

- `validation_error` - Invalid input parameters
- `not_found` - App or resource not found
- `scraper_error` - External API or scraping error
- `rate_limit_error` - Too many requests
- `internal_error` - Server-side error

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

Search for apps in the Google Play Store. Returns up to 100 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (minimum 2 characters) |
| `num` | integer | No | Number of results (1-100, default: 50). No pagination available - increase this value to get more results. |
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

Get app lists from Google Play Store collections and categories. Returns up to 100 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | No | Collection type. Available values: `TOP_FREE` (default), `TOP_PAID`, `GROSSING` |
| `category` | string | No | Category name for filtering apps. Popular categories: `GAME`, `BUSINESS`, `EDUCATION`, `ENTERTAINMENT`, `FINANCE`, `HEALTH_AND_FITNESS`, `LIFESTYLE`, `MUSIC_AND_AUDIO`, `NEWS_AND_MAGAZINES`, `PHOTOGRAPHY`, `PRODUCTIVITY`, `SHOPPING`, `SOCIAL`, `SPORTS`, `TOOLS`, `TRAVEL_AND_LOCAL`, `WEATHER`. Full list includes 51 categories including game subcategories like `GAME_ACTION`, `GAME_ADVENTURE`, etc. |
| `age` | string | No | Age rating filter. Available values: `FIVE_UNDER` (5 and under), `SIX_EIGHT` (6-8 years), `NINE_UP` (9+ years) |
| `num` | integer | No | Number of results (1-100, default: 50). No pagination available - increase this value to get more results. |
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

Get all apps by a specific developer with token-based pagination support.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `devId` | string | Yes | Developer ID or name |
| `lang` | string | No | Language code (default: "en") |
| `country` | string | No | Country code (default: "us") |
| `num` | integer | No | Number of results (1-100, default: 50). Use nextPaginationToken for additional pages. |
| `fullDetail` | boolean | No | Return full app details (default: false) |
| `nextPaginationToken` | string | No | Pagination token from previous response's "nextPaginationToken" field. Omit for first page. When null/missing in response, no more pages available. |

#### Pagination Example

To get the next batch of developer apps, use the `nextPaginationToken` from the previous response:

```json
{
  "jsonrpc": "2.0",
  "id": "dev-page-2",
  "method": "tools/call",
  "params": {
    "name": "google-play-developer",
    "arguments": {
      "devId": "Google LLC",
      "num": 20,
      "nextPaginationToken": "CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ-HESltoGbgsCuKhk10ejIR7OuGu_MLQjpgkT6myAGLeo91cVdIrjzePqVzeQjXxIZ0PMFrTOXz07byRAmt5r7nrnU5IJjzcjei1xMVUmWhzm1hJ6dHe_PMV3m7hS9-mUkcADZLNg7Q21pfV_NUVjk94OBklhayMHzNRq4jdAJdU8j2Q9m_4AY4czYuagxa1hSptLzCVubtmwvqKT6BSiB8_fDBg"
    }
  }
}
```

**Note**: When there are no more apps to fetch, the `nextPaginationToken` field will be `null` or omitted from the response.

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
| `appId` | string | Yes | Apple App Store numeric ID (e.g., "310633997") |
| `country` | string | No | Country code (default: "us") |

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

Get reviews for an Apple App Store app with pagination support.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `appId` | string | Yes | Apple App Store numeric ID |
| `page` | integer | No | Page number for pagination (default: 1) |
| `sort` | string | No | Sort order: "newest", "rating", "helpfulness" (default: "newest") |
| `country` | string | No | Country code (default: "us") |
| `num` | integer | No | Number of reviews (1-100, default: 50) |

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
      "sort": "mostRecent",
      "num": 10
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

To get the next page of reviews, increment the `page` parameter:

```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "method": "tools/call",
  "params": {
    "name": "app-store-app-reviews",
    "arguments": {
      "appId": "310633997",
      "page": 2,
      "num": 10
    }
  }
}
```

**Note**: When there are no more reviews on a page, an empty array `[]` will be returned.

### app-store-search

Search for apps in the Apple App Store. Returns up to 100 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query (minimum 2 characters) |
| `num` | integer | No | Number of results (1-100, default: 50). No pagination available - increase this value to get more results. |
| `country` | string | No | Country code (default: "us") |

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

Get app lists from Apple App Store collections and categories. Returns up to 100 results per request (no pagination support).

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | No | Collection type. Available values: `topmacapps`, `topfreemacapps`, `topgrossingmacapps`, `toppaidmacapps`, `newapplications`, `newfreeapplications`, `newpaidapplications`, `topfreeapplications` (default), `topfreeipadapplications`, `topgrossingapplications`, `topgrossingipadapplications`, `toppaidapplications`, `toppaidipadapplications` |
| `category` | string/integer | No | Category ID (number) or constant name (string). Popular categories: `GAMES` (6014), `BUSINESS` (6000), `EDUCATION` (6017), `ENTERTAINMENT` (6016), `FINANCE` (6015), `HEALTH_AND_FITNESS` (6013), `LIFESTYLE` (6012), `MUSIC` (6011), `NEWS` (6009), `PHOTO_AND_VIDEO` (6008), `PRODUCTIVITY` (6007), `SOCIAL_NETWORKING` (6005), `SPORTS` (6004), `TRAVEL` (6003), `UTILITIES` (6002), `WEATHER` (6001) |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code (default: "en") |
| `num` | integer | No | Number of results (1-100, default: 50). No pagination available - increase this value to get more results. |
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

#### Example with Numeric Category

```json
{
  "jsonrpc": "2.0",
  "id": "12",
  "method": "tools/call",
  "params": {
    "name": "app-store-list",
    "arguments": {
      "collection": "toppaidapplications",
      "category": 6014,
      "num": 5
    }
  }
}
```

### app-store-developer

Get all apps by a specific developer.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `devId` | string | Yes | Developer ID or name |
| `country` | string | No | Country code (default: "us") |
| `lang` | string | No | Language code (default: "en") |

### app-store-privacy

Get detailed app privacy information and policies.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Apple App Store numeric ID |

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
| `id` | string | No | Apple App Store numeric ID |
| `appId` | string | No | Alternative parameter name for app ID |
| `country` | string | No | Country code (default: "us") |

### app-store-ratings

Get detailed ratings breakdown and statistics.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | No | Apple App Store numeric ID |
| `appId` | string | No | Alternative parameter name for app ID |
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

## SSE Transport Examples

### Establishing SSE Connection with Automatic Initialization

The SSE transport now includes **automatic MCP initialization** to prevent client timeout issues. The server automatically sends an MCP initialize response immediately after connection establishment.

```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3000/sse');

let isInitialized = false;

// Handle connection establishment
eventSource.addEventListener('connection', function(event) {
  const data = JSON.parse(event.data);
  console.log('Connected with ID:', data.connectionId);
  
  // Store connection ID for sending messages
  window.sseConnectionId = data.connectionId;
});

// Handle MCP responses (including automatic initialization)
eventSource.addEventListener('mcp-response', function(event) {
  const response = JSON.parse(event.data);
  
  // Check if this is the automatic initialization response
  if (response.result && response.result.serverInfo && !isInitialized) {
    console.log('MCP initialization complete!');
    console.log('Server info:', response.result.serverInfo);
    console.log('Server capabilities:', response.result.capabilities);
    console.log('Protocol version:', response.result.protocolVersion);
    
    isInitialized = true;
    
    // Now ready to send MCP requests
    console.log('Ready to send MCP requests');
    
    // Example: Discover available tools
    discoverTools();
  } else {
    console.log('MCP Response:', response);
  }
});

// Handle heartbeats
eventSource.addEventListener('heartbeat', function(event) {
  const data = JSON.parse(event.data);
  console.log('Heartbeat:', data.timestamp);
});

// Handle connection errors
eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
};

// Function to discover tools after initialization
function discoverTools() {
  if (!isInitialized) {
    console.log('Waiting for initialization to complete...');
    return;
  }
  
  sendMCPMessage({
    jsonrpc: '2.0',
    id: 'discover-tools',
    method: 'tools/list'
  });
}
```

### Automatic Initialization Flow

The SSE transport follows this initialization sequence:

1. **Connection Establishment**: Client connects to `/sse` endpoint
2. **Connection Event**: Server sends `connection` event with connection ID
3. **Automatic Initialization**: Server automatically creates and processes an MCP `initialize` request
4. **Initialize Response**: Server sends `mcp-response` event with initialization result
5. **Ready State**: Client can now send MCP requests

#### Example Initialization Response

```json
{
  "jsonrpc": "2.0",
  "id": "init-12345678-1234-1234-1234-123456789abc",
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {},
      "logging": {}
    },
    "serverInfo": {
      "name": "app-store-mcp-server",
      "version": "2.0.0"
    }
  }
}
```

### Sending MCP Messages via SSE

```javascript
// Send MCP request via SSE transport
async function sendMCPMessage(message) {
  if (!window.sseConnectionId) {
    throw new Error('SSE connection not established');
  }
  
  const response = await fetch(`http://localhost:3000/sse/${window.sseConnectionId}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': 'unique-correlation-id'
    },
    body: JSON.stringify(message)
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  // Response will be received via SSE 'mcp-response' event
}

// Example usage after initialization
sendMCPMessage({
  jsonrpc: '2.0',
  id: '1',
  method: 'tools/call',
  params: {
    name: 'google-play-app-details',
    arguments: {
      appId: 'com.whatsapp'
    }
  }
});
```

### Request Queuing During Initialization

If you send requests before initialization completes, they will be automatically queued and processed after initialization:

```javascript
// This request will be queued if sent before initialization completes
sendMCPMessage({
  jsonrpc: '2.0',
  id: 'early-request',
  method: 'tools/call',
  params: {
    name: 'google-play-search',
    arguments: {
      query: 'messaging',
      num: 5
    }
  }
});

// The server will process this request after initialization completes
```

### Error Handling for SSE Transport

```javascript
eventSource.addEventListener('mcp-response', function(event) {
  const response = JSON.parse(event.data);
  
  if (response.error) {
    console.error('MCP Error:', response.error);
    
    // Handle specific error types
    switch (response.error.code) {
      case -32600: // Invalid Request
        console.error('Invalid MCP request format');
        break;
      case -32601: // Method Not Found
        console.error('Tool not found:', response.error.message);
        break;
      case -32602: // Invalid Params
        console.error('Invalid parameters:', response.error.message);
        break;
      case -32603: // Internal Error
        console.error('Server error:', response.error.message);
        break;
      default:
        console.error('Unknown error:', response.error);
    }
  } else if (response.result) {
    console.log('Success:', response.result);
  }
});
```

### SSE Configuration Options

The SSE transport behavior can be configured via environment variables:

```bash
# Enable/disable automatic initialization (default: true)
SSE_AUTO_INITIALIZE=true

# Initialization timeout in milliseconds (default: 5000)
SSE_INITIALIZATION_TIMEOUT=5000

# Heartbeat interval in milliseconds (default: 30000)
SSE_HEARTBEAT_INTERVAL=30000

# Connection timeout in milliseconds (default: 300000)
SSE_CONNECTION_TIMEOUT=300000

# Maximum concurrent connections (default: 100)
SSE_MAX_CONNECTIONS=100
```

### Complete SSE Client Example

```javascript
class SSEMCPClient {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.connectionId = null;
    this.eventSource = null;
    this.isInitialized = false;
    this.responseHandlers = new Map();
    this.requestQueue = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.eventSource = new EventSource(`${this.baseUrl}/sse`);
      
      this.eventSource.addEventListener('connection', (event) => {
        const data = JSON.parse(event.data);
        this.connectionId = data.connectionId;
        console.log('SSE connected with ID:', this.connectionId);
      });

      this.eventSource.addEventListener('mcp-response', (event) => {
        const response = JSON.parse(event.data);
        
        // Handle automatic initialization
        if (response.result && response.result.serverInfo && !this.isInitialized) {
          console.log('MCP initialization complete');
          this.isInitialized = true;
          resolve(response.result);
          
          // Process any queued requests
          this.processQueuedRequests();
          return;
        }
        
        // Handle regular responses
        const handler = this.responseHandlers.get(response.id);
        if (handler) {
          if (response.error) {
            handler.reject(new Error(response.error.message));
          } else {
            handler.resolve(response.result);
          }
          this.responseHandlers.delete(response.id);
        }
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        console.log('Heartbeat:', data.timestamp);
      });

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        reject(error);
      };

      // Timeout if initialization doesn't complete
      setTimeout(() => {
        if (!this.isInitialized) {
          reject(new Error('Initialization timeout'));
        }
      }, 10000);
    });
  }

  async callTool(toolName, arguments) {
    const requestId = Date.now().toString();
    const message = {
      jsonrpc: '2.0',
      id: requestId,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments
      }
    };

    // If not initialized, queue the request
    if (!this.isInitialized) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ message, resolve, reject });
      });
    }

    return this.sendMessage(message);
  }

  async sendMessage(message) {
    if (!this.connectionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    const responsePromise = new Promise((resolve, reject) => {
      this.responseHandlers.set(message.id, { resolve, reject });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.responseHandlers.has(message.id)) {
          this.responseHandlers.delete(message.id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });

    // Send message
    const response = await fetch(`${this.baseUrl}/sse/${this.connectionId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return responsePromise;
  }

  async processQueuedRequests() {
    const queue = [...this.requestQueue];
    this.requestQueue = [];

    for (const { message, resolve, reject } of queue) {
      try {
        const result = await this.sendMessage(message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.connectionId = null;
      this.isInitialized = false;
    }
  }
}

// Usage example
async function main() {
  const client = new SSEMCPClient();
  
  try {
    // Connect and wait for initialization
    const serverInfo = await client.connect();
    console.log('Connected to server:', serverInfo.name);
    
    // Now ready to make requests
    const appDetails = await client.callTool('google-play-app-details', {
      appId: 'com.whatsapp'
    });
    console.log('App title:', appDetails.title);
    
    // List available tools
    const tools = await client.sendMessage({
      jsonrpc: '2.0',
      id: 'list-tools',
      method: 'tools/list'
    });
    console.log('Available tools:', tools.tools.length);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.disconnect();
  }
}

main();
```

## Tool Discovery

Get a list of all available tools:

#### HTTP Request

```json
{
  "jsonrpc": "2.0",
  "id": "discovery",
  "method": "tools/list"
}
```

#### SSE Request

```javascript
sendMCPMessage(connectionId, {
  jsonrpc: '2.0',
  id: 'discovery',
  method: 'tools/list'
});
```

#### Response

```json
{
  "jsonrpc": "2.0",
  "id": "discovery",
  "result": {
    "tools": [
      {
        "name": "google-play-app-details",
        "description": "Get detailed information about a Google Play Store app including title, description, ratings, developer info, and metadata",
        "inputSchema": {
          "type": "object",
          "properties": {
            "appId": {
              "type": "string",
              "description": "The Google Play Store app ID (package name, e.g., com.example.app)",
              "pattern": "^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$"
            },
            "lang": {
              "type": "string",
              "description": "Language code for localized content (default: en)",
              "pattern": "^[a-z]{2}$",
              "default": "en"
            },
            "country": {
              "type": "string", 
              "description": "Country code for region-specific content (default: us)",
              "pattern": "^[a-z]{2}$",
              "default": "us"
            }
          },
          "required": ["appId"]
        }
      }
      // ... 18 more tools
    ]
  }
}
```

## Rate Limiting

The server implements rate limiting to prevent abuse:

- **Window**: 15 minutes (configurable)
- **Limit**: 100 requests per window (configurable)
- **Headers**: Rate limit information is included in response headers

When rate limited, you'll receive a 429 status code:

```json
{
  "success": false,
  "error": {
    "type": "rate_limit_error",
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 900
  }
}
```

## Health Check

Check server health at `/health`:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "tools": 19,
  "sseConnections": 3,
  "config": {
    "port": 3000,
    "logLevel": "info",
    "transports": {
      "http": true,
      "sse": true
    }
  }
}
```

## Best Practices

1. **Use appropriate pagination** - For tools with pagination support (reviews, developer apps), use pagination tokens/pages to get additional data. For search/list tools without pagination, increase the `num` parameter (up to 100) to get more results in a single request.
2. **Handle raw data responses** - All tools return unmodified data from scraping libraries
3. **Respect rate limits** - Implement backoff strategies and monitor rate limit headers
4. **Cache responses** - App store data doesn't change frequently, cache when possible
5. **Use specific app IDs** - More reliable than search when you know the exact app
6. **Set appropriate timeouts** - Network requests to app stores can be slow
7. **Choose the right transport** - Use HTTP transport for modern clients, SSE for legacy support
8. **Monitor SSE connections** - Close unused SSE connections to free server resources
9. **Handle connection failures** - Implement reconnection logic for SSE transport
10. **Validate input parameters** - Use the provided JSON schemas to validate inputs before sending requests

## Raw Data Model Information

All tools return complete, unmodified responses from the underlying scraping libraries:

- **Google Play Store tools** return data exactly as provided by `google-play-scraper` library
- **Apple App Store tools** return data exactly as provided by `app-store-scraper` library
- **No data transformation** is performed to preserve all available information
- **Field availability** may vary based on app store policies and data availability
- **Response structure** follows the original library specifications

This approach ensures you have access to all available data fields and metadata without any information loss through transformation layers.