/**
 * Google Play Store App Details MCP Tool
 * Provides detailed information about Google Play Store apps
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

/**
 * Input parameters for Google Play app details tool
 */
interface GooglePlayAppDetailsParams {
  appId: string;
  lang?: string;
  country?: string;
}

/**
 * Google Play App Details MCP Tool implementation
 */
export class GooglePlayAppDetailsTool implements MCPTool {
  public readonly name = 'google-play-app-details';
  public readonly description = 'Get detailed information about a Google Play Store app including title, description, ratings, developer info, and metadata';

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
      }
    },
    required: ['appId'],
    additionalProperties: false
  };

  constructor() {
    // No longer using scraper service - calling google-play-scraper directly
  }

  /**
   * Execute the Google Play app details tool
   */
  async execute(params: GooglePlayAppDetailsParams): Promise<any> {
    try {
      // Validate input parameters
      this.validateParams(params);

      // Fetch raw app details directly from google-play-scraper
      const gplayModule = await import('google-play-scraper');
      const gplay = gplayModule.default;
      
      const rawAppDetails = await gplay.app({
        appId: params.appId,
        lang: params.lang || 'en',
        country: params.country || 'us'
      });

      // Return complete raw response from google-play-scraper
      return rawAppDetails;
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
      throw new Error('appId is required and must be a string');
    }

    if (params.lang && (typeof params.lang !== 'string' || !/^[a-z]{2}$/.test(params.lang))) {
      throw new Error('lang must be a valid 2-letter language code');
    }

    if (params.country && (typeof params.country !== 'string' || !/^[a-z]{2}$/.test(params.country))) {
      throw new Error('country must be a valid 2-letter country code');
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
      error.message.includes('Parameters must be an object') ||
      error.message.includes('lang must be a valid') ||
      error.message.includes('country must be a valid')
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
        message: 'An unexpected error occurred while fetching app details',
        appId,
        details: error.message || 'Unknown error'
      }
    };
  }
}