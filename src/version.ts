/**
 * Server name and version, read from package.json at runtime so MCP serverInfo and /health
 * never drift from the released version (works from src/ under ts-jest and from dist/).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { name: string; version: string };

export const SERVER_NAME: string = pkg.name;
export const SERVER_VERSION: string = pkg.version;
