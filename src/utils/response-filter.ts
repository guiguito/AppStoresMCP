/**
 * Response filtering utilities for reducing token consumption
 */

/**
 * Essential App Store app fields kept in non-detailed responses (filterAppData is only used by app-store-search)
 */
const ESSENTIAL_FIELDS = [
  'id',
  'appId',
  'title',
  'subtitle',
  'url',
  'price',
  'score',
  'reviews',
  'primaryGenre',
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

type JsonObject = Record<string, unknown>;

/**
 * Keep only `fields` of an object; non-objects pass through untouched
 */
function pick(value: unknown, fields: string[]): unknown {
  if (!value || typeof value !== 'object') {
    return value;
  }
  const source = value as JsonObject;
  const picked: JsonObject = {};
  for (const field of fields) {
    if (Object.hasOwn(source, field)) {
      picked[field] = source[field];
    }
  }
  return picked;
}

/**
 * Filter app data (one app or a list) to ESSENTIAL_FIELDS unless fullDetail is set
 */
export function filterAppData(appData: unknown, fullDetail: boolean = false): unknown {
  if (fullDetail || !appData) {
    return appData;
  }
  return Array.isArray(appData) ? appData.map(app => pick(app, ESSENTIAL_FIELDS)) : pick(appData, ESSENTIAL_FIELDS);
}

/**
 * Filter review data to the platform's essential fields unless fullDetail is set.
 * Google Play returns `{ data, nextPaginationToken }`, the App Store a plain array.
 */
export function filterReviewData(reviewData: unknown, fullDetail: boolean = false, platform: 'app-store' | 'google-play'): unknown {
  if (fullDetail || !reviewData) {
    return reviewData;
  }
  const fields = platform === 'app-store' ? APP_STORE_REVIEW_ESSENTIAL_FIELDS : GOOGLE_PLAY_REVIEW_ESSENTIAL_FIELDS;

  if (Array.isArray(reviewData)) {
    return reviewData.map(review => pick(review, fields));
  }
  const page = reviewData as JsonObject;
  if (platform === 'google-play' && Array.isArray(page.data)) {
    return {
      data: page.data.map(review => pick(review, fields)),
      nextPaginationToken: page.nextPaginationToken
    };
  }
  return pick(reviewData, fields);
}
