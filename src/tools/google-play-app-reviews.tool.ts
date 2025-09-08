/**
 * Google Play Store App Reviews MCP Tool
 * Provides app reviews from Google Play Store with pagination support
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play app reviews tool
 */
interface GooglePlayAppReviewsParams {
  appId: string;
  num?: number;
  nextPaginationToken?: string;
  sort?: 'newest' | 'rating' | 'helpfulness';
  lang?: string;
  country?: string;
}

/**
 * Google Play App Reviews MCP Tool implementation
 */
export class GooglePlayAppReviewsTool implements MCPTool {
  public readonly name = 'google-play-app-reviews';
  public readonly description = 'Get reviews for a Google Play Store app with pagination and sorting options';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: {
        type: 'string',
        description: 'The Google Play Store app ID (package name, e.g., com.example.app)',
        pattern: '^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$'
      },
      num: {
        type: 'integer',
        description: 'Number of reviews to fetch (default: 100, max: 150)',
        minimum: 1,
        maximum: 150,
        default: 100
      },
      nextPaginationToken: {
        type: 'string',
        description: 'Pagination token from previous response for getting next batch of reviews'
      },
      sort: {
        type: 'string',
        description: 'Sort order for reviews',
        enum: ['newest', 'rating', 'helpfulness'],
        default: 'newest'
      },
      lang: {
        type: 'string',
        description: 'Language code for localized content (default: en)',
        pattern: '^[a-z]{2}$',
        default: 'en'
      },
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling google-play-scraper directly
  }

  /**
   * Execute the Google Play app reviews tool
   */
  async execute(params: GooglePlayAppReviewsParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw app reviews directly from google-play-scraper
      const gplayModule = await import('google-play-scraper');
      const gplay = gplayModule.default;
      
      const reviewsOptions: any = {
        appId: params.appId,
        num: Math.min(params.num || 100, 150), // Limit to prevent excessive requests
        sort: await this.mapSortOption(params.sort),
        lang: params.lang || 'en',
        country: params.country || 'us'
      };

      if (params.nextPaginationToken) {
        reviewsOptions.nextPaginationToken = params.nextPaginationToken;
      }

      const rawReviews = await gplay.reviews(reviewsOptions);

      // Return complete raw response from google-play-scraper
      return rawReviews;
    } catch (error) {
      const appId = params && typeof params === 'object' ? params.appId : 'unknown';
      return this.handleError(error, appId);
    }
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

    if (params.num !== undefined) {
      if (typeof params.num !== 'number' || !Number.isInteger(params.num) || params.num < 1 || params.num > 150) {
        throw new Error('num must be an integer between 1 and 150');
      }
    }

    if (params.nextPaginationToken !== undefined) {
      if (typeof params.nextPaginationToken !== 'string' || params.nextPaginationToken.trim().length === 0) {
        throw new Error('nextPaginationToken must be a non-empty string');
      }
    }

    if (params.sort && !['newest', 'rating', 'helpfulness'].includes(params.sort)) {
      throw new Error('sort must be one of: newest, rating, helpfulness');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }

  /**
   * Map sort option to google-play-scraper format
   * @private
   */
  private async mapSortOption(sort?: string): Promise<number> {
    const gplayModule = await import('google-play-scraper');
    const gplay = gplayModule.default;
    switch (sort) {
      case 'newest':
        return gplay.sort.NEWEST;
      case 'rating':
        return gplay.sort.RATING;
      case 'helpfulness':
        return gplay.sort.HELPFULNESS;
      default:
        return gplay.sort.NEWEST;
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, appId: string): any {

    if (error.message && error.message.includes('not found')) {
      return {
        success: false,
        error: {
          type: 'not_found',
          code: 'APP_NOT_FOUND',
          message: `App with ID '${appId}' not found in Google Play Store`,
          appId
        }
      };
    }

    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('appId is required') ||
      error.message.includes('Parameters must be an object') ||
      error.message.includes('num must be') ||
      error.message.includes('nextPaginationToken must be') ||
      error.message.includes('sort must be') ||
      error.message.includes('lang must be') ||
      error.message.includes('country must be')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          appId
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching app reviews',
        appId,
        details: error.message || 'Unknown error'
      }
    };
  }
}