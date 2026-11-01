/**
 * Google Play Store Developer MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, fullDetail, lang } from './common';

interface GooglePlayDeveloperParams {
  devId: string;
  lang?: string;
  country?: string;
  num?: number;
  fullDetail?: boolean;
}

export class GooglePlayDeveloperTool implements MCPTool {
  public readonly name = 'google-play-developer';
  public readonly description = 'Get apps by developer from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      devId: {
        type: 'string',
        description: 'Developer ID: numeric ID or developer name/slug as shown in the Play Store URL',
        minLength: 1
      },
      lang: lang('en'),
      country,
      num: {
        type: 'integer',
        description: 'Maximum number of apps to return (default: 50, max: 100)',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      fullDetail
    },
    required: ['devId'],
    additionalProperties: false
  };

  async execute(params: GooglePlayDeveloperParams): Promise<unknown> {
    return gplay.developer({
      devId: params.devId,
      lang: params.lang || 'en',
      country: params.country || 'us',
      num: params.num || 50,
      fullDetail: params.fullDetail || false
    });
  }
}
