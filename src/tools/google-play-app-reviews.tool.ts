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
  score?: 1 | 2 | 3 | 4 | 5;
  device?: keyof typeof gplay.device;
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
  public readonly description = 'Get reviews for a Google Play Store app with token-based pagination, optionally filtered by star rating and device. Use nextPaginationToken from the response for subsequent pages (with the same filters).';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      num: {
        type: 'integer',
        description: 'Number of reviews to fetch in this page (default: 100, max: 4500, one request). Large pages make large responses; prefer the default and paginate.',
        minimum: 1,
        maximum: 4500,
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
      score: {
        type: 'integer',
        description: 'Only reviews with this star rating (filtered by Google Play). Pass the same value with each nextPaginationToken.',
        enum: [1, 2, 3, 4, 5]
      },
      device: {
        type: 'string',
        description: 'Only reviews written on this form factor (filtered by Google Play). Pass the same value with each nextPaginationToken.',
        enum: Object.keys(gplay.device)
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

  async execute(params: GooglePlayAppReviewsParams): Promise<unknown> {
    const reviews = await gplay.reviews({
      appId: params.appId,
      num: params.num || 100,
      sort: SORT[params.sort || 'newest'],
      lang: params.lang || 'en',
      country: params.country || 'us',
      paginate: true,
      ...(params.score ? { score: params.score } : {}),
      ...(params.device ? { device: gplay.device[params.device] } : {}),
      ...(params.nextPaginationToken ? { nextPaginationToken: params.nextPaginationToken } : {})
    });
    return filterReviewData(reviews, params.fullDetail || false, 'google-play');
  }
}
