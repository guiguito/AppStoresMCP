/**
 * Apple App Store Suggest MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country } from './common';

interface AppStoreSuggestParams {
  term: string;
  country?: string;
}

export class AppStoreSuggestTool implements MCPTool {
  public readonly name = 'app-store-suggest';
  public readonly description = 'Get search suggestions from Apple App Store based on a search term';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      term: {
        type: 'string',
        description: 'Search term to get suggestions for (minimum 2 characters)',
        minLength: 2
      },
      country
    },
    required: ['term'],
    additionalProperties: false
  };

  async execute(params: AppStoreSuggestParams): Promise<unknown> {
    return store.suggest({ term: params.term, country: params.country || 'us' });
  }
}
