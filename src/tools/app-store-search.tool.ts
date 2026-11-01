/**
 * Apple App Store Search MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { filterAppData } from '../utils/response-filter';
import { country, lang } from './common';

interface AppStoreSearchParams {
  query: string;
  num?: number;
  page?: number;
  country?: string;
  lang?: string;
}

export class AppStoreSearchTool implements MCPTool {
  public readonly name = 'app-store-search';
  public readonly description = 'Search for apps in Apple App Store. Use num for page size and page to fetch further pages.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string (minimum 2 characters)',
        minLength: 2
      },
      num: {
        type: 'integer',
        description: 'Number of results per page (default: 50, max: 100)',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      page: {
        type: 'integer',
        description: 'Page number (default: 1); page N returns results (N-1)*num+1 to N*num',
        minimum: 1,
        default: 1
      },
      country,
      lang: lang()
    },
    required: ['query'],
    additionalProperties: false
  };

  async execute(params: AppStoreSearchParams): Promise<any> {
    const results = await store.search({
      term: params.query,
      num: params.num || 50,
      page: params.page || 1,
      country: params.country || 'us',
      ...(params.lang ? { lang: params.lang } : {})
    });
    return filterAppData(results, false);
  }
}
