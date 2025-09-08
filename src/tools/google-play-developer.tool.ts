/**
 * Google Play Store Developer MCP Tool
 * Provides apps by developer from Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play developer tool
 */
interface GooglePlayDeveloperParams {
  devId: string;
  lang?: string;
  country?: string;
  num?: number;
  fullDetail?: boolean;
  nextPaginationToken?: string;
}

/**
 * Google Play Developer MCP Tool implementation
 */
export class GooglePlayDeveloperTool implements MCPTool {
  public readonly name = 'google-play-developer';
  public readonly description = 'Get apps by developer from Google Play Store with token-based pagination. Use nextPaginationToken from response for subsequent pages.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      devId: {
        type: 'string',
        description: 'Developer ID or name to search for',
        minLength: 1
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
      },
      num: {
        type: 'integer',
        description: 'Number of results to return (default: 50, max: 100). Use nextPaginationToken for additional pages.',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full app details (default: false)',
        default: false
      },
      nextPaginationToken: {
        type: 'string',
        description: 'Pagination token from previous response\'s "nextPaginationToken" field. Omit for first page. When null/missing in response, no more pages available.'
      }
    },
    required: ['devId'],
    additionalProperties: false
  };

  /**
   * Execute the Google Play developer tool
   */
  async execute(params: GooglePlayDeveloperParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw developer data directly from google-play-scraper
      const gplayModule = await new Function('return import("google-play-scraper")')();
      const gplay = gplayModule.default;
      
      const developerOptions: any = {
        devId: params.devId,
        lang: params.lang || 'en',
        country: params.country || 'us',
        num: Math.min(params.num || 50, 100),
        fullDetail: params.fullDetail || false,
        paginate: true // Enable pagination
      };

      // Only add nextPaginationToken if it's provided and not empty
      if (params.nextPaginationToken && params.nextPaginationToken.trim()) {
        developerOptions.nextPaginationToken = params.nextPaginationToken.trim();
      }

      const rawDeveloperData = await gplay.developer(developerOptions);

      // Return complete raw response from google-play-scraper
      return rawDeveloperData;
    } catch (error) {
      return this.handleError(error, params);
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

    if (!params.devId || typeof params.devId !== 'string' || params.devId.trim().length === 0) {
      throw new Error('devId is required and must be a non-empty string');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.num && (typeof params.num !== 'number' || params.num < 1 || params.num > 100)) {
      throw new Error('num must be a number between 1 and 100');
    }

    if (params.fullDetail && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
    }

    if (params.nextPaginationToken !== undefined) {
      if (typeof params.nextPaginationToken !== 'string' || params.nextPaginationToken.trim().length === 0) {
        throw new Error('nextPaginationToken must be a non-empty string');
      }
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, params: GooglePlayDeveloperParams): any {
    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('Parameters must be an object') ||
      error.message.includes('devId is required') ||
      error.message.includes('lang must be a valid') ||
      error.message.includes('country must be a valid') ||
      error.message.includes('num must be a number') ||
      error.message.includes('fullDetail must be a boolean') ||
      error.message.includes('nextPaginationToken must be')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          params
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching developer apps',
        params,
        details: error.message || 'Unknown error'
      }
    };
  }
}