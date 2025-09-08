/**
 * Google Play Store Search MCP Tool
 * Provides app search functionality for Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play search tool
 */
interface GooglePlaySearchParams {
  query: string;
  num?: number;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

/**
 * Google Play Search MCP Tool implementation
 */
export class GooglePlaySearchTool implements MCPTool {
  public readonly name = 'google-play-search';
  public readonly description = 'Search for apps in Google Play Store. Returns up to 100 results per request (no pagination support).';

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
        description: 'Number of search results to return (default: 50, max: 100). No pagination available - increase this value to get more results.',
        minimum: 1,
        maximum: 100,
        default: 50
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
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full app details (default: false)',
        default: false
      }
    },
    required: ['query'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling google-play-scraper directly
  }

  /**
   * Execute the Google Play search tool
   */
  async execute(params: GooglePlaySearchParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw search results directly from google-play-scraper using dynamic import
      const gplayModule = await new Function('return import("google-play-scraper")')();
      const gplay = gplayModule.default;
      
      const rawSearchResults = await gplay.search({
        term: params.query,
        num: Math.min(params.num || 50, 100), // Limit to prevent excessive requests
        lang: params.lang || 'en',
        country: params.country || 'us',
        fullDetail: params.fullDetail || false
      });

      // Return complete raw response from google-play-scraper
      return rawSearchResults;
    } catch (error) {
      const query = params && typeof params === 'object' ? params.query : 'unknown';
      return this.handleError(error, query);
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

    if (!params.query || typeof params.query !== 'string' || params.query.trim().length === 0) {
      throw new Error('query is required and must be a string');
    }

    if (params.query.trim().length < 2) {
      throw new Error('query must be at least 2 characters long');
    }

    if (params.num !== undefined) {
      if (typeof params.num !== 'number' || !Number.isInteger(params.num) || params.num < 1 || params.num > 100) {
        throw new Error('num must be an integer between 1 and 100');
      }
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.fullDetail !== undefined && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, query: string): any {

    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('query is required') ||
      error.message.includes('Parameters must be an object') ||
      error.message.includes('query must be at least') ||
      error.message.includes('num must be') ||
      error.message.includes('lang must be') ||
      error.message.includes('country must be') ||
      error.message.includes('fullDetail must be')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          query
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while searching apps',
        query,
        details: error.message || 'Unknown error'
      }
    };
  }
}