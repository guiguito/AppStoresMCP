/**
 * Google Play Store Similar MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { omitFields, PLAY_SUMMARY_OMIT } from '../utils/response-filter';
import { country, googlePlayAppId, lang, playFullDetail } from './common';

interface GooglePlaySimilarParams {
  appId: string;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

export class GooglePlaySimilarTool implements MCPTool {
  public readonly name = 'google-play-similar';
  public readonly description = 'Get similar apps from Google Play Store based on an app ID';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      lang: lang('en'),
      country,
      fullDetail: playFullDetail
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: GooglePlaySimilarParams): Promise<unknown> {
    const results = await gplay.similar({
      appId: params.appId,
      lang: params.lang || 'en',
      country: params.country || 'us',
      fullDetail: params.fullDetail || false
    });
    return params.fullDetail ? results : omitFields(results, PLAY_SUMMARY_OMIT);
  }
}
