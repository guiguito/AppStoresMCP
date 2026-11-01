/**
 * Google Play Store Search MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, fullDetail, lang } from './common';

interface GooglePlaySearchParams {
  query: string;
  num?: number;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

export class GooglePlaySearchTool implements MCPTool {
  public readonly name = 'google-play-search';
  public readonly description = 'Search for apps in Google Play Store. Google Play serves at most 30 results per query (no pagination).';

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
        description: 'Number of search results to return (default: 30, max: 30 - Google Play serves no more per query)',
        minimum: 1,
        maximum: 30,
        default: 30
      },
      lang: lang('en'),
      country,
      fullDetail
    },
    required: ['query'],
    additionalProperties: false
  };

  async execute(params: GooglePlaySearchParams): Promise<any> {
    return gplay.search({
      term: params.query,
      num: params.num || 30,
      lang: params.lang || 'en',
      country: params.country || 'us',
      fullDetail: params.fullDetail || false
    });
  }
}
