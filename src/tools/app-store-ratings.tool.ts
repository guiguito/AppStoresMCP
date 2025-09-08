/**
 * Apple App Store Ratings MCP Tool
 * Provides ratings breakdown from Apple App Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { AppStoreScraperService } from '../services/app-store-scraper.service';

/**
 * Input parameters for Apple App Store ratings tool
 */
interface AppStoreRatingsParams {
  id?: string;
  appId?: string;
  country?: string;
}

/**
 * Apple App Store Ratings MCP Tool implementation
 */
export class AppStoreRatingsTool implements MCPTool {
  public readonly name = 'app-store-ratings';
  public readonly description = 'Get ratings breakdown from Apple App Store based on an app ID';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The Apple App Store app ID (numeric ID, e.g., 123456789)',
        pattern: '^\\d+$'
      },

      country: {
        type: 'string',
        description: 'Country code for region-specific ratings (default: us)',
        pattern: '^[a-z]{2}$'
      }
    },
    required: ['id'],
    additionalProperties: false
  };

  private appStoreService: AppStoreScraperService;

  constructor() {
    this.appStoreService = new AppStoreScraperService();
  }

  /**
   * Execute the Apple App Store ratings tool
   */
  async execute(params: AppStoreRatingsParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Use id parameter
    const appId = params.id;

    // Prepare options
    const options: { country?: string } = {};
    if (params.country) {
      options.country = params.country;
    }

    // Fetch raw ratings data through AppStoreScraperService
    const rawRatingsData = await this.appStoreService.ratings(appId!, options);

    // Return complete raw response from app-store-scraper
    return rawRatingsData;
  }

  /**
   * Validate input parameters
   * @private
   */
  private validateParams(params: any): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    if (!params.id || typeof params.id !== 'string' || params.id.trim().length === 0) {
      throw new Error('id is required and must be a non-empty string');
    }

    if (!/^\d+$/.test(params.id.trim())) {
      throw new Error('id must be a numeric string for Apple App Store');
    }

    // Validate country parameter if provided
    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a two-letter lowercase country code');
    }
  }
}