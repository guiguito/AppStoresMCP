/**
 * Apple App Store Suggest MCP Tool
 * Provides search suggestions from Apple App Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { AppStoreScraperService } from '../services/app-store-scraper.service';

/**
 * Input parameters for Apple App Store suggest tool
 */
interface AppStoreSuggestParams {
  term: string;
  country?: string;
}

/**
 * Apple App Store Suggest MCP Tool implementation
 */
export class AppStoreSuggestTool implements MCPTool {
  public readonly name = 'app-store-suggest';
  public readonly description = 'Get search suggestions from Apple App Store based on a search term';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      term: {
        type: 'string',
        description: 'Search term to get suggestions for (minimum 2 characters)',
        minLength: 2
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

  private appStoreService: AppStoreScraperService;

  constructor() {
    this.appStoreService = new AppStoreScraperService();
  }

  /**
   * Execute the Apple App Store suggest tool
   */
  async execute(params: AppStoreSuggestParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw suggest data through AppStoreScraperService
    const options: { country?: string } = {};
    if (params.country) {
      options.country = params.country;
    }
    
    const rawSuggestData = await this.appStoreService.suggest(params.term, options);

    // Return complete raw response from app-store-scraper
    return rawSuggestData;
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }
}