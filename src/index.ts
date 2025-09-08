/**
 * Main entry point for the App Store MCP Server
 * Initializes and starts the server with configuration management
 */

import { MCPServer } from './server';
import { loadConfig } from './config/server-config';

/**
 * Main function to start the MCP server
 */
async function main(): Promise<void> {
  try {
    // Load configuration from environment variables
    const config = loadConfig();
    
    // Create and start the MCP server
    const server = new MCPServer(config);
    await server.start();

    // Log startup success
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      type: 'application_started',
      message: 'App Store MCP Server application started successfully',
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform
    }));

  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'application_start_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }));
    
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'main_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }));
    process.exit(1);
  });
}

// Export for testing
export { MCPServer } from './server';
export { loadConfig } from './config/server-config';