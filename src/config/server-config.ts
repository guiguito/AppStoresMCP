/**
 * Server Configuration Management
 * Handles environment variable configuration and default values
 */

export interface ServerConfig {
  port: number;
  cors: {
    /** Allowed browser origins; empty = no CORS headers and any Origin header is rejected, ['*'] = allow all */
    origins: string[];
  };
  server: {
    requestTimeout: number;
    enableLogging: boolean;
    /** Express "trust proxy" setting (hop count or value); needed behind a reverse proxy so rate limits apply per client IP */
    trustProxy?: number | string | undefined;
  };
  /** Per-IP request limit on /mcp and /sse; omitted or maxRequests 0 = disabled */
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
  transport: {
    enableSSE: boolean;
    https: {
      enabled: boolean;
      keyPath?: string | undefined;
      certPath?: string | undefined;
      caPath?: string | undefined;
      passphrase?: string | undefined;
    };
    sse: {
      heartbeatInterval: number;
      maxConnections: number;
    };
  };
  tools: {
    enabledTools: Set<string>;
    disabledTools: Set<string>;
  };
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): ServerConfig {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000', 10),
    cors: {
      origins: (process.env.CORS_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)
    },
    server: {
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '60000', 10),
      enableLogging: process.env.ENABLE_LOGGING !== 'false',
      ...(process.env.TRUST_PROXY && {
        trustProxy: /^\d+$/.test(process.env.TRUST_PROXY) ? parseInt(process.env.TRUST_PROXY, 10) : process.env.TRUST_PROXY
      })
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
    },
    transport: {
      enableSSE: process.env.ENABLE_SSE_TRANSPORT !== 'false',
      https: {
        enabled: process.env.HTTPS_ENABLED === 'true',
        ...(process.env.HTTPS_KEY_PATH && { keyPath: process.env.HTTPS_KEY_PATH }),
        ...(process.env.HTTPS_CERT_PATH && { certPath: process.env.HTTPS_CERT_PATH }),
        ...(process.env.HTTPS_CA_PATH && { caPath: process.env.HTTPS_CA_PATH }),
        ...(process.env.HTTPS_PASSPHRASE && { passphrase: process.env.HTTPS_PASSPHRASE })
      },
      sse: {
        heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL || '30000', 10),
        maxConnections: parseInt(process.env.SSE_MAX_CONNECTIONS || '100', 10)
      }
    },
    tools: loadToolsConfig()
  };

  validateConfig(config);
  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config: ServerConfig): void {
  if (!(config.port >= 1 && config.port <= 65535)) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.rateLimit && !(config.rateLimit.maxRequests >= 0 && config.rateLimit.windowMs >= 1000)) {
    throw new Error('Invalid rate limit: RATE_LIMIT_MAX_REQUESTS must be >= 0 (0 disables) and RATE_LIMIT_WINDOW_MS >= 1000.');
  }

  if (!(config.transport.sse.heartbeatInterval >= 1000)) {
    throw new Error(`SSE heartbeat interval too small: ${config.transport.sse.heartbeatInterval}ms. Must be at least 1000ms.`);
  }

  if (!(config.transport.sse.maxConnections >= 1)) {
    throw new Error(`SSE max connections too small: ${config.transport.sse.maxConnections}. Must be at least 1.`);
  }

  if (config.transport.https.enabled) {
    if (!config.transport.https.keyPath) {
      throw new Error('HTTPS key path is required when HTTPS is enabled. Set HTTPS_KEY_PATH environment variable.');
    }
    if (!config.transport.https.certPath) {
      throw new Error('HTTPS certificate path is required when HTTPS is enabled. Set HTTPS_CERT_PATH environment variable.');
    }
  }
}

/**
 * Load tools configuration from environment variables
 */
function loadToolsConfig(): { enabledTools: Set<string>; disabledTools: Set<string> } {
  const enabledTools = new Set<string>();
  const disabledTools = new Set<string>();

  // Parse ENABLED_TOOLS environment variable (comma-separated list)
  if (process.env.ENABLED_TOOLS) {
    const tools = process.env.ENABLED_TOOLS.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
    tools.forEach(tool => enabledTools.add(tool));
  }

  // Parse DISABLED_TOOLS environment variable (comma-separated list)
  if (process.env.DISABLED_TOOLS) {
    const tools = process.env.DISABLED_TOOLS.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0);
    tools.forEach(tool => disabledTools.add(tool));
  }

  // Check for individual tool environment variables (ENABLE_TOOL_<TOOL_NAME> or DISABLE_TOOL_<TOOL_NAME>)
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('ENABLE_TOOL_')) {
      const toolName = key.replace('ENABLE_TOOL_', '').toLowerCase().replace(/_/g, '-');
      if (process.env[key] === 'true') {
        enabledTools.add(toolName);
      } else if (process.env[key] === 'false') {
        disabledTools.add(toolName);
      }
    } else if (key.startsWith('DISABLE_TOOL_')) {
      const toolName = key.replace('DISABLE_TOOL_', '').toLowerCase().replace(/_/g, '-');
      if (process.env[key] === 'true') {
        disabledTools.add(toolName);
      } else if (process.env[key] === 'false') {
        enabledTools.add(toolName);
      }
    }
  });

  return { enabledTools, disabledTools };
}

/**
 * Check if a tool should be enabled based on configuration
 */
export function isToolEnabled(toolName: string, config: ServerConfig): boolean {
  // If tool is explicitly disabled, return false
  if (config.tools.disabledTools.has(toolName)) {
    return false;
  }

  // If there are enabled tools specified and this tool is not in the list, return false
  if (config.tools.enabledTools.size > 0 && !config.tools.enabledTools.has(toolName)) {
    return false;
  }

  // Otherwise, tool is enabled by default
  return true;
}

/**
 * Get environment-specific configuration summary for logging
 */
export function getConfigSummary(config: ServerConfig): Record<string, unknown> {
  return {
    port: config.port,
    corsOrigins: config.cors.origins.length > 0 ? config.cors.origins.join(', ') : 'none',
    requestTimeout: `${config.server.requestTimeout}ms`,
    rateLimit: config.rateLimit && config.rateLimit.maxRequests > 0 ? `${config.rateLimit.maxRequests} req / ${config.rateLimit.windowMs}ms per IP` : "disabled",
    loggingEnabled: config.server.enableLogging,
    sseTransportEnabled: config.transport.enableSSE,
    sseHeartbeatInterval: `${config.transport.sse.heartbeatInterval}ms`,
    sseMaxConnections: config.transport.sse.maxConnections,
    httpsEnabled: config.transport.https.enabled,
    enabledTools: config.tools.enabledTools.size > 0 ? Array.from(config.tools.enabledTools) : 'all',
    disabledTools: config.tools.disabledTools.size > 0 ? Array.from(config.tools.disabledTools) : 'none'
  };
}
