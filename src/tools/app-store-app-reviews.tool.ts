/**
 * Apple App Store App Reviews MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { filterReviewData } from '../utils/response-filter';
import { appStoreAppId, appStoreIdOption, country } from './common';

interface AppStoreAppReviewsParams {
  appId: string;
  page?: number;
  sort?: 'newest' | 'helpfulness';
  country?: string;
  fullDetail?: boolean;
}

export class AppStoreAppReviewsTool implements MCPTool {
  public readonly name = 'app-store-app-reviews';
  public readonly description = 'Get reviews for an Apple App Store app. Apple serves at most 10 pages (about 50 reviews each); an empty array means no more reviews.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: appStoreAppId,
      page: {
        type: 'integer',
        description: 'Page number, 1 to 10 (default: 1). Apple does not serve pages beyond 10.',
        minimum: 1,
        maximum: 10,
        default: 1
      },
      sort: {
        type: 'string',
        description: 'Sort order: newest (most recent) or helpfulness (most helpful)',
        enum: ['newest', 'helpfulness'],
        default: 'newest'
      },
      country,
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full review details (default: false). When false, only essential fields are returned: id, version, userName, score, title, text, updated',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: AppStoreAppReviewsParams): Promise<any> {
    const reviews = await store.reviews({
      ...appStoreIdOption(params.appId),
      page: params.page || 1,
      sort: params.sort === 'helpfulness' ? store.constants.sort.HELPFUL : store.constants.sort.RECENT,
      country: params.country || 'us'
    });
    return filterReviewData(reviews, params.fullDetail || false, 'app-store');
  }
}
