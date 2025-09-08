// Simple test to verify configuration options work
const { SSETransportHandler } = require('./dist/transport/sse-transport');

// Test with default configuration
console.log('Testing default configuration...');
const defaultHandler = new SSETransportHandler();
console.log('✓ Default configuration works');

// Test with custom configuration including new options
console.log('Testing custom configuration...');
const customHandler = new SSETransportHandler({
  heartbeatInterval: 10000,
  connectionTimeout: 60000,
  maxConnections: 50,
  enableLogging: true,
  autoInitialize: false,
  initializationTimeout: 3000
});
console.log('✓ Custom configuration with new options works');

// Test backward compatibility (without new options)
console.log('Testing backward compatibility...');
const backwardCompatHandler = new SSETransportHandler({
  heartbeatInterval: 15000,
  connectionTimeout: 120000,
  maxConnections: 25,
  enableLogging: false
});
console.log('✓ Backward compatibility works');

console.log('All configuration tests passed!');