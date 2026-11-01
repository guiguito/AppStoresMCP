/**
 * Google Play Store Categories MCP Tool
 */

import gplay from 'google-play-scraper-ts';
import { JSONSchema7 } from 'json-schema';
import { MCPTool } from '../types/mcp';

export class GooglePlayCategoriesTool implements MCPTool {
  public readonly name = 'google-play-categories';
  public readonly description = 'Get available categories from Google Play Store';

  public readonly inputSchema: JSONSchema7 = {
    type: 'object',
    properties: {},
    additionalProperties: false
  };

  async execute(): Promise<unknown> {
    return gplay.categories();
  }
}
