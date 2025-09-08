/**
 * Retry handler with exponential backoff for transient failures
 * Provides configurable retry logic for network and rate limiting errors
 */

import { ErrorCategory, ErrorHandler } from './error-handler';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableCategories: ErrorCategory[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 100,
  retryableCategories: [ErrorCategory.NETWORK, ErrorCategory.RATE_LIMITING]
};

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  delayMs: number;
  error?: any;
}

/**
 * Retry result information
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: any;
  attempts: RetryAttempt[];
  totalDurationMs: number;
}

/**
 * Retry handler class with exponential backoff
 */
export class RetryHandler {
  private errorHandler: ErrorHandler;
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.errorHandler = ErrorHandler.getInstance();
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * Execute a function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    correlationId?: string,
    context?: Record<string, any>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const attempts: RetryAttempt[] = [];
    let lastError: any;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      const attemptInfo: RetryAttempt = {
        attemptNumber: attempt,
        delayMs: 0
      };

      try {
        // Execute the operation
        const result = await operation();
        
        // Success - record attempt and return
        attempts.push(attemptInfo);
        return {
          success: true,
          result,
          attempts,
          totalDurationMs: Date.now() - startTime
        };
      } catch (error) {
        lastError = error;
        attemptInfo.error = error;
        attempts.push(attemptInfo);

        // Check if error is retryable
        const errorResponse = this.errorHandler.handleError(error, correlationId, context);
        const isRetryable = this.isRetryableError(errorResponse.errorInfo.category);

        // If not retryable or last attempt, don't retry
        if (!isRetryable || attempt === this.options.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        attemptInfo.delayMs = delay;

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All attempts failed
    return {
      success: false,
      error: lastError,
      attempts,
      totalDurationMs: Date.now() - startTime
    };
  }

  /**
   * Execute a function with retry logic, throwing on final failure
   */
  async executeWithRetryThrow<T>(
    operation: () => Promise<T>,
    correlationId?: string,
    context?: Record<string, any>
  ): Promise<T> {
    const result = await this.executeWithRetry(operation, correlationId, context);
    
    if (result.success && result.result !== undefined) {
      return result.result;
    }

    // Enhance error with retry information
    const enhancedContext = {
      ...context,
      retryInfo: {
        attempts: result.attempts.length,
        totalDurationMs: result.totalDurationMs,
        finalAttempt: result.attempts[result.attempts.length - 1]
      }
    };

    const errorResponse = this.errorHandler.handleError(result.error, correlationId, enhancedContext);
    throw errorResponse.error;
  }

  /**
   * Check if error category is retryable
   */
  private isRetryableError(category: ErrorCategory): boolean {
    return this.options.retryableCategories.includes(category);
  }

  /**
   * Calculate delay for next retry attempt using exponential backoff
   */
  private calculateDelay(attemptNumber: number): number {
    // Calculate exponential backoff delay
    const exponentialDelay = this.options.baseDelayMs * 
      Math.pow(this.options.backoffMultiplier, attemptNumber - 1);

    // Apply maximum delay limit
    const cappedDelay = Math.min(exponentialDelay, this.options.maxDelayMs);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.options.jitterMs;

    return Math.floor(cappedDelay + jitter);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry options
   */
  public updateOptions(options: Partial<RetryOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current retry options
   */
  public getOptions(): RetryOptions {
    return { ...this.options };
  }
}

/**
 * Utility function to create a retry handler with custom options
 */
export function createRetryHandler(options?: Partial<RetryOptions>): RetryHandler {
  return new RetryHandler(options);
}

/**
 * Decorator function for adding retry logic to methods
 */
export function withRetry(options?: Partial<RetryOptions>) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    if (!originalMethod) return;

    const retryHandler = new RetryHandler(options);

    descriptor.value = async function (...args: any[]): Promise<any> {
      const correlationId = (this as any).correlationId;
      const context = { method: propertyKey, args: args.length };

      return retryHandler.executeWithRetryThrow(
        () => originalMethod.apply(this, args),
        correlationId,
        context
      );
    };

    return descriptor;
  };
}