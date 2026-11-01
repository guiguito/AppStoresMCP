/**
 * Google Play Store Permissions MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { googlePlayAppId, lang } from './common';

interface GooglePlayPermissionsParams {
  appId: string;
  lang?: string;
  short?: boolean;
}

export class GooglePlayPermissionsTool implements MCPTool {
  public readonly name = 'google-play-permissions';
  public readonly description = 'Get app permissions information from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      lang: lang('en'),
      short: {
        type: 'boolean',
        description: 'Whether to return short permission names (default: false)',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  async execute(params: GooglePlayPermissionsParams): Promise<unknown> {
    return gplay.permissions({
      appId: params.appId,
      lang: params.lang || 'en',
      short: params.short || false
    });
  }
}
