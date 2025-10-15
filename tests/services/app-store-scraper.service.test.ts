/**
 * Unit tests for Apple App Store scraper service
 * Tests all methods with mocked app-store-scraper responses
 */

import { AppStoreScraperService, AppStoreScraperError } from '../../src/services/app-store-scraper.service';

// Use manual mock from __mocks__/app-store-scraper.js
jest.mock('app-store-scraper');

const store = require('app-store-scraper');

describe('AppStoreScraperService', () => {
  let service: AppStoreScraperService;

  beforeEach(() => {
    service = new AppStoreScraperService();
    jest.clearAllMocks();
  });

  describe('getAppDetails', () => {
    const mockAppData = {
      id: 123456789,
      appId: 'com.example.app',
      title: 'Test App',
      description: 'A test application for iOS',
      summary: 'Test app summary',
      developer: 'Test Developer',
      developerId: 987654321,
      score: 4.5,
      reviews: 1000,
      version: '1.0.0',
      size: '10.5 MB',
      primaryGenre: 'Productivity',
      genre: ['Productivity', 'Business'],
      free: true,
      price: 0,
      currency: 'USD',
      screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
      icon: 'icon.jpg',
      contentRating: '4+',
      released: '2023-01-01T00:00:00.000Z',
      updated: '2023-06-01T00:00:00.000Z',
      url: 'https://apps.apple.com/us/app/test-app/id123456789',
      supportedDevices: ['iPhone', 'iPad'],
      languages: ['EN'],
      artistName: 'Test Developer',
      artistId: 987654321,
      artistUrl: 'https://apps.apple.com/us/developer/test-developer/id987654321',
      bundleId: 'com.example.app',
      minimumOsVersion: '13.0',
      releaseNotes: 'Bug fixes and improvements',
      sellerName: 'Test Developer Inc.',
      trackCensoredName: 'Test App',
      trackContentRating: '4+',
      trackId: 123456789,
      trackName: 'Test App',
      trackViewUrl: 'https://apps.apple.com/us/app/test-app/id123456789',
      wrapperType: 'software'
    };

    it('should fetch and transform app details successfully', async () => {
      store.app.mockResolvedValue(mockAppData);

      const result = await service.getAppDetails('123456789');

      expect(store.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'us'
      });

      expect(result).toEqual({
        id: '123456789',
        title: 'Test App',
        description: 'A test application for iOS',
        developer: 'Test Developer',
        rating: 4.5,
        ratingCount: 1000,
        version: '1.0.0',
        size: '10.5 MB',
        category: 'Productivity',
        price: 'Free',
        screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
        icon: 'icon.jpg',
        url: 'https://apps.apple.com/us/app/test-app/id123456789'
      });
    });

    it('should use custom options when provided', async () => {
      store.app.mockResolvedValue(mockAppData);

      await service.getAppDetails('123456789', { country: 'ca' });

      expect(store.app).toHaveBeenCalledWith({
        id: '123456789',
        country: 'ca'
      });
    });

    it('should handle paid apps correctly', async () => {
      const paidAppData = { ...mockAppData, free: false, price: 2.99 };
      store.app.mockResolvedValue(paidAppData);

      const result = await service.getAppDetails('123456789');

      expect(result.price).toBe('2.99');
    });

    it('should handle missing genre gracefully', async () => {
      const appDataNoGenre = { ...mockAppData, primaryGenre: undefined, genre: undefined };
      store.app.mockResolvedValue(appDataNoGenre);

      const result = await service.getAppDetails('123456789');

      expect(result.category).toBe('');
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.getAppDetails('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.getAppDetails('invalid-id')).rejects.toThrow(AppStoreScraperError);
      await expect(service.getAppDetails('abc123')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      store.app.mockRejectedValue(error);

      await expect(service.getAppDetails('123456789')).rejects.toThrow(AppStoreScraperError);
    });
  });

  describe('getAppReviews', () => {
    const mockReviewsData = [
      {
        id: 'review1',
        userName: 'User1',
        score: 5,
        title: 'Great app!',
        text: 'This app is amazing and works perfectly',
        date: '2023-01-01T00:00:00.000Z',
        version: '1.0.0'
      },
      {
        id: 'review2',
        userName: 'User2',
        score: 3,
        title: 'Could be better',
        text: 'The app has potential but needs improvements',
        date: '2023-01-02T00:00:00.000Z',
        version: '1.0.0'
      }
    ];

    it('should fetch and transform app reviews successfully', async () => {
      store.reviews.mockResolvedValue(mockReviewsData);

      const result = await service.getAppReviews('123456789');

      expect(store.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 1,
        sort: 'recent',
        country: 'us'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'review1',
        userName: 'User1',
        rating: 5,
        title: 'Great app!',
        text: 'This app is amazing and works perfectly',
        date: new Date('2023-01-01T00:00:00.000Z')
      });
      expect(result[1]).toEqual({
        id: 'review2',
        userName: 'User2',
        rating: 3,
        title: 'Could be better',
        text: 'The app has potential but needs improvements',
        date: new Date('2023-01-02T00:00:00.000Z')
      });
    });

    it('should use custom options when provided', async () => {
      store.reviews.mockResolvedValue(mockReviewsData);

      await service.getAppReviews('123456789', {
        page: 2,
        sort: 'rating'
      });

      expect(store.reviews).toHaveBeenCalledWith({
        id: '123456789',
        page: 2,
        sort: 'helpful',
        country: 'us'
      });
    });

    it('should handle reviews without titles', async () => {
      const reviewsWithoutTitles = [
        {
          id: 'review3',
          userName: 'User3',
          score: 4,
          title: null,
          text: 'Good app overall',
          date: '2023-01-03T00:00:00.000Z',
          version: '1.0.0'
        }
      ];
      store.reviews.mockResolvedValue(reviewsWithoutTitles);

      const result = await service.getAppReviews('123456789');

      expect(result).toHaveLength(1);
      expect(result[0]?.title).toBeUndefined();
    });

    it('should handle missing review data gracefully', async () => {
      const incompleteReviews = [
        {
          id: null,
          userName: null,
          score: null,
          title: null,
          text: null,
          date: null,
          version: '1.0.0'
        }
      ];
      store.reviews.mockResolvedValue(incompleteReviews);

      const result = await service.getAppReviews('123456789');

      expect(result[0]).toEqual({
        id: '',
        userName: 'Anonymous',
        rating: 0,
        title: undefined,
        text: '',
        date: expect.any(Date)
      });
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.getAppReviews('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.getAppReviews('invalid-id')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      store.reviews.mockRejectedValue(error);

      await expect(service.getAppReviews('123456789')).rejects.toThrow(AppStoreScraperError);
    });
  });

  describe('searchApps', () => {
    const mockSearchResults = [
      {
        id: 123456789,
        appId: 'com.example.app1',
        title: 'App 1',
        summary: 'App 1 summary',
        developer: 'Developer 1',
        developerId: 987654321,
        score: 4.5,
        free: true,
        price: 0,
        icon: 'icon1.jpg',
        url: 'https://apps.apple.com/us/app/app-1/id123456789'
      },
      {
        id: 987654321,
        appId: 'com.example.app2',
        title: 'App 2',
        summary: 'App 2 summary',
        developer: 'Developer 2',
        developerId: 123456789,
        score: 3.8,
        free: false,
        price: 1.99,
        icon: 'icon2.jpg',
        url: 'https://apps.apple.com/us/app/app-2/id987654321'
      }
    ];

    it('should search and transform results successfully', async () => {
      store.search.mockResolvedValue(mockSearchResults);

      const result = await service.searchApps('test query');

      expect(store.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 50,
        country: 'us'
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '123456789',
        title: 'App 1',
        developer: 'Developer 1',
        rating: 4.5,
        price: 'Free',
        icon: 'icon1.jpg',
        url: 'https://apps.apple.com/us/app/app-1/id123456789'
      });
      expect(result[1]).toEqual({
        id: '987654321',
        title: 'App 2',
        developer: 'Developer 2',
        rating: 3.8,
        price: '1.99',
        icon: 'icon2.jpg',
        url: 'https://apps.apple.com/us/app/app-2/id987654321'
      });
    });

    it('should use custom options when provided', async () => {
      store.search.mockResolvedValue(mockSearchResults);

      await service.searchApps('test query', {
        num: 25,
        country: 'ca'
      });

      expect(store.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 25,
        country: 'ca'
      });
    });

    it('should limit excessive num parameter', async () => {
      store.search.mockResolvedValue(mockSearchResults);

      await service.searchApps('test query', { num: 200 });

      expect(store.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 100, // Limited to 100
        country: 'us'
      });
    });

    it('should handle missing search result data gracefully', async () => {
      const incompleteResults = [
        {
          id: null,
          appId: null,
          title: null,
          developer: null,
          score: null,
          free: true,
          price: null,
          icon: null,
          url: null
        }
      ];
      store.search.mockResolvedValue(incompleteResults);

      const result = await service.searchApps('test query');

      expect(result[0]).toEqual({
        id: '',
        title: '',
        developer: '',
        rating: 0,
        price: 'Free',
        icon: '',
        url: ''
      });
    });

    it('should throw error for invalid search query', async () => {
      await expect(service.searchApps('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.searchApps('a')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      store.search.mockRejectedValue(error);

      await expect(service.searchApps('test query')).rejects.toThrow(AppStoreScraperError);
    });
  });

  describe('Sort option mapping', () => {
    it('should map sort options correctly', async () => {
      store.reviews.mockResolvedValue([]);

      // Test newest mapping
      await service.getAppReviews('123456789', { sort: 'newest' });
      expect(store.reviews).toHaveBeenCalledWith(expect.objectContaining({ sort: 'recent' }));

      // Test rating mapping
      await service.getAppReviews('123456789', { sort: 'rating' });
      expect(store.reviews).toHaveBeenCalledWith(expect.objectContaining({ sort: 'helpful' }));

      // Test helpfulness mapping
      await service.getAppReviews('123456789', { sort: 'helpfulness' });
      expect(store.reviews).toHaveBeenCalledWith(expect.objectContaining({ sort: 'helpful' }));

      // Test default mapping
      await service.getAppReviews('123456789', { sort: 'unknown' as any });
      expect(store.reviews).toHaveBeenCalledWith(expect.objectContaining({ sort: 'recent' }));
    });
  });

  describe('list', () => {
    const mockListResults = [
      {
        id: 123456789,
        appId: 'com.example.app1',
        title: 'Top App 1',
        developer: 'Developer 1',
        score: 4.8,
        free: true,
        icon: 'icon1.jpg'
      },
      {
        id: 987654321,
        appId: 'com.example.app2',
        title: 'Top App 2',
        developer: 'Developer 2',
        score: 4.5,
        free: false,
        price: 2.99,
        icon: 'icon2.jpg'
      }
    ];

    it('should fetch list with default parameters', async () => {
      store.list.mockResolvedValue(mockListResults);

      const result = await service.list();

      expect(store.list).toHaveBeenCalledWith({
        collection: 'top-free',
        country: 'us',
        lang: 'en',
        num: 50,
        fullDetail: false
      });
      expect(result).toEqual(mockListResults);
    });

    it('should use custom options when provided', async () => {
      store.list.mockResolvedValue(mockListResults);

      await service.list({
        collection: 'top-paid',
        category: 'games',
        country: 'gb',
        lang: 'fr',
        num: 25,
        fullDetail: true
      });

      expect(store.list).toHaveBeenCalledWith({
        collection: 'top-paid',
        category: 'games',
        country: 'gb',
        lang: 'fr',
        num: 25,
        fullDetail: true
      });
    });

    it('should limit num parameter to maximum of 100', async () => {
      store.list.mockResolvedValue(mockListResults);

      await service.list({ num: 150 });

      expect(store.list).toHaveBeenCalledWith(
        expect.objectContaining({
          num: 100
        })
      );
    });

    it('should not include category when not specified', async () => {
      store.list.mockResolvedValue(mockListResults);

      await service.list({ collection: 'top-free' });

      const callArgs = store.list.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('category');
    });

    it('should return raw response from app-store-scraper', async () => {
      const rawResponse = { apps: mockListResults, metadata: { total: 2 } };
      store.list.mockResolvedValue(rawResponse);

      const result = await service.list();

      expect(result).toEqual(rawResponse);
      expect(result).toBe(rawResponse); // Should be the exact same object
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      store.list.mockRejectedValue(error);

      await expect(service.list()).rejects.toThrow(AppStoreScraperError);
      await expect(service.list()).rejects.toThrow('Failed to fetch app list: Network error');
    });
  });

  describe('privacy', () => {
    const mockPrivacyData = {
      privacyTypes: [
        {
          identifier: 'NSLocationWhenInUseUsageDescription',
          category: 'Location',
          purposes: ['App Functionality'],
          dataType: 'Precise Location'
        },
        {
          identifier: 'NSCameraUsageDescription',
          category: 'Camera',
          purposes: ['App Functionality'],
          dataType: 'Camera'
        }
      ],
      privacyLabels: {
        dataUsedToTrackYou: [],
        dataLinkedToYou: ['Location'],
        dataNotLinkedToYou: []
      }
    };

    it('should fetch privacy information successfully', async () => {
      store.privacy = jest.fn().mockResolvedValue(mockPrivacyData);

      const result = await service.privacy('123456789');

      expect(store.privacy).toHaveBeenCalledWith({
        id: '123456789'
      });
      expect(result).toEqual(mockPrivacyData);
    });

    it('should return raw response from app-store-scraper', async () => {
      store.privacy = jest.fn().mockResolvedValue(mockPrivacyData);

      const result = await service.privacy('123456789');

      expect(result).toEqual(mockPrivacyData);
      expect(result).toBe(mockPrivacyData); // Should be the exact same object
    });

    it('should handle empty privacy data', async () => {
      const emptyPrivacyData = { privacyTypes: [] };
      store.privacy = jest.fn().mockResolvedValue(emptyPrivacyData);

      const result = await service.privacy('123456789');

      expect(result).toEqual(emptyPrivacyData);
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.privacy('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.privacy('invalid-id')).rejects.toThrow(AppStoreScraperError);
      await expect(service.privacy('abc123')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      store.privacy = jest.fn().mockRejectedValue(error);

      await expect(service.privacy('123456789')).rejects.toThrow(AppStoreScraperError);
      await expect(service.privacy('123456789')).rejects.toThrow('Failed to fetch app privacy information: Network error');
    });
  });

  describe('suggest', () => {
    const mockSuggestData = ['test app', 'test game', 'test tool'];

    it('should fetch search suggestions successfully', async () => {
      store.suggest = jest.fn().mockResolvedValue(mockSuggestData);

      const result = await service.suggest('test');

      expect(store.suggest).toHaveBeenCalledWith({
        term: 'test'
      });
      expect(result).toEqual(mockSuggestData);
    });

    it('should return raw response from app-store-scraper', async () => {
      const complexSuggestData = {
        suggestions: ['app1', 'app2'],
        metadata: { term: 'test', count: 2 }
      };
      store.suggest = jest.fn().mockResolvedValue(complexSuggestData);

      const result = await service.suggest('test');

      expect(result).toEqual(complexSuggestData);
      expect(result).toBe(complexSuggestData);
    });

    it('should handle empty suggestions', async () => {
      const emptySuggestData: any[] = [];
      store.suggest = jest.fn().mockResolvedValue(emptySuggestData);

      const result = await service.suggest('xyz123');

      expect(result).toEqual([]);
    });

    it('should throw error for invalid search term', async () => {
      await expect(service.suggest('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.suggest('a')).rejects.toThrow(AppStoreScraperError);
      await expect(service.suggest('   ')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Suggest service unavailable');
      store.suggest = jest.fn().mockRejectedValue(error);

      await expect(service.suggest('test')).rejects.toThrow(AppStoreScraperError);
      await expect(service.suggest('test')).rejects.toThrow('Failed to fetch search suggestions: Suggest service unavailable');
    });
  });

  describe('similar', () => {
    const mockSimilarData = [
      { id: '456789', title: 'Similar App 1', developer: 'Dev 1' },
      { id: '789123', title: 'Similar App 2', developer: 'Dev 2' }
    ];

    it('should fetch similar apps successfully', async () => {
      store.similar = jest.fn().mockResolvedValue(mockSimilarData);

      const result = await service.similar('123456789');

      expect(store.similar).toHaveBeenCalledWith({
        id: '123456789'
      });
      expect(result).toEqual(mockSimilarData);
    });

    it('should return raw response from app-store-scraper', async () => {
      const complexSimilarData = {
        results: [
          { id: '456', title: 'Similar App 1', developer: 'Dev 1' }
        ],
        metadata: { sourceAppId: '123456789', total: 1 }
      };
      store.similar = jest.fn().mockResolvedValue(complexSimilarData);

      const result = await service.similar('123456789');

      expect(result).toEqual(complexSimilarData);
      expect(result).toBe(complexSimilarData);
    });

    it('should handle empty similar apps results', async () => {
      const emptySimilarData: any[] = [];
      store.similar = jest.fn().mockResolvedValue(emptySimilarData);

      const result = await service.similar('123456789');

      expect(result).toEqual([]);
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.similar('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.similar('invalid')).rejects.toThrow(AppStoreScraperError);
      await expect(service.similar('com.example.app')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Similar service unavailable');
      store.similar = jest.fn().mockRejectedValue(error);

      await expect(service.similar('123456789')).rejects.toThrow(AppStoreScraperError);
      await expect(service.similar('123456789')).rejects.toThrow('Failed to fetch similar apps: Similar service unavailable');
    });
  });

  describe('ratings', () => {
    const mockRatingsData = {
      ratings: {
        5: 1000,
        4: 500,
        3: 250,
        2: 100,
        1: 50
      },
      histogram: [50, 100, 250, 500, 1000],
      total: 1900,
      average: 4.2
    };

    it('should fetch ratings successfully', async () => {
      store.ratings = jest.fn().mockResolvedValue(mockRatingsData);

      const result = await service.ratings('123456789');

      expect(store.ratings).toHaveBeenCalledWith({
        id: '123456789'
      });
      expect(result).toEqual(mockRatingsData);
    });

    it('should fetch ratings with country option', async () => {
      store.ratings = jest.fn().mockResolvedValue(mockRatingsData);

      const result = await service.ratings('123456789', { country: 'ca' });

      expect(store.ratings).toHaveBeenCalledWith({
        id: '123456789',
        country: 'ca'
      });
      expect(result).toEqual(mockRatingsData);
    });

    it('should return raw response from app-store-scraper', async () => {
      const complexRatingsData = {
        ratings: {
          5: 800,
          4: 400,
          3: 200,
          2: 80,
          1: 40
        },
        breakdown: {
          byVersion: {
            '1.0': { 5: 100, 4: 50, 3: 25, 2: 10, 1: 5 },
            '2.0': { 5: 700, 4: 350, 3: 175, 2: 70, 1: 35 }
          }
        },
        metadata: {
          appId: '123456789',
          country: 'us',
          lastUpdated: '2023-01-01'
        }
      };
      store.ratings = jest.fn().mockResolvedValue(complexRatingsData);

      const result = await service.ratings('123456789');

      expect(result).toEqual(complexRatingsData);
      expect(result).toBe(complexRatingsData);
    });

    it('should handle empty ratings results', async () => {
      const emptyRatingsData = { ratings: {} };
      store.ratings = jest.fn().mockResolvedValue(emptyRatingsData);

      const result = await service.ratings('123456789');

      expect(result).toEqual(emptyRatingsData);
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.ratings('')).rejects.toThrow(AppStoreScraperError);
      await expect(service.ratings('invalid')).rejects.toThrow(AppStoreScraperError);
      await expect(service.ratings('com.example.app')).rejects.toThrow(AppStoreScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Ratings service unavailable');
      store.ratings = jest.fn().mockRejectedValue(error);

      await expect(service.ratings('123456789')).rejects.toThrow(AppStoreScraperError);
      await expect(service.ratings('123456789')).rejects.toThrow('Failed to fetch app ratings: Ratings service unavailable');
    });
  });

  describe('Error handling', () => {
    it('should create proper error instances', () => {
      const originalError = new Error('Original error');
      const customError = new AppStoreScraperError('Custom message', 'CUSTOM_CODE', originalError);

      expect(customError.name).toBe('AppStoreScraperError');
      expect(customError.message).toBe('Custom message');
      expect(customError.code).toBe('CUSTOM_CODE');
      expect(customError.originalError).toBe(originalError);
    });

    it('should validate app ID format correctly', async () => {
      // Valid numeric IDs should not throw
      expect(() => (service as any).validateAppId('123456789')).not.toThrow();
      expect(() => (service as any).validateAppId('1')).not.toThrow();

      // Invalid IDs should throw
      expect(() => (service as any).validateAppId('')).toThrow(AppStoreScraperError);
      expect(() => (service as any).validateAppId('abc')).toThrow(AppStoreScraperError);
      expect(() => (service as any).validateAppId('123abc')).toThrow(AppStoreScraperError);
      expect(() => (service as any).validateAppId('com.example.app')).toThrow(AppStoreScraperError);
    });

    it('should validate search query correctly', async () => {
      // Valid queries should not throw
      expect(() => (service as any).validateSearchQuery('test')).not.toThrow();
      expect(() => (service as any).validateSearchQuery('test query')).not.toThrow();

      // Invalid queries should throw
      expect(() => (service as any).validateSearchQuery('')).toThrow(AppStoreScraperError);
      expect(() => (service as any).validateSearchQuery('a')).toThrow(AppStoreScraperError);
      expect(() => (service as any).validateSearchQuery('   ')).toThrow(AppStoreScraperError);
    });
  });
});