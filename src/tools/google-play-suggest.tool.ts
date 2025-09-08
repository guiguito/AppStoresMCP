/**
 * Google Play Store Suggest MCP Tool
 * Provides search suggestions from Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play suggest tool
 */
interface GooglePlaySuggestParams {
  term: string;
  lang?: string;
  country?: string;
}

/**
 * Google Play Suggest MCP Tool implementation
 */
export class GooglePlaySuggestTool implements MCPTool {
  public readonly name = 'google-play-suggest';
  public readonly description = 'Get search suggestions from Google Play Store based on a search term';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      term: {
        type: 'string',
        description: 'Search term to get suggestions for (minimum 2 characters)',
        minLength: 2
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
    required: ['term'],
    additionalProperties: false
  };

  /**
   * Execute the Google Play suggest tool
   */
  async execute(params: GooglePlaySuggestParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw suggest data directly from google-play-scraper
      const gplayModule = await new Function('return import("google-play-scraper")')();
      const gplay = gplayModule.default;
      
      const suggestOptions = {
        term: params.term,
        lang: params.lang || 'en',
        country: params.country || 'us'
      };

      const rawSuggestData = await gplay.suggest(suggestOptions);

      // Return complete raw response from google-play-scraper
      return rawSuggestData;
    } catch (error) {
      const term = params && typeof params === 'object' ? params.term : 'unknown';
      return this.handleError(error, term);
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

    if (!params.term || typeof params.term !== 'string' || params.term.trim().length === 0) {
      throw new Error('term is required and must be a non-empty string');
    }

    if (params.term.trim().length < 2) {
      throw new Error('term must be at least 2 characters long');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, term: string): any {
    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('term is required') ||
      error.message.includes('term must be at least') ||
      error.message.includes('Parameters must be an object') ||
      error.message.includes('lang must be a valid') ||
      error.message.includes('country must be a valid')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          term
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching search suggestions',
        term,
        details: error.message || 'Unknown error'
      }
    };
  }
}