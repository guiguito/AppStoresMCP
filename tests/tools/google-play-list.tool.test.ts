/**
 * Unit tests for Google Play List MCP Tool
 */

import { GooglePlayListTool } from '../../src/tools/google-play-list.tool';

// Mock google-play-scraper
const mockGplayList = jest.fn();
const mockGplay = {
  list: mockGplayList,
  collection: {
    TOP_FREE: 'topselling_free',
    TOP_PAID: 'topselling_paid',
    NEW_FREE: 'topnewfree',
    NEW_PAID: 'topnewpaid',
    TRENDING: 'movers_shakers',
    GROSSING: 'topgrossing'
  },
  age: {
    AGE_RANGE1: 'AGE_RANGE1',
    AGE_RANGE2: 'AGE_RANGE2',
    AGE_RANGE3: 'AGE_RANGE3'
  }
};

jest.mock('google-play-scraper', () => mockGplay);

describe('GooglePlayListTool', () => {
  let tool: GooglePlayListTool;

  beforeEach(() => {
    tool = new GooglePlayListTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-list');
      expect(tool.description).toBe('Get app lists from Google Play Store collections and categories');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
    });

    it('should have correct schema properties', () => {
      const properties = tool.inputSchema.properties!;
      
      expect(properties.collection).toBeDefined();
      expect(properties.category).toBeDefined();
      expect(properties.age).toBeDefined();
      expect(properties.num).toBeDefined();
      expect(properties.lang).toBeDefined();
      expect(properties.country).toBeDefined();
      expect(properties.fullDetail).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const mockListData = [
        { appId: 'com.example.app1', title: 'Test App 1' },
        { appId: 'com.example.app2', title: 'Test App 2' }
      ];
      mockGplayList.mockResolvedValue(mockListData);

      const result = await tool.execute({
        collection: 'TOP_FREE',
        num: 10,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });

      expect(result).toEqual(mockListData);
      expect(mockGplayList).toHaveBeenCalledWith({
        collection: 'topselling_free',
        num: 10,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should use default values when no parameters provided', async () => {
      const mockListData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockGplayList.mockResolvedValue(mockListData);

      const result = await tool.execute();

      expect(result).toEqual(mockListData);
      expect(mockGplayList).toHaveBeenCalledWith({
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should handle category parameter', async () => {
      const mockListData = [{ appId: 'com.example.game', title: 'Test Game' }];
      mockGplayList.mockResolvedValue(mockListData);

      await tool.execute({
        category: 'GAME',
        collection: 'TOP_FREE'
      });

      expect(mockGplayList).toHaveBeenCalledWith({
        collection: 'topselling_free',
        category: 'GAME',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should handle age parameter', async () => {
      const mockListData = [{ appId: 'com.example.kids', title: 'Kids App' }];
      mockGplayList.mockResolvedValue(mockListData);

      await tool.execute({
        age: 'AGE_RANGE1',
        collection: 'TOP_FREE'
      });

      expect(mockGplayList).toHaveBeenCalledWith({
        collection: 'topselling_free',
        age: 'AGE_RANGE1',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should reject invalid num parameter', async () => {
      const result = await tool.execute({ num: 150 });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('num must be a number between 1 and 100');
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({ lang: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country parameter', async () => {
      const result = await tool.execute({ country: 'USA' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });

    it('should reject invalid fullDetail parameter', async () => {
      const result = await tool.execute({ fullDetail: 'true' as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('fullDetail must be a boolean');
    });
  });

  describe('Collection Mapping', () => {
    it('should map collection strings correctly', async () => {
      const mockListData = [{ appId: 'com.example.app', title: 'Test App' }];
      mockGplayList.mockResolvedValue(mockListData);

      const collections = [
        { input: 'TOP_FREE', expected: 'topselling_free' },
        { input: 'TOP_PAID', expected: 'topselling_paid' },
        { input: 'NEW_FREE', expected: 'topnewfree' },
        { input: 'NEW_PAID', expected: 'topnewpaid' },
        { input: 'TRENDING', expected: 'movers_shakers' },
        { input: 'GROSSING', expected: 'topgrossing' }
      ];

      for (const { input, expected } of collections) {
        mockGplayList.mockClear();
        await tool.execute({ collection: input });
        
        expect(mockGplayList).toHaveBeenCalledWith(
          expect.objectContaining({ collection: expected })
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockGplayList.mockRejectedValue(error);

      const result = await tool.execute({ collection: 'TOP_FREE' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle validation errors', async () => {
      const result = await tool.execute({ num: -1 });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('Raw Data Preservation', () => {
    it('should return complete raw response from google-play-scraper', async () => {
      const mockRawData = {
        apps: [
          {
            appId: 'com.example.app1',
            title: 'Test App 1',
            developer: 'Test Developer',
            score: 4.5,
            reviews: 1000,
            icon: 'https://example.com/icon1.png',
            url: 'https://play.google.com/store/apps/details?id=com.example.app1',
            additionalField: 'should be preserved',
            nestedObject: {
              someProperty: 'should also be preserved'
            }
          }
        ],
        metadata: {
          totalResults: 1,
          nextPageToken: 'token123'
        }
      };

      mockGplayList.mockResolvedValue(mockRawData);

      const result = await tool.execute({ collection: 'TOP_FREE' });

      expect(result).toEqual(mockRawData);
      expect(result.apps[0].additionalField).toBe('should be preserved');
      expect(result.apps[0].nestedObject.someProperty).toBe('should also be preserved');
      expect(result.metadata).toBeDefined();
    });
  });
});