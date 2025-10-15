/**
 * Unit tests for Apple App Store Search MCP Tool
 */

// Mock app-store-scraper module before importing anything else
const mockAppStoreScraper = {
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  sort: {
    RECENT: 'mostRecent',
    HELPFUL: 'mostHelpful'
  }
};

jest.mock('app-store-scraper-ts', () => mockAppStoreScraper);

import { AppStoreSearchTool } from '../../src/tools/app-store-search.tool';

describe('AppStoreSearchTool', () => {
  let tool: AppStoreSearchTool;

  // Mock raw response from app-store-scraper
  const mockRawSearchResults = [
    {
      id: 123456789,
      title: 'Test App 1',
      developer: 'Test Developer 1',
      score: 4.5,
      free: true,
      price: 0,
      icon: 'icon1.jpg',
      url: 'https://apps.apple.com/app/test-app-1/id123456789',
      genre: 'Productivity',
      released: '2023-01-01'
    },
    {
      id: 987654321,
      title: 'Test App 2',
      developer: 'Test Developer 2',
      score: 4.0,
      free: false,
      price: 2.99,
      icon: 'icon2.jpg',
      url: 'https://apps.apple.com/app/test-app-2/id987654321',
      genre: 'Games',
      released: '2023-02-01'
    }
  ];

  // Expected filtered response (only essential fields)
  const mockFilteredSearchResults = [
    {
      id: 123456789,
      title: 'Test App 1',
      developer: 'Test Developer 1',
      free: true,
      price: 0,
      icon: 'icon1.jpg',
      url: 'https://apps.apple.com/app/test-app-1/id123456789'
    },
    {
      id: 987654321,
      title: 'Test App 2',
      developer: 'Test Developer 2',
      free: false,
      price: 2.99,
      icon: 'icon2.jpg',
      url: 'https://apps.apple.com/app/test-app-2/id987654321'
    }
  ];

  beforeEach(() => {
    tool = new AppStoreSearchTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-search');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe('Search for apps in Apple App Store. Returns up to 100 results per request (no pagination support).');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query string (minimum 2 characters)',
            minLength: 2
          },
          num: {
            type: 'integer',
            description: 'Number of search results to return (default: 50, max: 100). No pagination available - increase this value to get more results.',
            minimum: 1,
            maximum: 100,
            default: 50
          },
          country: {
            type: 'string',
            description: 'Country code for region-specific content (default: us)',
            pattern: '^[a-z]{2}$',
            default: 'us'
          }
        },
        required: ['query'],
        additionalProperties: false
      });
    });
  });

  describe('execute', () => {
    it('should successfully search apps with valid query', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should successfully search apps with num parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', num: 25 });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 25,
        country: 'us'
      });
    });

    it('should successfully search apps with country parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', country: 'ca' });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'ca'
      });
    });

    it('should successfully search apps with all parameters', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ 
        query: 'test app', 
        num: 75, 
        country: 'gb' 
      });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 75,
        country: 'gb'
      });
    });

    it('should throw app-store-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockAppStoreScraper.search.mockRejectedValue(scraperError);

      await expect(tool.execute({ query: 'test app' })).rejects.toThrow('Network error');
    });
  });

  describe('Parameter Validation', () => {
    it('should throw error for null parameters', async () => {
      await expect(tool.execute(null as any)).rejects.toThrow('Parameters must be an object');
    });

    it('should throw error for undefined parameters', async () => {
      await expect(tool.execute(undefined as any)).rejects.toThrow('Parameters must be an object');
    });

    it('should throw error for missing query', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('query is required and must be a string');
    });

    it('should throw error for empty query', async () => {
      await expect(tool.execute({ query: '' })).rejects.toThrow('query is required and must be a string');
    });

    it('should throw error for query that is too short', async () => {
      await expect(tool.execute({ query: 'a' })).rejects.toThrow('query must be at least 2 characters long');
    });

    it('should throw error for invalid num parameter (zero)', async () => {
      await expect(tool.execute({ query: 'test app', num: 0 })).rejects.toThrow('num must be an integer between 1 and 100');
    });

    it('should throw error for invalid num parameter (too large)', async () => {
      await expect(tool.execute({ query: 'test app', num: 150 })).rejects.toThrow('num must be an integer between 1 and 100');
    });

    it('should throw error for invalid country code', async () => {
      await expect(tool.execute({ query: 'test app', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should accept valid query', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should accept valid num parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', num: 50 });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should accept valid country code', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', country: 'fr' });

      expect(result).toEqual(mockFilteredSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'fr'
      });
    });
  });



  describe('Response Filtering', () => {
    it('should return filtered response by default to reduce token usage', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      // Should return filtered response with only essential fields
      expect(result).toEqual(mockFilteredSearchResults);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(123456789);
      expect(result[0].title).toBe('Test App 1');
      expect(result[0].developer).toBe('Test Developer 1');
      expect(result[0].price).toBe(0);
      
      // Verbose fields should be filtered out
      expect(result[0].score).toBeUndefined();
      expect(result[0].genre).toBeUndefined();
      expect(result[0].released).toBeUndefined();
    });

    it('should filter out non-essential fields even from extended responses', async () => {
      const extendedRawResponse = [
        {
          ...mockRawSearchResults[0],
          additionalField: 'additional value',
          nestedObject: { key: 'value' },
          arrayField: [1, 2, 3]
        }
      ];
      
      mockAppStoreScraper.search.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ query: 'test app' });

      // Should filter out non-essential fields including additional ones
      expect(result).toEqual([mockFilteredSearchResults[0]]);
      expect(result[0].additionalField).toBeUndefined();
      expect(result[0].nestedObject).toBeUndefined();
      expect(result[0].arrayField).toBeUndefined();
      expect(result[0].score).toBeUndefined();
      expect(result[0].genre).toBeUndefined();
      
      // But should keep essential fields
      expect(result[0].id).toBe(123456789);
      expect(result[0].title).toBe('Test App 1');
      expect(result[0].developer).toBe('Test Developer 1');
    });
  });
});