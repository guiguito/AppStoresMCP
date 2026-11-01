/**
 * HTTP Transport Layer for MCP Streamable HTTP (POST /mcp), plus routing for the legacy SSE transport
 */

import express, { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import { MCPErrorCode } from '../types/mcp';
import { isValidMCPRequest } from '../protocol/mcp-handler';
import { errorResponse, logError } from '../errors/error-handler';
import { SSETransportHandler, MCPRequestHandler } from './sse-transport';

export interface HTTPTransportConfig {
  port: number;
  /** Allowed browser origins; empty/undefined = none, ['*'] = all */
  corsOrigins?: string[];
  enableLogging?: boolean;
  requestTimeout?: number;
  https?: {
    enabled: boolean;
    keyPath?: string | undefined;
    certPath?: string | undefined;
    caPath?: string | undefined;
    passphrase?: string | undefined;
  };
}

export class HTTPTransportHandler {
  private app: express.Application;
  private server: http.Server | https.Server | undefined;
  private origins: string[];

  constructor(
    private config: HTTPTransportConfig,
    private requestHandler: MCPRequestHandler,
    sseHandler?: SSETransportHandler
  ) {
    this.origins = config.corsOrigins ?? [];
    this.app = express();

    this.app.use(helmet());
    if (this.origins.length > 0) {
      this.app.use(cors({ origin: this.origins.includes('*') ? '*' : this.origins }));
    }
    this.app.use(express.json({ limit: '1mb' }));
    if (config.enableLogging !== false) {
      this.app.use(this.requestLoggingMiddleware);
    }
    this.app.use(['/mcp', '/sse'], this.originGuard);

    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    this.app.post('/mcp', this.timeoutMiddleware, (req: Request, res: Response) => this.handleMCPRequest(req, res));

    if (sseHandler) {
      this.app.get('/sse', sseHandler.handleSSEConnection);
      this.app.post('/sse/:connectionId/message', sseHandler.handleMessage);
    }

    this.app.use((req: Request, res: Response) => {
      res.status(404).json(errorResponse(null, MCPErrorCode.METHOD_NOT_FOUND, `Route not found: ${req.method} ${req.path}`));
    });
    this.app.use(this.errorHandler);
  }

  /**
   * Reject browser requests from origins that are not explicitly allowed (DNS-rebinding protection).
   * Requests without an Origin header (non-browser clients) pass.
   */
  private originGuard: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (!origin || this.origins.includes('*') || this.origins.includes(origin)) {
      next();
      return;
    }
    res.status(403).json(errorResponse(null, MCPErrorCode.INVALID_REQUEST, 'Origin not allowed'));
  };

  private requestLoggingMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    res.on('finish', () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        type: 'http_request',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${Date.now() - startTime}ms`
      }));
    });
    next();
  };

  private timeoutMiddleware: RequestHandler = (_req: Request, res: Response, next: NextFunction): void => {
    if (!this.config.requestTimeout) {
      next();
      return;
    }
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json(errorResponse(null, MCPErrorCode.INTERNAL_ERROR, 'Request timeout'));
      }
    }, this.config.requestTimeout);
    res.on('close', () => clearTimeout(timeout));
    next();
  };

  private async handleMCPRequest(req: Request, res: Response): Promise<void> {
    if (!isValidMCPRequest(req.body)) {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        type: 'invalid_mcp_request',
        bodyKeys: req.body && typeof req.body === 'object' ? Object.keys(req.body) : typeof req.body
      }));
      res.status(400).json(errorResponse(null, MCPErrorCode.INVALID_REQUEST, 'Invalid MCP request format'));
      return;
    }

    const response = await this.requestHandler(req.body);

    // The timeout middleware may already have answered
    if (res.headersSent) {
      return;
    }
    if (response) {
      res.json(response);
    } else {
      res.status(202).end();
    }
  }

  // Express only treats 4-argument middleware as an error handler, so `_next` must stay
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private errorHandler: ErrorRequestHandler = (error: any, _req: Request, res: Response, _next: NextFunction): void => {
    const status: number = error.status || error.statusCode || 500;
    if (status >= 500) {
      logError('unhandled_error', error);
    }
    if (res.headersSent) {
      return;
    }
    if (error.type === 'entity.parse.failed') {
      res.status(400).json(errorResponse(null, MCPErrorCode.PARSE_ERROR, 'Parse error'));
    } else if (status < 500) {
      res.status(status).json(errorResponse(null, MCPErrorCode.INVALID_REQUEST, error.message));
    } else {
      res.status(500).json(errorResponse(null, MCPErrorCode.INTERNAL_ERROR, 'Internal server error'));
    }
  };

  private createHttpsOptions(): https.ServerOptions {
    const { keyPath, certPath, caPath, passphrase } = this.config.https!;
    if (!keyPath || !certPath) {
      throw new Error('HTTPS key and certificate paths are required');
    }
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
      ...(caPath && { ca: fs.readFileSync(caPath) }),
      ...(passphrase && { passphrase })
    };
  }

  public async start(): Promise<void> {
    const isHttps = this.config.https?.enabled === true;
    const server = isHttps ? https.createServer(this.createHttpsOptions(), this.app) : http.createServer(this.app);
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(this.config.port, () => {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'info',
          type: 'server_start',
          message: `MCP ${isHttps ? 'HTTPS' : 'HTTP'} transport listening on port ${this.config.port}`,
          port: this.config.port,
          httpsEnabled: isHttps
        }));
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    const server = this.server;
    if (!server) {
      return;
    }
    this.server = undefined;
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
  }

  /**
   * Express app (used by tests via supertest)
   */
  public getApp(): express.Application {
    return this.app;
  }
}
