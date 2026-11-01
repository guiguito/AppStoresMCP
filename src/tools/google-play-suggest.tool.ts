/**
 * Google Play Store Suggest MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, lang } from './common';

interface GooglePlaySuggestParams {
  term: string;
  lang?: string;
  country?: string;
}

export class GooglePlaySuggestTool implements MCPTool {
  public readonly name = 'google-play-suggest';
  public readonly description = 'Get search suggestions from Google Play Store based on a search term';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      term: {
        type: 'string',
        description: 'Search term to get suggestions for (minimum 2 characters)',
        minLength: 2
      },
      lang: lang('en'),
      country
    },
    required: ['term'],
    additionalProperties: false
  };

  async execute(params: GooglePlaySuggestParams): Promise<any> {
    return gplay.suggest({
      term: params.term,
      lang: params.lang || 'en',
      country: params.country || 'us'
    });
  }
}
