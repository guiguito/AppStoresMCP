/**
 * Unit tests for retry handler with exponential backoff
 */

import { RetryHandler, DEFAULT_RETRY_OPTIONS, createRetryHandler, withRetry } from '../../src/errors/retry-handler';
import { ErrorCategory, ErrorHandler } from '../../src/errors/error-handler';

// Mock the ErrorHandler
jest.mock('../../src/errors/error-handler');

describe('RetryHandler', () => {
  let retryHandler: RetryHandler;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  beforeEach(() => {
    mockErrorHandler = {
      handleError: jest.fn()
    } as any;

    (ErrorHandler.getInstance as jest.Mock).mockReturnValue(mockErrorHandler);
    
    retryHandler = new RetryHandler();
    
    // Mock sleep to make tests faster
    jest.spyOn(retryHandler as any, 'sleep').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryHandler.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0]?.attemptNumber).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');

      mockErrorHandler.handleError.mockReturnValue({
        error: { code: -32603, message: 'Network error' },
        errorInfo: {
          id: 'error-id',
          category: ErrorCategory.NETWORK,
          timestamp: new Date().toISOString(),
          retryable: true
        }
      });

      const result = await retryHandler.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toHaveLength(2);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation error'));

      mockErrorHandler.handleError.mockReturnValue({
        error: { code: -32602, message: 'Validation error' },
        errorInfo: {
          id: 'error-id',
          category: ErrorCategory.VALIDATION,
          timestamp: new Date().toISOString(),
          retryable: false
        }
      });

      const result = await retryHandler.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));

      mockErrorHandler.handleError.mockReturnValue({
        error: { code: -32603, message: 'Network error' },
        errorInfo: {
          id: 'error-id',
          category: ErrorCategory.NETWORK,
          timestamp: new Date().toISOString(),
          retryable: true
        }
      });

      const result = await retryHandler.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(DEFAULT_RETRY_OPTIONS.maxAttempts);
      expect(operation).toHaveBeenCalledTimes(DEFAULT_RETRY_OPTIONS.maxAttempts);
    });

    it('should calculate exponential backoff delays', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Rate limit error'));

      mockErrorHandler.handleError.mockReturnValue({
        error: { code: -32603, message: 'Rate limit error' },
        errorInfo: {
          id: 'error-id',
          category: ErrorCategory.RATE_LIMITING,
          timestamp: new Date().toISOString(),
          retryable: true
        }
      });

      const result = await retryHandler.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toHaveLength(3);
      
      // Check that delays increase exponentially (with jitter tolerance)
      const delays = result.attempts.slice(0, -1).map(a => a.delayMs);
      expect(delays[0]).toBeGreaterThan(0);
      if (delays[1] !== undefined && delays[0] !== undefined) {
        expect(delays[1]).toBeGreaterThan(delays[0]);
      }
    });

    it('should include correlation ID and context', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));
      const correlationId = 'test-correlation';
      const context = { operation: 'test' };

      mockErrorHandler.handleError.mockReturnValue({
        error: { code: -32603, message: 'Test error' },
        errorInfo: {
          id: 'error-id',
          category: ErrorCategory.INTERNAL,
          timestamp: new Date().toISOString(),
          retryable: false
        }
      });

      await retryHandler.executeWithRetry(operation, correlationId, context);

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.any(Error),
        correlationId,
        context
      );
    });
  });

  describe('executeWithRetryThrow', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryHandler.executeWithRetryThrow(operation);

      expect(result).toBe('success');
    });

    it('should throw enhanced error on failure', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Test error'));

      mockErrorHandler.handleError
        .mockReturnValueOnce({
          error: { code: -32603, message: 'Test error' },
          errorInfo: {
            id: 'error-id',
            category: ErrorCategory.INTERNAL,
            timestamp: new Date().toISOString(),
            retryable: false
          }
        })
        .mockReturnValueOnce({
          error: { 
            code: -32603, 
            message: 'Test error',
            data: { retryInfo: expect.any(Object) }
          },
          errorInfo: {
            id: 'error-id',
            category: ErrorCategory.INTERNAL,
            timestamp: new Date().toISOString(),
            retryable: false
          }
        });

      await expect(retryHandler.executeWithRetryThrow(operation)).rejects.toMatchObject({
        code: -32603,
        message: 'Test error'
      });

      // Verify that error was enhanced with retry information
      expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(2);
      const secondCall = mockErrorHandler.handleError.mock.calls[1];
      if (secondCall) {
        expect(secondCall[2]).toMatchObject({
          retryInfo: {
            attempts: 1,
            totalDurationMs: expect.any(Number)
          }
        });
      }
    });
  });

  describe('configuration', () => {
    it('should use custom retry options', () => {
      const customOptions = {
        maxAttempts: 5,
        baseDelayMs: 500,
        maxDelayMs: 10000
      };

      const customRetryHandler = new RetryHandler(customOptions);
      const options = customRetryHandler.getOptions();

      expect(options.maxAttempts).toBe(5);
      expect(options.baseDelayMs).toBe(500);
      expect(options.maxDelayMs).toBe(10000);
      expect(options.backoffMultiplier).toBe(DEFAULT_RETRY_OPTIONS.backoffMultiplier);
    });

    it('should update options', () => {
      retryHandler.updateOptions({ maxAttempts: 10 });
      
      const options = retryHandler.getOptions();
      expect(options.maxAttempts).toBe(10);
    });
  });

  describe('delay calculation', () => {
    it('should calculate correct exponential delays', () => {
      const calculateDelay = (retryHandler as any).calculateDelay.bind(retryHandler);
      
      const delay1 = calculateDelay(1);
      const delay2 = calculateDelay(2);
      const delay3 = calculateDelay(3);

      // Base delay is 1000ms, multiplier is 2
      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay1).toBeLessThan(1200); // 1000 + 100 jitter + some tolerance
      
      expect(delay2).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeLessThan(2200);
      
      expect(delay3).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeLessThan(4200);
    });

    it('should respect maximum delay', () => {
      const customRetryHandler = new RetryHandler({ maxDelayMs: 3000 });
      const calculateDelay = (customRetryHandler as any).calculateDelay.bind(customRetryHandler);
      
      const delay = calculateDelay(10); // Would be very large without cap
      expect(delay).toBeLessThanOrEqual(3100); // 3000 + jitter
    });
  });
});

describe('createRetryHandler', () => {
  it('should create retry handler with custom options', () => {
    const options = { maxAttempts: 5 };
    const handler = createRetryHandler(options);
    
    expect(handler.getOptions().maxAttempts).toBe(5);
  });
});

describe('withRetry decorator', () => {
  it('should create a decorator function', () => {
    const decorator = withRetry({ maxAttempts: 2 });
    expect(typeof decorator).toBe('function');
  });
});