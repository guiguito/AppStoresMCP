/**
 * Unit tests for comprehensive error handling system
 */

import { ErrorHandler, ErrorCategory, ErrorSeverity, ErrorLogger } from '../../src/errors/error-handler';
import { MCPErrorCode } from '../../src/types/mcp';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockLogger: jest.Mocked<ErrorLogger>;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    
    // Mock the logger
    mockLogger = {
      logError: jest.fn(),
      getSeverityLogLevel: jest.fn()
    } as unknown as jest.Mocked<ErrorLogger>;
    
    // Replace the logger instance
    (errorHandler as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle validation errors correctly', () => {
      const validationError = new Error('Parameter validation failed: name is required');
      const correlationId = 'test-correlation-id';
      const context = { toolName: 'test-tool' };

      const result = errorHandler.handleError(validationError, correlationId, context);

      expect(result.error.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error.message).toContain('Parameter validation failed');
      expect(result.error.data.category).toBe(ErrorCategory.VALIDATION);
      expect(result.error.data.retryable).toBe(false);
      expect(result.errorInfo.category).toBe(ErrorCategory.VALIDATION);
      expect(result.errorInfo.correlationId).toBe(correlationId);
      expect(result.errorInfo.retryable).toBe(false);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          code: 'VALIDATION_ERROR',
          correlationId,
          context,
          retryable: false
        })
      );
    });

    it('should handle not found errors correctly', () => {
      const notFoundError = new Error('App not found in store');
      
      const result = errorHandler.handleError(notFoundError);

      expect(result.error.code).toBe(MCPErrorCode.METHOD_NOT_FOUND);
      expect(result.error.message).toContain('App not found');
      expect(result.error.data.category).toBe(ErrorCategory.NOT_FOUND);
      expect(result.error.data.retryable).toBe(false);
      expect(result.errorInfo.category).toBe(ErrorCategory.NOT_FOUND);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NOT_FOUND,
          severity: ErrorSeverity.LOW,
          code: 'NOT_FOUND'
        })
      );
    });

    it('should handle rate limiting errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded: too many requests');
      
      const result = errorHandler.handleError(rateLimitError);

      expect(result.error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(result.error.message).toContain('Rate limit exceeded');
      expect(result.error.data.category).toBe(ErrorCategory.RATE_LIMITING);
      expect(result.error.data.retryable).toBe(true);
      expect(result.errorInfo.category).toBe(ErrorCategory.RATE_LIMITING);
      expect(result.errorInfo.retryable).toBe(true);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.RATE_LIMITING,
          severity: ErrorSeverity.MEDIUM,
          code: 'RATE_LIMITED',
          retryable: true
        })
      );
    });

    it('should handle network errors correctly', () => {
      const networkError = new Error('ECONNREFUSED: Connection refused');
      
      const result = errorHandler.handleError(networkError);

      expect(result.error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(result.error.message).toContain('ECONNREFUSED');
      expect(result.error.data.category).toBe(ErrorCategory.NETWORK);
      expect(result.error.data.retryable).toBe(true);
      expect(result.errorInfo.category).toBe(ErrorCategory.NETWORK);
      expect(result.errorInfo.retryable).toBe(true);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.NETWORK,
          severity: ErrorSeverity.MEDIUM,
          code: 'NETWORK_ERROR',
          retryable: true
        })
      );
    });

    it('should handle internal errors correctly', () => {
      const internalError = new Error('Unexpected server error');
      
      const result = errorHandler.handleError(internalError);

      expect(result.error.code).toBe(MCPErrorCode.INTERNAL_ERROR);
      expect(result.error.message).toContain('Unexpected server error');
      expect(result.error.data.category).toBe(ErrorCategory.INTERNAL);
      expect(result.error.data.retryable).toBe(false);
      expect(result.errorInfo.category).toBe(ErrorCategory.INTERNAL);
      expect(result.errorInfo.retryable).toBe(false);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        expect.objectContaining({
          category: ErrorCategory.INTERNAL,
          severity: ErrorSeverity.HIGH,
          code: 'INTERNAL_ERROR',
          retryable: false
        })
      );
    });

    it('should handle string errors', () => {
      const stringError = 'Simple string error message';
      
      const result = errorHandler.handleError(stringError);

      expect(result.error.message).toBe(stringError);
      expect(result.error.data.category).toBe(ErrorCategory.INTERNAL);
    });

    it('should handle MCP validation errors', () => {
      const mcpError = {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters provided',
        data: { validationErrors: ['field is required'] }
      };
      
      const result = errorHandler.handleError(mcpError);

      expect(result.error.code).toBe(MCPErrorCode.INVALID_PARAMS);
      expect(result.error.data.category).toBe(ErrorCategory.VALIDATION);
      expect(result.errorInfo.category).toBe(ErrorCategory.VALIDATION);
    });

    it('should generate unique error IDs', () => {
      const error1 = errorHandler.handleError(new Error('Error 1'));
      const error2 = errorHandler.handleError(new Error('Error 2'));

      expect(error1.errorInfo.id).not.toBe(error2.errorInfo.id);
      expect(error1.errorInfo.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should include context in error data', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'search' };
      
      const result = errorHandler.handleError(error, undefined, context);

      expect(result.error.data.context).toEqual(context);
    });
  });

  describe('error categorization', () => {
    const testCases = [
      {
        name: 'validation errors',
        errors: [
          'validation failed',
          'invalid parameter',
          'field is required',
          'must be a string',
          'parameter missing'
        ],
        expectedCategory: ErrorCategory.VALIDATION
      },
      {
        name: 'not found errors',
        errors: [
          'not found',
          'does not exist',
          '404 error',
          'missing resource'
        ],
        expectedCategory: ErrorCategory.NOT_FOUND
      },
      {
        name: 'rate limiting errors',
        errors: [
          'rate limit exceeded',
          'too many requests',
          '429 status',
          'quota exceeded'
        ],
        expectedCategory: ErrorCategory.RATE_LIMITING
      },
      {
        name: 'network errors',
        errors: [
          'ECONNREFUSED',
          'ENOTFOUND',
          'ETIMEDOUT',
          'network error',
          'connection failed',
          'timeout occurred'
        ],
        expectedCategory: ErrorCategory.NETWORK
      }
    ];

    testCases.forEach(({ name, errors, expectedCategory }) => {
      describe(name, () => {
        errors.forEach(errorMessage => {
          it(`should categorize "${errorMessage}" correctly`, () => {
            const error = new Error(errorMessage);
            const result = errorHandler.handleError(error);
            
            expect(result.errorInfo.category).toBe(expectedCategory);
          });
        });
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorHandler.getInstance();
      const instance2 = ErrorHandler.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});

describe('ErrorLogger', () => {
  let errorLogger: ErrorLogger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    errorLogger = new ErrorLogger();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should log high severity errors to console.error', () => {
    const errorInfo = {
      id: 'test-id',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      code: 'TEST_ERROR',
      message: 'Test error message',
      timestamp: new Date(),
      retryable: false
    };

    errorLogger.logError(errorInfo);

    expect(console.error).toHaveBeenCalledWith(
      'ERROR:',
      expect.stringContaining('"level": "error"')
    );
  });

  it('should log low severity errors to console.warn', () => {
    const errorInfo = {
      id: 'test-id',
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      code: 'TEST_ERROR',
      message: 'Test error message',
      timestamp: new Date(),
      retryable: false
    };

    errorLogger.logError(errorInfo);

    expect(console.warn).toHaveBeenCalledWith(
      'WARNING:',
      expect.stringContaining('"level": "warn"')
    );
  });

  it('should include all error information in log entry', () => {
    const errorInfo = {
      id: 'test-id',
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      timestamp: new Date(),
      correlationId: 'correlation-123',
      context: { operation: 'fetch' },
      retryable: true,
      originalError: new Error('Original error')
    };

    errorLogger.logError(errorInfo);

    // MEDIUM severity goes to console.warn, not console.error
    const logCall = (console.warn as jest.Mock).mock.calls[0];
    expect(logCall).toBeDefined();
    expect(logCall[0]).toBe('WARNING:');
    
    const logEntry = JSON.parse(logCall[1]);

    expect(logEntry).toMatchObject({
      errorId: 'test-id',
      category: ErrorCategory.NETWORK,
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      correlationId: 'correlation-123',
      context: { operation: 'fetch' },
      retryable: true
    });
    expect(logEntry.stack).toBeDefined();
  });
});