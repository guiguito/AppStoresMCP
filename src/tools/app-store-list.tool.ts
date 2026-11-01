/**
 * Apple App Store List MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, fullDetail, lang } from './common';

interface AppStoreListParams {
  collection?: string;
  category?: string;
  country?: string;
  lang?: string;
  num?: number;
  fullDetail?: boolean;
}

export class AppStoreListTool implements MCPTool {
  public readonly name = 'app-store-list';
  public readonly description = 'Get app lists from collections and categories in Apple App Store. Returns up to 200 results per request (no pagination).';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Collection (chart) to retrieve (default: topfreeapplications)',
        enum: [
          'topmacapps',
          'topfreemacapps',
          'topgrossingmacapps',
          'toppaidmacapps',
          'newapplications',
          'newfreeapplications',
          'newpaidapplications',
          'topfreeapplications',
          'topfreeipadapplications',
          'topgrossingapplications',
          'topgrossingipadapplications',
          'toppaidapplications',
          'toppaidipadapplications'
        ],
        default: 'topfreeapplications'
      },
      category: {
        type: 'string',
        description: 'Category to filter by',
        enum: [
          'BOOKS', 'BUSINESS', 'CATALOGS', 'EDUCATION', 'ENTERTAINMENT', 'FINANCE', 'FOOD_AND_DRINK',
          'GAMES', 'GAMES_ACTION', 'GAMES_ADVENTURE', 'GAMES_ARCADE', 'GAMES_BOARD', 'GAMES_CARD',
          'GAMES_CASINO', 'GAMES_DICE', 'GAMES_EDUCATIONAL', 'GAMES_FAMILY', 'GAMES_MUSIC',
          'GAMES_PUZZLE', 'GAMES_RACING', 'GAMES_ROLE_PLAYING', 'GAMES_SIMULATION', 'GAMES_SPORTS',
          'GAMES_STRATEGY', 'GAMES_TRIVIA', 'GAMES_WORD', 'HEALTH_AND_FITNESS', 'LIFESTYLE',
          'MAGAZINES_AND_NEWSPAPERS', 'MEDICAL', 'MUSIC', 'NAVIGATION', 'NEWS', 'PHOTO_AND_VIDEO',
          'PRODUCTIVITY', 'REFERENCE', 'SHOPPING', 'SOCIAL_NETWORKING', 'SPORTS', 'TRAVEL',
          'UTILITIES', 'WEATHER'
        ]
      },
      country,
      lang: lang('en'),
      num: {
        type: 'integer',
        description: 'Number of results to return (default: 50, max: 200)',
        minimum: 1,
        maximum: 200,
        default: 50
      },
      fullDetail
    },
    additionalProperties: false
  };

  async execute(params: AppStoreListParams = {}): Promise<any> {
    const categories = store.constants.category as Record<string, number>;
    return store.list({
      collection: (params.collection || store.constants.collection.TOP_FREE_IOS) as any,
      ...(params.category ? { category: categories[params.category] as any } : {}),
      country: params.country || 'us',
      lang: params.lang || 'en',
      num: params.num || 50,
      fullDetail: params.fullDetail || false
    });
  }
}
