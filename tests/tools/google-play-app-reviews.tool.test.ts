/**
 * Unit tests for Google Play App Reviews MCP Tool
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

import { GooglePlayAppReviewsTool } from '../../src/tools/google-play-app-reviews.tool';

describe('GooglePlayAppReviewsTool', () => {
  let tool: GooglePlayAppReviewsTool;

  // Mock raw response from google-play-scraper
  const mockRawReviews = {
    data: [
      {
        id: 'review1',
        userName: 'User1',
        score: 5,
        title: 'Great app!',
        text: 'This app is amazing and works perfectly.',
        date: '2023-01-01',
        thumbsUp: 10,
        version: '1.0.0'
      },
      {
        id: 'review2',
        userName: 'User2',
        score: 4,
        text: 'Good app but could be better.',
        date: '2023-01-02',
        thumbsUp: 5,
        version: '1.0.0'
      }
    ],
    nextPaginationToken: 'next_page_token'
  };

  beforeEach(() => {
    tool = new GooglePlayAppReviewsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('google-play-app-reviews');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('Google Play Store app');
      expect(tool.description).toContain('reviews');
      expect(tool.description).toContain('pagination');
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

    it('should have num parameter with proper constraints', () => {
      const numProperty = tool.inputSchema.properties?.num as any;
      expect(numProperty.type).toBe('integer');
      expect(numProperty.minimum).toBe(1);
      expect(numProperty.maximum).toBe(150);
    });

    it('should have sort parameter with enum values', () => {
      const sortProperty = tool.inputSchema.properties?.sort as any;
      expect(sortProperty.enum).toEqual(['newest', 'rating', 'helpfulness']);
    });
  });

  describe('Parameter Validation', () => {
    it('should execute successfully with valid appId only', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result).toEqual(mockRawReviews);
      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: mockGooglePlayScraper.sort.NEWEST,
        lang: 'en',
        country: 'us'
      });
    });

    it('should execute successfully with all parameters', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        num: 50,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        sort: 'rating'
      });

      expect(result).toEqual(mockRawReviews);
      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 50,
        sort: mockGooglePlayScraper.sort.RATING,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us'
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

    it('should reject invalid num parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        num: 200
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 150');
    });

    it('should reject negative num parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        num: -1
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 150');
    });

    it('should reject non-integer num parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        num: 10.5
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be an integer between 1 and 150');
    });

    it('should reject invalid nextPaginationToken parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        nextPaginationToken: ''
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('nextPaginationToken must be a non-empty string');
    });

    it('should reject non-string nextPaginationToken parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        nextPaginationToken: 123 as any
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('nextPaginationToken must be a non-empty string');
    });

    it('should reject invalid sort parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        sort: 'invalid' as any
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('sort must be one of: newest, rating, helpfulness');
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        lang: 'ENG'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country parameter', async () => {
      const result = await tool.execute({
        appId: 'com.example.testapp',
        country: 'USA'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });

    it('should accept valid lang and country parameters', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        lang: 'fr',
        country: 'ca'
      });

      expect(result).toEqual(mockRawReviews);
      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: mockGooglePlayScraper.sort.NEWEST,
        lang: 'fr',
        country: 'ca'
      });
    });
  });

  describe('Google Play Scraper Integration', () => {
    it('should call google-play-scraper with correct parameters', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      await tool.execute({ appId: 'com.example.testapp' });

      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: mockGooglePlayScraper.sort.NEWEST,
        lang: 'en',
        country: 'us'
      });
    });

    it('should call google-play-scraper with all parameters', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      await tool.execute({
        appId: 'com.example.testapp',
        num: 50,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        sort: 'helpfulness'
      });

      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 50,
        sort: mockGooglePlayScraper.sort.HELPFULNESS,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us'
      });
    });

    it('should handle google-play-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockGooglePlayScraper.reviews.mockRejectedValue(scraperError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle app not found errors', async () => {
      const notFoundError = new Error('App not found');
      mockGooglePlayScraper.reviews.mockRejectedValue(notFoundError);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.appId).toBe('com.nonexistent.app');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockGooglePlayScraper.reviews.mockRejectedValue(unexpectedError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return raw google-play-scraper response', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      // Should return the complete raw response from google-play-scraper
      expect(result).toEqual(mockRawReviews);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('review1');
      expect(result.data[0].score).toBe(5);
      expect(result.nextPaginationToken).toBe('next_page_token');
    });

    it('should preserve all fields from raw response', async () => {
      const extendedRawResponse = {
        ...mockRawReviews,
        additionalField: 'additional value',
        metadata: { key: 'value' }
      };
      
      mockGooglePlayScraper.reviews.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result.additionalField).toBe('additional value');
      expect(result.metadata).toEqual({ key: 'value' });
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

    it('should handle valid sort options', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const validSortOptions = ['newest', 'rating', 'helpfulness'];
      
      for (const sort of validSortOptions) {
        const result = await tool.execute({
          appId: 'com.example.testapp',
          sort: sort as any
        });
        expect(result).toEqual(mockRawReviews);
      }
    });

    it('should handle boundary values for num parameter', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      // Test minimum value
      const result1 = await tool.execute({
        appId: 'com.example.testapp',
        num: 1
      });
      expect(result1).toEqual(mockRawReviews);

      // Test maximum value
      const result2 = await tool.execute({
        appId: 'com.example.testapp',
        num: 150
      });
      expect(result2).toEqual(mockRawReviews);
    });

    it('should handle nextPaginationToken parameter', async () => {
      mockGooglePlayScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ'
      });

      expect(result).toEqual(mockRawReviews);
      expect(mockGooglePlayScraper.reviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: mockGooglePlayScraper.sort.NEWEST,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us'
      });
    });

    it('should handle empty reviews response', async () => {
      const emptyRawReviews = { data: [], nextPaginationToken: null };
      mockGooglePlayScraper.reviews.mockResolvedValue(emptyRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result).toEqual(emptyRawReviews);
      expect(result.data).toEqual([]);
    });
  });
});