/**
 * Unit tests for Apple App Store Search MCP Tool
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
      expect(tool.description).toBe('Search for apps in Apple App Store with customizable result count and region options');
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
            description: 'Number of search results to return (default: 50, max: 100)',
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

      expect(result).toEqual(mockRawSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should successfully search apps with num parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', num: 25 });

      expect(result).toEqual(mockRawSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 25,
        country: 'us'
      });
    });

    it('should successfully search apps with country parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', country: 'ca' });

      expect(result).toEqual(mockRawSearchResults);
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

      expect(result).toEqual(mockRawSearchResults);
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

      expect(result).toEqual(mockRawSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should accept valid num parameter', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', num: 50 });

      expect(result).toEqual(mockRawSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'us'
      });
    });

    it('should accept valid country code', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app', country: 'fr' });

      expect(result).toEqual(mockRawSearchResults);
      expect(mockAppStoreScraper.search).toHaveBeenCalledWith({
        term: 'test app',
        num: 50,
        country: 'fr'
      });
    });
  });



  describe('Raw Data Preservation', () => {
    it('should return raw app-store-scraper response', async () => {
      mockAppStoreScraper.search.mockResolvedValue(mockRawSearchResults);

      const result = await tool.execute({ query: 'test app' });

      // Should return the complete raw response from app-store-scraper
      expect(result).toEqual(mockRawSearchResults);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(123456789);
      expect(result[0].score).toBe(4.5);
      expect(result[0].genre).toBe('Productivity');
      expect(result[0].released).toBe('2023-01-01');
      expect(result[1].price).toBe(2.99);
    });

    it('should preserve all fields from raw response', async () => {
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

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result[0].additionalField).toBe('additional value');
      expect(result[0].nestedObject).toEqual({ key: 'value' });
      expect(result[0].arrayField).toEqual([1, 2, 3]);
    });
  });
});