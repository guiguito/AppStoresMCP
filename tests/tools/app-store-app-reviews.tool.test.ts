/**
 * Unit tests for Apple App Store App Reviews MCP Tool
 */

// Mock app-store-scraper module before importing anything else
const mockAppStoreScraper = {
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  sort: {
    RECENT: 'recent',
    HELPFUL: 'helpful'
  }
};

jest.mock('app-store-scraper', () => mockAppStoreScraper);

import { AppStoreAppReviewsTool } from '../../src/tools/app-store-app-reviews.tool';

describe('AppStoreAppReviewsTool', () => {
  let tool: AppStoreAppReviewsTool;

  // Mock raw response from app-store-scraper
  const mockRawReviews = [
    {
      id: 1,
      userName: 'User1',
      score: 5,
      title: 'Great app!',
      text: 'This app is amazing',
      date: '2023-01-01',
      version: '1.0.0',
      updated: '2023-01-01'
    },
    {
      id: 2,
      userName: 'User2',
      score: 4,
      text: 'Good app overall',
      date: '2023-01-02',
      version: '1.0.0',
      updated: '2023-01-02'
    }
  ];

  beforeEach(() => {
    tool = new AppStoreAppReviewsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-app-reviews');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe('Get reviews for an Apple App Store app with page-based pagination. Increment page parameter for next page, empty array indicates end.');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          appId: {
            type: 'string',
            description: 'The Apple App Store app ID (numeric ID, e.g., 123456789)',
            pattern: '^\\d+$'
          },
          page: {
            type: 'integer',
            description: 'Page number for pagination (default: 1). Increment to get next page. Empty array response indicates no more pages.',
            minimum: 1,
            default: 1
          },
          sort: {
            type: 'string',
            description: 'Sort order for reviews',
            enum: ['newest', 'rating', 'helpfulness'],
            default: 'newest'
          },
          country: {
            type: 'string',
            description: 'Country code for region-specific content (default: us)',
            pattern: '^[a-z]{2}$',
            default: 'us'
          },
          fullDetail: {
            type: 'boolean',
            description: 'Whether to return full review details (default: false). When false, only essential fields are returned: id, version, userName, score, title, text, updated',
            default: false
          }
        },
        required: ['appId'],
        additionalProperties: false
      });
    });
  });

  describe('execute', () => {
    it('should successfully fetch app reviews with valid appId', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789' });

      // Should return filtered data by default (fullDetail: false)
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].userName).toBe('User1');
      expect(result[0].score).toBe(5);
      expect(result[0].title).toBe('Great app!');
      expect(result[0].text).toBe('This app is amazing');
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].updated).toBe('2023-01-01');
      // Should not have date field (filtered out)
      expect(result[0].date).toBeUndefined();
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'us'
      });
    });

    it('should successfully fetch app reviews with pagination', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', page: 2 });

      // Should return filtered data by default
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].date).toBeUndefined(); // Should be filtered out
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 2,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'us'
      });
    });

    it('should successfully fetch app reviews with sort parameter', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', sort: 'rating' });

      // Should return filtered data by default
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].date).toBeUndefined(); // Should be filtered out
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: mockAppStoreScraper.sort.HELPFUL,
        country: 'us'
      });
    });

    it('should successfully fetch app reviews with all parameters', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ 
        appId: '123456789', 
        page: 3, 
        sort: 'helpfulness' 
      });

      expect(result).toHaveLength(2);
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 3,
        sort: mockAppStoreScraper.sort.HELPFUL,
        country: 'us'
      });
    });

    it('should throw app-store-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockAppStoreScraper.reviews.mockRejectedValue(scraperError);

      await expect(tool.execute({ appId: '123456789' })).rejects.toThrow('Network error');
    });

    it('should throw not found errors', async () => {
      const notFoundError = new Error('App not found');
      mockAppStoreScraper.reviews.mockRejectedValue(notFoundError);

      await expect(tool.execute({ appId: '999999999' })).rejects.toThrow('App not found');
    });

    it('should return full details when fullDetail is true', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', fullDetail: true });

      expect(result).toEqual(mockRawReviews);
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'us'
      });
    });

    it('should return filtered details when fullDetail is false', async () => {
      const mockRawReviewsWithExtraFields = [
        {
          id: 1,
          userName: 'User1',
          score: 5,
          title: 'Great app!',
          text: 'This app is amazing',
          date: '2023-01-01',
          version: '1.0.0',
          updated: '2023-01-01',
          // Extra fields that should be filtered out
          url: 'https://example.com/review',
          thumbsUp: 10
        }
      ];
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviewsWithExtraFields);

      const result = await tool.execute({ appId: '123456789', fullDetail: false });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].userName).toBe('User1');
      expect(result[0].score).toBe(5);
      expect(result[0].title).toBe('Great app!');
      expect(result[0].text).toBe('This app is amazing');
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].updated).toBe('2023-01-01');
      // Should not have extra fields
      expect(result[0].url).toBeUndefined();
      expect(result[0].thumbsUp).toBeUndefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should throw error for null parameters', async () => {
      await expect(tool.execute(null as any)).rejects.toThrow('Parameters must be an object');
    });

    it('should throw error for undefined parameters', async () => {
      await expect(tool.execute(undefined as any)).rejects.toThrow('Parameters must be an object');
    });

    it('should throw error for missing appId', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('appId is required and must be a string');
    });

    it('should throw error for empty appId', async () => {
      await expect(tool.execute({ appId: '' })).rejects.toThrow('appId is required and must be a string');
    });

    it('should throw error for non-numeric appId', async () => {
      await expect(tool.execute({ appId: 'com.example.app' })).rejects.toThrow('appId must be a numeric string for Apple App Store');
    });

    it('should throw error for invalid page number (zero)', async () => {
      await expect(tool.execute({ appId: '123456789', page: 0 })).rejects.toThrow('page must be a positive integer');
    });

    it('should throw error for invalid page number (negative)', async () => {
      await expect(tool.execute({ appId: '123456789', page: -1 })).rejects.toThrow('page must be a positive integer');
    });

    it('should throw error for invalid sort option', async () => {
      await expect(tool.execute({ appId: '123456789', sort: 'invalid' as any })).rejects.toThrow('sort must be one of: newest, rating, helpfulness');
    });

    it('should accept valid numeric appId', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789' });

      // Should return filtered data by default
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].date).toBeUndefined(); // Should be filtered out
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'us'
      });
    });

    it('should accept valid page number', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', page: 5 });

      // Should return filtered data by default
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].date).toBeUndefined(); // Should be filtered out
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 5,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'us'
      });
    });

    it('should accept valid sort options', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      for (const sort of ['newest', 'rating', 'helpfulness']) {
        const result = await tool.execute({ appId: '123456789', sort: sort as any });
        // Should return filtered data by default
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[0].date).toBeUndefined(); // Should be filtered out
      }
    });

    it('should throw error for invalid country code', async () => {
      await expect(tool.execute({ appId: '123456789', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should throw error for invalid fullDetail parameter', async () => {
      await expect(tool.execute({ appId: '123456789', fullDetail: 'true' as any })).rejects.toThrow('fullDetail must be a boolean');
    });

    it('should accept valid country code', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', country: 'ca' });

      // Should return filtered data by default
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].date).toBeUndefined(); // Should be filtered out
      
      expect(mockAppStoreScraper.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: mockAppStoreScraper.sort.RECENT,
        country: 'ca'
      });
    });
  });



  describe('Raw Data Preservation', () => {
    it('should return raw app-store-scraper response when fullDetail is true', async () => {
      mockAppStoreScraper.reviews.mockResolvedValue(mockRawReviews);

      const result = await tool.execute({ appId: '123456789', fullDetail: true });

      // Should return the complete raw response from app-store-scraper
      expect(result).toEqual(mockRawReviews);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(1);
      expect(result[0].score).toBe(5);
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].date).toBe('2023-01-01'); // Should have all fields when fullDetail is true
      expect(result[1].userName).toBe('User2');
    });

    it('should preserve all fields from raw response when fullDetail is true', async () => {
      const extendedRawResponse = [
        {
          ...mockRawReviews[0],
          additionalField: 'additional value',
          nestedObject: { key: 'value' }
        }
      ];
      
      mockAppStoreScraper.reviews.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ appId: '123456789', fullDetail: true });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result[0].additionalField).toBe('additional value');
      expect(result[0].nestedObject).toEqual({ key: 'value' });
    });
  });
});