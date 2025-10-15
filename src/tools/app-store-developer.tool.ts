/**
 * Apple App Store Developer MCP Tool
 * Provides apps by developer functionality
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Apple App Store developer tool
 */
interface AppStoreDeveloperParams {
  devId: string;
  country?: string;
  lang?: string;
}

/**
 * Apple App Store Developer MCP Tool implementation
 */
export class AppStoreDeveloperTool implements MCPTool {
  public readonly name = 'app-store-developer';
  public readonly description = 'Get apps by developer from Apple App Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      devId: {
        type: 'string',
        description: 'The developer ID or name to search for'
      },
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      },
      lang: {
        type: 'string',
        description: 'Language code for localized content (default: en)',
        pattern: '^[a-z]{2}$',
        default: 'en'
      }
    },
    required: ['devId'],
    additionalProperties: false
  };

  constructor() {
    // No dependencies needed - calling app-store-scraper-ts directly
  }

  /**
   * Execute the Apple App Store developer tool
   */
  async execute(params: AppStoreDeveloperParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw developer data directly from app-store-scraper-ts
    const store = await import('app-store-scraper-ts');
    
    const developerParams: any = {
      devId: params.devId,
      country: params.country || 'us',
      lang: params.lang || 'en'
    };

    const rawDeveloperData = await store.developer(developerParams);

    // Return complete raw response from app-store-scraper
    return rawDeveloperData;
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }
  }
}