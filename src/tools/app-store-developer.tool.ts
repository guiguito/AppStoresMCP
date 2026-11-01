/**
 * Apple App Store Developer MCP Tool
 */

import * as store from 'app-store-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { country, lang } from './common';

interface AppStoreDeveloperParams {
  devId: string;
  country?: string;
  lang?: string;
}

export class AppStoreDeveloperTool implements MCPTool {
  public readonly name = 'app-store-developer';
  public readonly description = 'Get apps by a developer from Apple App Store, using the numeric developer (artist) ID';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      devId: {
        type: 'string',
        description: 'Numeric App Store developer (artist) ID, e.g. 284882218 (the `developerId` field of app results). Names are not supported.',
        pattern: '^\\d+$'
      },
      country,
      lang: lang('en')
    },
    required: ['devId'],
    additionalProperties: false
  };

  async execute(params: AppStoreDeveloperParams): Promise<any> {
    return store.developer({
      devId: params.devId,
      country: params.country || 'us',
      lang: params.lang || 'en'
    });
  }
}
