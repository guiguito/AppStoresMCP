/**
 * Minimal client using the official MCP SDK (handles initialize, sessions, SSE, errors).
 *
 *   npm install @modelcontextprotocol/sdk
 *   node examples/sdk-client.js                 # Streamable HTTP (http://localhost:3000/mcp)
 *   node examples/sdk-client.js --sse           # legacy HTTP+SSE (http://localhost:3000/sse)
 *   MCP_URL=https://host:3443 node examples/sdk-client.js
 */
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

const base = process.env.MCP_URL || 'http://localhost:3000';
const useSSE = process.argv.includes('--sse');

// Tool output is JSON text in content[0]; store/validation failures come back with isError: true
async function call(client, name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content[0].text;
  if (res.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}

(async () => {
  const transport = useSSE
    ? new SSEClientTransport(new URL(`${base}/sse`))
    : new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  const client = new Client({ name: 'example', version: '1.0.0' });
  await client.connect(transport);

  const { tools } = await client.listTools();
  console.log(`${tools.length} tools: ${tools.map(t => t.name).join(', ')}\n`);

  const gp = await call(client, 'google-play-search', { query: 'messaging', num: 3 });
  console.log('Google Play search:');
  gp.forEach(a => console.log(`  ${a.title} by ${a.developer} (${a.score?.toFixed(1)}★)`));

  const app = await call(client, 'app-store-app-details', { appId: 'com.burbn.instagram' });
  console.log(`\nApp Store details: ${app.title} by ${app.developer}, ${app.score?.toFixed(1)}★ (${app.reviews} ratings), ${app.primaryGenre}`);

  const { data: reviews } = await call(client, 'google-play-app-reviews', { appId: 'com.whatsapp', num: 3 });
  console.log('\nLatest WhatsApp reviews (Google Play):');
  reviews.forEach(r => console.log(`  ${r.score}★ ${r.userName}: ${r.text?.slice(0, 80)}`));

  try {
    await call(client, 'app-store-app-details', { appId: '1', bogus: true });
  } catch (e) {
    console.log(`\nBad arguments are reported, not thrown by the server: ${e.message.slice(0, 120)}`);
  }

  await client.close();
})().catch(e => { console.error(e); process.exit(1); });
