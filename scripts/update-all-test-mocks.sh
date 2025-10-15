#!/bin/bash
# Script to update all test files to use global mocks

set -e

echo "Updating Google Play test files to use global mocks..."

# List of Google Play test files
GP_FILES=(
  "tests/tools/google-play-app-reviews.tool.test.ts"
  "tests/tools/google-play-categories.tool.test.ts"
  "tests/tools/google-play-datasafety.tool.test.ts"
  "tests/tools/google-play-developer.tool.test.ts"
  "tests/tools/google-play-list.tool.test.ts"
  "tests/tools/google-play-permissions.tool.test.ts"
  "tests/tools/google-play-search.tool.test.ts"
  "tests/tools/google-play-similar.tool.test.ts"
  "tests/tools/google-play-suggest.tool.test.ts"
)

echo "Updating App Store test files to use global mocks..."

# List of App Store test files  
AS_FILES=(
  "tests/tools/app-store-app-details.tool.test.ts"
  "tests/tools/app-store-app-reviews.tool.test.ts"
  "tests/tools/app-store-developer.tool.test.ts"
  "tests/tools/app-store-list.tool.test.ts"
  "tests/tools/app-store-privacy.tool.test.ts"
  "tests/tools/app-store-ratings.tool.test.ts"
  "tests/tools/app-store-search.tool.test.ts"
  "tests/tools/app-store-similar.tool.test.ts"
  "tests/tools/app-store-suggest.tool.test.ts"
)

echo "Manual updates required for:"
echo "- ${GP_FILES[@]}"
echo "- ${AS_FILES[@]}"
echo ""
echo "Pattern: Replace jest.mock() and local mocks with imports from global mocks"
echo "See tests/tools/google-play-app-details.tool.test.ts as reference"
