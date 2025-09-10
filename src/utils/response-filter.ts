/**
 * Response filtering utilities for reducing token consumption
 */

/**
 * Essential fields to keep in non-detailed responses
 */
const ESSENTIAL_FIELDS = [
  'id',
  'appId', 
  'title',
  'url',
  'price',
  'rating',
  'ratingsCount',
  'category',
  'developer',
  'developerId',
  'icon',
  'free'
];

/**
 * Filter app data to remove verbose fields when fullDetail is false
 * @param appData - Raw app data from scraper
 * @param fullDetail - Whether to return full details
 * @returns Filtered app data
 */
export function filterAppData(appData: any, fullDetail: boolean = false): any {
  if (fullDetail || !appData) {
    return appData;
  }

  // If it's an array, filter each item
  if (Array.isArray(appData)) {
    return appData.map(item => filterSingleApp(item));
  }

  // If it's a single app, filter it
  return filterSingleApp(appData);
}

/**
 * Filter a single app object to keep only essential fields
 * @param app - Single app data object
 * @returns Filtered app object with only essential fields
 */
function filterSingleApp(app: any): any {
  if (!app || typeof app !== 'object') {
    return app;
  }

  const filtered: any = {};
  
  // Keep only essential fields
  ESSENTIAL_FIELDS.forEach(field => {
    if (app.hasOwnProperty(field)) {
      filtered[field] = app[field];
    }
  });

  return filtered;
}

/**
 * Get a summary of what fields were filtered out
 * @param originalCount - Number of fields in original data
 * @param filteredCount - Number of fields in filtered data
 * @returns Summary message
 */
export function getFilterSummary(originalCount: number, filteredCount: number): string {
  const removedCount = originalCount - filteredCount;
  return `Filtered response: kept ${filteredCount} essential fields, removed ${removedCount} verbose fields to reduce token usage`;
}