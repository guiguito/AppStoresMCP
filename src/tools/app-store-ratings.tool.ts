/**
 * Apple App Store Ratings MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { appStoreNumericId, country } from './common';

interface AppStoreRatingsParams {
  id: string;
  country?: string;
}

export class AppStoreRatingsTool implements MCPTool {
  public readonly name = 'app-store-ratings';
  public readonly description = 'Get the ratings histogram for an Apple App Store app (numeric app ID only)';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      id: appStoreNumericId,
      country
    },
    required: ['id'],
    additionalProperties: false
  };

  async execute(params: AppStoreRatingsParams): Promise<any> {
    return store.ratings({ id: params.id, country: params.country || 'us' });
  }
}
