/**
 * Google Play Store availability MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';
import { googlePlayAppId, lang } from './common';

interface GooglePlayAvailabilityParams {
  appId: string;
  countries: string[];
  lang?: string;
}

export class GooglePlayAvailabilityTool implements MCPTool {
  public readonly name = 'google-play-availability';
  public readonly description = 'Check in which countries a Google Play app is offered. Returns { "<country>": true|false } per requested country code. One request per country; an unknown or removed app is false everywhere.';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: googlePlayAppId,
      countries: {
        type: 'array',
        description: 'Two-letter country codes to check, e.g. ["us", "fr", "jp"] (1-50; each costs one request to Google Play)',
        items: { type: 'string', pattern: '^[a-zA-Z]{2}$' },
        minItems: 1,
        // ponytail: one Play request per country; 50 keeps a single call from tripping Google's captcha
        maxItems: 50
      },
      lang: lang('en')
    },
    required: ['appId', 'countries'],
    additionalProperties: false
  };

  async execute(params: GooglePlayAvailabilityParams): Promise<unknown> {
    return gplay.availability({ appId: params.appId, countries: params.countries, lang: params.lang || 'en' });
  }
}
