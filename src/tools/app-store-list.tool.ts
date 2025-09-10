/**
 * Apple App Store List MCP Tool
 * Provides app lists from collections and categories
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { filterAppData } from '../utils/response-filter';

/**
 * Input parameters for Apple App Store list tool
 */
interface AppStoreListParams {
  collection?: string;
  category?: string | number;
  country?: string;
  lang?: string;
  num?: number;
  fullDetail?: boolean;
}

/**
 * Apple App Store List MCP Tool implementation
 */
export class AppStoreListTool implements MCPTool {
  public readonly name = 'app-store-list';
  public readonly description = 'Get app lists from collections and categories in Apple App Store. Returns up to 100 results per request (no pagination support).';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Collection to retrieve from Apple App Store',
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
        description: 'Category name to filter by. Common categories: GAMES, BUSINESS, EDUCATION, ENTERTAINMENT, FINANCE, HEALTH_AND_FITNESS, LIFESTYLE, MUSIC, NEWS, PHOTO_AND_VIDEO, PRODUCTIVITY, SOCIAL_NETWORKING, SPORTS, TRAVEL, UTILITIES, WEATHER',
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
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      },
      lang: {
        type: 'string',
        description: 'Language code for localized content (default: en)',
        pattern: '^[a-z]{2}$',
        default: 'en'
      },
      num: {
        type: 'integer',
        description: 'Number of results to return (default: 50, max: 100). No pagination available - increase this value to get more results.',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full app details (default: false)',
        default: false
      }
    },
    additionalProperties: false
  };

  constructor() {
    // No dependencies needed - calling app-store-scraper directly
  }

  /**
   * Execute the Apple App Store list tool
   */
  async execute(params: AppStoreListParams = {}): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw list data directly from app-store-scraper
    const store = require('app-store-scraper');
    
    const listParams: any = {
      collection: params.collection || store.collection.TOP_FREE_IOS,
      country: params.country || 'us',
      lang: params.lang || 'en',
      num: params.num ? Math.min(params.num, 100) : 50,
      fullDetail: params.fullDetail || false
    };

    // Add category if specified
    if (params.category) {
      // Handle both string constants and numeric IDs
      if (typeof params.category === 'string' && store.category[params.category] !== undefined) {
        listParams.category = store.category[params.category];
      } else {
        listParams.category = params.category;
      }
    }

    const rawListData = await store.list(listParams);

    // Filter response to reduce token consumption when not in full detail mode
    return filterAppData(rawListData, params.fullDetail || false);
  }

  /**
   * Validate input parameters
   * @private
   */
  private validateParams(params: any): void {
    if (params && typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    if (params.collection && typeof params.collection !== 'string') {
      throw new Error('collection must be a string');
    }

    if (params.category && typeof params.category !== 'string' && typeof params.category !== 'number') {
      throw new Error('category must be a string or number');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.num !== undefined && (typeof params.num !== 'number' || params.num < 1)) {
      throw new Error('num must be a positive number');
    }

    if (params.fullDetail && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
    }
  }
}