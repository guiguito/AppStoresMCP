/**
 * Unit tests for Google Play Data Safety MCP Tool
 */

import { GooglePlayDataSafetyTool } from '../../src/tools/google-play-datasafety.tool';
import { mockDatasafety } from '../__mocks__/google-play-scraper-ts';

describe('GooglePlayDataSafetyTool', () => {
  let tool: GooglePlayDataSafetyTool;

  beforeEach(() => {
    tool = new GooglePlayDataSafetyTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-datasafety');
      expect(tool.description).toBe('Get app data safety information from Google Play Store');
    });

    it('should have valid input schema', () => {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.inputSchema.required).toEqual(['appId']);
    });

    it('should have correct schema properties', () => {
      const properties = tool.inputSchema.properties!;
      
      expect(properties.appId).toBeDefined();
      expect(properties.lang).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const mockDatasafetyData = {
        dataShared: [
          {
            category: 'Personal info',
            types: ['Name', 'Email address'],
            purposes: ['App functionality', 'Analytics']
          }
        ],
        dataCollected: [
          {
            category: 'App activity',
            types: ['App interactions'],
            purposes: ['Analytics']
          }
        ],
        securityPractices: {
          dataEncrypted: true,
          dataCanBeDeleted: true
        }
      };
      mockDatasafety.mockResolvedValue(mockDatasafetyData);

      const result = await tool.execute({
        appId: 'com.example.app',
        lang: 'en'
      });

      expect(result).toEqual(mockDatasafetyData);
      expect(mockDatasafety).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en'
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockDatasafetyData = {
        dataShared: [],
        dataCollected: [],
        securityPractices: {}
      };
      mockDatasafety.mockResolvedValue(mockDatasafetyData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockDatasafetyData);
      expect(mockDatasafety).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en'
      });
    });

    it('should require appId parameter', async () => {
      const result = await tool.execute({} as any);

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required');
    });

    it('should reject empty appId', async () => {
      const result = await tool.execute({ appId: '' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId is required and must be a non-empty string');
    });

    it('should reject invalid appId format', async () => {
      const result = await tool.execute({ appId: 'invalid-app-id' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('appId must be a valid package name format');
    });

    it('should accept valid package name formats', async () => {
      const mockDatasafetyData = { dataShared: [], dataCollected: [] };
      mockDatasafety.mockResolvedValue(mockDatasafetyData);

      const validAppIds = [
        'com.example.app',
        'com.company.product.app',
        'org.apache.commons.lang3',
        'io.github.user.project'
      ];

      for (const appId of validAppIds) {
        mockDatasafety.mockClear();
        const result = await tool.execute({ appId });
        expect(result).toEqual(mockDatasafetyData);
      }
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', lang: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });
  });

  describe('Error Handling', () => {
    it('should handle app not found errors', async () => {
      const error = new Error('App not found');
      mockDatasafety.mockRejectedValue(error);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.message).toContain('com.nonexistent.app');
    });

    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockDatasafety.mockRejectedValue(error);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('internal_error');
      expect(result.error.code).toBe('INTERNAL_ERROR');
      expect(result.error.details).toBe('Network error');
    });

    it('should handle validation errors', async () => {
      const result = await tool.execute({ appId: 'invalid-format' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.code).toBe('INVALID_PARAMS');
    });
  });

  describe('Raw Data Preservation', () => {
    it('should return complete raw response from google-play-scraper', async () => {
      const mockRawData = {
        dataShared: [
          {
            category: 'Personal info',
            types: ['Name', 'Email address', 'Phone number'],
            purposes: ['App functionality', 'Analytics', 'Advertising'],
            optional: false
          },
          {
            category: 'Financial info',
            types: ['Payment info'],
            purposes: ['App functionality'],
            optional: false
          }
        ],
        dataCollected: [
          {
            category: 'App activity',
            types: ['App interactions', 'In-app search history'],
            purposes: ['Analytics', 'Personalization'],
            optional: true
          },
          {
            category: 'Device or other IDs',
            types: ['Device or other IDs'],
            purposes: ['Analytics', 'Advertising'],
            optional: false
          }
        ],
        securityPractices: {
          dataEncrypted: true,
          dataCanBeDeleted: true,
          dataCanBeRequested: true,
          independentSecurityReview: false
        },
        metadata: {
          lastUpdated: '2023-12-01',
          version: '1.2.3'
        }
      };

      mockDatasafety.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(result.dataShared).toBeDefined();
      expect(result.dataCollected).toBeDefined();
      expect(result.securityPractices).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.dataShared.length).toBe(2);
      expect(result.dataCollected.length).toBe(2);
      expect(result.securityPractices.dataEncrypted).toBe(true);
    });

    it('should handle empty data safety information', async () => {
      const mockRawData = {
        dataShared: [],
        dataCollected: [],
        securityPractices: {},
        metadata: null
      };

      mockDatasafety.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result.dataShared)).toBe(true);
      expect(Array.isArray(result.dataCollected)).toBe(true);
      expect(result.dataShared.length).toBe(0);
      expect(result.dataCollected.length).toBe(0);
    });

    it('should preserve nested data structures', async () => {
      const mockRawData = {
        dataShared: [
          {
            category: 'Location',
            types: ['Approximate location', 'Precise location'],
            purposes: ['App functionality', 'Analytics'],
            optional: false,
            details: {
              description: 'Used for location-based features',
              retention: '30 days',
              sharing: {
                thirdParties: ['Analytics providers'],
                purposes: ['Performance monitoring']
              }
            }
          }
        ],
        dataCollected: [
          {
            category: 'Photos and videos',
            types: ['Photos', 'Videos'],
            purposes: ['App functionality'],
            optional: true,
            details: {
              description: 'Used for profile pictures and content sharing',
              retention: 'Until user deletes',
              processing: {
                automated: true,
                humanReview: false
              }
            }
          }
        ],
        securityPractices: {
          dataEncrypted: true,
          dataCanBeDeleted: true,
          dataCanBeRequested: true,
          independentSecurityReview: true,
          details: {
            encryptionMethod: 'AES-256',
            certifications: ['SOC 2', 'ISO 27001'],
            auditDate: '2023-11-15'
          }
        }
      };

      mockDatasafety.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(result.dataShared[0].details).toBeDefined();
      expect(result.dataShared[0].details.sharing).toBeDefined();
      expect(result.dataCollected[0].details.processing).toBeDefined();
      expect(result.securityPractices.details).toBeDefined();
      expect(result.securityPractices.details.certifications).toEqual(['SOC 2', 'ISO 27001']);
    });

    it('should handle different language responses', async () => {
      const mockRawData = {
        dataShared: [
          {
            category: 'Informations personnelles',
            types: ['Nom', 'Adresse e-mail'],
            purposes: ['Fonctionnalité de l\'application'],
            optional: false
          }
        ],
        dataCollected: [],
        securityPractices: {
          dataEncrypted: true,
          dataCanBeDeleted: true
        },
        language: 'fr'
      };

      mockDatasafety.mockResolvedValue(mockRawData);

      const result = await tool.execute({ 
        appId: 'com.example.app',
        lang: 'fr'
      });

      expect(result).toEqual(mockRawData);
      expect(result.language).toBe('fr');
      expect(result.dataShared[0].category).toBe('Informations personnelles');
      expect(mockDatasafety).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'fr'
      });
    });
  });
});