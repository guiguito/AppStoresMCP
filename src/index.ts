/**
 * Main entry point for the App Store MCP Server
 */

import { MCPServer } from './server';
import { loadConfig } from './config/server-config';

async function main(): Promise<void> {
  const server = new MCPServer(loadConfig());
  await server.start();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', type: 'shutdown_signal', signal }));
    await server.stop();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      type: 'application_start_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }));
    process.exit(1);
  });
}

export { MCPServer } from './server';
export { loadConfig } from './config/server-config';
