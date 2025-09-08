/**
 * Unit tests for Apple App Store Suggest MCP Tool
 */

import { AppStoreSuggestTool } from '../../src/tools/app-store-suggest.tool';
import { AppStoreScraperService } from '../../src/services/app-store-scraper.service';

// Mock AppStoreScraperService
jest.mock('../../src/services/app-store-scraper.service');

const MockedAppStoreScraperService = AppStoreScraperService as jest.MockedClass<typeof AppStoreScraperService>;

describe('AppStoreSuggestTool', () => {
  let tool: AppStoreSuggestTool;
  let mockAppStoreService: jest.Mocked<AppStoreScraperService>;

  beforeEach(() => {
    tool = new AppStoreSuggestTool();
    mockAppStoreService = MockedAppStoreScraperService.mock.instances[0] as jest.Mocked<AppStoreScraperService>;
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-suggest');
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
    it('should define required term parameter', () => {
      const termProperty = tool.inputSchema.properties?.term as any;
      expect(termProperty).toBeTruthy();
      expect(termProperty.type).toBe('string');
      expect(termProperty.minLength).toBe(2);
      expect(tool.inputSchema.required).toContain('term');
    });

    it('should not allow additional properties', () => {
      expect(tool.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should require term parameter', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('term is required and must be a non-empty string');
      await expect(tool.execute({ term: '' })).rejects.toThrow('term is required and must be a non-empty string');
      await expect(tool.execute({ term: '   ' })).rejects.toThrow('term is required and must be a non-empty string');
    });

    it('should validate term parameter type', async () => {
      await expect(tool.execute({ term: 123 as any })).rejects.toThrow('term is required and must be a non-empty string');
      await expect(tool.execute({ term: null as any })).rejects.toThrow('term is required and must be a non-empty string');
    });

    it('should validate term minimum length', async () => {
      await expect(tool.execute({ term: 'a' })).rejects.toThrow('term must be at least 2 characters long');
    });

    it('should accept valid term', async () => {
      const mockResponse = ['suggestion1', 'suggestion2'];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'test' });
      expect(result).toEqual(mockResponse);
    });

    it('should reject invalid country parameter', async () => {
      await expect(tool.execute({ term: 'test', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ term: 'test', country: 'A' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ term: 'test', country: 'ABC' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should accept valid country parameter', async () => {
      const mockResponse = ['suggestion1', 'suggestion2'];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'test', country: 'ca' });

      expect(result).toEqual(mockResponse);
      expect(mockAppStoreService.suggest).toHaveBeenCalledWith('test', { country: 'ca' });
    });
  });

  describe('Tool Execution', () => {
    it('should call AppStoreScraperService suggest with correct parameters', async () => {
      const mockResponse = ['test app', 'test game', 'test tool'];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'test' });

      expect(mockAppStoreService.suggest).toHaveBeenCalledWith('test', {});
      expect(result).toEqual(mockResponse);
    });

    it('should handle different search terms', async () => {
      const mockResponse = ['game suggestion 1', 'game suggestion 2'];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ term: 'game' });

      expect(mockAppStoreService.suggest).toHaveBeenCalledWith('game', {});
    });

    it('should handle terms with spaces', async () => {
      const mockResponse = ['photo editor', 'photo viewer'];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      await tool.execute({ term: 'photo edit' });

      expect(mockAppStoreService.suggest).toHaveBeenCalledWith('photo edit', {});
    });

    it('should return raw response from AppStoreScraperService', async () => {
      const mockResponse = {
        suggestions: ['app1', 'app2', 'app3'],
        metadata: { term: 'test', count: 3 }
      };
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'test' });

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from AppStoreScraperService', async () => {
      const error = new Error('Suggest service unavailable');
      mockAppStoreService.suggest = jest.fn().mockRejectedValue(error);

      await expect(tool.execute({ term: 'test' })).rejects.toThrow('Suggest service unavailable');
    });

    it('should handle empty suggestions', async () => {
      const mockResponse: any[] = [];
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'xyz123' });

      expect(result).toEqual([]);
    });

    it('should handle complex suggestion data structures', async () => {
      const mockResponse = {
        suggestions: [
          { term: 'test app', popularity: 100 },
          { term: 'test game', popularity: 85 }
        ],
        related: ['testing', 'tester'],
        categories: ['productivity', 'games']
      };
      mockAppStoreService.suggest = jest.fn().mockResolvedValue(mockResponse);

      const result = await tool.execute({ term: 'test' });

      expect(result).toEqual(mockResponse);
      expect(result.suggestions).toBeDefined();
      expect(result.related).toBeDefined();
    });
  });
});