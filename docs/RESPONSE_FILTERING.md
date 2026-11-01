# Response Filtering

A few tools trim their responses to essential fields to reduce token usage. Everything else returns the raw data from `app-store-scraper-ts` / `google-play-scraper-ts` unchanged.

## Which tools filter

| Tool | Behaviour |
|------|-----------|
| `app-store-search` | Always returns essential app fields only (no `fullDetail` option) |
| `app-store-app-reviews` | Essential review fields unless `fullDetail: true` |
| `google-play-app-reviews` | Essential review fields unless `fullDetail: true`; `nextPaginationToken` is always kept |

The `fullDetail` option on the list/search/developer/similar tools is not a filter: it is passed to the library, which then fetches the full app details for every result instead of the lighter summary entries.

## Essential fields

**App Store apps (`app-store-search`):** `id`, `appId`, `title`, `url`, `price`, `score`, `reviews` (rating count), `primaryGenre`, `developer`, `developerId`, `icon`, `free`.

**App Store reviews:** `id`, `version`, `userName`, `score`, `title`, `text`, `updated`.

**Google Play reviews:** `id`, `userName`, `date`, `score`, `text`, `version`.

## Example

```javascript
// app-store-app-reviews, filtered (default)
await tool.execute({ appId: '553834731' });
// -> [{ id, version, userName, score, title, text, updated }, ...]

// full review objects (adds userUrl, url)
await tool.execute({ appId: '553834731', fullDetail: true });
```

Implementation: `src/utils/response-filter.ts`.
