/**
 * Apple App Store App Details MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { appStoreAppId, appStoreIdOption, country, lang, subtitle } from './common';

interface AppStoreAppDetailsParams {
  appId: string;
  country?: string;
  lang?: string;
  subtitle?: boolean;
  ratings?: boolean;
  inAppPurchases?: boolean;
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
      },
      inAppPurchases: {
        type: 'boolean',
        description: 'Also return the app\'s top in-app purchases (up to 10, as on its App Store page) in `inAppPurchases`: title, numeric price, currency, formattedPrice, subscription and subscriptionPeriod (ISO 8601, e.g. P1M), priced in the `country` storefront. One extra request; the call fails if it fails (default: false).',
        default: false
      },
      subtitle
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: AppStoreAppDetailsParams): Promise<unknown> {
    return store.app({
      ...appStoreIdOption(params.appId),
      country: params.country || 'us',
      ...(params.lang ? { lang: params.lang } : {}),
      ...(params.subtitle ? { subtitle: true } : {}),
      ...(params.inAppPurchases ? { inAppPurchases: true } : {}),
      ...(params.ratings ? { ratings: true } : {})
    });
  }
}
