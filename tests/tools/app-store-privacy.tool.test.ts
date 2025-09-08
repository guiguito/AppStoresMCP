/**
 * Unit tests for Apple App Store Privacy MCP Tool
 */

import { AppStorePrivacyTool } from '../../src/tools/app-store-privacy.tool';

// Mock app-store-scraper
jest.mock('app-store-scraper', () => ({
  privacy: jest.fn()
}));

const mockStore = require('app-store-scraper');

describe('AppStorePrivacyTool', () => {
  let tool: AppStorePrivacyTool;

  beforeEach(() => {
    tool = new AppStorePrivacyTool();
    jest.clearAllMocks();
  });

  describe('Tool Properties', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('app-store-privacy');
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
    it('should define required id parameter', () => {
      const idProperty = tool.inputSchema.properties?.id as any;
      expect(idProperty).toBeTruthy();
      expect(idProperty.type).toBe('string');
      expect(idProperty.pattern).toBe('^\\d+$');
      expect(tool.inputSchema.required).toContain('id');
    });

    it('should not allow additional properties', () => {
      expect(tool.inputSchema.additionalProperties).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    it('should require id parameter', async () => {
      await expect(tool.execute({} as any)).rejects.toThrow('id is required and must be a non-empty string');
      await expect(tool.execute({ id: '' })).rejects.toThrow('id is required and must be a non-empty string');
      await expect(tool.execute({ id: '   ' })).rejects.toThrow('id is required and must be a non-empty string');
    });

    it('should validate id parameter type', async () => {
      await expect(tool.execute({ id: 123 as any })).rejects.toThrow('id is required and must be a non-empty string');
      await expect(tool.execute({ id: null as any })).rejects.toThrow('id is required and must be a non-empty string');
    });

    it('should validate id parameter format', async () => {
      await expect(tool.execute({ id: 'abc123' })).rejects.toThrow('id must be a numeric string for Apple App Store');
      await expect(tool.execute({ id: '123abc' })).rejects.toThrow('id must be a numeric string for Apple App Store');
      await expect(tool.execute({ id: 'com.example.app' })).rejects.toThrow('id must be a numeric string for Apple App Store');
    });

    it('should accept valid numeric id', async () => {
      const mockResponse = { privacyTypes: [] };
      mockStore.privacy.mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('Tool Execution', () => {
    it('should call app-store-scraper privacy with correct parameters', async () => {
      const mockResponse = {
        privacyTypes: [
          { identifier: 'NSLocationWhenInUseUsageDescription', category: 'Location' },
          { identifier: 'NSCameraUsageDescription', category: 'Camera' }
        ]
      };
      mockStore.privacy.mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(mockStore.privacy).toHaveBeenCalledWith({
        id: '123456789'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle different app IDs', async () => {
      const mockResponse = { privacyTypes: [] };
      mockStore.privacy.mockResolvedValue(mockResponse);

      await tool.execute({ id: '987654321' });

      expect(mockStore.privacy).toHaveBeenCalledWith({
        id: '987654321'
      });
    });

    it('should return raw response from app-store-scraper', async () => {
      const mockResponse = {
        privacyTypes: [
          {
            identifier: 'NSLocationWhenInUseUsageDescription',
            category: 'Location',
            purposes: ['App Functionality'],
            dataType: 'Precise Location'
          },
          {
            identifier: 'NSCameraUsageDescription',
            category: 'Camera',
            purposes: ['App Functionality'],
            dataType: 'Camera'
          }
        ],
        metadata: {
          appId: '123456789',
          lastUpdated: '2023-01-01'
        }
      };
      mockStore.privacy.mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result).toBe(mockResponse); // Should be the exact same object
    });

    it('should propagate errors from app-store-scraper', async () => {
      const error = new Error('App not found');
      mockStore.privacy.mockRejectedValue(error);

      await expect(tool.execute({ id: '999999999' })).rejects.toThrow('App not found');
    });

    it('should handle empty privacy data', async () => {
      const mockResponse = { privacyTypes: [] };
      mockStore.privacy.mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual({ privacyTypes: [] });
    });

    it('should handle complex privacy data structures', async () => {
      const mockResponse = {
        privacyTypes: [
          {
            identifier: 'NSLocationWhenInUseUsageDescription',
            category: 'Location',
            purposes: ['App Functionality', 'Analytics'],
            dataType: 'Precise Location',
            linked: true,
            tracking: false
          }
        ],
        privacyLabels: {
          dataUsedToTrackYou: [],
          dataLinkedToYou: ['Location'],
          dataNotLinkedToYou: []
        }
      };
      mockStore.privacy.mockResolvedValue(mockResponse);

      const result = await tool.execute({ id: '123456789' });

      expect(result).toEqual(mockResponse);
      expect(result.privacyLabels).toBeDefined();
      expect(result.privacyTypes[0].linked).toBe(true);
    });
  });
});