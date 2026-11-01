#!/usr/bin/env node
/**
 * Live check: calls every tool through the built server against the real stores.
 * Unit/integration tests mock the scraper libraries, so this is what catches store or library drift.
 * Usage: npm run test:live
 */
const { MCPServer } = require('../dist/server');
const request = require("supertest");
const { loadConfig } = require('../dist/config/server-config');

const CALLS = {
  'google-play-app-details': { appId: 'com.spotify.music' },
  'google-play-app-reviews': { appId: 'com.spotify.music', num: 5 },
  'google-play-search': { query: 'spotify', num: 3 },
  'google-play-list': { collection: 'TOP_FREE', num: 3 },
  'google-play-developer': { devId: 'Spotify AB', num: 3 },
  'google-play-suggest': { term: 'spot' },
  'google-play-similar': { appId: 'com.spotify.music' },
  'google-play-permissions': { appId: 'com.spotify.music' },
  'google-play-datasafety': { appId: 'com.spotify.music' },
  'google-play-categories': {},
  'app-store-app-details': { appId: 'com.duolingo.DuolingoMobile', subtitle: true },
  'app-store-app-reviews': { appId: '324684580', sort: 'helpfulness' },
  'app-store-search': { query: 'duolingo', num: 3, subtitle: true },
  'app-store-list': { num: 3, fullDetail: true, subtitle: true },
  'app-store-developer': { devId: '324684583' },
  'app-store-privacy': { id: '324684580' },
  'app-store-suggest': { term: 'spot' },
  'app-store-similar': { appId: '324684580' },
  'app-store-ratings': { id: '324684580' },
};

// Field-level checks on top of "not an error, not empty": these catch library features silently disappearing.
const CHECKS = {
  'google-play-app-details': app => typeof app.releasedTimestamp === 'number' && app.developerId === 'Spotify AB'
    || `releasedTimestamp=${app.releasedTimestamp} developerId=${app.developerId}`,
  'app-store-app-details': app => typeof app.subtitle === 'string' && app.subtitle.length > 0 || `subtitle=${app.subtitle}`,
  'app-store-search': apps => apps.some(a => typeof a.subtitle === 'string') || 'no subtitle in any result',
  'app-store-list': apps => apps.some(a => typeof a.subtitle === 'string') || 'no subtitle in any result',
};

(async () => {
  process.env.ENABLE_LOGGING = 'false';
  const server = new MCPServer({ ...loadConfig(), port: 0 });
  await server.start();
  const app = server.getHttpTransport().getApp();
  let failed = 0;
  for (const [name, args] of Object.entries(CALLS)) {
    const t = Date.now();
    const body = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } };
    const res = await request(app).post('/mcp').send(body).then(r => r.body);
    const text = res.result?.content?.[0]?.text ?? JSON.stringify(res.error);
    let ok = res.result && !res.result.isError && text && text !== '[]' && text !== 'null';
    let detail = ok ? '' : text.slice(0, 150);
    if (ok && CHECKS[name]) {
      const verdict = CHECKS[name](JSON.parse(text));
      if (verdict !== true) {
        ok = false;
        detail = `field check failed: ${verdict}`;
      }
    }
    if (!ok) failed++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${name.padEnd(24)} ${Date.now() - t}ms ${detail}`);
  }
  await server.stop();
  console.log(failed ? `\n${failed} tool(s) failed` : '\nall tools OK');
  process.exit(failed ? 1 : 0);
})();
