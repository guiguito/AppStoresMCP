/**
 * Apple App Store App Reviews MCP Tool
 * Provides app reviews from Apple App Store with pagination support
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { filterReviewData } from '../utils/response-filter';

/**
 * Input parameters for Apple App Store app reviews tool
 */
interface AppStoreAppReviewsParams {
  appId: string;
  page?: number;
  sort?: 'newest' | 'rating' | 'helpfulness';
  country?: string;
  fullDetail?: boolean;
}

/**
 * Apple App Store App Reviews MCP Tool implementation
 */
export class AppStoreAppReviewsTool implements MCPTool {
  public readonly name = 'app-store-app-reviews';
  public readonly description = 'Get reviews for an Apple App Store app with page-based pagination. Increment page parameter for next page, empty array indicates end.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: {
        type: 'string',
        description: 'The Apple App Store app ID (numeric ID, e.g., 123456789)',
        pattern: '^\\d+$'
      },
      page: {
        type: 'integer',
        description: 'Page number for pagination (default: 1). Increment to get next page. Empty array response indicates no more pages.',
        minimum: 1,
        default: 1
      },
      sort: {
        type: 'string',
        description: 'Sort order for reviews',
        enum: ['newest', 'rating', 'helpfulness'],
        default: 'newest'
      },
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      },
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full review details (default: false). When false, only essential fields are returned: id, version, userName, score, title, text, updated',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling app-store-scraper-ts directly
  }

  /**
   * Execute the Apple App Store app reviews tool
   */
  async execute(params: AppStoreAppReviewsParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw app reviews directly from app-store-scraper-ts
    const store = await import('app-store-scraper-ts');
    
    const reviewsOptions: any = {
      id: params.appId,
      page: params.page || 1,
      sort: this.mapSortOption(params.sort),
      country: params.country || 'us'
    };

    const rawReviews = await store.reviews(reviewsOptions);

    // Filter response to reduce token consumption when not in full detail mode
    return filterReviewData(rawReviews, params.fullDetail || false, 'app-store');
  }

  /**
   * Validate input parameters
   * @private
   */
  private validateParams(params: any): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    if (!params.appId || typeof params.appId !== 'string' || params.appId.trim().length === 0) {
      throw new Error('appId is required and must be a string');
    }

    if (!/^\d+$/.test(params.appId.trim())) {
      throw new Error('appId must be a numeric string for Apple App Store');
    }

    if (params.page !== undefined) {
      if (typeof params.page !== 'number' || !Number.isInteger(params.page) || params.page < 1) {
        throw new Error('page must be a positive integer');
      }
    }

    if (params.sort && !['newest', 'rating', 'helpfulness'].includes(params.sort)) {
      throw new Error('sort must be one of: newest, rating, helpfulness');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.fullDetail !== undefined && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
    }
  }

  /**
   * Map sort option to app-store-scraper format
   * @private
   */
  private mapSortOption(sort?: string): string {
    switch (sort) {
      case 'newest':
      case 'mostRecent':
        return 'mostRecent';
      case 'rating':
      case 'helpful':
      case 'mostHelpful':
        return 'mostHelpful';
      default:
        return 'mostRecent';
    }
  }
}