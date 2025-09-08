/**
 * Apple App Store App Details MCP Tool
 * Provides detailed information about Apple App Store apps
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Apple App Store app details tool
 */
interface AppStoreAppDetailsParams {
  appId: string;
  country?: string;
}

/**
 * Apple App Store App Details MCP Tool implementation
 */
export class AppStoreAppDetailsTool implements MCPTool {
  public readonly name = 'app-store-app-details';
  public readonly description = 'Get detailed information about an Apple App Store app including title, description, ratings, developer info, and metadata';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: {
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
    required: ['appId'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling app-store-scraper directly
  }

  /**
   * Execute the Apple App Store app details tool
   */
  async execute(params: AppStoreAppDetailsParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw app details directly from app-store-scraper
    const store = require('app-store-scraper');
    
    const rawAppDetails = await store.app({
      id: params.appId,
      country: params.country || 'us'
    });

    // Return complete raw response from app-store-scraper
    return rawAppDetails;
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }
  }


}