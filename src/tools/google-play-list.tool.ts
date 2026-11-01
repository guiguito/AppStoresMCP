/**
 * Google Play Store List MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, fullDetail, lang } from './common';

interface GooglePlayListParams {
  collection?: string;
  category?: string;
  age?: string;
  num?: number;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

export class GooglePlayListTool implements MCPTool {
  public readonly name = 'google-play-list';
  public readonly description = 'Get app lists (Top Free, Top Paid, Top Grossing charts) from Google Play Store, optionally filtered by category and age';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      collection: {
        type: 'string',
        description: 'Chart to retrieve (default: TOP_FREE)',
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
        description: 'Age range filter (FIVE_UNDER/SIX_EIGHT/NINE_UP or their raw values AGE_RANGE1/2/3)',
        enum: ['FIVE_UNDER', 'SIX_EIGHT', 'NINE_UP', 'AGE_RANGE1', 'AGE_RANGE2', 'AGE_RANGE3']
      },
      num: {
        type: 'integer',
        description: 'Number of results to return (default: 50, max: 500). No pagination - increase this value to get more results.',
        minimum: 1,
        maximum: 500,
        default: 50
      },
      lang: lang('en'),
      country,
      fullDetail
    },
    additionalProperties: false
  };

  async execute(params: GooglePlayListParams = {}): Promise<any> {
    const ages = gplay.age as Record<string, string>;
    return gplay.list({
      collection: (params.collection || gplay.collection.TOP_FREE) as any,
      ...(params.category ? { category: params.category as any } : {}),
      ...(params.age ? { age: (ages[params.age] || params.age) as any } : {}),
      num: params.num || 50,
      lang: params.lang || 'en',
      country: params.country || 'us',
      fullDetail: params.fullDetail || false
    });
  }
}
