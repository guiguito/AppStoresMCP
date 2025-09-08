/**
 * Unit tests for Apple App Store Ratings MCP Tool
 */

import { AppStoreRatingsTool } from '../../src/tools/app-store-ratings.tool';
import { AppStoreScraperService } from '../../src/services/app-store-scraper.service';

// Mock AppStoreScraperService
jest.mock('../../src/services/app-store-scraper.service');

const MockedAppStoreScraperService = AppStoreScraperService as jest.MockedClass<typeof AppStoreScraperService>;

describe('AppStoreRatingsTool', () => {
  let tool: AppStoreRatingsTool;
  let mockAppStoreService: jest.Mocked<AppStoreScraperService>;

  beforeEach(() => {
    tool = new AppStoreRatingsTool();
    mockAppStoreService = MockedAppStoreScraperService.mock.instances[0] as jest.Mocked<AppStoreScraperService>;
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-ratings');
    });

    it('should have description', () => {
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe('string');
    });

    it('should have input schema', () => {
      expect(tool.inputSchema).toBeTruthy();
      expect(tool.inputSchema.type).toBe('object');
    });
  });

  describe('Input Schema Validation', () => {
    it('should define id parameter', () => {
      const idProperty = tool.inputSchema.properties?.id as any;
      expect(idProperty).toBeTruthy();
      expect(idProperty.type).toBe('string');
      expect(idProperty.pattern).toBe('^\\d+$');
    });

    it('should define appId parameter', () => {
      const appIdProperty = tool.inputSchema.properties?.appId as any;
      expect(appIdProperty).toBeTruthy();
      expect(appIdProperty.type).toBe('string');
      expect(appIdProperty.pattern).toBe('^\\d+$');
    });

    it('should define country parameter', () => {
      const countryProperty = tool.inputSchema.properties?.country as any;
      expect(countryProperty).toBeTruthy();
      expect(countryProperty.type).toBe('string');
      expect(countryProperty.pattern).toBe('^[a-z]{2}$');
    });

    it('should require either id or appId', () => {
      expect(tool.inputSchema.anyOf).toBeDefined();
      expect(tool.inputSchema.anyOf).toHaveLength(2);
    });

    it('should not allow additional properties', () => {
      expect(tool.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should require id or appId parameter', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('id or appId is required and must be a non-empty string');
      await expect(tool.execute({ id: '' })).rejects.toThrow('id or appId is required and must be a non-empty string');
      await expect(tool.execute({ appId: '   ' })).rejects.toThrow('id or appId is required and must be a non-empty string');
    });

    it('should validate id parameter type', async () => {
      await expect(tool.execute({ id: 123 as any })).rejects.toThrow('id or appId is required and must be a non-empty string');
      await expect(tool.execute({ id: null as any })).rejects.toThrow('id or appId is required and must be a non-empty string');
    });

    it('should validate appId parameter type', async () => {
      await expect(tool.execute({ appId: 123 as any })).rejects.toThrow('id or appId is required and must be a non-empty string');
      await expect(tool.execute({ appId: null as any })).rejects.toThrow('id or appId is required and must be a non-empty string');
    });

    it('should validate id parameter format', async () => {
      await expect(tool.execute({ id: 'abc123' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
      await expect(tool.execute({ id: '123abc' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
      await expect(tool.execute({ id: 'com.example.app' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
    });

    it('should validate appId parameter format', async () => {
      await expect(tool.execute({ appId: 'abc123' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
      await expect(tool.execute({ appId: '123abc' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
      await expect(tool.execute({ appId: 'com.example.app' })).rejects.toThrow('id or appId must be a numeric string for Apple App Store');
    });

    it('should validate country parameter format', async () => {
      const mockResponse = { ratings: { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      await expect(tool.execute({ id: '123456789', country: 'USA' })).rejects.toThrow('country must be a two-letter lowercase country code');
      await expect(tool.execute({ id: '123456789', country: 'US' })).rejects.toThrow('country must be a two-letter lowercase country code');
      await expect(tool.execute({ id: '123456789', country: '12' })).rejects.toThrow('country must be a two-letter lowercase country code');
    });

    it('should accept valid id parameter', async () => {
      const mockResponse = { ratings: { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });
      expect(result).toEqual(mockResponse);
    });

    it('should accept valid appId parameter', async () => {
      const mockResponse = { ratings: { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ appId: '123456789' });
      expect(result).toEqual(mockResponse);
    });

    it('should accept valid country parameter', async () => {
      const mockResponse = { ratings: { 5: 80, 4: 40, 3: 20, 2: 8, 1: 4 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789', country: 'ca' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Tool Execution', () => {
    it('should call AppStoreScraperService ratings with id parameter', async () => {
      const mockResponse = { ratings: { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(mockAppStoreService.ratings).toHaveBeenCalledWith('123456789', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call AppStoreScraperService ratings with appId parameter', async () => {
      const mockResponse = { ratings: { 5: 200, 4: 100, 3: 50, 2: 20, 1: 10 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ appId: '987654321' });

      expect(mockAppStoreService.ratings).toHaveBeenCalledWith('987654321', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call AppStoreScraperService ratings with country parameter', async () => {
      const mockResponse = { ratings: { 5: 150, 4: 75, 3: 35, 2: 15, 1: 8 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789', country: 'gb' });

      expect(mockAppStoreService.ratings).toHaveBeenCalledWith('123456789', { country: 'gb' });
      expect(result).toEqual(mockResponse);
    });

    it('should prefer id over appId when both are provided', async () => {
      const mockResponse = { ratings: { 5: 120, 4: 60, 3: 30, 2: 12, 1: 6 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ id: '123456789', appId: '987654321' });

      expect(mockAppStoreService.ratings).toHaveBeenCalledWith('123456789', {});
    });

    it('should handle different app IDs', async () => {
      const mockResponse = { ratings: { 5: 90, 4: 45, 3: 22, 2: 9, 1: 4 } };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ id: '555666777' });

      expect(mockAppStoreService.ratings).toHaveBeenCalledWith('555666777', {});
    });

    it('should return raw response from app-store-scraper', async () => {
      const mockResponse = {
        ratings: {
          5: 1000,
          4: 500,
          3: 250,
          2: 100,
          1: 50
        },
        histogram: [50, 100, 250, 500, 1000],
        total: 1900,
        average: 4.2
      };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from AppStoreScraperService', async () => {
      const error = new Error('App not found');
      mockAppStoreService.ratings = jest.fn().mockRejectedValue(error);

      await expect(tool.execute({ id: '999999999' })).rejects.toThrow('App not found');
    });

    it('should handle empty ratings results', async () => {
      const mockResponse = { ratings: {} };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual({ ratings: {} });
    });

    it('should handle complex ratings data structures', async () => {
      const mockResponse = {
        ratings: {
          5: 800,
          4: 400,
          3: 200,
          2: 80,
          1: 40
        },
        breakdown: {
          byVersion: {
            '1.0': { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 },
            '2.0': { 5: 700, 4: 350, 3: 175, 2: 70, 1: 35 }
          }
        },
        metadata: {
          appId: '123456789',
          country: 'us',
          lastUpdated: '2023-01-01'
        }
      };
      mockAppStoreService.ratings = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result.ratings).toBeDefined();
      expect(result.breakdown).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
});