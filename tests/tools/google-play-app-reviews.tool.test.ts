/**
 * Unit tests for Google Play App Reviews MCP Tool
 */

import { GooglePlayAppReviewsTool } from '../../src/tools/google-play-app-reviews.tool';
import { mockReviews } from '../__mocks__/google-play-scraper-ts';

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
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      // Should return filtered data by default (fullDetail: false)
      expect(result.data).toHaveLength(2);
      expect(result.nextPaginationToken).toBe('next_page_token');
      expect(result.data[0].id).toBe('review1');
      expect(result.data[0].userName).toBe('User1');
      expect(result.data[0].score).toBe(5);
      expect(result.data[0].text).toBe('This app is amazing and works perfectly.');
      expect(result.data[0].date).toBe('2023-01-01');
      expect(result.data[0].version).toBe('1.0.0');
      // Should not have filtered fields
      expect(result.data[0].title).toBeUndefined();
      expect(result.data[0].thumbsUp).toBeUndefined();
      
      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: 2, // NEWEST
        lang: 'en',
        country: 'us',
        paginate: true
      });
    });

    it('should execute successfully with all parameters', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        num: 50,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        sort: 'rating'
      });

      // Should return filtered data by default
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBeUndefined(); // Should be filtered out
      
      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 50,
        sort: 3, // RATING
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us',
        paginate: true
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
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        lang: 'fr',
        country: 'ca'
      });

      // Should return filtered data by default
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBeUndefined(); // Should be filtered out
      
      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: 2, // NEWEST
        lang: 'fr',
        country: 'ca',
        paginate: true
      });
    });
  });

  describe('Google Play Scraper Integration', () => {
    it('should call google-play-scraper with correct parameters', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      await tool.execute({ appId: 'com.example.testapp' });

      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: 2, // NEWEST
        lang: 'en',
        country: 'us',
        paginate: true
      });
    });

    it('should call google-play-scraper with all parameters', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      await tool.execute({
        appId: 'com.example.testapp',
        num: 50,
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        sort: 'helpfulness'
      });

      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 50,
        sort: 1, // HELPFULNESS
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us',
        paginate: true
      });
    });

    it('should return full details when fullDetail is true', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp', fullDetail: true });

      expect(result).toEqual(mockRawReviews);
      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: 2, // NEWEST
        lang: 'en',
        country: 'us',
        paginate: true
      });
    });

    it('should return filtered details when fullDetail is false', async () => {
      const mockRawReviewsWithExtraFields = {
        data: [
          {
            id: 'review1',
            userName: 'User1',
            score: 5,
            text: 'This app is amazing and works perfectly.',
            date: '2023-01-01',
            version: '1.0.0',
            // Extra fields that should be filtered out
            title: 'Great app!',
            thumbsUp: 10,
            url: 'https://example.com/review'
          }
        ],
        nextPaginationToken: 'next_page_token'
      };
      mockReviews.mockResolvedValue(mockRawReviewsWithExtraFields);

      const result = await tool.execute({ appId: 'com.example.testapp', fullDetail: false });

      expect(result.data).toHaveLength(1);
      expect(result.nextPaginationToken).toBe('next_page_token');
      expect(result.data[0].id).toBe('review1');
      expect(result.data[0].userName).toBe('User1');
      expect(result.data[0].score).toBe(5);
      expect(result.data[0].text).toBe('This app is amazing and works perfectly.');
      expect(result.data[0].date).toBe('2023-01-01');
      expect(result.data[0].version).toBe('1.0.0');
      // Should not have extra fields
      expect(result.data[0].title).toBeUndefined();
      expect(result.data[0].thumbsUp).toBeUndefined();
      expect(result.data[0].url).toBeUndefined();
    });

    it('should reject invalid fullDetail parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.testapp', fullDetail: 'true' as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('fullDetail must be a boolean');
    });

    it('should handle google-play-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockReviews.mockRejectedValue(scraperError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle app not found errors', async () => {
      const notFoundError = new Error('App not found');
      mockReviews.mockRejectedValue(notFoundError);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.appId).toBe('com.nonexistent.app');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockReviews.mockRejectedValue(unexpectedError);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return raw google-play-scraper response when fullDetail is true', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp', fullDetail: true });

      // Should return the complete raw response from google-play-scraper
      expect(result).toEqual(mockRawReviews);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('review1');
      expect(result.data[0].score).toBe(5);
      expect(result.data[0].title).toBe('Great app!'); // Should have all fields when fullDetail is true
      expect(result.data[0].thumbsUp).toBe(10);
      expect(result.nextPaginationToken).toBe('next_page_token');
    });

    it('should preserve all fields from raw response when fullDetail is true', async () => {
      const extendedRawResponse = {
        ...mockRawReviews,
        additionalField: 'additional value',
        metadata: { key: 'value' }
      };
      
      mockReviews.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ appId: 'com.example.testapp', fullDetail: true });

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
      mockReviews.mockResolvedValue(mockRawReviews);

      const validSortOptions = ['newest', 'rating', 'helpfulness'];
      
      for (const sort of validSortOptions) {
        const result = await tool.execute({
          appId: 'com.example.testapp',
          sort: sort as any
        });
        // Should return filtered data by default
        expect(result.data).toHaveLength(2);
        expect(result.data[0].title).toBeUndefined(); // Should be filtered out
      }
    });

    it('should handle boundary values for num parameter', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      // Test minimum value
      const result1 = await tool.execute({
        appId: 'com.example.testapp',
        num: 1
      });
      // Should return filtered data by default
      expect(result1.data).toHaveLength(2);
      expect(result1.data[0].title).toBeUndefined(); // Should be filtered out

      // Test maximum value
      const result2 = await tool.execute({
        appId: 'com.example.testapp',
        num: 150
      });
      // Should return filtered data by default
      expect(result2.data).toHaveLength(2);
      expect(result2.data[0].title).toBeUndefined(); // Should be filtered out
    });

    it('should handle nextPaginationToken parameter', async () => {
      mockReviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({
        appId: 'com.example.testapp',
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ'
      });

      // Should return filtered data by default
      expect(result.data).toHaveLength(2);
      expect(result.data[0].title).toBeUndefined(); // Should be filtered out
      
      expect(mockReviews).toHaveBeenCalledWith({
        appId: 'com.example.testapp',
        num: 100,
        sort: 2, // NEWEST
        nextPaginationToken: 'CsEBIrgBAcgILLS5IDBgvTCYG4Xnpm31aqIVGkbk0JJ',
        lang: 'en',
        country: 'us',
        paginate: true
      });
    });

    it('should handle empty reviews response', async () => {
      const emptyRawReviews = { data: [], nextPaginationToken: null };
      mockReviews.mockResolvedValue(emptyRawReviews);

      const result = await tool.execute({ appId: 'com.example.testapp' });

      expect(result).toEqual(emptyRawReviews);
      expect(result.data).toEqual([]);
    });
  });
});