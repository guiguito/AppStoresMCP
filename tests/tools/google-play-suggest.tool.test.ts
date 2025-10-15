/**
 * Unit tests for Google Play Suggest MCP Tool
 */

import { GooglePlaySuggestTool } from '../../src/tools/google-play-suggest.tool';
import { mockSuggest } from '../__mocks__/google-play-scraper-ts';

describe('GooglePlaySuggestTool', () => {
  let tool: GooglePlaySuggestTool;

  // Mock raw response from google-play-scraper
  const mockRawSuggestResults = [
    'test app',
    'test application',
    'test app game',
    'test app productivity',
    'test app free'
  ];

  beforeEach(() => {
    tool = new GooglePlaySuggestTool();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('google-play-suggest');
    });

    it('should have descriptive description', () => {
      expect(tool.description).toContain('search suggestions');
      expect(tool.description).toContain('Google Play Store');
      expect(tool.description).toContain('search term');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toContain('term');
    });

    it('should validate term minLength in schema', () => {
      const termProperty = tool.inputSchema.properties?.term as any;
      expect(termProperty.minLength).toBe(2);
      expect(termProperty.type).toBe('string');
    });

    it('should have lang and country parameters with pattern validation', () => {
      const langProperty = tool.inputSchema.properties?.lang as any;
      const countryProperty = tool.inputSchema.properties?.country as any;
      
      expect(langProperty.pattern).toBe('^[a-z]{2}$');
      expect(countryProperty.pattern).toBe('^[a-z]{2}$');
    });

    it('should have default values for lang and country', () => {
      const langProperty = tool.inputSchema.properties?.lang as any;
      const countryProperty = tool.inputSchema.properties?.country as any;
      
      expect(langProperty.default).toBe('en');
      expect(countryProperty.default).toBe('us');
    });
  });

  describe('Parameter Validation', () => {
    it('should execute successfully with valid term only', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const result = await tool.execute({ term: 'test' });

      expect(result).toEqual(mockRawSuggestResults);
      expect(mockSuggest).toHaveBeenCalledWith({
        term: 'test',
        lang: 'en',
        country: 'us'
      });
    });

    it('should execute successfully with all parameters', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const result = await tool.execute({
        term: 'productivity',
        lang: 'es',
        country: 'mx'
      });

      expect(result).toEqual(mockRawSuggestResults);
      expect(mockSuggest).toHaveBeenCalledWith({
        term: 'productivity',
        lang: 'es',
        country: 'mx'
      });
    });

    it('should reject missing term', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('term is required');
    });

    it('should reject null parameters', async () => {
      const result = await tool.execute(null as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('Parameters must be an object');
    });

    it('should reject invalid term type', async () => {
      const result = await tool.execute({ term: 123 } as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('term is required and must be a non-empty string');
    });

    it('should reject empty term', async () => {
      const result = await tool.execute({ term: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('term is required');
    });

    it('should reject term that is too short', async () => {
      const result = await tool.execute({ term: 'a' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('term must be at least 2 characters long');
    });

    it('should reject whitespace-only term', async () => {
      const result = await tool.execute({ term: '   ' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('term is required');
    });

    it('should reject invalid language code', async () => {
      const result = await tool.execute({
        term: 'test',
        lang: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid country code', async () => {
      const result = await tool.execute({
        term: 'test',
        country: 'USA'
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('country must be a valid 2-letter country code');
    });
  });

  describe('Google Play Scraper Integration', () => {
    it('should call google-play-scraper with correct parameters', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      await tool.execute({ term: 'test' });

      expect(mockSuggest).toHaveBeenCalledWith({
        term: 'test',
        lang: 'en',
        country: 'us'
      });
    });

    it('should call google-play-scraper with all parameters', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      await tool.execute({
        term: 'productivity',
        lang: 'fr',
        country: 'ca'
      });

      expect(mockSuggest).toHaveBeenCalledWith({
        term: 'productivity',
        lang: 'fr',
        country: 'ca'
      });
    });

    it('should handle google-play-scraper errors', async () => {
      const scraperError = new Error('Network error');
      mockSuggest.mockRejectedValue(scraperError);

      const result = await tool.execute({ term: 'test' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockSuggest.mockRejectedValue(unexpectedError);

      const result = await tool.execute({ term: 'test' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Unexpected error');
    });
  });

  describe('Response Format', () => {
    it('should return raw google-play-scraper response', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const result = await tool.execute({ term: 'test' });

      // Should return the complete raw response from google-play-scraper
      expect(result).toEqual(mockRawSuggestResults);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe('test app');
      expect(result[1]).toBe('test application');
      expect(result[4]).toBe('test app free');
    });

    it('should preserve all fields from raw response', async () => {
      const extendedRawResponse = [
        'test app',
        'test application',
        { suggestion: 'test app game', metadata: { popularity: 100 } }
      ];
      
      mockSuggest.mockResolvedValue(extendedRawResponse);

      const result = await tool.execute({ term: 'test' });

      // Should preserve all fields including additional ones
      expect(result).toEqual(extendedRawResponse);
      expect(result[2]).toEqual({ suggestion: 'test app game', metadata: { popularity: 100 } });
    });

    it('should return properly formatted error response', async () => {
      const result = await tool.execute({ term: '' });

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');
      expect(result.error).toHaveProperty('type');
      expect(result.error).toHaveProperty('code');
      expect(result.error).toHaveProperty('message');
      expect(result.error).toHaveProperty('term');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum valid term length', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const result = await tool.execute({ term: 'ab' });

      expect(result).toEqual(mockRawSuggestResults);
    });

    it('should handle valid language codes', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const validLangCodes = ['en', 'es', 'fr', 'de', 'ja', 'ko'];
      
      for (const lang of validLangCodes) {
        const result = await tool.execute({
          term: 'test',
          lang
        });
        expect(result).toEqual(mockRawSuggestResults);
      }
    });

    it('should handle valid country codes', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const validCountryCodes = ['us', 'mx', 'ca', 'gb', 'de', 'jp'];
      
      for (const country of validCountryCodes) {
        const result = await tool.execute({
          term: 'test',
          country
        });
        expect(result).toEqual(mockRawSuggestResults);
      }
    });

    it('should handle empty suggestion results', async () => {
      const emptyResults: any[] = [];
      mockSuggest.mockResolvedValue(emptyResults);

      const result = await tool.execute({ term: 'nonexistent' });

      expect(result).toEqual(emptyResults);
      expect(result).toHaveLength(0);
    });

    it('should handle terms with special characters', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const specialTerms = ['app & game', 'app-name', 'app.name', 'app_name'];
      
      for (const term of specialTerms) {
        const result = await tool.execute({ term });
        expect(result).toEqual(mockRawSuggestResults);
      }
    });

    it('should handle unicode characters in terms', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const unicodeTerms = ['café', 'naïve', '测试', 'тест'];
      
      for (const term of unicodeTerms) {
        const result = await tool.execute({ term });
        expect(result).toEqual(mockRawSuggestResults);
      }
    });

    it('should handle long terms', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const longTerm = 'a'.repeat(100);
      const result = await tool.execute({ term: longTerm });

      expect(result).toEqual(mockRawSuggestResults);
    });

    it('should handle terms with numbers', async () => {
      mockSuggest.mockResolvedValue(mockRawSuggestResults);

      const numericTerms = ['app2', '2048', 'test123'];
      
      for (const term of numericTerms) {
        const result = await tool.execute({ term });
        expect(result).toEqual(mockRawSuggestResults);
      }
    });
  });
});