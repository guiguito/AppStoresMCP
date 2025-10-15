/**
 * Unit tests for Google Play Developer MCP Tool
 */

import { GooglePlayDeveloperTool } from '../../src/tools/google-play-developer.tool';
import { mockDeveloper } from '../__mocks__/google-play-scraper-ts';

describe('GooglePlayDeveloperTool', () => {
  let tool: GooglePlayDeveloperTool;

  beforeEach(() => {
    tool = new GooglePlayDeveloperTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-developer');
      expect(tool.description).toBe('Get apps by developer from Google Play Store');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    });

    it('should have correct schema properties', () => {
      const properties = tool.inputSchema.properties!;
      
      expect(properties.devId).toBeDefined();
      expect(properties.lang).toBeDefined();
      expect(properties.country).toBeDefined();
      expect(properties.num).toBeDefined();
      expect(properties.fullDetail).toBeDefined();
    });

    it('should require devId parameter', () => {
      expect(tool.inputSchema.required).toContain('devId');
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const mockDeveloperData = [
        { appId: 'com.example.app1', title: 'Test App 1', developer: 'Test Developer' },
        { appId: 'com.example.app2', title: 'Test App 2', developer: 'Test Developer' }
      ];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      const result = await tool.execute({
        devId: 'Test Developer',
        num: 10,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });

      expect(result).toEqual(mockDeveloperData);
      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test Developer',
        num: 10,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App', developer: 'Test Dev' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      const result = await tool.execute({ devId: 'Test Dev' });

      expect(result).toEqual(mockDeveloperData);
      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test Dev',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should reject missing devId parameter', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('devId is required');
    });

    it('should reject empty devId parameter', async () => {
      const result = await tool.execute({ devId: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('devId is required and must be a non-empty string');
    });

    it('should reject invalid devId parameter type', async () => {
      const result = await tool.execute({ devId: 123 as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('devId is required and must be a non-empty string');
    });

    it('should reject invalid num parameter', async () => {
      const result = await tool.execute({ devId: 'Test Dev', num: 150 });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be a number between 1 and 100');
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({ devId: 'Test Dev', lang: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country parameter', async () => {
      const result = await tool.execute({ devId: 'Test Dev', country: 'USA' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });

    it('should reject invalid fullDetail parameter', async () => {
      const result = await tool.execute({ devId: 'Test Dev', fullDetail: 'true' as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('fullDetail must be a boolean');
    });

    it('should reject non-object parameters', async () => {
      const result = await tool.execute('invalid' as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('Parameters must be an object');
    });
  });

  describe('Developer ID Handling', () => {
    it('should handle developer ID with spaces', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: 'Google LLC' });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Google LLC',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should handle developer ID with special characters', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: 'Test & Co.' });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test & Co.',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should trim whitespace from devId', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: '  Test Developer  ' });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: '  Test Developer  ',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockDeveloper.mockRejectedValue(error);

      const result = await tool.execute({ devId: 'Test Developer' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle validation errors', async () => {
      const result = await tool.execute({ devId: 'Test Dev', num: -1 });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.code).toBe('INVALID_PARAMS');
    });

    it('should include params in error response', async () => {
      const params = { devId: 'Test Dev', num: -1 };
      const result = await tool.execute(params);

      expect(result.error.params).toEqual(params);
    });
  });

  describe('Raw Data Preservation', () => {
    it('should return complete raw response from google-play-scraper', async () => {
      const mockRawData = {
        apps: [
          {
            appId: 'com.example.app1',
            title: 'Test App 1',
            developer: 'Test Developer',
            score: 4.5,
            reviews: 1000,
            icon: 'https://example.com/icon1.png',
            url: 'https://play.google.com/store/apps/details?id=com.example.app1',
            additionalField: 'should be preserved',
            nestedObject: {
              someProperty: 'should also be preserved'
            }
          }
        ],
        developer: {
          name: 'Test Developer',
          email: 'test@example.com',
          website: 'https://example.com',
          additionalDeveloperInfo: 'should be preserved'
        },
        metadata: {
          totalResults: 1,
          nextPageToken: 'token123'
        }
      };

      mockDeveloper.mockResolvedValue(mockRawData);

      const result = await tool.execute({ devId: 'Test Developer' });

      expect(result).toEqual(mockRawData);
      expect(result.apps[0].additionalField).toBe('should be preserved');
      expect(result.apps[0].nestedObject.someProperty).toBe('should also be preserved');
      expect(result.developer.additionalDeveloperInfo).toBe('should be preserved');
      expect(result.metadata).toBeDefined();
    });

    it('should preserve all fields from developer response', async () => {
      const mockRawData = [
        {
          appId: 'com.example.app1',
          title: 'Test App 1',
          developer: 'Test Developer',
          score: 4.5,
          reviews: 1000,
          icon: 'https://example.com/icon1.png',
          url: 'https://play.google.com/store/apps/details?id=com.example.app1',
          genre: 'Productivity',
          genreId: 'PRODUCTIVITY',
          free: true,
          price: '$0',
          currency: 'USD',
          priceText: 'Free',
          summary: 'A test app',
          installs: '1,000+',
          minInstalls: 1000,
          maxInstalls: 5000,
          size: '10M',
          androidVersion: '4.1',
          androidVersionText: '4.1 and up',
          contentRating: 'Everyone',
          contentRatingDescription: 'No objectionable content',
          adSupported: false,
          inAppPurchases: false,
          editorsChoice: false,
          screenshots: ['https://example.com/screenshot1.png'],
          video: 'https://example.com/video.mp4',
          videoImage: 'https://example.com/video-thumb.png',
          description: 'Full app description',
          descriptionHTML: '<p>Full app description</p>',
          recentChanges: 'Bug fixes',
          released: 'Jan 1, 2023',
          updated: 1672531200000,
          version: '1.0.0',
          offersIAP: false,
          IAPRange: undefined,
          histogram: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 50 },
          customField: 'should be preserved'
        }
      ];

      mockDeveloper.mockResolvedValue(mockRawData);

      const result = await tool.execute({ devId: 'Test Developer' });

      expect(result).toEqual(mockRawData);
      expect(result[0].customField).toBe('should be preserved');
      expect(result[0].histogram).toBeDefined();
      expect(result[0].screenshots).toBeDefined();
      expect(result[0].descriptionHTML).toBeDefined();
    });
  });

  describe('Localization Support', () => {
    it('should handle different language codes', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: 'Test Developer', lang: 'es' });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test Developer',
        num: 50,
        lang: 'es',
        country: 'us',
        fullDetail: false
      });
    });

    it('should handle different country codes', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: 'Test Developer', country: 'gb' });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test Developer',
        num: 50,
        lang: 'en',
        country: 'gb',
        fullDetail: false
      });
    });
  });

  describe('Full Detail Support', () => {
    it('should handle fullDetail parameter', async () => {
      const mockDeveloperData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockDeveloper.mockResolvedValue(mockDeveloperData);

      await tool.execute({ devId: 'Test Developer', fullDetail: true });

      expect(mockDeveloper).toHaveBeenCalledWith({
        devId: 'Test Developer',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: true
      });
    });
  });
});