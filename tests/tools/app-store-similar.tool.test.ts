/**
 * Unit tests for Apple App Store Similar MCP Tool
 */

import { AppStoreSimilarTool } from '../../src/tools/app-store-similar.tool';
import { AppStoreScraperService } from '../../src/services/app-store-scraper.service';

// Mock AppStoreScraperService
jest.mock('../../src/services/app-store-scraper.service');

const MockedAppStoreScraperService = AppStoreScraperService as jest.MockedClass<typeof AppStoreScraperService>;

describe('AppStoreSimilarTool', () => {
  let tool: AppStoreSimilarTool;
  let mockAppStoreService: jest.Mocked<AppStoreScraperService>;

  beforeEach(() => {
    tool = new AppStoreSimilarTool();
    mockAppStoreService = MockedAppStoreScraperService.mock.instances[0] as jest.Mocked<AppStoreScraperService>;
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-similar');
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

    it('should accept valid id parameter', async () => {
      const mockResponse = [{ id: '456', title: 'Similar App' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });
      expect(result).toEqual(mockResponse);
    });

    it('should accept valid appId parameter', async () => {
      const mockResponse = [{ id: '456', title: 'Similar App' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ appId: '123456789' });
      expect(result).toEqual(mockResponse);
    });

    it('should reject invalid country parameter', async () => {
      await expect(tool.execute({ id: '123456789', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ id: '123456789', country: 'A' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ id: '123456789', country: 'ABC' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should accept valid country parameter', async () => {
      const mockResponse = [{ id: '456', title: 'Similar App' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789', country: 'ca' });

      expect(result).toEqual(mockResponse);
      expect(mockAppStoreService.similar).toHaveBeenCalledWith('123456789', { country: 'ca' });
    });
  });

  describe('Tool Execution', () => {
    it('should call AppStoreScraperService similar with id parameter', async () => {
      const mockResponse = [{ id: '456', title: 'Similar App 1' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(mockAppStoreService.similar).toHaveBeenCalledWith('123456789', {});
      expect(result).toEqual(mockResponse);
    });

    it('should call AppStoreScraperService similar with appId parameter', async () => {
      const mockResponse = [{ id: '789', title: 'Similar App 2' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ appId: '987654321' });

      expect(mockAppStoreService.similar).toHaveBeenCalledWith('987654321', {});
      expect(result).toEqual(mockResponse);
    });

    it('should prefer id over appId when both are provided', async () => {
      const mockResponse = [{ id: '111', title: 'Similar App 3' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ id: '123456789', appId: '987654321' });

      expect(mockAppStoreService.similar).toHaveBeenCalledWith('123456789', {});
    });

    it('should handle different app IDs', async () => {
      const mockResponse = [{ id: '222', title: 'Different Similar App' }];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ id: '555666777' });

      expect(mockAppStoreService.similar).toHaveBeenCalledWith('555666777', {});
    });

    it('should return raw response from app-store-scraper', async () => {
      const mockResponse = {
        similarApps: [
          { id: '456', title: 'Similar App 1', developer: 'Dev 1' },
          { id: '789', title: 'Similar App 2', developer: 'Dev 2' }
        ],
        metadata: { sourceAppId: '123456789', total: 2 }
      };
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from AppStoreScraperService', async () => {
      const error = new Error('App not found');
      mockAppStoreService.similar = jest.fn().mockRejectedValue(error);

      await expect(tool.execute({ id: '999999999' })).rejects.toThrow('App not found');
    });

    it('should handle empty similar apps results', async () => {
      const mockResponse: any[] = [];
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual([]);
    });

    it('should handle complex similar apps data structures', async () => {
      const mockResponse = {
        results: [
          {
            id: '456',
            title: 'Similar App 1',
            developer: 'Dev 1',
            rating: 4.5,
            category: 'Productivity'
          }
        ],
        recommendations: {
          byCategory: ['789', '101'],
          byDeveloper: ['202', '303']
        }
      };
      mockAppStoreService.similar = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result.results).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });
});