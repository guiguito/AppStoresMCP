/**
 * Tool Configuration Tests
 */

import { loadConfig, isToolEnabled } from '../../../src/config/server-config';

describe('Tool Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.ENABLED_TOOLS;
    delete process.env.DISABLED_TOOLS;
    
    // Clear individual tool environment variables
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('ENABLE_TOOL_') || key.startsWith('DISABLE_TOOL_')) {
        delete process.env[key];
      }
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Default Behavior', () => {
    it('should enable all tools by default', () => {
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
      expect(isToolEnabled('google-play-app-details', config)).toBe(true);
      expect(isToolEnabled('app-store-app-details', config)).toBe(true);
    });
  });

  describe('DISABLED_TOOLS Configuration', () => {
    it('should disable tools listed in DISABLED_TOOLS', () => {
      process.env.DISABLED_TOOLS = 'google-play-search,app-store-reviews';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false);
      expect(isToolEnabled('app-store-reviews', config)).toBe(false);
      expect(isToolEnabled('google-play-app-details', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
    });

    it('should handle whitespace in DISABLED_TOOLS', () => {
      process.env.DISABLED_TOOLS = ' google-play-search , app-store-reviews ';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false);
      expect(isToolEnabled('app-store-reviews', config)).toBe(false);
    });

    it('should ignore empty values in DISABLED_TOOLS', () => {
      process.env.DISABLED_TOOLS = 'google-play-search,,app-store-reviews,';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false);
      expect(isToolEnabled('app-store-reviews', config)).toBe(false);
      expect(isToolEnabled('google-play-app-details', config)).toBe(true);
    });
  });

  describe('ENABLED_TOOLS Configuration', () => {
    it('should enable only tools listed in ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = 'google-play-search,app-store-search';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
      expect(isToolEnabled('google-play-app-details', config)).toBe(false);
      expect(isToolEnabled('app-store-app-details', config)).toBe(false);
    });

    it('should handle whitespace in ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = ' google-play-search , app-store-search ';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
      expect(isToolEnabled('google-play-app-details', config)).toBe(false);
    });
  });

  describe('Individual Tool Controls', () => {
    it('should handle DISABLE_TOOL_* environment variables', () => {
      process.env.DISABLE_TOOL_GOOGLE_PLAY_SEARCH = 'true';
      process.env.DISABLE_TOOL_APP_STORE_REVIEWS = 'true';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false);
      expect(isToolEnabled('app-store-reviews', config)).toBe(false);
      expect(isToolEnabled('google-play-app-details', config)).toBe(true);
    });

    it('should handle ENABLE_TOOL_* environment variables', () => {
      process.env.ENABLED_TOOLS = 'google-play-search'; // Restrictive list
      process.env.ENABLE_TOOL_APP_STORE_SEARCH = 'true'; // Override
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
      expect(isToolEnabled('google-play-app-details', config)).toBe(false);
    });

    it('should convert underscores to hyphens in tool names', () => {
      process.env.DISABLE_TOOL_GOOGLE_PLAY_APP_DETAILS = 'true';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-app-details', config)).toBe(false);
    });

    it('should ignore invalid boolean values', () => {
      process.env.DISABLE_TOOL_GOOGLE_PLAY_SEARCH = 'invalid';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
    });
  });

  describe('Priority Rules', () => {
    it('should prioritize DISABLED_TOOLS over ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = 'google-play-search,app-store-search';
      process.env.DISABLED_TOOLS = 'google-play-search';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false); // Disabled wins
      expect(isToolEnabled('app-store-search', config)).toBe(true);
    });

    it('should prioritize individual DISABLE_TOOL_* over ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = 'google-play-search,app-store-search';
      process.env.DISABLE_TOOL_GOOGLE_PLAY_SEARCH = 'true';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(false); // Individual disable wins
      expect(isToolEnabled('app-store-search', config)).toBe(true);
    });

    it('should allow individual ENABLE_TOOL_* to override ENABLED_TOOLS restriction', () => {
      process.env.ENABLED_TOOLS = 'google-play-search'; // Only this tool
      process.env.ENABLE_TOOL_APP_STORE_SEARCH = 'true'; // Add this tool
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('app-store-search', config)).toBe(true);
      expect(isToolEnabled('google-play-app-details', config)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ENABLED_TOOLS', () => {
      process.env.ENABLED_TOOLS = '';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
    });

    it('should handle empty DISABLED_TOOLS', () => {
      process.env.DISABLED_TOOLS = '';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
    });

    it('should handle non-existent tool names gracefully', () => {
      process.env.DISABLED_TOOLS = 'non-existent-tool';
      const config = loadConfig();
      
      expect(isToolEnabled('google-play-search', config)).toBe(true);
      expect(isToolEnabled('non-existent-tool', config)).toBe(false);
    });
  });
});