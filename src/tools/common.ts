/**
 * Schema fragments shared by the MCP tools. Validation happens once in mcp-handler
 * (validateToolParams) before execute(), so tools only map params to library options.
 */

import { JSONSchema7 } from 'json-schema';

/** Language code; pass a default only where the tool applies one itself. */
export const lang = (defaultValue?: string): JSONSchema7 => ({
  type: 'string',
  description: `Language code, e.g. "en", "pt-BR" or "en_us"${defaultValue ? ` (default: ${defaultValue})` : ''}`,
  pattern: '^[a-z]{2}([-_][A-Za-z]{2})?$',
  ...(defaultValue ? { default: defaultValue } : {})
});

export const country: JSONSchema7 = {
  type: 'string',
  description: 'Two-letter country code (default: us)',
  pattern: '^[a-z]{2}$',
  default: 'us'
};

export const fullDetail: JSONSchema7 = {
  type: 'boolean',
  description: 'Whether to return full app details (default: false)',
  default: false
};

export const googlePlayAppId: JSONSchema7 = {
  type: 'string',
  description: 'The Google Play Store app ID (package name, e.g., com.example.app)',
  pattern: '^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+$'
};

export const appStoreNumericId: JSONSchema7 = {
  type: 'string',
  description: 'The Apple App Store numeric app ID (e.g., 553834731)',
  pattern: '^\\d+$'
};

export const appStoreAppId: JSONSchema7 = {
  type: 'string',
  description: 'The Apple App Store app: numeric track ID (e.g., 553834731) or bundle ID (e.g., com.midasplayer.apps.candycrushsaga)',
  pattern: '^(\\d+|[A-Za-z][A-Za-z0-9_-]*(\\.[A-Za-z0-9_-]+)+)$'
};

/** Numeric App Store ids go to the library as `id`, bundle ids as `appId`. */
export function appStoreIdOption(appId: string): { id: string } | { appId: string } {
  return /^\d+$/.test(appId) ? { id: appId } : { appId };
}
