/**
 * Tool Configuration Utilities
 * Provides helper functions for managing tool enabling/disabling
 */

/**
 * Available MCP tools in the system
 */
export const AVAILABLE_TOOLS = [
  // Google Play Store tools
  'google-play-app-details',
  'google-play-app-reviews',
  'google-play-search',
  'google-play-list',
  'google-play-developer',
  'google-play-suggest',
  'google-play-similar',
  'google-play-permissions',
  'google-play-datasafety',
  'google-play-categories',
  
  // Apple App Store tools
  'app-store-app-details',
  'app-store-app-reviews',
  'app-store-search',
  'app-store-list',
  'app-store-developer',
  'app-store-privacy',
  'app-store-suggest',
  'app-store-similar',
  'app-store-ratings'
] as const;

export type ToolName = typeof AVAILABLE_TOOLS[number];

/**
 * Tool categories for easier management
 */
export const TOOL_CATEGORIES = {
  GOOGLE_PLAY: AVAILABLE_TOOLS.filter(tool => tool.startsWith('google-play-')),
  APP_STORE: AVAILABLE_TOOLS.filter(tool => tool.startsWith('app-store-')),
  SEARCH: AVAILABLE_TOOLS.filter(tool => tool.includes('-search')),
  DETAILS: AVAILABLE_TOOLS.filter(tool => tool.includes('-app-details')),
  REVIEWS: AVAILABLE_TOOLS.filter(tool => tool.includes('-app-reviews')),
  DEVELOPER: AVAILABLE_TOOLS.filter(tool => tool.includes('-developer')),
  LIST: AVAILABLE_TOOLS.filter(tool => tool.includes('-list')),
  SUGGEST: AVAILABLE_TOOLS.filter(tool => tool.includes('-suggest')),
  SIMILAR: AVAILABLE_TOOLS.filter(tool => tool.includes('-similar'))
} as const;

/**
 * Generate environment variable name for enabling a tool
 */
export function getEnableToolEnvVar(toolName: string): string {
  return `ENABLE_TOOL_${toolName.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Generate environment variable name for disabling a tool
 */
export function getDisableToolEnvVar(toolName: string): string {
  return `DISABLE_TOOL_${toolName.toUpperCase().replace(/-/g, '_')}`;
}

/**
 * Validate if a tool name is valid
 */
export function isValidToolName(toolName: string): toolName is ToolName {
  return AVAILABLE_TOOLS.includes(toolName as ToolName);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(category: keyof typeof TOOL_CATEGORIES): readonly string[] {
  return TOOL_CATEGORIES[category];
}

/**
 * Generate docker-compose environment variables for disabling specific tools
 */
export function generateDockerComposeToolConfig(options: {
  disabledTools?: string[];
  enabledTools?: string[];
  individualControls?: Record<string, boolean>;
}): string[] {
  const envVars: string[] = [];

  if (options.disabledTools && options.disabledTools.length > 0) {
    envVars.push(`- DISABLED_TOOLS=\${DISABLED_TOOLS:-${options.disabledTools.join(',')}}`);
  }

  if (options.enabledTools && options.enabledTools.length > 0) {
    envVars.push(`- ENABLED_TOOLS=\${ENABLED_TOOLS:-${options.enabledTools.join(',')}}`);
  }

  if (options.individualControls) {
    Object.entries(options.individualControls).forEach(([toolName, enabled]) => {
      if (isValidToolName(toolName)) {
        const envVar = enabled ? getEnableToolEnvVar(toolName) : getDisableToolEnvVar(toolName);
        envVars.push(`- ${envVar}=\${${envVar}:-${enabled}}`);
      }
    });
  }

  return envVars;
}

/**
 * Parse tool configuration from environment variables (for debugging)
 */
export function parseToolConfigFromEnv(): {
  enabledTools: string[];
  disabledTools: string[];
  individualControls: Record<string, boolean>;
} {
  const enabledTools: string[] = [];
  const disabledTools: string[] = [];
  const individualControls: Record<string, boolean> = {};

  // Parse ENABLED_TOOLS
  if (process.env.ENABLED_TOOLS) {
    enabledTools.push(...process.env.ENABLED_TOOLS.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0));
  }

  // Parse DISABLED_TOOLS
  if (process.env.DISABLED_TOOLS) {
    disabledTools.push(...process.env.DISABLED_TOOLS.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0));
  }

  // Parse individual tool controls
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('ENABLE_TOOL_') || key.startsWith('DISABLE_TOOL_')) {
      const toolName = key.replace(/^(ENABLE|DISABLE)_TOOL_/, '').toLowerCase().replace(/_/g, '-');
      if (isValidToolName(toolName)) {
        const value = process.env[key];
        if (value === 'true' || value === 'false') {
          individualControls[toolName] = key.startsWith('ENABLE_TOOL_') ? value === 'true' : value === 'false';
        }
      }
    }
  });

  return { enabledTools, disabledTools, individualControls };
}