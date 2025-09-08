/**
 * Setup file for integration tests
 * Configures test environment for real API calls with rate limiting
 */

// Extend Jest timeout for integration tests
jest.setTimeout(60000);

// Global test configuration
const INTEGRATION_CONFIG = {
  RATE_LIMIT_DELAY: 2000, // 2 seconds between requests
  MAX_RETRIES: 3,
  TIMEOUT: 30000,
  CONCURRENT_LIMIT: 1
};

// Global rate limiting state
let lastRequestTime = 0;
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

// Rate limiting utility for integration tests
export const rateLimitedRequest = async <T>(requestFn: () => Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        
        if (timeSinceLastRequest < INTEGRATION_CONFIG.RATE_LIMIT_DELAY) {
          const delay = INTEGRATION_CONFIG.RATE_LIMIT_DELAY - timeSinceLastRequest;
          await new Promise(r => setTimeout(r, delay));
        }
        
        lastRequestTime = Date.now();
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (request) {
      await request();
    }
  }
  
  isProcessingQueue = false;
};

// Mock console methods to reduce noise in integration tests
const originalConsole = { ...console };

beforeAll(() => {
  // Reduce console noise for integration tests
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  
  // Keep error and warn for debugging
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
});

afterAll(() => {
  // Restore console methods
  Object.assign(console, originalConsole);
});

// Global error handler for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export configuration for use in tests
export { INTEGRATION_CONFIG };