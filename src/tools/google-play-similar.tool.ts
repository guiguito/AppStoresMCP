/**
 * Google Play Store Similar MCP Tool
 * Provides similar apps from Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play similar tool
 */
interface GooglePlaySimilarParams {
  appId: string;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

/**
 * Google Play Similar MCP Tool implementation
 */
export class GooglePlaySimilarTool implements MCPTool {
  public readonly name = 'google-play-similar';
  public readonly description = 'Get similar apps from Google Play Store based on an app ID';

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
      country: {
        type: 'string',
        description: 'Country code for region-specific content (default: us)',
        pattern: '^[a-z]{2}$',
        default: 'us'
      },
      fullDetail: {
        type: 'boolean',
        description: 'Whether to return full app details (default: false)',
        default: false
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  /**
   * Execute the Google Play similar tool
   */
  async execute(params: GooglePlaySimilarParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw similar data directly from google-play-scraper
      const gplayModule = await import('google-play-scraper');
      const gplay = gplayModule.default;
      
      const similarOptions = {
        appId: params.appId,
        lang: params.lang || 'en',
        country: params.country || 'us',
        fullDetail: params.fullDetail || false
      };

      const rawSimilarData = await gplay.similar(similarOptions);

      // Return complete raw response from google-play-scraper
      return rawSimilarData;
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

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
    }

    if (params.fullDetail && typeof params.fullDetail !== 'boolean') {
      throw new Error('fullDetail must be a boolean');
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
      error.message.includes('country must be a valid') ||
      error.message.includes('fullDetail must be a boolean')
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
        message: 'An unexpected error occurred while fetching similar apps',
        appId,
        details: error.message || 'Unknown error'
      }
    };
  }
}