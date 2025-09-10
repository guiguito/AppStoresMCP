/**
 * Server Configuration Management
 * Handles environment variable configuration and default values
 */

export interface ServerConfig {
  port: number;
  logLevel: string;
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  scraping: {
    timeout: number;
    retries: number;
  };
  cors: {
    origins: string | string[];
  };
  server: {
    requestTimeout: number;
    enableLogging: boolean;
  };
  transport: {
    enableHttp: boolean;
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
      connectionTimeout: number;
      maxConnections: number;
      autoInitialize: boolean;
      initializationTimeout: number;
    };
  };
  tools: {
    enabledTools: Set<string>;
    disabledTools: Set<string>;
  };
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: 3000,
  logLevel: 'info',
  rateLimiting: {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  },
  scraping: {
    timeout: 30000, // 30 seconds
    retries: 3
  },
  cors: {
    origins: '*'
  },
  server: {
    requestTimeout: 60000, // 60 seconds
    enableLogging: true
  },
  transport: {
    enableHttp: true,
    enableSSE: true,
    https: {
      enabled: false
    },
    sse: {
      heartbeatInterval: 30000, // 30 seconds
      connectionTimeout: 300000, // 5 minutes
      maxConnections: 100,
      autoInitialize: true, // Default: enable automatic initialization
      initializationTimeout: 5000 // Default: 5 seconds
    }
  },
  tools: {
    enabledTools: new Set<string>(),
    disabledTools: new Set<string>()
  }
};

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): ServerConfig {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || String(DEFAULT_CONFIG.port), 10),
    logLevel: process.env.LOG_LEVEL || DEFAULT_CONFIG.logLevel,
    rateLimiting: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_CONFIG.rateLimiting.windowMs), 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || String(DEFAULT_CONFIG.rateLimiting.maxRequests), 10)
    },
    scraping: {
      timeout: parseInt(process.env.SCRAPING_TIMEOUT || String(DEFAULT_CONFIG.scraping.timeout), 10),
      retries: parseInt(process.env.SCRAPING_RETRIES || String(DEFAULT_CONFIG.scraping.retries), 10)
    },
    cors: {
      origins: process.env.CORS_ORIGINS ?
        process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) :
        DEFAULT_CONFIG.cors.origins
    },
    server: {
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || String(DEFAULT_CONFIG.server.requestTimeout), 10),
      enableLogging: process.env.ENABLE_LOGGING !== 'false'
    },
    transport: {
      enableHttp: process.env.ENABLE_HTTP_TRANSPORT !== 'false',
      enableSSE: process.env.ENABLE_SSE_TRANSPORT !== 'false',
      https: {
        enabled: process.env.HTTPS_ENABLED === 'true',
        ...(process.env.HTTPS_KEY_PATH && { keyPath: process.env.HTTPS_KEY_PATH }),
        ...(process.env.HTTPS_CERT_PATH && { certPath: process.env.HTTPS_CERT_PATH }),
        ...(process.env.HTTPS_CA_PATH && { caPath: process.env.HTTPS_CA_PATH }),
        ...(process.env.HTTPS_PASSPHRASE && { passphrase: process.env.HTTPS_PASSPHRASE })
      },
      sse: {
        heartbeatInterval: parseInt(process.env.SSE_HEARTBEAT_INTERVAL || String(DEFAULT_CONFIG.transport.sse.heartbeatInterval), 10),
        connectionTimeout: parseInt(process.env.SSE_CONNECTION_TIMEOUT || String(DEFAULT_CONFIG.transport.sse.connectionTimeout), 10),
        maxConnections: parseInt(process.env.SSE_MAX_CONNECTIONS || String(DEFAULT_CONFIG.transport.sse.maxConnections), 10),
        autoInitialize: process.env.SSE_AUTO_INITIALIZE !== 'false',
        initializationTimeout: parseInt(process.env.SSE_INITIALIZATION_TIMEOUT || String(DEFAULT_CONFIG.transport.sse.initializationTimeout), 10)
      }
    },
    tools: loadToolsConfig()
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config: ServerConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.rateLimiting.windowMs < 1000) {
    throw new Error(`Rate limiting window too small: ${config.rateLimiting.windowMs}ms. Must be at least 1000ms.`);
  }

  if (config.rateLimiting.maxRequests < 1) {
    throw new Error(`Rate limiting max requests too small: ${config.rateLimiting.maxRequests}. Must be at least 1.`);
  }

  if (config.scraping.timeout < 1000) {
    throw new Error(`Scraping timeout too small: ${config.scraping.timeout}ms. Must be at least 1000ms.`);
  }

  if (config.scraping.retries < 0) {
    throw new Error(`Scraping retries cannot be negative: ${config.scraping.retries}.`);
  }

  if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
    throw new Error(`Invalid log level: ${config.logLevel}. Must be one of: debug, info, warn, error.`);
  }

  // Validate transport configuration
  if (!config.transport.enableHttp) {
    throw new Error('HTTP transport must be enabled. SSE transport requires HTTP transport to serve endpoints.');
  }

  if (config.transport.sse.heartbeatInterval < 1000) {
    throw new Error(`SSE heartbeat interval too small: ${config.transport.sse.heartbeatInterval}ms. Must be at least 1000ms.`);
  }

  if (config.transport.sse.connectionTimeout < 10000) {
    throw new Error(`SSE connection timeout too small: ${config.transport.sse.connectionTimeout}ms. Must be at least 10000ms.`);
  }

  if (config.transport.sse.maxConnections < 1) {
    throw new Error(`SSE max connections too small: ${config.transport.sse.maxConnections}. Must be at least 1.`);
  }

  if (config.transport.sse.initializationTimeout < 1000) {
    throw new Error(`SSE initialization timeout too small: ${config.transport.sse.initializationTimeout}ms. Must be at least 1000ms.`);
  }

  // Validate HTTPS configuration
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
export function getConfigSummary(config: ServerConfig): Record<string, any> {
  return {
    port: config.port,
    logLevel: config.logLevel,
    rateLimitWindow: `${config.rateLimiting.windowMs}ms`,
    rateLimitMaxRequests: config.rateLimiting.maxRequests,
    scrapingTimeout: `${config.scraping.timeout}ms`,
    scrapingRetries: config.scraping.retries,
    corsOrigins: Array.isArray(config.cors.origins) ? config.cors.origins.join(', ') : config.cors.origins,
    requestTimeout: `${config.server.requestTimeout}ms`,
    loggingEnabled: config.server.enableLogging,
    httpTransportEnabled: config.transport.enableHttp,
    sseTransportEnabled: config.transport.enableSSE,
    sseHeartbeatInterval: `${config.transport.sse.heartbeatInterval}ms`,
    sseConnectionTimeout: `${config.transport.sse.connectionTimeout}ms`,
    sseMaxConnections: config.transport.sse.maxConnections,
    sseAutoInitialize: config.transport.sse.autoInitialize,
    sseInitializationTimeout: `${config.transport.sse.initializationTimeout}ms`,
    httpsEnabled: config.transport.https.enabled,
    httpsKeyPath: config.transport.https.enabled ? config.transport.https.keyPath : 'disabled',
    httpsCertPath: config.transport.https.enabled ? config.transport.https.certPath : 'disabled',
    enabledTools: config.tools.enabledTools.size > 0 ? Array.from(config.tools.enabledTools) : 'all',
    disabledTools: config.tools.disabledTools.size > 0 ? Array.from(config.tools.disabledTools) : 'none'
  };
}