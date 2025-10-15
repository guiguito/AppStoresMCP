/**
 * Unit tests for Google Play Categories MCP Tool
 */

import { GooglePlayCategoriesTool } from '../../src/tools/google-play-categories.tool';
import { mockCategories } from '../__mocks__/google-play-scraper-ts';

describe('GooglePlayCategoriesTool', () => {
  let tool: GooglePlayCategoriesTool;

  beforeEach(() => {
    tool = new GooglePlayCategoriesTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-categories');
      expect(tool.description).toBe('Get available categories from Google Play Store');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(Object.keys(tool.inputSchema.properties!)).toHaveLength(0);
    });

    it('should not require any parameters', () => {
      expect(tool.inputSchema.required).toBeUndefined();
    });
  });

  describe('Execution', () => {
    it('should fetch categories successfully', async () => {
      const mockCategoriesData = [
        'ART_AND_DESIGN',
        'AUTO_AND_VEHICLES',
        'BEAUTY',
        'BOOKS_AND_REFERENCE',
        'BUSINESS',
        'COMICS',
        'COMMUNICATION',
        'DATING',
        'EDUCATION',
        'ENTERTAINMENT',
        'EVENTS',
        'FINANCE',
        'FOOD_AND_DRINK',
        'HEALTH_AND_FITNESS',
        'HOUSE_AND_HOME',
        'LIBRARIES_AND_DEMO',
        'LIFESTYLE',
        'MAPS_AND_NAVIGATION',
        'MEDICAL',
        'MUSIC_AND_AUDIO',
        'NEWS_AND_MAGAZINES',
        'PARENTING',
        'PERSONALIZATION',
        'PHOTOGRAPHY',
        'PRODUCTIVITY',
        'SHOPPING',
        'SOCIAL',
        'SPORTS',
        'TOOLS',
        'TRAVEL_AND_LOCAL',
        'VIDEO_PLAYERS',
        'WEATHER'
      ];
      mockCategories.mockResolvedValue(mockCategoriesData);

      const result = await tool.execute();

      expect(result).toEqual(mockCategoriesData);
      expect(mockCategories).toHaveBeenCalledWith();
    });

    it('should work without any parameters', async () => {
      const mockCategoriesData = ['GAMES', 'EDUCATION', 'BUSINESS'];
      mockCategories.mockResolvedValue(mockCategoriesData);

      const result = await tool.execute();

      expect(result).toEqual(mockCategoriesData);
      expect(mockCategories).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockCategories.mockRejectedValue(error);

      const result = await tool.execute();

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle unknown errors', async () => {
      const error = new Error();
      mockCategories.mockRejectedValue(error);

      const result = await tool.execute();

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unknown error');
    });
  });

  describe('Raw Data Preservation', () => {
    it('should return complete raw response from google-play-scraper', async () => {
      const mockRawData = [
        'ART_AND_DESIGN',
        'AUTO_AND_VEHICLES',
        'BEAUTY',
        'BOOKS_AND_REFERENCE',
        'BUSINESS',
        'COMICS',
        'COMMUNICATION',
        'DATING',
        'EDUCATION',
        'ENTERTAINMENT'
      ];

      mockCategories.mockResolvedValue(mockRawData);

      const result = await tool.execute();

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(10);
      expect(result[0]).toBe('ART_AND_DESIGN');
      expect(result[9]).toBe('ENTERTAINMENT');
    });

    it('should preserve complex category objects if returned', async () => {
      const mockRawData = [
        {
          id: 'ART_AND_DESIGN',
          name: 'Art & Design',
          description: 'Creative apps for art and design',
          metadata: {
            popularity: 85,
            appCount: 15000
          }
        },
        {
          id: 'GAMES',
          name: 'Games',
          description: 'Entertainment games',
          metadata: {
            popularity: 95,
            appCount: 50000
          }
        }
      ];

      mockCategories.mockResolvedValue(mockRawData);

      const result = await tool.execute();

      expect(result).toEqual(mockRawData);
      expect(result[0].metadata.popularity).toBe(85);
      expect(result[1].metadata.appCount).toBe(50000);
    });

    it('should handle empty categories list', async () => {
      const mockRawData: string[] = [];

      mockCategories.mockResolvedValue(mockRawData);

      const result = await tool.execute();

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });
});