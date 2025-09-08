/**
 * Google Play Store Permissions MCP Tool
 * Provides app permissions information from Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play permissions tool
 */
interface GooglePlayPermissionsParams {
  appId: string;
  lang?: string;
  short?: boolean;
}

/**
 * Google Play Permissions MCP Tool implementation
 */
export class GooglePlayPermissionsTool implements MCPTool {
  public readonly name = 'google-play-permissions';
  public readonly description = 'Get app permissions information from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {
      appId: {
        type: 'string',
        description: 'The Google Play Store app ID (package name, e.g., com.example.app)',
        pattern: '^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$'
      },
      lang: {
        type: 'string',
        description: 'Language code for localized content (default: en)',
        pattern: '^[a-z]{2}$',
        default: 'en'
      },
      short: {
        type: 'boolean',
        description: 'Whether to return short permission names (default: false)',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  /**
   * Execute the Google Play permissions tool
   */
  async execute(params: GooglePlayPermissionsParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw permissions data directly from google-play-scraper
      const gplayModule = await import('google-play-scraper');
      const gplay = gplayModule.default;
      
      const permissionsOptions: any = {
        appId: params.appId,
        lang: params.lang || 'en',
        short: params.short || false
      };

      const rawPermissionsData = await gplay.permissions(permissionsOptions);

      // Return complete raw response from google-play-scraper
      return rawPermissionsData;
    } catch (error) {
      const appId = params && typeof params === 'object' ? params.appId : 'unknown';
      return this.handleError(error, appId);
    }
  }

  /**
   * Validate input parameters
   * @private
   */
  private validateParams(params: any): void {
    if (!params || typeof params !== 'object') {
      throw new Error('Parameters must be an object');
    }

    if (!params.appId || typeof params.appId !== 'string' || params.appId.trim().length === 0) {
      throw new Error('appId is required and must be a non-empty string');
    }

    // Basic validation for Google Play package name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(params.appId)) {
      throw new Error('appId must be a valid package name format');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.short !== undefined && typeof params.short !== 'boolean') {
      throw new Error('short must be a boolean value');
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any, appId: string): any {
    if (error.message && error.message.includes('not found')) {
      return {
        success: false,
        error: {
          type: 'not_found',
          code: 'APP_NOT_FOUND',
          message: `App with ID '${appId}' not found in Google Play Store`,
          appId
        }
      };
    }

    // Handle validation errors specifically
    if (error.message && (
      error.message.includes('appId is required') ||
      error.message.includes('appId must be a valid package name format') ||
      error.message.includes('Parameters must be an object') ||
      error.message.includes('lang must be a valid') ||
      error.message.includes('short must be a boolean')
    )) {
      return {
        success: false,
        error: {
          type: 'validation_error',
          code: 'INVALID_PARAMS',
          message: error.message,
          appId
        }
      };
    }

    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching app permissions information',
        appId,
        details: error.message || 'Unknown error'
      }
    };
  }
}