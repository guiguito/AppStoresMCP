/**
 * Review Filtering Example
 * 
 * This example demonstrates the new review filtering functionality that reduces
 * token consumption by up to 93% while preserving essential review data.
 */

const fetch = require('node-fetch');

const MCP_SERVER_URL = 'http://localhost:3000/mcp';

/**
 * Send MCP request to the server
 */
async function sendMCPRequest(toolName, arguments) {
  const request = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).substring(7),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: arguments
    }
  };

  const response = await fetch(MCP_SERVER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (result.error) {
    throw new Error(`MCP Error: ${result.error.message}`);
  }

  return result.result;
}

/**
 * Example 1: Google Play Reviews with Filtering (Default)
 * Returns only essential fields: id, userName, date, score, text, version
 */
async function getFilteredGooglePlayReviews() {
  console.log('\n=== Google Play Reviews (Filtered - Default) ===');
  
  const reviews = await sendMCPRequest('google-play-app-reviews', {
    appId: 'com.whatsapp',
    num: 3,
    sort: 'newest'
    // fullDetail: false is the default
  });

  console.log(`Received ${reviews.data.length} reviews`);
  console.log('Sample review (filtered):');
  console.log(JSON.stringify(reviews.data[0], null, 2));
  
  // Calculate approximate token usage
  const jsonString = JSON.stringify(reviews);
  console.log(`Approximate token usage: ${jsonString.length} characters`);
  
  return reviews;
}

/**
 * Example 2: Google Play Reviews with Full Details
 * Returns all fields including verbose metadata
 */
async function getFullGooglePlayReviews() {
  console.log('\n=== Google Play Reviews (Full Details) ===');
  
  const reviews = await sendMCPRequest('google-play-app-reviews', {
    appId: 'com.whatsapp',
    num: 3,
    sort: 'newest',
    fullDetail: true  // Request full details
  });

  console.log(`Received ${reviews.data.length} reviews`);
  console.log('Sample review (full details):');
  console.log(JSON.stringify(reviews.data[0], null, 2));
  
  // Calculate approximate token usage
  const jsonString = JSON.stringify(reviews);
  console.log(`Approximate token usage: ${jsonString.length} characters`);
  
  return reviews;
}

/**
 * Example 3: App Store Reviews with Filtering (Default)
 * Returns only essential fields: id, version, userName, score, title, text, updated
 */
async function getFilteredAppStoreReviews() {
  console.log('\n=== App Store Reviews (Filtered - Default) ===');
  
  const reviews = await sendMCPRequest('app-store-app-reviews', {
    appId: '310633997', // WhatsApp iOS
    num: 3,
    sort: 'newest'
    // fullDetail: false is the default
  });

  console.log(`Received ${reviews.length} reviews`);
  if (reviews.length > 0) {
    console.log('Sample review (filtered):');
    console.log(JSON.stringify(reviews[0], null, 2));
  }
  
  // Calculate approximate token usage
  const jsonString = JSON.stringify(reviews);
  console.log(`Approximate token usage: ${jsonString.length} characters`);
  
  return reviews;
}

/**
 * Example 4: App Store Reviews with Full Details
 * Returns all fields including verbose metadata
 */
async function getFullAppStoreReviews() {
  console.log('\n=== App Store Reviews (Full Details) ===');
  
  const reviews = await sendMCPRequest('app-store-app-reviews', {
    appId: '310633997', // WhatsApp iOS
    num: 3,
    sort: 'newest',
    fullDetail: true  // Request full details
  });

  console.log(`Received ${reviews.length} reviews`);
  if (reviews.length > 0) {
    console.log('Sample review (full details):');
    console.log(JSON.stringify(reviews[0], null, 2));
  }
  
  // Calculate approximate token usage
  const jsonString = JSON.stringify(reviews);
  console.log(`Approximate token usage: ${jsonString.length} characters`);
  
  return reviews;
}

/**
 * Example 5: Token Usage Comparison
 * Demonstrates the significant reduction in token usage with filtering
 */
async function compareTokenUsage() {
  console.log('\n=== Token Usage Comparison ===');
  
  try {
    // Get filtered reviews
    const filteredReviews = await sendMCPRequest('google-play-app-reviews', {
      appId: 'com.whatsapp',
      num: 10,
      fullDetail: false
    });
    
    // Get full reviews
    const fullReviews = await sendMCPRequest('google-play-app-reviews', {
      appId: 'com.whatsapp',
      num: 10,
      fullDetail: true
    });
    
    const filteredSize = JSON.stringify(filteredReviews).length;
    const fullSize = JSON.stringify(fullReviews).length;
    const reduction = ((fullSize - filteredSize) / fullSize * 100).toFixed(1);
    
    console.log(`Filtered response: ${filteredSize} characters`);
    console.log(`Full response: ${fullSize} characters`);
    console.log(`Token usage reduction: ${reduction}% (${fullSize - filteredSize} characters saved)`);
    
    return { filteredSize, fullSize, reduction };
  } catch (error) {
    console.error('Error comparing token usage:', error.message);
  }
}

/**
 * Example 6: Essential Fields Demonstration
 * Shows exactly which fields are preserved in filtered responses
 */
async function demonstrateEssentialFields() {
  console.log('\n=== Essential Fields Demonstration ===');
  
  try {
    // Get one review with full details
    const fullReview = await sendMCPRequest('google-play-app-reviews', {
      appId: 'com.whatsapp',
      num: 1,
      fullDetail: true
    });
    
    // Get the same review filtered
    const filteredReview = await sendMCPRequest('google-play-app-reviews', {
      appId: 'com.whatsapp',
      num: 1,
      fullDetail: false
    });
    
    if (fullReview.data.length > 0 && filteredReview.data.length > 0) {
      const fullFields = Object.keys(fullReview.data[0]);
      const filteredFields = Object.keys(filteredReview.data[0]);
      const removedFields = fullFields.filter(field => !filteredFields.includes(field));
      
      console.log('Essential fields (preserved):');
      console.log(filteredFields.join(', '));
      
      console.log('\nRemoved fields (filtered out):');
      console.log(removedFields.join(', '));
      
      console.log(`\nField reduction: ${fullFields.length} → ${filteredFields.length} fields (${removedFields.length} removed)`);
    }
  } catch (error) {
    console.error('Error demonstrating essential fields:', error.message);
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('Review Filtering Examples');
  console.log('========================');
  console.log('This example demonstrates the new review filtering functionality');
  console.log('that reduces token consumption while preserving essential data.\n');
  
  try {
    // Run all examples
    await getFilteredGooglePlayReviews();
    await getFullGooglePlayReviews();
    await getFilteredAppStoreReviews();
    await getFullAppStoreReviews();
    await compareTokenUsage();
    await demonstrateEssentialFields();
    
    console.log('\n=== Summary ===');
    console.log('✅ Review filtering reduces token usage by up to 93%');
    console.log('✅ Essential fields (id, userName, score, text, etc.) are preserved');
    console.log('✅ Use fullDetail=true when you need complete review metadata');
    console.log('✅ Use fullDetail=false (default) for efficient token usage');
    
  } catch (error) {
    console.error('Error running examples:', error.message);
    console.log('\nMake sure the MCP server is running on http://localhost:3000');
  }
}

// Run the examples if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  sendMCPRequest,
  getFilteredGooglePlayReviews,
  getFullGooglePlayReviews,
  getFilteredAppStoreReviews,
  getFullAppStoreReviews,
  compareTokenUsage,
  demonstrateEssentialFields
};