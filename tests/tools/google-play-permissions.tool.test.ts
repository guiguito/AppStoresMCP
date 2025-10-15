/**
 * Unit tests for Google Play Permissions MCP Tool
 */

import { GooglePlayPermissionsTool } from '../../src/tools/google-play-permissions.tool';
import { mockPermissions } from '../__mocks__/google-play-scraper-ts';

describe('GooglePlayPermissionsTool', () => {
  let tool: GooglePlayPermissionsTool;

  beforeEach(() => {
    tool = new GooglePlayPermissionsTool();
    jest.clearAllMocks();
  });

  describe('Tool Configuration', () => {
    it('should have correct name and description', () => {
      expect(tool.name).toBe('google-play-permissions');
      expect(tool.description).toBe('Get app permissions information from Google Play Store');
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
      expect(properties.short).toBeDefined();
    });
  });

  describe('Parameter Validation', () => {
    it('should accept valid parameters', async () => {
      const mockPermissionsData = [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA'
      ];
      mockPermissions.mockResolvedValue(mockPermissionsData);

      const result = await tool.execute({
        appId: 'com.example.app',
        lang: 'en',
        short: false
      });

      expect(result).toEqual(mockPermissionsData);
      expect(mockPermissions).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        short: false
      });
    });

    it('should use default values for optional parameters', async () => {
      const mockPermissionsData = ['android.permission.INTERNET'];
      mockPermissions.mockResolvedValue(mockPermissionsData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockPermissionsData);
      expect(mockPermissions).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        short: false
      });
    });

    it('should handle short parameter correctly', async () => {
      const mockPermissionsData = ['INTERNET', 'CAMERA'];
      mockPermissions.mockResolvedValue(mockPermissionsData);

      const result = await tool.execute({ 
        appId: 'com.example.app',
        short: true
      });

      expect(result).toEqual(mockPermissionsData);
      expect(mockPermissions).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        short: true
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
      const mockPermissionsData = ['android.permission.INTERNET'];
      mockPermissions.mockResolvedValue(mockPermissionsData);

      const validAppIds = [
        'com.example.app',
        'com.company.product.app',
        'org.apache.commons.lang3',
        'io.github.user.project'
      ];

      for (const appId of validAppIds) {
        mockPermissions.mockClear();
        const result = await tool.execute({ appId });
        expect(result).toEqual(mockPermissionsData);
      }
    });

    it('should reject invalid lang parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', lang: 'invalid' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('lang must be a valid 2-letter language code');
    });

    it('should reject invalid short parameter', async () => {
      const result = await tool.execute({ appId: 'com.example.app', short: 'invalid' as any });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('validation_error');
      expect(result.error.message).toContain('short must be a boolean value');
    });
  });

  describe('Error Handling', () => {
    it('should handle app not found errors', async () => {
      const error = new Error('App not found');
      mockPermissions.mockRejectedValue(error);

      const result = await tool.execute({ appId: 'com.nonexistent.app' });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe('not_found');
      expect(result.error.code).toBe('APP_NOT_FOUND');
      expect(result.error.message).toContain('com.nonexistent.app');
    });

    it('should handle google-play-scraper errors', async () => {
      const error = new Error('Network error');
      mockPermissions.mockRejectedValue(error);

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
      const mockRawData = [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION'
      ];

      mockPermissions.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(8);
      expect(result).toContain('android.permission.INTERNET');
      expect(result).toContain('android.permission.CAMERA');
    });

    it('should handle short permission names', async () => {
      const mockRawData = [
        'INTERNET',
        'CAMERA',
        'RECORD_AUDIO',
        'WRITE_EXTERNAL_STORAGE'
      ];

      mockPermissions.mockResolvedValue(mockRawData);

      const result = await tool.execute({ 
        appId: 'com.example.app',
        short: true
      });

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      expect(result).toContain('INTERNET');
      expect(result).toContain('CAMERA');
    });

    it('should handle empty permissions list', async () => {
      const mockRawData: string[] = [];

      mockPermissions.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should preserve complex permission data structures', async () => {
      const mockRawData = {
        permissions: [
          {
            name: 'android.permission.INTERNET',
            description: 'Allows the app to create network sockets and use custom network protocols.',
            category: 'Network communication',
            dangerous: false
          },
          {
            name: 'android.permission.CAMERA',
            description: 'Allows the app to take pictures and videos with the camera.',
            category: 'Hardware controls',
            dangerous: true
          }
        ],
        metadata: {
          totalCount: 2,
          dangerousCount: 1
        }
      };

      mockPermissions.mockResolvedValue(mockRawData);

      const result = await tool.execute({ appId: 'com.example.app' });

      expect(result).toEqual(mockRawData);
      expect(result.permissions).toBeDefined();
      expect(result.permissions.length).toBe(2);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.totalCount).toBe(2);
      expect(result.metadata.dangerousCount).toBe(1);
    });
  });
});