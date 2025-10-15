/**
 * Unit tests for Apple App Store List MCP Tool
 */

import { AppStoreListTool } from '../../src/tools/app-store-list.tool';

// Use manual mock from __mocks__/app-store-scraper-ts.ts
jest.mock('app-store-scraper-ts');
const mockStore = jest.requireMock('app-store-scraper-ts');

describe('AppStoreListTool', () => {
  let tool: AppStoreListTool;

  beforeEach(() => {
    tool = new AppStoreListTool();
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-list');
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
    it('should define optional collection parameter', () => {
      const collectionProperty = tool.inputSchema.properties?.collection as any;
      expect(collectionProperty).toBeTruthy();
      expect(collectionProperty.type).toBe('string');
      expect(collectionProperty.enum).toContain('top-free');
      expect(collectionProperty.enum).toContain('top-paid');
    });

    it('should define optional category parameter', () => {
      const categoryProperty = tool.inputSchema.properties?.category as any;
      expect(categoryProperty).toBeTruthy();
      expect(categoryProperty.type).toBe('string');
    });

    it('should define optional country parameter with pattern', () => {
      const countryProperty = tool.inputSchema.properties?.country as any;
      expect(countryProperty).toBeTruthy();
      expect(countryProperty.type).toBe('string');
      expect(countryProperty.pattern).toBe('^[a-z]{2}$');
    });

    it('should define optional num parameter with constraints', () => {
      const numProperty = tool.inputSchema.properties?.num as any;
      expect(numProperty).toBeTruthy();
      expect(numProperty.type).toBe('integer');
      expect(numProperty.minimum).toBe(1);
      expect(numProperty.maximum).toBe(100);
    });
  });

  describe('Parameter Validation', () => {
    it('should accept empty parameters', async () => {
      const mockResponse = [{ id: '123', title: 'Test App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      const result = await tool.execute({});
      expect(result).toEqual(mockResponse);
    });

    it('should validate country parameter format', async () => {
      await expect(tool.execute({ country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ country: 'u' })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should validate lang parameter format', async () => {
      await expect(tool.execute({ lang: 'ENG' })).rejects.toThrow('lang must be a valid 2-letter language code');
      await expect(tool.execute({ lang: 'e' })).rejects.toThrow('lang must be a valid 2-letter language code');
    });

    it('should validate num parameter range', async () => {
      await expect(tool.execute({ num: 0 })).rejects.toThrow('num must be a positive number');
      await expect(tool.execute({ num: -5 })).rejects.toThrow('num must be a positive number');
      
      // Values above 100 should be accepted but limited internally
      const mockResponse = [{ id: '123', title: 'Test App' }];
      mockStore.list.mockResolvedValue(mockResponse);
      const result = await tool.execute({ num: 150 });
      expect(result).toEqual(mockResponse);
    });

    it('should validate collection parameter type', async () => {
      await expect(tool.execute({ collection: 123 as any })).rejects.toThrow('collection must be a string');
    });

    it('should validate category parameter type', async () => {
      await expect(tool.execute({ category: 123 as any })).rejects.toThrow('category must be a string');
    });

    it('should validate fullDetail parameter type', async () => {
      await expect(tool.execute({ fullDetail: 'true' as any })).rejects.toThrow('fullDetail must be a boolean');
    });
  });

  describe('Tool Execution', () => {
    it('should call app-store-scraper list with default parameters', async () => {
      const mockResponse = [{ id: '123', title: 'Test App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      const result = await tool.execute({});

      expect(mockStore.list).toHaveBeenCalledWith({
        collection: 'topfreeapplications',
        country: 'us',
        lang: 'en',
        num: 50,
        fullDetail: false
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call app-store-scraper list with custom parameters', async () => {
      const mockResponse = [{ id: '456', title: 'Another App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      const params = {
        collection: 'top-paid',
        category: 'games',
        country: 'gb',
        lang: 'fr',
        num: 25,
        fullDetail: true
      };

      const result = await tool.execute(params);

      expect(mockStore.list).toHaveBeenCalledWith({
        collection: 'top-paid',
        category: 'games',
        country: 'gb',
        lang: 'fr',
        num: 25,
        fullDetail: true
      });
      expect(result).toEqual(mockResponse);
    });

    it('should limit num parameter to maximum of 100', async () => {
      const mockResponse = [{ id: '789', title: 'Limited App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      await tool.execute({ num: 150 });

      expect(mockStore.list).toHaveBeenCalledWith(
        expect.objectContaining({
          num: 100
        })
      );
    });

    it('should handle different collections', async () => {
      const mockResponse = [{ id: '101', title: 'Top Grossing App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      await tool.execute({ collection: 'top-grossing' });

      expect(mockStore.list).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'top-grossing'
        })
      );
    });

    it('should include category when specified', async () => {
      const mockResponse = [{ id: '202', title: 'Category App' }];
      mockStore.list.mockResolvedValue(mockResponse);

      await tool.execute({ category: 'productivity' });

      expect(mockStore.list).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'productivity'
        })
      );
    });

    it('should return raw response from app-store-scraper', async () => {
      const mockResponse = {
        apps: [
          { id: '123', title: 'App 1', developer: 'Dev 1' },
          { id: '456', title: 'App 2', developer: 'Dev 2' }
        ],
        metadata: { total: 2 }
      };
      mockStore.list.mockResolvedValue(mockResponse);

      const result = await tool.execute({});

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from app-store-scraper', async () => {
      const error = new Error('Network error');
      mockStore.list.mockRejectedValue(error);

      await expect(tool.execute({})).rejects.toThrow('Network error');
    });
  });
});