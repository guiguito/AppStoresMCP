#!/usr/bin/env node

/**
 * Tool Configuration Helper Script
 * Generates environment variable configurations for enabling/disabling MCP tools
 */

const AVAILABLE_TOOLS = [
  // Google Play Store tools
  'google-play-app-details',
  'google-play-app-reviews',
  'google-play-search',
  'google-play-list',
  'google-play-developer',
  'google-play-suggest',
  'google-play-similar',
  'google-play-permissions',
  'google-play-datasafety',
  'google-play-categories',
  
  // Apple App Store tools
  'app-store-app-details',
  'app-store-app-reviews',
  'app-store-search',
  'app-store-list',
  'app-store-developer',
  'app-store-privacy',
  'app-store-suggest',
  'app-store-similar',
  'app-store-ratings'
];

const TOOL_CATEGORIES = {
  'google-play': AVAILABLE_TOOLS.filter(tool => tool.startsWith('google-play-')),
  'app-store': AVAILABLE_TOOLS.filter(tool => tool.startsWith('app-store-')),
  'search': AVAILABLE_TOOLS.filter(tool => tool.includes('-search')),
  'details': AVAILABLE_TOOLS.filter(tool => tool.includes('-app-details')),
  'reviews': AVAILABLE_TOOLS.filter(tool => tool.includes('-app-reviews')),
  'developer': AVAILABLE_TOOLS.filter(tool => tool.includes('-developer')),
  'list': AVAILABLE_TOOLS.filter(tool => tool.includes('-list')),
  'suggest': AVAILABLE_TOOLS.filter(tool => tool.includes('-suggest')),
  'similar': AVAILABLE_TOOLS.filter(tool => tool.includes('-similar'))
};

function showHelp() {
  console.log(`
Tool Configuration Helper

Usage:
  node scripts/configure-tools.js [command] [options]

Commands:
  list                    List all available tools
  categories              List tools by category
  enable <tools...>       Generate ENABLED_TOOLS configuration
  disable <tools...>      Generate DISABLED_TOOLS configuration
  category <category>     Generate configuration for a category
  preset <preset>         Generate configuration for a preset

Categories:
  google-play, app-store, search, details, reviews, developer, list, suggest, similar

Presets:
  search-only            Only search tools
  no-reviews            All tools except reviews
  google-play-only      Only Google Play tools
  app-store-only        Only App Store tools
  core                  Search and details tools only

Examples:
  node scripts/configure-tools.js list
  node scripts/configure-tools.js enable google-play-search app-store-search
  node scripts/configure-tools.js disable google-play-reviews app-store-reviews
  node scripts/configure-tools.js category search
  node scripts/configure-tools.js preset search-only
`);
}

function listTools() {
  console.log('\nAvailable Tools:');
  console.log('================');
  
  console.log('\nGoogle Play Store Tools:');
  TOOL_CATEGORIES['google-play'].forEach(tool => {
    console.log(`  - ${tool}`);
  });
  
  console.log('\nApple App Store Tools:');
  TOOL_CATEGORIES['app-store'].forEach(tool => {
    console.log(`  - ${tool}`);
  });
  
  console.log(`\nTotal: ${AVAILABLE_TOOLS.length} tools`);
}

function listCategories() {
  console.log('\nTool Categories:');
  console.log('================');
  
  Object.entries(TOOL_CATEGORIES).forEach(([category, tools]) => {
    console.log(`\n${category} (${tools.length} tools):`);
    tools.forEach(tool => {
      console.log(`  - ${tool}`);
    });
  });
}

function generateEnableConfig(tools) {
  const validTools = tools.filter(tool => AVAILABLE_TOOLS.includes(tool));
  const invalidTools = tools.filter(tool => !AVAILABLE_TOOLS.includes(tool));
  
  if (invalidTools.length > 0) {
    console.log(`\nWarning: Invalid tools ignored: ${invalidTools.join(', ')}`);
  }
  
  if (validTools.length === 0) {
    console.log('\nError: No valid tools specified');
    return;
  }
  
  console.log('\nEnvironment Variable Configuration:');
  console.log('===================================');
  console.log(`ENABLED_TOOLS=${validTools.join(',')}`);
  
  console.log('\nDocker Compose Configuration:');
  console.log('=============================');
  console.log(`      - ENABLED_TOOLS=\${ENABLED_TOOLS:-${validTools.join(',')}}`);
  
  console.log(`\nThis will enable ${validTools.length} tools and disable ${AVAILABLE_TOOLS.length - validTools.length} tools.`);
}

function generateDisableConfig(tools) {
  const validTools = tools.filter(tool => AVAILABLE_TOOLS.includes(tool));
  const invalidTools = tools.filter(tool => !AVAILABLE_TOOLS.includes(tool));
  
  if (invalidTools.length > 0) {
    console.log(`\nWarning: Invalid tools ignored: ${invalidTools.join(', ')}`);
  }
  
  if (validTools.length === 0) {
    console.log('\nError: No valid tools specified');
    return;
  }
  
  console.log('\nEnvironment Variable Configuration:');
  console.log('===================================');
  console.log(`DISABLED_TOOLS=${validTools.join(',')}`);
  
  console.log('\nDocker Compose Configuration:');
  console.log('=============================');
  console.log(`      - DISABLED_TOOLS=\${DISABLED_TOOLS:-${validTools.join(',')}}`);
  
  console.log(`\nThis will disable ${validTools.length} tools and keep ${AVAILABLE_TOOLS.length - validTools.length} tools enabled.`);
}

function generateCategoryConfig(category) {
  if (!TOOL_CATEGORIES[category]) {
    console.log(`\nError: Invalid category '${category}'`);
    console.log('Available categories:', Object.keys(TOOL_CATEGORIES).join(', '));
    return;
  }
  
  const tools = TOOL_CATEGORIES[category];
  console.log(`\nConfiguration for category '${category}' (${tools.length} tools):`);
  generateEnableConfig(tools);
}

function generatePresetConfig(preset) {
  const presets = {
    'search-only': ['google-play-search', 'app-store-search'],
    'no-reviews': AVAILABLE_TOOLS.filter(tool => !tool.includes('-app-reviews')),
    'google-play-only': TOOL_CATEGORIES['google-play'],
    'app-store-only': TOOL_CATEGORIES['app-store'],
    'core': ['google-play-search', 'app-store-search', 'google-play-app-details', 'app-store-app-details']
  };
  
  if (!presets[preset]) {
    console.log(`\nError: Invalid preset '${preset}'`);
    console.log('Available presets:', Object.keys(presets).join(', '));
    return;
  }
  
  const tools = presets[preset];
  console.log(`\nConfiguration for preset '${preset}' (${tools.length} tools):`);
  
  if (preset === 'no-reviews') {
    // For no-reviews, show as disabled tools
    const reviewTools = AVAILABLE_TOOLS.filter(tool => tool.includes('-app-reviews'));
    generateDisableConfig(reviewTools);
  } else {
    generateEnableConfig(tools);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
  showHelp();
} else if (args[0] === 'list') {
  listTools();
} else if (args[0] === 'categories') {
  listCategories();
} else if (args[0] === 'enable') {
  if (args.length < 2) {
    console.log('\nError: Please specify tools to enable');
    console.log('Usage: node scripts/configure-tools.js enable <tool1> <tool2> ...');
  } else {
    generateEnableConfig(args.slice(1));
  }
} else if (args[0] === 'disable') {
  if (args.length < 2) {
    console.log('\nError: Please specify tools to disable');
    console.log('Usage: node scripts/configure-tools.js disable <tool1> <tool2> ...');
  } else {
    generateDisableConfig(args.slice(1));
  }
} else if (args[0] === 'category') {
  if (args.length < 2) {
    console.log('\nError: Please specify a category');
    console.log('Available categories:', Object.keys(TOOL_CATEGORIES).join(', '));
  } else {
    generateCategoryConfig(args[1]);
  }
} else if (args[0] === 'preset') {
  if (args.length < 2) {
    console.log('\nError: Please specify a preset');
    console.log('Available presets: search-only, no-reviews, google-play-only, app-store-only, core');
  } else {
    generatePresetConfig(args[1]);
  }
} else {
  console.log(`\nError: Unknown command '${args[0]}'`);
  showHelp();
}