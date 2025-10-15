/**
 * Google Play Store Categories MCP Tool
 * Provides available categories from Google Play Store
 */

import { MCPTool } from '../types/mcp';
import { JSONSchema7 } from 'json-schema';

import gplay from 'google-play-scraper-ts';

/**
 * Google Play Categories MCP Tool implementation
 */
export class GooglePlayCategoriesTool implements MCPTool {
  public readonly name = 'google-play-categories';
  public readonly description = 'Get available categories from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };

  /**
   * Execute the Google Play categories tool
   */
  async execute(): Promise<any> {
    try {
      // Fetch raw categories data directly from google-play-scraper
      const rawCategoriesData = await gplay.categories();

      // Return complete raw response from google-play-scraper
      return rawCategoriesData;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  private handleError(error: any): any {
    return {
      success: false,
      error: {
        type: 'internal_error',
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while fetching categories',
        details: error.message || 'Unknown error'
      }
    };
  }
}