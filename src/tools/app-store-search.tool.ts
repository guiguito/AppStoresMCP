/**
 * Apple App Store Search MCP Tool
 * Provides app search functionality for Apple App Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { filterAppData } from '../utils/response-filter';

/**
 * Input parameters for Apple App Store search tool
 */
interface AppStoreSearchParams {
  query: string;
  num?: number;
  country?: string;
}

/**
 * Apple App Store Search MCP Tool implementation
 */
export class AppStoreSearchTool implements MCPTool {
  public readonly name = 'app-store-search';
  public readonly description = 'Search for apps in Apple App Store. Returns up to 100 results per request (no pagination support).';

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
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      }
    },
    required: ['query'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling app-store-scraper directly
  }

  /**
   * Execute the Apple App Store search tool
   */
  async execute(params: AppStoreSearchParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw search results directly from app-store-scraper
    const store = require('app-store-scraper');
    
    const rawSearchResults = await store.search({
      term: params.query,
      num: Math.min(params.num || 50, 100), // Limit to prevent excessive requests
      country: params.country || 'us'
    });

    // Filter response to reduce token consumption for non-detailed results
    return filterAppData(rawSearchResults, false);
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }


}