/**
 * Apple App Store App Details MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { appStoreAppId, appStoreIdOption, country, lang } from './common';

interface AppStoreAppDetailsParams {
  appId: string;
  country?: string;
  lang?: string;
  ratings?: boolean;
}

export class AppStoreAppDetailsTool implements MCPTool {
  public readonly name = 'app-store-app-details';
  public readonly description = 'Get detailed information about an Apple App Store app including title, description, ratings, developer info, and metadata';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: appStoreAppId,
      country,
      lang: lang(),
      ratings: {
        type: 'boolean',
        description: 'Also fetch the ratings histogram and merge `ratings`/`histogram` into the result (one extra request, default: false)',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: AppStoreAppDetailsParams): Promise<any> {
    return store.app({
      ...appStoreIdOption(params.appId),
      country: params.country || 'us',
      ...(params.lang ? { lang: params.lang } : {}),
      ...(params.ratings ? { ratings: true } : {})
    });
  }
}
