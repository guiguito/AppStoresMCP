/**
 * Apple App Store Similar MCP Tool
 * Provides similar apps from Apple App Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';
import { AppStoreScraperService } from '../services/app-store-scraper.service';

/**
 * Input parameters for Apple App Store similar tool
 */
interface AppStoreSimilarParams {
  id?: string;
  appId?: string;
  country?: string;
}

/**
 * Apple App Store Similar MCP Tool implementation
 */
export class AppStoreSimilarTool implements MCPTool {
  public readonly name = 'app-store-similar';
  public readonly description = 'Get similar apps from Apple App Store based on an app ID';

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
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
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
   * Execute the Apple App Store similar tool
   */
  async execute(params: AppStoreSimilarParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Use id parameter
    const appId = params.id;

    // Fetch raw similar data through AppStoreScraperService
    const options: { country?: string } = {};
    if (params.country) {
      options.country = params.country;
    }
    
    const rawSimilarData = await this.appStoreService.similar(appId!, options);

    // Return complete raw response from app-store-scraper
    return rawSimilarData;
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }
}