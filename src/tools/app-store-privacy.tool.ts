/**
 * Apple App Store Privacy MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { appStoreNumericId, country } from './common';

interface AppStorePrivacyParams {
  id: string;
  country?: string;
}

export class AppStorePrivacyTool implements MCPTool {
  public readonly name = 'app-store-privacy';
  public readonly description = 'Get privacy information for an Apple App Store app';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      id: appStoreNumericId,
      country
    },
    required: ['id'],
    additionalProperties: false
  };

  async execute(params: AppStorePrivacyParams): Promise<any> {
    return store.privacy({ id: params.id, country: params.country || 'us' });
  }
}
