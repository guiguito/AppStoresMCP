/**
 * Google Play Store App Details MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, googlePlayAppId, lang } from './common';

interface GooglePlayAppDetailsParams {
  appId: string;
  lang?: string;
  country?: string;
}

export class GooglePlayAppDetailsTool implements MCPTool {
  public readonly name = 'google-play-app-details';
  public readonly description = 'Get detailed information about a Google Play Store app including title, description, ratings, developer info, and metadata';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      lang: lang('en'),
      country
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: GooglePlayAppDetailsParams): Promise<any> {
    return gplay.app({
      appId: params.appId,
      lang: params.lang || 'en',
      country: params.country || 'us'
    });
  }
}
