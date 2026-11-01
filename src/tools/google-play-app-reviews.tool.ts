/**
 * Google Play Store App Reviews MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { filterReviewData } from '../utils/response-filter';
import { country, googlePlayAppId, lang } from './common';

interface GooglePlayAppReviewsParams {
  appId: string;
  num?: number;
  nextPaginationToken?: string;
  sort?: 'newest' | 'rating' | 'helpfulness';
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

const SORT = {
  newest: gplay.sort.NEWEST,
  rating: gplay.sort.RATING,
  helpfulness: gplay.sort.HELPFULNESS
};

export class GooglePlayAppReviewsTool implements MCPTool {
  public readonly name = 'google-play-app-reviews';
  public readonly description = 'Get reviews for a Google Play Store app with token-based pagination. Use nextPaginationToken from response for subsequent pages.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      num: {
        type: 'integer',
        description: 'Number of reviews to fetch (default: 100, max: 150)',
        minimum: 1,
        maximum: 150,
        default: 100
      },
      nextPaginationToken: {
        type: 'string',
        description: 'Pagination token from previous response\'s "nextPaginationToken" field. Omit for first page. When null/missing in response, no more pages available.',
        minLength: 1
      },
      sort: {
        type: 'string',
        description: 'Sort order for reviews',
        enum: ['newest', 'rating', 'helpfulness'],
        default: 'newest'
      },
      lang: lang('en'),
      country,
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full review details (default: false). When false, only essential fields are returned: id, userName, date, score, text, version',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: GooglePlayAppReviewsParams): Promise<any> {
    const reviews = await gplay.reviews({
      appId: params.appId,
      num: params.num || 100,
      sort: SORT[params.sort || 'newest'],
      lang: params.lang || 'en',
      country: params.country || 'us',
      paginate: true,
      ...(params.nextPaginationToken ? { nextPaginationToken: params.nextPaginationToken } : {})
    });
    return filterReviewData(reviews, params.fullDetail || false, 'google-play');
  }
}
