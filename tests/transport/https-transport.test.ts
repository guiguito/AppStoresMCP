/**
 * HTTPS Transport Tests
 * Tests HTTPS functionality for the MCP server
 */

import { HTTPTransportHandler } from '../../src/transport/http-transport';
import { MCPRequest, MCPResponse } from '../../src/types/mcp';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

describe('HTTPS Transport', () => {
  let transport: HTTPTransportHandler;
  const testPort = 3443;
  const sslDir = path.join(__dirname, '../../ssl');
  const keyPath = path.join(sslDir, 'server.key');
  const certPath = path.join(sslDir, 'server.crt');

  beforeAll(() => {
    // Skip tests if SSL certificates don't exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log('⚠️  SSL certificates not found. Run ./scripts/generate-ssl-certs.sh to generate them.');
      return;
    }
  });

  afterEach(async () => {
    if (transport) {
      await transport.stop();
    }
  });

  it('should start HTTPS server with valid certificates', async () => {
    // Skip if certificates don't exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log('Skipping HTTPS test - certificates not found');
      return;
    }

    transport = new HTTPTransportHandler({
      port: testPort,
      enableLogging: false,
      https: {
        enabled: true,
        keyPath,
        certPath
      }
    });

    // Set up a mock request handler
    transport.setRequestHandler(async (request: MCPRequest): Promise<MCPResponse> => {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { message: 'HTTPS test successful' }
      };
    });

    await expect(transport.start()).resolves.not.toThrow();
  });

  it('should handle HTTPS requests correctly', async () => {
    // Skip if certificates don't exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.log('Skipping HTTPS request test - certificates not found');
      return;
    }

    transport = new HTTPTransportHandler({
      port: testPort,
      enableLogging: false,
      https: {
        enabled: true,
        keyPath,
        certPath
      }
    });

    // Set up a mock request handler
    transport.setRequestHandler(async (request: MCPRequest): Promise<MCPResponse> => {
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: { 
          method: request.method,
          params: request.params,
          httpsEnabled: true
        }
      };
    });

    await transport.start();

    // Make HTTPS request
    const requestData = JSON.stringify({
      jsonrpc: '2.0',
      id: 'test-https-1',
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      }
    });

    const response = await new Promise<string>((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: testPort,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestData)
        },
        // Ignore self-signed certificate errors for testing
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(requestData);
      req.end();
    });

    const parsedResponse = JSON.parse(response);
    expect(parsedResponse.jsonrpc).toBe('2.0');
    expect(parsedResponse.id).toBe('test-https-1');
    expect(parsedResponse.result.httpsEnabled).toBe(true);
    expect(parsedResponse.result.method).toBe('initialize');
  });

  it('should fail to start with invalid certificate paths', async () => {
    transport = new HTTPTransportHandler({
      port: testPort,
      enableLogging: false,
      https: {
        enabled: true,
        keyPath: '/invalid/path/key.pem',
        certPath: '/invalid/path/cert.pem'
      }
    });

    await expect(transport.start()).rejects.toThrow();
  });

  it('should fail to start when HTTPS enabled but no certificates provided', async () => {
    transport = new HTTPTransportHandler({
      port: testPort,
      enableLogging: false,
      https: {
        enabled: true
        // Missing keyPath and certPath
      }
    });

    await expect(transport.start()).rejects.toThrow('HTTPS key and certificate paths are required');
  });
});