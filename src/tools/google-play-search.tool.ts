/**
 * Google Play Store Search MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { omitFields, PLAY_SUMMARY_OMIT } from '../utils/response-filter';
import { country, lang, playFullDetail } from './common';

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
        description: 'Search query string',
        minLength: 1
      },
      num: {
        type: 'integer',
        description: 'Maximum results (default: 30, max: 250). Most queries stop at Play\'s first page (~20-30 apps); some (single characters, digits, some app names) continue up to ~250. For more distinct apps, run related queries (e.g. from google-play-suggest) and de-duplicate by appId.',
        minimum: 1,
        maximum: 250,
        default: 30
      },
      lang: lang('en'),
      country,
      fullDetail: playFullDetail
    },
    required: ['query'],
    additionalProperties: false
  };

  async execute(params: GooglePlaySearchParams): Promise<unknown> {
    const results = await gplay.search({
      term: params.query,
      num: params.num || 30,
      lang: params.lang || 'en',
      country: params.country || 'us',
      fullDetail: params.fullDetail || false
    });
    return params.fullDetail ? results : omitFields(results, PLAY_SUMMARY_OMIT);
  }
}
