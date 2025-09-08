/**
 * Unit tests for Apple App Store App Details MCP Tool
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

import { AppStoreAppDetailsTool } from '../../src/tools/app-store-app-details.tool';

describe('AppStoreAppDetailsTool', () => {
  let tool: AppStoreAppDetailsTool;

  // Mock raw response from app-store-scraper
  const mockRawAppDetails = {
    id: 123456789,
    title: 'Test App',
    description: 'A test application',
    developer: 'Test Developer',
    score: 4.5,
    reviews: 1000,
    version: '1.0.0',
    size: '50MB',
    primaryGenre: 'Productivity',
    genre: 'Productivity',
    free: true,
    price: 0,
    screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
    icon: 'icon.jpg',
    url: 'https://apps.apple.com/app/test-app/id123456789',
    released: '2023-01-01',
    updated: '2023-06-01',
    contentRating: '4+',
    languages: ['EN']
  };

  beforeEach(() => {
    tool = new AppStoreAppDetailsTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-app-details');
    });

    it('should have correct description', () => {
      expect(tool.description).toBe('Get detailed information about an Apple App Store app including title, description, ratings, developer info, and metadata');
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
          country: {
            type: 'string',
            description: 'Country code for region-specific content (default: us)',
            pattern: '^[a-z]{2}$',
            default: 'us'
          }
        },
        required: ['appId'],
        additionalProperties: false
      });
    });
  });

  describe('execute', () => {
    it('should successfully fetch app details with valid appId', async () => {
      mockAppStoreScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: '123456789' });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockAppStoreScraper.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'us'
      });
    });

    it('should successfully fetch app details with country parameter', async () => {
      mockAppStoreScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: '123456789', country: 'ca' });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockAppStoreScraper.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'ca'
      });
    });

    it('should throw app-store-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockAppStoreScraper.app.mockRejectedValue(scraperError);

      await expect(tool.execute({ appId: '123456789' })).rejects.toThrow('Network error');
    });

    it('should throw not found errors', async () => {
      const notFoundError = new Error('App not found');
      mockAppStoreScraper.app.mockRejectedValue(notFoundError);

      await expect(tool.execute({ appId: '999999999' })).rejects.toThrow('App not found');
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

    it('should throw error for invalid country code', async () => {
      await expect(tool.execute({ appId: '123456789', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should accept valid numeric appId', async () => {
      mockAppStoreScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: '123456789' });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockAppStoreScraper.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'us'
      });
    });

    it('should accept valid country code', async () => {
      mockAppStoreScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: '123456789', country: 'gb' });

      expect(result).toEqual(mockRawAppDetails);
      expect(mockAppStoreScraper.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'gb'
      });
    });
  });



  describe('Raw Data Preservation', () => {
    it('should return raw app-store-scraper response', async () => {
      mockAppStoreScraper.app.mockResolvedValue(mockRawAppDetails);

      const result = await tool.execute({ appId: '123456789' });

      // Should return the complete raw response from app-store-scraper
      expect(result).toEqual(mockRawAppDetails);
      expect(result.id).toBe(123456789);
      expect(result.score).toBe(4.5);
      expect(result.primaryGenre).toBe('Productivity');
      expect(result.contentRating).toBe('4+');
      expect(result.languages).toEqual(['EN']);
    });

    it('should preserve all fields from raw response', async () => {
      const extendedRawResponse = {
        ...mockRawAppDetails,
        additionalField: 'additional value',
        nestedObject: { key: 'value' },
        arrayField: [1, 2, 3]
      };
      
      mockAppStoreScraper.app.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ appId: '123456789' });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result.additionalField).toBe('additional value');
      expect(result.nestedObject).toEqual({ key: 'value' });
      expect(result.arrayField).toEqual([1, 2, 3]);
    });
  });
});