/**
 * Google Play Store Data Safety MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { googlePlayAppId, lang } from './common';

interface GooglePlayDataSafetyParams {
  appId: string;
  lang?: string;
}

export class GooglePlayDataSafetyTool implements MCPTool {
  public readonly name = 'google-play-datasafety';
  public readonly description = 'Get app data safety information from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      lang: lang('en')
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: GooglePlayDataSafetyParams): Promise<any> {
    return gplay.datasafety({ appId: params.appId, lang: params.lang || 'en' });
  }
}
