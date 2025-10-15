/**
 * Unit tests for Google Play Similar MCP Tool
 */

import { GooglePlaySimilarTool } from '../../src/tools/google-play-similar.tool';

// Use manual mock from __mocks__/google-play-scraper.js
jest.mock('google-play-scraper');
const mockGplay = require('google-play-scraper');

describe('GooglePlaySimilarTool', () => {
  let tool: GooglePlaySimilarTool;

  beforeEach(() => {
    tool = new GooglePlaySimilarTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-similar');
      expect(tool.description).toBe('Get similar apps from Google Play Store based on an app ID');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['appId']);
    });

    it('should have correct schema properties', () => {
      const properties = tool.inputSchema.properties!;
      
      expect(properties.appId).toBeDefined();
      expect(properties.lang).toBeDefined();
      expect(properties.country).toBeDefined();
      expect(properties.fullDetail).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const mockSimilarData = [
        { appId: 'com.similar.app1', title: 'Similar App 1', developer: 'Developer 1' },
        { appId: 'com.similar.app2', title: 'Similar App 2', developer: 'Developer 2' }
      ];
      mockGplay.similar.mockResolvedValue(mockSimilarData);

      const result = await tool.execute({
        appId: 'com.example.app',
        lang: 'en',
        country: 'us',
        fullDetail: false
      });

      expect(result).toEqual(mockSimilarData);
      expect(mockGplay.similar).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockSimilarData = [{ appId: 'com.similar.app', title: 'Similar App' }];
      mockGplay.similar.mockResolvedValue(mockSimilarData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockSimilarData);
      expect(mockGplay.similar).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should require appId parameter', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required');
    });

    it('should reject empty appId', async () => {
      const result = await tool.execute({ appId: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required and must be a non-empty string');
    });

    it('should reject invalid appId format', async () => {
      const result = await tool.execute({ appId: 'invalid-app-id' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId must be a valid package name format');
    });

    it('should accept valid package name formats', async () => {
      const mockSimilarData = [{ appId: 'com.similar.app', title: 'Similar App' }];
      mockGplay.similar.mockResolvedValue(mockSimilarData);

      const validAppIds = [
        'com.example.app',
        'com.company.product.app',
        'org.apache.commons.lang3',
        'io.github.user.project'
      ];

      for (const appId of validAppIds) {
        mockGplay.similar.mockClear();
        const result = await tool.execute({ appId });
        expect(result).toEqual(mockSimilarData);
      }
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', lang: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', country: 'USA' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });

    it('should reject invalid fullDetail parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', fullDetail: 'true' as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('fullDetail must be a boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle app not found errors', async () => {
      const error = new Error('App not found');
      mockGplay.similar.mockRejectedValue(error);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.message).toContain('com.nonexistent.app');
    });

    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockGplay.similar.mockRejectedValue(error);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle validation errors', async () => {
      const result = await tool.execute({ appId: 'invalid-format' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('Raw Data Preservation', () => {
    it('should return complete raw response from google-play-scraper', async () => {
      const mockRawData = [
        {
          appId: 'com.similar.app1',
          title: 'Similar App 1',
          developer: 'Developer 1',
          score: 4.5,
          reviews: 1000,
          icon: 'https://example.com/icon1.png',
          url: 'https://play.google.com/store/apps/details?id=com.similar.app1',
          additionalField: 'should be preserved',
          nestedObject: {
            someProperty: 'should also be preserved'
          }
        },
        {
          appId: 'com.similar.app2',
          title: 'Similar App 2',
          developer: 'Developer 2',
          score: 4.2,
          reviews: 500,
          icon: 'https://example.com/icon2.png',
          url: 'https://play.google.com/store/apps/details?id=com.similar.app2',
          anotherField: 'also preserved'
        }
      ];

      mockGplay.similar.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(result[0].additionalField).toBe('should be preserved');
      expect(result[0].nestedObject.someProperty).toBe('should also be preserved');
      expect(result[1].anotherField).toBe('also preserved');
    });
  });
});