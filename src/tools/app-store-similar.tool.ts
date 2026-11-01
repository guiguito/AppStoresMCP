/**
 * Apple App Store Similar MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { appStoreAppId, appStoreIdOption, country, lang, subtitle } from './common';

interface AppStoreSimilarParams {
  appId: string;
  country?: string;
  lang?: string;
  subtitle?: boolean;
}

export class AppStoreSimilarTool implements MCPTool {
  public readonly name = 'app-store-similar';
  public readonly description = 'Get similar apps from Apple App Store based on an app ID';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: appStoreAppId,
      country,
      lang: lang(),
      subtitle
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: AppStoreSimilarParams): Promise<unknown> {
    return store.similar({
      ...appStoreIdOption(params.appId),
      country: params.country || 'us',
      ...(params.lang ? { lang: params.lang } : {}),
      ...(params.subtitle ? { subtitle: true } : {})
    });
  }
}
