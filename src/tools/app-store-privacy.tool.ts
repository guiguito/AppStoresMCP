/**
 * Apple App Store Privacy MCP Tool
 * Provides privacy information for Apple App Store apps
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Apple App Store privacy tool
 */
interface AppStorePrivacyParams {
  id: string;
}

/**
 * Apple App Store Privacy MCP Tool implementation
 */
export class AppStorePrivacyTool implements MCPTool {
  public readonly name = 'app-store-privacy';
  public readonly description = 'Get privacy information for an Apple App Store app';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The Apple App Store app ID (numeric ID, e.g., 123456789)',
        pattern: '^\\d+$'
      }
    },
    required: ['id'],
    additionalProperties: false
  };

  constructor() {
    // No dependencies needed - calling app-store-scraper-ts directly
  }

  /**
   * Execute the Apple App Store privacy tool
   */
  async execute(params: AppStorePrivacyParams): Promise<any> {
    // Validate input parameters
    this.validateParams(params);

    // Fetch raw privacy data directly from app-store-scraper-ts
    const store = await import('app-store-scraper-ts');
    
    const rawPrivacyData = await store.privacy({
      id: params.id
    });

    // Return complete raw response from app-store-scraper-ts
    return rawPrivacyData;
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
  }
}