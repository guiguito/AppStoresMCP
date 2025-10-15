/**
 * Unit tests for Apple App Store Developer MCP Tool
 */

import { AppStoreDeveloperTool } from '../../src/tools/app-store-developer.tool';

// Mock app-store-scraper
jest.mock('app-store-scraper-ts', () => ({
  developer: jest.fn()
}));

// Import the mocked module to access mock functions
const mockStore = jest.requireMock('app-store-scraper-ts');

describe('AppStoreDeveloperTool', () => {
  let tool: AppStoreDeveloperTool;

  beforeEach(() => {
    tool = new AppStoreDeveloperTool();
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-developer');
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
    it('should define required devId parameter', () => {
      const devIdProperty = tool.inputSchema.properties?.devId as any;
      expect(devIdProperty).toBeTruthy();
      expect(devIdProperty.type).toBe('string');
      expect(tool.inputSchema.required).toContain('devId');
    });

    it('should define optional country parameter with pattern', () => {
      const countryProperty = tool.inputSchema.properties?.country as any;
      expect(countryProperty).toBeTruthy();
      expect(countryProperty.type).toBe('string');
      expect(countryProperty.pattern).toBe('^[a-z]{2}$');
    });

    it('should define optional lang parameter with pattern', () => {
      const langProperty = tool.inputSchema.properties?.lang as any;
      expect(langProperty).toBeTruthy();
      expect(langProperty.type).toBe('string');
      expect(langProperty.pattern).toBe('^[a-z]{2}$');
    });
  });

  describe('Parameter Validation', () => {
    it('should require devId parameter', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('devId is required and must be a non-empty string');
      await expect(tool.execute({ devId: '' })).rejects.toThrow('devId is required and must be a non-empty string');
      await expect(tool.execute({ devId: '   ' })).rejects.toThrow('devId is required and must be a non-empty string');
    });

    it('should validate devId parameter type', async () => {
      await expect(tool.execute({ devId: 123 as any })).rejects.toThrow('devId is required and must be a non-empty string');
      await expect(tool.execute({ devId: null as any })).rejects.toThrow('devId is required and must be a non-empty string');
    });

    it('should validate country parameter format', async () => {
      await expect(tool.execute({ devId: 'test-dev', country: 'USA' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ devId: 'test-dev', country: 'u' })).rejects.toThrow('country must be a valid 2-letter country code');
      await expect(tool.execute({ devId: 'test-dev', country: 123 as any })).rejects.toThrow('country must be a valid 2-letter country code');
    });

    it('should validate lang parameter format', async () => {
      await expect(tool.execute({ devId: 'test-dev', lang: 'ENG' })).rejects.toThrow('lang must be a valid 2-letter language code');
      await expect(tool.execute({ devId: 'test-dev', lang: 'e' })).rejects.toThrow('lang must be a valid 2-letter language code');
      await expect(tool.execute({ devId: 'test-dev', lang: 123 as any })).rejects.toThrow('lang must be a valid 2-letter language code');
    });

    it('should accept valid parameters', async () => {
      const mockResponse = [{ id: '123', title: 'Test App' }];
      mockStore.developer.mockResolvedValue(mockResponse);

      const result = await tool.execute({ devId: 'test-developer' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Tool Execution', () => {
    it('should call app-store-scraper developer with default parameters', async () => {
      const mockResponse = [{ id: '123', title: 'Test App' }];
      mockStore.developer.mockResolvedValue(mockResponse);

      const result = await tool.execute({ devId: 'test-developer' });

      expect(mockStore.developer).toHaveBeenCalledWith({
        devId: 'test-developer',
        country: 'us',
        lang: 'en'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should call app-store-scraper developer with custom parameters', async () => {
      const mockResponse = [{ id: '456', title: 'Another App' }];
      mockStore.developer.mockResolvedValue(mockResponse);

      const params = {
        devId: 'custom-developer',
        country: 'gb',
        lang: 'fr'
      };

      const result = await tool.execute(params);

      expect(mockStore.developer).toHaveBeenCalledWith({
        devId: 'custom-developer',
        country: 'gb',
        lang: 'fr'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle developer ID with spaces', async () => {
      const mockResponse = [{ id: '789', title: 'Spaced Developer App' }];
      mockStore.developer.mockResolvedValue(mockResponse);

      await tool.execute({ devId: 'Developer With Spaces' });

      expect(mockStore.developer).toHaveBeenCalledWith({
        devId: 'Developer With Spaces',
        country: 'us',
        lang: 'en'
      });
    });

    it('should handle numeric developer ID as string', async () => {
      const mockResponse = [{ id: '101', title: 'Numeric Dev App' }];
      mockStore.developer.mockResolvedValue(mockResponse);

      await tool.execute({ devId: '123456789' });

      expect(mockStore.developer).toHaveBeenCalledWith({
        devId: '123456789',
        country: 'us',
        lang: 'en'
      });
    });

    it('should return raw response from app-store-scraper', async () => {
      const mockResponse = {
        apps: [
          { id: '123', title: 'App 1', developer: 'Test Dev' },
          { id: '456', title: 'App 2', developer: 'Test Dev' }
        ],
        metadata: { developerName: 'Test Dev', total: 2 }
      };
      mockStore.developer.mockResolvedValue(mockResponse);

      const result = await tool.execute({ devId: 'test-dev' });

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from app-store-scraper', async () => {
      const error = new Error('Developer not found');
      mockStore.developer.mockRejectedValue(error);

      await expect(tool.execute({ devId: 'nonexistent-dev' })).rejects.toThrow('Developer not found');
    });

    it('should handle empty developer results', async () => {
      const mockResponse: any[] = [];
      mockStore.developer.mockResolvedValue(mockResponse);

      const result = await tool.execute({ devId: 'empty-dev' });

      expect(result).toEqual([]);
    });
  });
});