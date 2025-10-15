/**
 * Unit tests for Google Play Search MCP Tool
 */

import { GooglePlaySearchTool } from '../../src/tools/google-play-search.tool';

// Use manual mock from __mocks__/google-play-scraper.js
jest.mock('google-play-scraper');
const mockGooglePlayScraper = require('google-play-scraper');

describe('GooglePlaySearchTool', () => {
  let tool: GooglePlaySearchTool;

  // Mock raw response from google-play-scraper
  const mockRawSearchResults = [
    {
      appId: 'com.example.app1',
      title: 'Test App 1',
      developer: 'Test Developer 1',
      score: 4.5,
      free: true,
      price: '$0',
      icon: 'https://example.com/icon1.jpg',
      url: 'https://play.google.com/store/apps/details?id=com.example.app1',
      genre: 'Productivity',
      installs: '1,000+'
    },
    {
      appId: 'com.example.app2',
      title: 'Test App 2',
      developer: 'Test Developer 2',
      score: 4.0,
      free: false,
      price: '$2.99',
      icon: 'https://example.com/icon2.jpg',
      url: 'https://play.google.com/store/apps/details?id=com.example.app2',
      genre: 'Games',
      installs: '10,000+'
    }
  ];

  beforeEach(() => {
    tool = new GooglePlaySearchTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('google-play-search');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('Search for apps');
      expect(tool.description).toContain('Google Play Store');
      expect(tool.description).toContain('result count');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toContain('query');
    });

    it('should validate query minLength in schema', () => {
      const queryProperty = tool.inputSchema.properties?.query as any;
      expect(queryProperty.minLength).toBe(2);
      expect(queryProperty.type).toBe('string');
    });

    it('should have num parameter with proper constraints', () => {
      const numProperty = tool.inputSchema.properties?.num as any;
      expect(numProperty.type).toBe('integer');
      expect(numProperty.minimum).toBe(1);
      expect(numProperty.maximum).toBe(100);
    });

    it('should have lang and country parameters with pattern validation', () => {
      const langProperty = tool.inputSchema.properties?.lang as any;
      const countryProperty = tool.inputSchema.properties?.country as any;
      
      expect(langProperty.pattern).toBe('^[a-z]{2}$');
      expect(countryProperty.pattern).toBe('^[a-z]{2}$');
    });

    it('should have fullDetail parameter as boolean', () => {
      const fullDetailProperty = tool.inputSchema.properties?.fullDetail as any;
      expect(fullDetailProperty.type).toBe('boolean');
    });
  });

  describe('Parameter Validation', () => {
    it('should execute successfully with valid query only', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      expect(result).toEqual(mockRawSearchResults);
      expect(mockGooglePlayScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should execute successfully with all parameters', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({
        query: 'productivity',
        num: 25,
        lang: 'es',
        country: 'mx',
        fullDetail: true
      });

      expect(result).toEqual(mockRawSearchResults);
      expect(mockGooglePlayScraper.search).toHaveBeenCalledWith({
        term: 'productivity',
        num: 25,
        lang: 'es',
        country: 'mx',
        fullDetail: true
      });
    });

    it('should reject missing query', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('query is required');
    });

    it('should reject null parameters', async () => {
      const result = await tool.execute(null as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('Parameters must be an object');
    });

    it('should reject invalid query type', async () => {
      const result = await tool.execute({ query: 123 } as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('query is required and must be a string');
    });

    it('should reject empty query', async () => {
      const result = await tool.execute({ query: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('query is required');
    });

    it('should reject query that is too short', async () => {
      const result = await tool.execute({ query: 'a' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('query must be at least 2 characters long');
    });

    it('should reject whitespace-only query', async () => {
      const result = await tool.execute({ query: '   ' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('query is required');
    });

    it('should reject invalid num parameter', async () => {
      const result = await tool.execute({
        query: 'test app',
        num: 150
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 100');
    });

    it('should reject negative num parameter', async () => {
      const result = await tool.execute({
        query: 'test app',
        num: -1
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 100');
    });

    it('should reject non-integer num parameter', async () => {
      const result = await tool.execute({
        query: 'test app',
        num: 10.5
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 100');
    });

    it('should reject invalid language code', async () => {
      const result = await tool.execute({
        query: 'test app',
        lang: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country code', async () => {
      const result = await tool.execute({
        query: 'test app',
        country: 'USA'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });

    it('should reject invalid fullDetail parameter', async () => {
      const result = await tool.execute({
        query: 'test app',
        fullDetail: 'yes' as any
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('fullDetail must be a boolean');
    });
  });

  describe('Google Play Scraper Integration', () => {
    it('should call google-play-scraper with correct parameters', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      await tool.execute({ query: 'test app' });

      expect(mockGooglePlayScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should call google-play-scraper with all parameters', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      await tool.execute({
        query: 'productivity',
        num: 25,
        lang: 'fr',
        country: 'ca',
        fullDetail: true
      });

      expect(mockGooglePlayScraper.search).toHaveBeenCalledWith({
        term: 'productivity',
        num: 25,
        lang: 'fr',
        country: 'ca',
        fullDetail: true
      });
    });

    it('should handle google-play-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockGooglePlayScraper.search.mockRejectedValue(scraperError);

      const result = await tool.execute({ query: 'test app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockGooglePlayScraper.search.mockRejectedValue(unexpectedError);

      const result = await tool.execute({ query: 'test app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return raw google-play-scraper response', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      // Should return the complete raw response from google-play-scraper
      expect(result).toEqual(mockRawSearchResults);
      expect(result).toHaveLength(2);
      expect(result[0].appId).toBe('com.example.app1');
      expect(result[0].score).toBe(4.5);
      expect(result[0].installs).toBe('1,000+');
      expect(result[1].genre).toBe('Games');
    });

    it('should preserve all fields from raw response', async () => {
      const extendedRawResponse = [
        {
          ...mockRawSearchResults[0],
          additionalField: 'additional value',
          nestedObject: { key: 'value' }
        }
      ];
      
      mockGooglePlayScraper.search.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ query: 'test app' });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result[0].additionalField).toBe('additional value');
      expect(result[0].nestedObject).toEqual({ key: 'value' });
    });

    it('should return properly formatted error response', async () => {
      const result = await tool.execute({ query: '' });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('type');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid query length', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'ab' });

      expect(result).toEqual(mockRawSearchResults);
    });

    it('should handle valid language codes', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const validLangCodes = ['en', 'es', 'fr', 'de', 'ja', 'ko'];
      
      for (const lang of validLangCodes) {
        const result = await tool.execute({
          query: 'test app',
          lang
        });
        expect(result).toEqual(mockRawSearchResults);
      }
    });

    it('should handle valid country codes', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const validCountryCodes = ['us', 'mx', 'ca', 'gb', 'de', 'jp'];
      
      for (const country of validCountryCodes) {
        const result = await tool.execute({
          query: 'test app',
          country
        });
        expect(result).toEqual(mockRawSearchResults);
      }
    });

    it('should handle boundary values for num parameter', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      // Test minimum value
      const result1 = await tool.execute({
        query: 'test app',
        num: 1
      });
      expect(result1).toEqual(mockRawSearchResults);

      // Test maximum value
      const result2 = await tool.execute({
        query: 'test app',
        num: 100
      });
      expect(result2).toEqual(mockRawSearchResults);
    });

    it('should handle boolean fullDetail values', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      // Test true
      const result1 = await tool.execute({
        query: 'test app',
        fullDetail: true
      });
      expect(result1).toEqual(mockRawSearchResults);

      // Test false
      const result2 = await tool.execute({
        query: 'test app',
        fullDetail: false
      });
      expect(result2).toEqual(mockRawSearchResults);
    });

    it('should handle empty search results', async () => {
      const emptyResults: any[] = [];
      mockGooglePlayScraper.search.mockResolvedValue(emptyResults);

      const result = await tool.execute({ query: 'nonexistent app' });

      expect(result).toEqual(emptyResults);
      expect(result).toHaveLength(0);
    });

    it('should handle queries with special characters', async () => {
      mockGooglePlayScraper.search.mockResolvedValue(mockRawSearchResults);

      const specialQueries = ['app & game', 'app-name', 'app.name', 'app_name'];
      
      for (const query of specialQueries) {
        const result = await tool.execute({ query });
        expect(result).toEqual(mockRawSearchResults);
      }
    });
  });
});