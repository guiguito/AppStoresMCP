# MCP Client Examples

Start the server first (`npm run build && npm start`, default `http://localhost:3000`), then run an example in another terminal.

| Example | Transport | Extra install |
|---|---|---|
| `sdk-client.js` | Official MCP SDK over Streamable HTTP (`/mcp`), or legacy SSE with `--sse` | `npm install @modelcontextprotocol/sdk` |
| `sse-client-example.js` | Raw legacy HTTP+SSE (`GET /sse`, `endpoint`/`message` events) | `npm install eventsource` |
| `review-filtering-example.js` | Raw JSON-RPC over `POST /mcp`, compares filtered vs `fullDetail` reviews | – |
| `https-client-example.js` | Raw JSON-RPC over HTTPS (see `npm run generate-ssl`) | – |

```bash
node examples/sdk-client.js            # recommended starting point
node examples/sdk-client.js --sse
MCP_URL=https://localhost:3443 node examples/sdk-client.js
node examples/review-filtering-example.js
```

## Reading tool results

Every tool returns the scraper library's raw data as JSON text in `result.content[0].text`:

```js
const res = await client.callTool({ name: 'google-play-search', arguments: { query: 'spotify', num: 3 } });
if (res.isError) throw new Error(res.content[0].text);   // store failure or invalid arguments
const apps = JSON.parse(res.content[0].text);            // array of apps
```

- **Store failures and invalid arguments** (wrong type, value outside an enum, unknown property) come back as a normal result with `isError: true` and a readable message, e.g. `Invalid parameters: {"validationErrors":["root: Unknown property 'bogus'"]}`.
- **Protocol errors** (unknown tool `-32602`, unknown method `-32601`, malformed JSON-RPC) come back as JSON-RPC `error` objects.
- **Field names are the libraries' own.** App Store apps have `score`, `reviews` and `primaryGenre`. Google Play apps have `score`, `ratings` and `genre`. `google-play-app-reviews` returns `{ data, nextPaginationToken }`. See [docs/API.md](../docs/API.md) for each tool's parameters.

## Raw HTTP

Without the SDK, POST JSON-RPC to `/mcp`. Notifications (no `id`) get `202` with an empty body.

```bash
curl -s -X POST http://localhost:3000/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"app-store-app-details","arguments":{"appId":"com.spotify.client"}}}'
```

## Limits

- **Rate limit:** 100 requests per IP per minute on `/mcp` and `/sse` by default (`RATE_LIMIT_MAX_REQUESTS`, `RATE_LIMIT_WINDOW_MS`). Over the limit you get HTTP 429 with a JSON-RPC error.
- **Browser clients** need their origin listed in `CORS_ORIGINS`. Clients that send no `Origin` header (CLI, desktop, Node) are not affected.
