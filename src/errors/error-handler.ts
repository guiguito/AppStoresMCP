/**
 * Comprehensive error handling system for MCP server
 * Provides centralized error handling, categorization, and structured responses
 */

import { v4 as uuidv4 } from 'uuid';
import { MCPError, MCPErrorCode } from '../types/mcp';

/**
 * Error categories for classification and handling
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  RATE_LIMITING = 'rate_limiting',
  NETWORK = 'network',
  INTERNAL = 'internal'
}

/**
 * Error severity levels for logging and monitoring
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Structured error information for logging and debugging
 */
export interface ErrorInfo {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  timestamp: Date;
  correlationId?: string;
  context?: Record<string, any>;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Error response structure for MCP clients
 */
export interface StructuredErrorResponse {
  error: MCPError;
  errorInfo: {
    id: string;
    category: ErrorCategory;
    timestamp: string;
    correlationId?: string;
    retryable: boolean;
  };
}

/**
 * Centralized error handler class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private logger: ErrorLogger;

  private constructor() {
    this.logger = new ErrorLogger();
  }

  /**
   * Get singleton instance of ErrorHandler
   */
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and categorize errors, returning structured MCP error response
   */
  public handleError(
    error: any,
    correlationId?: string,
    context?: Record<string, any>
  ): StructuredErrorResponse {
    const errorInfo = this.categorizeError(error, correlationId, context);
    
    // Log the error
    this.logger.logError(errorInfo);

    // Create MCP error response
    const mcpError: MCPError = {
      code: this.getMCPErrorCode(errorInfo.category),
      message: errorInfo.message,
      data: {
        category: errorInfo.category,
        errorId: errorInfo.id,
        retryable: errorInfo.retryable,
        ...(context && { context })
      }
    };

    return {
      error: mcpError,
      errorInfo: {
        id: errorInfo.id,
        category: errorInfo.category,
        timestamp: errorInfo.timestamp.toISOString(),
        ...(errorInfo.correlationId && { correlationId: errorInfo.correlationId }),
        retryable: errorInfo.retryable
      }
    };
  }

  /**
   * Categorize error based on type and characteristics
   */
  private categorizeError(
    error: any,
    correlationId?: string,
    context?: Record<string, any>
  ): ErrorInfo {
    const errorId = uuidv4();
    const timestamp = new Date();

    // Handle known error types
    if (this.isValidationError(error)) {
      return {
        id: errorId,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        code: 'VALIDATION_ERROR',
        message: this.extractErrorMessage(error),
        timestamp,
        ...(correlationId && { correlationId }),
        ...(context && { context }),
        ...(error instanceof Error && { originalError: error }),
        retryable: false
      };
    }

    if (this.isNotFoundError(error)) {
      return {
        id: errorId,
        category: ErrorCategory.NOT_FOUND,
        severity: ErrorSeverity.LOW,
        code: 'NOT_FOUND',
        message: this.extractErrorMessage(error),
        timestamp,
        ...(correlationId && { correlationId }),
        ...(context && { context }),
        ...(error instanceof Error && { originalError: error }),
        retryable: false
      };
    }

    if (this.isRateLimitError(error)) {
      return {
        id: errorId,
        category: ErrorCategory.RATE_LIMITING,
        severity: ErrorSeverity.MEDIUM,
        code: 'RATE_LIMITED',
        message: this.extractErrorMessage(error),
        timestamp,
        ...(correlationId && { correlationId }),
        ...(context && { context }),
        ...(error instanceof Error && { originalError: error }),
        retryable: true
      };
    }

    if (this.isNetworkError(error)) {
      return {
        id: errorId,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        code: 'NETWORK_ERROR',
        message: this.extractErrorMessage(error),
        timestamp,
        ...(correlationId && { correlationId }),
        ...(context && { context }),
        ...(error instanceof Error && { originalError: error }),
        retryable: true
      };
    }

    // Default to internal error
    return {
      id: errorId,
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      code: 'INTERNAL_ERROR',
      message: this.extractErrorMessage(error) || 'An unexpected error occurred',
      timestamp,
      ...(correlationId && { correlationId }),
      ...(context && { context }),
      ...(error instanceof Error && { originalError: error }),
      retryable: false
    };
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(error: any): boolean {
    if (error && typeof error === 'object' && error.code === MCPErrorCode.INVALID_PARAMS) {
      return true;
    }

    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('validation') ||
           message.includes('invalid') ||
           message.includes('required') ||
           message.includes('must be') ||
           message.includes('parameter');
  }

  /**
   * Check if error is a not found error
   */
  private isNotFoundError(error: any): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('not found') ||
           message.includes('does not exist') ||
           message.includes('404') ||
           message.includes('missing');
  }

  /**
   * Check if error is a rate limiting error
   */
  private isRateLimitError(error: any): boolean {
    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('rate limit') ||
           message.includes('too many requests') ||
           message.includes('429') ||
           message.includes('quota exceeded');
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    if (error instanceof Error) {
      const networkErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
      if (networkErrorCodes.some(code => error.message.includes(code))) {
        return true;
      }
    }

    const message = this.extractErrorMessage(error).toLowerCase();
    return message.includes('network') ||
           message.includes('connection') ||
           message.includes('timeout') ||
           message.includes('unreachable') ||
           message.includes('dns');
  }

  /**
   * Extract error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      return error.message;
    }

    if (error && typeof error === 'object') {
      return error.message || error.msg || error.error || 'Unknown error';
    }

    return 'Unknown error';
  }

  /**
   * Map error category to MCP error code
   */
  private getMCPErrorCode(category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.VALIDATION:
        return MCPErrorCode.INVALID_PARAMS;
      case ErrorCategory.NOT_FOUND:
        return MCPErrorCode.METHOD_NOT_FOUND;
      case ErrorCategory.RATE_LIMITING:
      case ErrorCategory.NETWORK:
      case ErrorCategory.INTERNAL:
      default:
        return MCPErrorCode.INTERNAL_ERROR;
    }
  }
}

/**
 * Error logging utility with structured format
 */
export class ErrorLogger {
  /**
   * Log error with structured format
   */
  public logError(errorInfo: ErrorInfo): void {
    const logEntry = {
      timestamp: errorInfo.timestamp.toISOString(),
      level: this.getSeverityLogLevel(errorInfo.severity),
      errorId: errorInfo.id,
      category: errorInfo.category,
      code: errorInfo.code,
      message: errorInfo.message,
      correlationId: errorInfo.correlationId,
      context: errorInfo.context,
      retryable: errorInfo.retryable,
      stack: errorInfo.originalError?.stack
    };

    // In production, this would integrate with proper logging infrastructure
    // For now, we'll use console with structured format
    if (errorInfo.severity === ErrorSeverity.CRITICAL || errorInfo.severity === ErrorSeverity.HIGH) {
      console.error('ERROR:', JSON.stringify(logEntry, null, 2));
    } else {
      console.warn('WARNING:', JSON.stringify(logEntry, null, 2));
    }
  }

  /**
   * Map error severity to log level
   */
  private getSeverityLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'warn';
      case ErrorSeverity.MEDIUM:
        return 'error';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }
}