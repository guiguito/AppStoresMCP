/**
 * Table-driven tests for all 19 MCP tools.
 * The bare library names are mapped to tests/__mocks__ (jest.config.js), so the real
 * libraries are required by path to check schema enums against their actual constants.
 */

import * as store from 'app-store-scraper-ts';
import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../../src/types/mcp';
import { SchemaValidator } from '../../src/utils/validation';
import { AppStoreAppDetailsTool } from '../../src/tools/app-store-app-details.tool';
import { AppStoreAppReviewsTool } from '../../src/tools/app-store-app-reviews.tool';
import { AppStoreDeveloperTool } from '../../src/tools/app-store-developer.tool';
import { AppStoreListTool } from '../../src/tools/app-store-list.tool';
import { AppStorePrivacyTool } from '../../src/tools/app-store-privacy.tool';
import { AppStoreRatingsTool } from '../../src/tools/app-store-ratings.tool';
import { AppStoreSearchTool } from '../../src/tools/app-store-search.tool';
import { AppStoreSimilarTool } from '../../src/tools/app-store-similar.tool';
import { AppStoreSuggestTool } from '../../src/tools/app-store-suggest.tool';
import { GooglePlayAppDetailsTool } from '../../src/tools/google-play-app-details.tool';
import { GooglePlayAppReviewsTool } from '../../src/tools/google-play-app-reviews.tool';
import { GooglePlayCategoriesTool } from '../../src/tools/google-play-categories.tool';
import { GooglePlayDataSafetyTool } from '../../src/tools/google-play-datasafety.tool';
import { GooglePlayDeveloperTool } from '../../src/tools/google-play-developer.tool';
import { GooglePlayListTool } from '../../src/tools/google-play-list.tool';
import { GooglePlayPermissionsTool } from '../../src/tools/google-play-permissions.tool';
import { GooglePlaySearchTool } from '../../src/tools/google-play-search.tool';
import { GooglePlaySimilarTool } from '../../src/tools/google-play-similar.tool';
import { GooglePlaySuggestTool } from '../../src/tools/google-play-suggest.tool';

const realStore = jest.requireActual('../../node_modules/app-store-scraper-ts');
const realPlay = jest.requireActual('../../node_modules/google-play-scraper-ts').default;

const asMock = store as unknown as Record<string, jest.Mock>;
const gpMock = gplay as unknown as Record<string, jest.Mock>;

const enumOf = (tool: MCPTool, prop: string): any[] =>
  (tool.inputSchema.properties as Record<string, JSONSchema7>)[prop]!.enum as any[];

beforeEach(() => jest.clearAllMocks());

describe('schema enums match the real library constants', () => {
  it('app-store-list collection = library collection values', () => {
    const tool = new AppStoreListTool();
    expect([...enumOf(tool, 'collection')].sort()).toEqual(Object.values(realStore.constants.collection).sort());
    expect((tool.inputSchema.properties as any).collection.default).toBe(realStore.constants.collection.TOP_FREE_IOS);
  });

  it('app-store-list categories are library category keys', () => {
    for (const c of enumOf(new AppStoreListTool(), 'category')) {
      expect(realStore.constants.category).toHaveProperty(c);
    }
  });

  it('google-play-list collection = library collection keys', () => {
    expect([...enumOf(new GooglePlayListTool(), 'collection')].sort()).toEqual(Object.keys(realPlay.collection).sort());
  });

  it('google-play-list categories = library category keys', () => {
    expect([...enumOf(new GooglePlayListTool(), 'category')].sort()).toEqual(Object.keys(realPlay.category).sort());
  });

  it('google-play-list age values are library age keys or values', () => {
    const valid = [...Object.keys(realPlay.age), ...Object.values(realPlay.age)];
    for (const a of enumOf(new GooglePlayListTool(), 'age')) expect(valid).toContain(a);
  });

  it('review sort enums map onto real library sort constants', () => {
    expect(enumOf(new AppStoreAppReviewsTool(), 'sort')).toEqual(['newest', 'helpfulness']);
    expect(Object.values(realStore.constants.sort)).toEqual(expect.arrayContaining(['mostRecent', 'mostHelpful']));
    expect(enumOf(new GooglePlayAppReviewsTool(), 'sort')).toEqual(['newest', 'rating', 'helpfulness']);
    expect(Object.keys(realPlay.sort).sort()).toEqual(['HELPFULNESS', 'NEWEST', 'RATING']);
  });
});

describe('schemas', () => {
  const valid = (tool: MCPTool, params: any) => SchemaValidator.validate(params, tool.inputSchema).valid;

  it('App Store appId accepts numeric and bundle ids, ratings stays numeric', () => {
    const details = new AppStoreAppDetailsTool();
    expect(valid(details, { appId: '553834731' })).toBe(true);
    expect(valid(details, { appId: 'com.midasplayer.apps.candycrushsaga' })).toBe(true);
    expect(valid(details, { appId: 'not an id' })).toBe(false);
    expect(valid(new AppStoreRatingsTool(), { id: 'com.example.app' })).toBe(false);
    expect(valid(new AppStoreRatingsTool(), { appId: '553834731' })).toBe(false);
  });

  it('Google Play appId pattern requires a literal dot', () => {
    const tool = new GooglePlayAppDetailsTool();
    expect(valid(tool, { appId: 'com.whatsapp' })).toBe(true);
    expect(valid(tool, { appId: 'comXwhatsapp' })).toBe(false);
  });

  it('lang accepts region variants', () => {
    expect(valid(new GooglePlaySearchTool(), { query: 'abc', lang: 'pt-BR' })).toBe(true);
    expect(valid(new GooglePlaySearchTool(), { query: 'abc', lang: 'english' })).toBe(false);
  });

  it('limits match library caps', () => {
    expect(valid(new AppStoreListTool(), { num: 200 })).toBe(true);
    expect(valid(new AppStoreListTool(), { num: 201 })).toBe(false);
    expect(valid(new AppStoreAppReviewsTool(), { appId: '1', page: 11 })).toBe(false);
    expect(valid(new GooglePlaySearchTool(), { query: 'abc', num: 31 })).toBe(false);
    expect(valid(new GooglePlayListTool(), { num: 500 })).toBe(true);
    expect(valid(new GooglePlayDeveloperTool(), { devId: 'x', nextPaginationToken: 't' })).toBe(false);
    expect(valid(new AppStoreDeveloperTool(), { devId: 'Supercell' })).toBe(false);
  });
});

describe('execute forwards the expected library options', () => {
  const cases: Array<[string, MCPTool, any, Record<string, jest.Mock>, string, any]> = [
    ['app-store-app-details numeric', new AppStoreAppDetailsTool(), { appId: '553834731', lang: 'fr', ratings: true },
      asMock, 'app', { id: '553834731', country: 'us', lang: 'fr', ratings: true }],
    ['app-store-app-details bundle', new AppStoreAppDetailsTool(), { appId: 'com.example.app' },
      asMock, 'app', { appId: 'com.example.app', country: 'us' }],
    ['app-store-app-reviews', new AppStoreAppReviewsTool(), { appId: 'com.example.app', sort: 'helpfulness', page: 3 },
      asMock, 'reviews', { appId: 'com.example.app', page: 3, sort: 'mostHelpful', country: 'us' }],
    ['app-store-app-reviews default sort', new AppStoreAppReviewsTool(), { appId: '1' },
      asMock, 'reviews', { id: '1', page: 1, sort: 'mostRecent', country: 'us' }],
    ['app-store-developer', new AppStoreDeveloperTool(), { devId: '284882218' },
      asMock, 'developer', { devId: '284882218', country: 'us', lang: 'en' }],
    ['app-store-list', new AppStoreListTool(), { category: 'GAMES', num: 200 },
      asMock, 'list', { collection: 'topfreeapplications', category: 6014, country: 'us', lang: 'en', num: 200, fullDetail: false }],
    ['app-store-privacy', new AppStorePrivacyTool(), { id: '1', country: 'fr' },
      asMock, 'privacy', { id: '1', country: 'fr' }],
    ['app-store-ratings', new AppStoreRatingsTool(), { id: '1' },
      asMock, 'ratings', { id: '1', country: 'us' }],
    ['app-store-search', new AppStoreSearchTool(), { query: 'notes', page: 2, num: 10, lang: 'en-us' },
      asMock, 'search', { term: 'notes', num: 10, page: 2, country: 'us', lang: 'en-us' }],
    ['app-store-similar', new AppStoreSimilarTool(), { appId: 'com.example.app', lang: 'de' },
      asMock, 'similar', { appId: 'com.example.app', country: 'us', lang: 'de' }],
    ['app-store-suggest', new AppStoreSuggestTool(), { term: 'pan' },
      asMock, 'suggest', { term: 'pan', country: 'us' }],
    ['google-play-app-details', new GooglePlayAppDetailsTool(), { appId: 'com.whatsapp' },
      gpMock, 'app', { appId: 'com.whatsapp', lang: 'en', country: 'us' }],
    ['google-play-app-reviews', new GooglePlayAppReviewsTool(), { appId: 'com.whatsapp', sort: 'rating', nextPaginationToken: 'tok' },
      gpMock, 'reviews', { appId: 'com.whatsapp', num: 100, sort: realPlay.sort.RATING, lang: 'en', country: 'us', paginate: true, nextPaginationToken: 'tok' }],
    ['google-play-categories', new GooglePlayCategoriesTool(), {}, gpMock, 'categories', undefined],
    ['google-play-datasafety', new GooglePlayDataSafetyTool(), { appId: 'com.whatsapp' },
      gpMock, 'datasafety', { appId: 'com.whatsapp', lang: 'en' }],
    ['google-play-developer', new GooglePlayDeveloperTool(), { devId: 'Google LLC' },
      gpMock, 'developer', { devId: 'Google LLC', lang: 'en', country: 'us', num: 50, fullDetail: false }],
    ['google-play-list', new GooglePlayListTool(), { collection: 'GROSSING', category: 'GAME', age: 'FIVE_UNDER', num: 500 },
      gpMock, 'list', { collection: 'GROSSING', category: 'GAME', age: 'AGE_RANGE1', num: 500, lang: 'en', country: 'us', fullDetail: false }],
    ['google-play-permissions', new GooglePlayPermissionsTool(), { appId: 'com.whatsapp', short: true },
      gpMock, 'permissions', { appId: 'com.whatsapp', lang: 'en', short: true }],
    ['google-play-search', new GooglePlaySearchTool(), { query: 'notes' },
      gpMock, 'search', { term: 'notes', num: 30, lang: 'en', country: 'us', fullDetail: false }],
    ['google-play-similar', new GooglePlaySimilarTool(), { appId: 'com.whatsapp' },
      gpMock, 'similar', { appId: 'com.whatsapp', lang: 'en', country: 'us', fullDetail: false }],
    ['google-play-suggest', new GooglePlaySuggestTool(), { term: 'pan', lang: 'pt-BR' },
      gpMock, 'suggest', { term: 'pan', lang: 'pt-BR', country: 'us' }]
  ];

  it.each(cases)('%s', async (_name, tool, params, lib, fn, expected) => {
    lib[fn]!.mockResolvedValue([]);
    await tool.execute(params);
    if (expected === undefined) expect(lib[fn]).toHaveBeenCalledWith();
    else expect(lib[fn]).toHaveBeenCalledWith(expected);
  });

  it('covers every tool', () => {
    expect(new Set(cases.map(c => c[1].name)).size).toBe(19);
  });
});

describe('library errors propagate', () => {
  it('Google Play', async () => {
    gpMock.app!.mockRejectedValue(new Error('Request failed: 404 Not Found'));
    await expect(new GooglePlayAppDetailsTool().execute({ appId: 'com.nope.app' })).rejects.toThrow('404');
  });

  it('App Store', async () => {
    asMock.app!.mockRejectedValue(new Error('App not found (404)'));
    await expect(new AppStoreAppDetailsTool().execute({ appId: '1' })).rejects.toThrow('404');
  });
});
