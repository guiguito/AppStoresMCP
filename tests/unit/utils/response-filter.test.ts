/**
 * Tests for response filtering utilities
 */

import { filterAppData, filterReviewData, getFilterSummary } from '../../../src/utils/response-filter';

describe('Response Filter Utils', () => {
  const mockAppData = {
    id: 'com.example.app',
    appId: 'com.example.app',
    title: 'Example App',
    url: 'https://example.com',
    price: 0,
    rating: 4.5,
    ratingsCount: 1000,
    category: 'PRODUCTIVITY',
    developer: 'Example Developer',
    developerId: 'example-dev',
    icon: 'https://example.com/icon.png',
    free: true,
    // Fields that should be filtered out
    description: 'This is a very long description that consumes many tokens...',
    summary: 'Short summary that also consumes tokens',
    descriptionHTML: '<p>HTML description</p>',
    releaseNotes: 'Latest release notes',
    screenshots: ['screenshot1.png', 'screenshot2.png'],
    permissions: ['CAMERA', 'LOCATION'],
    reviews: [{ text: 'Great app!' }]
  };

  describe('filterAppData', () => {
    it('should return full data when fullDetail is true', () => {
      const result = filterAppData(mockAppData, true);
      expect(result).toEqual(mockAppData);
    });

    it('should filter out verbose fields when fullDetail is false', () => {
      const result = filterAppData(mockAppData, false);
      
      // Should keep essential fields
      expect(result.id).toBe('com.example.app');
      expect(result.title).toBe('Example App');
      expect(result.rating).toBe(4.5);
      expect(result.developer).toBe('Example Developer');
      
      // Should remove verbose fields
      expect(result.description).toBeUndefined();
      expect(result.summary).toBeUndefined();
      expect(result.descriptionHTML).toBeUndefined();
      expect(result.releaseNotes).toBeUndefined();
      expect(result.screenshots).toBeUndefined();
      expect(result.permissions).toBeUndefined();
      expect(result.reviews).toBeUndefined();
    });

    it('should handle arrays of app data', () => {
      const appArray = [mockAppData, { ...mockAppData, id: 'com.example.app2' }];
      const result = filterAppData(appArray, false);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].description).toBeUndefined();
      expect(result[1].description).toBeUndefined();
      expect(result[0].title).toBe('Example App');
      expect(result[1].title).toBe('Example App');
    });

    it('should handle null/undefined input', () => {
      expect(filterAppData(null)).toBeNull();
      expect(filterAppData(undefined)).toBeUndefined();
    });

    it('should handle non-object input', () => {
      expect(filterAppData('string')).toBe('string');
      expect(filterAppData(123)).toBe(123);
    });

    it('should default to filtering when fullDetail is not specified', () => {
      const result = filterAppData(mockAppData);
      expect(result.description).toBeUndefined();
      expect(result.title).toBe('Example App');
    });
  });

  describe('filterReviewData', () => {
    const mockAppStoreReview = {
      id: 1,
      userName: 'TestUser',
      score: 5,
      title: 'Great app!',
      text: 'This app is amazing',
      date: '2023-01-01',
      version: '1.0.0',
      updated: '2023-01-01',
      // Fields that should be filtered out
      url: 'https://example.com/review',
      thumbsUp: 10,
      helpful: true
    };

    const mockGooglePlayReview = {
      id: 'review1',
      userName: 'TestUser',
      score: 5,
      text: 'This app is amazing',
      date: '2023-01-01',
      version: '1.0.0',
      // Fields that should be filtered out
      title: 'Great app!',
      thumbsUp: 10,
      url: 'https://example.com/review'
    };

    it('should return full data when fullDetail is true for App Store', () => {
      const result = filterReviewData([mockAppStoreReview], true, 'app-store');
      expect(result).toEqual([mockAppStoreReview]);
    });

    it('should return full data when fullDetail is true for Google Play', () => {
      const mockGooglePlayData = { data: [mockGooglePlayReview], nextPaginationToken: 'token' };
      const result = filterReviewData(mockGooglePlayData, true, 'google-play');
      expect(result).toEqual(mockGooglePlayData);
    });

    it('should filter App Store reviews when fullDetail is false', () => {
      const result = filterReviewData([mockAppStoreReview], false, 'app-store');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe(1);
      expect(result[0].userName).toBe('TestUser');
      expect(result[0].score).toBe(5);
      expect(result[0].title).toBe('Great app!');
      expect(result[0].text).toBe('This app is amazing');
      expect(result[0].version).toBe('1.0.0');
      expect(result[0].updated).toBe('2023-01-01');
      
      // Should remove non-essential fields
      expect(result[0].url).toBeUndefined();
      expect(result[0].thumbsUp).toBeUndefined();
      expect(result[0].helpful).toBeUndefined();
    });

    it('should filter Google Play reviews when fullDetail is false', () => {
      const mockGooglePlayData = { data: [mockGooglePlayReview], nextPaginationToken: 'token' };
      const result = filterReviewData(mockGooglePlayData, false, 'google-play');
      
      expect(result.data).toBeDefined();
      expect(result.nextPaginationToken).toBe('token');
      expect(result.data[0].id).toBe('review1');
      expect(result.data[0].userName).toBe('TestUser');
      expect(result.data[0].score).toBe(5);
      expect(result.data[0].text).toBe('This app is amazing');
      expect(result.data[0].date).toBe('2023-01-01');
      expect(result.data[0].version).toBe('1.0.0');
      
      // Should remove non-essential fields
      expect(result.data[0].title).toBeUndefined();
      expect(result.data[0].thumbsUp).toBeUndefined();
      expect(result.data[0].url).toBeUndefined();
    });

    it('should handle null/undefined input', () => {
      expect(filterReviewData(null, false, 'app-store')).toBeNull();
      expect(filterReviewData(undefined, false, 'google-play')).toBeUndefined();
    });

    it('should default to filtering when fullDetail is not specified', () => {
      const result = filterReviewData([mockAppStoreReview], undefined, 'app-store');
      expect(result[0].url).toBeUndefined();
      expect(result[0].userName).toBe('TestUser');
    });
  });

  describe('getFilterSummary', () => {
    it('should generate correct summary message', () => {
      const summary = getFilterSummary(20, 12);
      expect(summary).toBe('Filtered response: kept 12 essential fields, removed 8 verbose fields to reduce token usage');
    });

    it('should handle zero removed fields', () => {
      const summary = getFilterSummary(10, 10);
      expect(summary).toBe('Filtered response: kept 10 essential fields, removed 0 verbose fields to reduce token usage');
    });
  });
});