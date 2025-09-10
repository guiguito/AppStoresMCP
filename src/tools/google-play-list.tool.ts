/**
 * Google Play Store List MCP Tool
 * Provides app lists from Google Play Store collections
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { filterAppData } from '../utils/response-filter';

/**
 * Input parameters for Google Play list tool
 */
interface GooglePlayListParams {
  collection?: string;
  category?: string;
  age?: string;
  num?: number;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

/**
 * Google Play List MCP Tool implementation
 */
export class GooglePlayListTool implements MCPTool {
  public readonly name = 'google-play-list';
  public readonly description = 'Get app lists from Google Play Store collections and categories. Returns up to 100 results per request (no pagination support).';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Collection type from Google Play Store',
        enum: ['TOP_FREE', 'TOP_PAID', 'GROSSING'],
        default: 'TOP_FREE'
      },
      category: {
        type: 'string',
        description: 'Category name for filtering apps. Available categories: APPLICATION, ANDROID_WEAR, ART_AND_DESIGN, AUTO_AND_VEHICLES, BEAUTY, BOOKS_AND_REFERENCE, BUSINESS, COMICS, COMMUNICATION, DATING, EDUCATION, ENTERTAINMENT, EVENTS, FINANCE, FOOD_AND_DRINK, HEALTH_AND_FITNESS, HOUSE_AND_HOME, LIBRARIES_AND_DEMO, LIFESTYLE, MAPS_AND_NAVIGATION, MEDICAL, MUSIC_AND_AUDIO, NEWS_AND_MAGAZINES, PARENTING, PERSONALIZATION, PHOTOGRAPHY, PRODUCTIVITY, SHOPPING, SOCIAL, SPORTS, TOOLS, TRAVEL_AND_LOCAL, VIDEO_PLAYERS, WATCH_FACE, WEATHER, GAME, GAME_ACTION, GAME_ADVENTURE, GAME_ARCADE, GAME_BOARD, GAME_CARD, GAME_CASINO, GAME_CASUAL, GAME_EDUCATIONAL, GAME_MUSIC, GAME_PUZZLE, GAME_RACING, GAME_ROLE_PLAYING, GAME_SIMULATION, GAME_SPORTS, GAME_STRATEGY, GAME_TRIVIA, GAME_WORD, FAMILY',
        enum: [
          'APPLICATION', 'ANDROID_WEAR', 'ART_AND_DESIGN', 'AUTO_AND_VEHICLES', 'BEAUTY', 
          'BOOKS_AND_REFERENCE', 'BUSINESS', 'COMICS', 'COMMUNICATION', 'DATING', 
          'EDUCATION', 'ENTERTAINMENT', 'EVENTS', 'FINANCE', 'FOOD_AND_DRINK', 
          'HEALTH_AND_FITNESS', 'HOUSE_AND_HOME', 'LIBRARIES_AND_DEMO', 'LIFESTYLE', 
          'MAPS_AND_NAVIGATION', 'MEDICAL', 'MUSIC_AND_AUDIO', 'NEWS_AND_MAGAZINES', 
          'PARENTING', 'PERSONALIZATION', 'PHOTOGRAPHY', 'PRODUCTIVITY', 'SHOPPING', 
          'SOCIAL', 'SPORTS', 'TOOLS', 'TRAVEL_AND_LOCAL', 'VIDEO_PLAYERS', 
          'WATCH_FACE', 'WEATHER', 'GAME', 'GAME_ACTION', 'GAME_ADVENTURE', 
          'GAME_ARCADE', 'GAME_BOARD', 'GAME_CARD', 'GAME_CASINO', 'GAME_CASUAL', 
          'GAME_EDUCATIONAL', 'GAME_MUSIC', 'GAME_PUZZLE', 'GAME_RACING', 
          'GAME_ROLE_PLAYING', 'GAME_SIMULATION', 'GAME_SPORTS', 'GAME_STRATEGY', 
          'GAME_TRIVIA', 'GAME_WORD', 'FAMILY'
        ]
      },
      age: {
        type: 'string',
        description: 'Age rating filter for apps',
        enum: ['FIVE_UNDER', 'SIX_EIGHT', 'NINE_UP']
      },
      num: {
        type: 'integer',
        description: 'Number of results to return (default: 50, max: 100). No pagination available - increase this value to get more results.',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      lang: {
        type: 'string',
        description: 'Language code for localized content (default: en)',
        pattern: '^[a-z]{2}$',
        default: 'en'
      },
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      },
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full app details (default: false)',
        default: false
      }
    },
    additionalProperties: false
  };

  /**
   * Execute the Google Play list tool
   */
  async execute(params: GooglePlayListParams = {}): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw list data directly from google-play-scraper
      const gplayModule = await new Function('return import("google-play-scraper")')();
      const gplay = gplayModule.default;
      
      const listOptions: any = {
        num: Math.min(params.num || 50, 100),
        lang: params.lang || 'en',
        country: params.country || 'us',
        fullDetail: params.fullDetail || false
      };

      // Add collection if specified
      if (params.collection) {
        listOptions.collection = await this.mapCollection(params.collection);
      }

      // Add category if specified
      if (params.category) {
        listOptions.category = await this.mapCategory(params.category);
      }

      // Add age if specified
      if (params.age) {
        listOptions.age = await this.mapAge(params.age);
      }

      const rawListData = await gplay.list(listOptions);

      // Filter response to reduce token consumption when not in full detail mode
      return filterAppData(rawListData, params.fullDetail || false);
    } catch (error) {
      return this.handleError(error, params);
    }
  }

  /**
   * Validate input parameters
   * @private
   */
  private validateParams(params: any): void {
    if (params && typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    if (params.num && (typeof params.num !== 'number' || params.num < 1 || params.num > 100)) {
      throw new Error('num must be a number between 1 and 100');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.fullDetail && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
    }

    if (params.collection && typeof params.collection !== 'string') {
      throw new Error('collection must be a string');
    }

    if (params.category && typeof params.category !== 'string') {
      throw new Error('category must be a string');
    }

    if (params.age && typeof params.age !== 'string') {
      throw new Error('age must be a string');
    }
  }

  /**
   * Map collection string to google-play-scraper collection constant
   * @private
   */
  private async mapCollection(collection: string): Promise<any> {
    const gplayModule = await new Function('return import("google-play-scraper")')();
    const gplay = gplayModule.default;
    
    switch (collection) {
      case 'TOP_FREE':
        return gplay.collection.TOP_FREE;
      case 'TOP_PAID':
        return gplay.collection.TOP_PAID;
      case 'GROSSING':
        return gplay.collection.GROSSING;
      default:
        return gplay.collection.TOP_FREE;
    }
  }

  /**
   * Map category string to google-play-scraper category constant
   * @private
   */
  private async mapCategory(category: string): Promise<any> {
    const gplayModule = await new Function('return import("google-play-scraper")')();
    const gplay = gplayModule.default;
    
    // The category constants in google-play-scraper are the same as the string values
    // so we can directly use the category constant
    return (gplay.category as any)[category] || category;
  }

  /**
   * Map age string to google-play-scraper age constant
   * @private
   */
  private async mapAge(age: string): Promise<any> {
    const gplayModule = await new Function('return import("google-play-scraper")')();
    const gplay = gplayModule.default;
    
    switch (age) {
      case 'FIVE_UNDER':
        return gplay.age.FIVE_UNDER;
      case 'SIX_EIGHT':
        return gplay.age.SIX_EIGHT;
      case 'NINE_UP':
        return gplay.age.NINE_UP;
      default:
        return undefined;
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, params: GooglePlayListParams): any {
    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('Parameters must be an object') ||
      error.message.includes('num must be a number') ||
      error.message.includes('lang must be a valid') ||
      error.message.includes('country must be a valid') ||
      error.message.includes('fullDetail must be a boolean') ||
      error.message.includes('collection must be a string') ||
      error.message.includes('category must be a string') ||
      error.message.includes('age must be a string')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          params
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching app list',
        params,
        details: error.message || 'Unknown error'
      }
    };
  }
}