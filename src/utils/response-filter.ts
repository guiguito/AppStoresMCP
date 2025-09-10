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
 * Essential fields to keep in App Store review responses when fullDetail is false
 */
const APP_STORE_REVIEW_ESSENTIAL_FIELDS = [
  'id',
  'version',
  'userName',
  'score',
  'title',
  'text',
  'updated'
];

/**
 * Essential fields to keep in Google Play review responses when fullDetail is false
 */
const GOOGLE_PLAY_REVIEW_ESSENTIAL_FIELDS = [
  'id',
  'userName',
  'date',
  'score',
  'text',
  'version'
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
 * Filter review data to remove verbose fields when fullDetail is false
 * @param reviewData - Raw review data from scraper
 * @param fullDetail - Whether to return full details
 * @param platform - Platform type ('app-store' or 'google-play')
 * @returns Filtered review data
 */
export function filterReviewData(reviewData: any, fullDetail: boolean = false, platform: 'app-store' | 'google-play'): any {
  if (fullDetail || !reviewData) {
    return reviewData;
  }

  // Handle Google Play format (has data array and pagination token)
  if (platform === 'google-play' && reviewData.data && Array.isArray(reviewData.data)) {
    return {
      data: reviewData.data.map((review: any) => filterSingleReview(review, GOOGLE_PLAY_REVIEW_ESSENTIAL_FIELDS)),
      nextPaginationToken: reviewData.nextPaginationToken
    };
  }

  // Handle App Store format (direct array)
  if (platform === 'app-store' && Array.isArray(reviewData)) {
    return reviewData.map((review: any) => filterSingleReview(review, APP_STORE_REVIEW_ESSENTIAL_FIELDS));
  }

  // If it's a single review, filter it
  if (typeof reviewData === 'object' && !Array.isArray(reviewData)) {
    const essentialFields = platform === 'app-store' ? APP_STORE_REVIEW_ESSENTIAL_FIELDS : GOOGLE_PLAY_REVIEW_ESSENTIAL_FIELDS;
    return filterSingleReview(reviewData, essentialFields);
  }

  return reviewData;
}

/**
 * Filter a single review object to keep only essential fields
 * @param review - Single review data object
 * @param essentialFields - Array of field names to keep
 * @returns Filtered review object with only essential fields
 */
function filterSingleReview(review: any, essentialFields: string[]): any {
  if (!review || typeof review !== 'object') {
    return review;
  }

  const filtered: any = {};
  
  // Keep only essential fields
  essentialFields.forEach(field => {
    if (review.hasOwnProperty(field)) {
      filtered[field] = review[field];
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