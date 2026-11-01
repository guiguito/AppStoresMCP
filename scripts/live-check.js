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
  'google-play-app-reviews': { appId: 'com.spotify.music', num: 5, score: 1, device: 'MOBILE' },
  'google-play-search': { query: 'a', num: 60 },
  'google-play-list': { collection: 'TOP_FREE', num: 3 },
  'google-play-developer': { devId: 'Spotify AB', num: 3 },
  'google-play-suggest': { term: 'spot' },
  'google-play-similar': { appId: 'com.spotify.music' },
  'google-play-permissions': { appId: 'com.spotify.music' },
  'google-play-datasafety': { appId: 'com.spotify.music' },
  'google-play-categories': {},
  'google-play-availability': { appId: 'com.venmo', countries: ['us', 'fr'] },
  'app-store-app-details': { appId: 'com.duolingo.DuolingoMobile', subtitle: true, inAppPurchases: true },
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
  'app-store-app-details': app => typeof app.subtitle === 'string' && app.subtitle.length > 0
    && Array.isArray(app.inAppPurchases) && app.inAppPurchases.length > 0 && typeof app.inAppPurchases[0].price === 'number'
    || `subtitle=${app.subtitle} inAppPurchases=${JSON.stringify(app.inAppPurchases)?.slice(0, 80)}`,
  // 0.5.0: search continues past Play's first page for some queries, and summary cards lose descriptionHTML
  'google-play-search': apps => apps.length > 30 && apps.every(a => !('descriptionHTML' in a))
    || `${apps.length} results, descriptionHTML present: ${apps.some(a => 'descriptionHTML' in a)}`,
  'google-play-list': apps => apps.every(a => !('descriptionHTML' in a)) || 'descriptionHTML not stripped',
  'google-play-app-reviews': page => page.data.length > 0 && page.data.every(r => r.score === 1) || `scores=${page.data.map(r => r.score)}`,
  'google-play-availability': map => map.us === true && map.fr === false || JSON.stringify(map),
  'app-store-privacy': p => typeof p.privacyPolicyUrl === 'string' || `privacyPolicyUrl=${p.privacyPolicyUrl}`,
  'app-store-app-reviews': reviews => reviews.every(r => Number.isInteger(r.voteSum) && Number.isInteger(r.voteCount)) || 'voteSum/voteCount missing',
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
