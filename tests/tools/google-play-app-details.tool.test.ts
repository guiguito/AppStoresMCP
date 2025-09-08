/**
 * Unit tests for Google Play App Details MCP Tool
 */

// Mock google-play-scraper module before importing anything else
const mockGooglePlayScraper = {
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  sort: {
    NEWEST: 1,
    RATING: 2,
    HELPFULNESS: 3
  }
};

jest.mock('google-play-scraper', () => mockGooglePlayScraper);

import { GooglePlayAppDetailsTool } from '../../src/tools/google-play-app-details.tool';

describe('GooglePlayAppDetailsTool', () => {
  let tool: GooglePlayAppDetailsTool;

  // Mock raw response from google-play-scraper
  const mockRawAppDetails = {
    appId: 'com.example.testapp',
    title: 'Test App',
    description: 'A test application for unit testing',
    developer: 'Test Developer',
    score: 4.5,
    reviews: 1000,
    version: '1.0.0',
    size: '10MB',
    genre: 'Productivity',
    free: true,
    price: '$0',
    screenshots: ['https://example.com/screenshot1.jpg'],
    icon: 'https://example.com/icon.jpg',
    url: 'https://play.google.com/store/apps/details?id=com.example.testapp',
    installs: '1,000+',
    updated: '2023-01-01',
    androidVersion: '5.0',
    contentRating: 'Everyone'
  };

  beforeEach(() => {
    tool = new GooglePlayAppDetailsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('google-play-app-details');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('Google Play Store app');
      expect(tool.description).toContain('detailed information');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toContain('appId');
    });

    it('should validate appId pattern in schema', () => {
      const appIdProperty = tool.inputSchema.properties?.appId as any;
      expect(appIdProperty.pattern).toBeDefined();
      expect(appIdProperty.type).toBe('string');
    });
  });

  describe('Parameter Validation', () => {
    it('should execute successfully with valid appId', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockGooglePlayScraper.app).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        lang: 'en',
        country: 'us'
      });
    });

    it('should execute successfully with valid appId and optional parameters', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        lang: 'es',
        country: 'mx'
      });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockGooglePlayScraper.app).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        lang: 'es',
        country: 'mx'
      });
    });

    it('should reject missing appId', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required');
    });

    it('should reject null parameters', async () => {
      const result = await tool.execute(null as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('Parameters must be an object');
    });

    it('should reject invalid appId type', async () => {
      const result = await tool.execute({ appId: 123 } as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required and must be a string');
    });

    it('should reject invalid language code', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        lang: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country code', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        country: 'USA'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });
  });

  describe('Google Play Scraper Integration', () => {
    it('should call google-play-scraper with correct parameters', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      await tool.execute({ appId: 'com.example.testapp' });

      expect(mockGooglePlayScraper.app).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        lang: 'en',
        country: 'us'
      });
    });

    it('should handle google-play-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockGooglePlayScraper.app.mockRejectedValue(scraperError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle app not found errors', async () => {
      const notFoundError = new Error('App not found');
      mockGooglePlayScraper.app.mockRejectedValue(notFoundError);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.appId).toBe('com.nonexistent.app');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockGooglePlayScraper.app.mockRejectedValue(unexpectedError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return raw google-play-scraper response', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      // Should return the complete raw response from google-play-scraper
      expect(result).toEqual(mockRawAppDetails);
      expect(result.appId).toBe('com.example.testapp');
      expect(result.title).toBe('Test App');
      expect(result.score).toBe(4.5);
      expect(result.installs).toBe('1,000+');
      expect(result.contentRating).toBe('Everyone');
    });

    it('should preserve all fields from raw response', async () => {
      const extendedRawResponse = {
        ...mockRawAppDetails,
        additionalField: 'additional value',
        nestedObject: { key: 'value' },
        arrayField: [1, 2, 3]
      };
      
      mockGooglePlayScraper.app.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result.additionalField).toBe('additional value');
      expect(result.nestedObject).toEqual({ key: 'value' });
      expect(result.arrayField).toEqual([1, 2, 3]);
    });

    it('should return properly formatted error response', async () => {
      const result = await tool.execute({ appId: '' });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('type');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string appId', async () => {
      const result = await tool.execute({ appId: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required');
    });

    it('should handle whitespace-only appId', async () => {
      const result = await tool.execute({ appId: '   ' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required');
    });

    it('should handle valid language codes', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      const validLangCodes = ['en', 'es', 'fr', 'de', 'ja', 'ko'];
      
      for (const lang of validLangCodes) {
        const result = await tool.execute({
          appId: 'com.example.testapp',
          lang
        });
        expect(result).toEqual(mockRawAppDetails);
      }
    });

    it('should handle valid country codes', async () => {
      mockGooglePlayScraper.app.mockResolvedValue(mockRawAppDetails);

      const validCountryCodes = ['us', 'mx', 'ca', 'gb', 'de', 'jp'];
      
      for (const country of validCountryCodes) {
        const result = await tool.execute({
          appId: 'com.example.testapp',
          country
        });
        expect(result).toEqual(mockRawAppDetails);
      }
    });
  });
});