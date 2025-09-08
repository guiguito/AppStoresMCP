/**
 * Unit tests for Google Play Store scraper service
 * Tests all methods with mocked google-play-scraper responses
 */

import { GooglePlayScraperService, GooglePlayScraperError } from '../../src/services/google-play-scraper.service';

// Mock the google-play-scraper module
jest.mock('google-play-scraper', () => ({
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  sort: {
    NEWEST: 1,
    RATING: 2,
    HELPFULNESS: 3
  }
}));

const gplay = require('google-play-scraper');

describe('GooglePlayScraperService', () => {
  let service: GooglePlayScraperService;

  beforeEach(() => {
    service = new GooglePlayScraperService();
    jest.clearAllMocks();
  });

  describe('getAppDetails', () => {
    const mockAppData = {
      appId: 'com.example.app',
      title: 'Test App',
      description: 'A test application',
      descriptionHTML: '<p>A test application</p>',
      summary: 'Test app summary',
      developer: 'Test Developer',
      developerId: 'test-developer-id',
      score: 4.5,
      scoreText: '4.5',
      reviews: 1000,
      version: '1.0.0',
      size: '10MB',
      installs: '1,000+',
      minInstalls: 1000,
      maxInstalls: 5000,
      genre: 'Productivity',
      genreId: 'PRODUCTIVITY',
      free: true,
      price: null,
      priceText: 'Free',
      currency: 'USD',
      screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
      icon: 'icon.jpg',
      headerImage: 'header.jpg',
      video: null,
      videoImage: null,
      contentRating: 'Everyone',
      contentRatingDescription: 'No objectionable content',
      adSupported: false,
      inAppPurchases: false,
      released: '2023-01-01',
      updated: 1672531200000,
      androidVersion: '5.0',
      androidVersionText: '5.0 and up',
      url: 'https://play.google.com/store/apps/details?id=com.example.app',
      privacyPolicy: 'https://example.com/privacy',
      developerWebsite: 'https://example.com',
      developerEmail: 'developer@example.com',
      developerAddress: '123 Developer St',
      comments: [],
      editorsChoice: false,
      features: [],
      histogram: { 1: 10, 2: 20, 3: 30, 4: 40, 5: 100 },
      permissions: [],
      playstoreUrl: 'https://play.google.com/store/apps/details?id=com.example.app',
      recentChanges: 'Bug fixes and improvements',
      similar: [],
      moreByDeveloper: []
    };

    it('should fetch and transform app details successfully', async () => {
      gplay.app.mockResolvedValue(mockAppData);

      const result = await service.getAppDetails('com.example.app');

      expect(gplay.app).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'en',
        country: 'us'
      });

      expect(result).toEqual({
        id: 'com.example.app',
        title: 'Test App',
        description: 'A test application',
        developer: 'Test Developer',
        rating: 4.5,
        ratingCount: 1000,
        version: '1.0.0',
        size: '10MB',
        category: 'Productivity',
        price: 'Free',
        screenshots: ['screenshot1.jpg', 'screenshot2.jpg'],
        icon: 'icon.jpg',
        url: 'https://play.google.com/store/apps/details?id=com.example.app'
      });
    });

    it('should use custom options when provided', async () => {
      gplay.app.mockResolvedValue(mockAppData);

      await service.getAppDetails('com.example.app', { lang: 'es', country: 'mx' });

      expect(gplay.app).toHaveBeenCalledWith({
        appId: 'com.example.app',
        lang: 'es',
        country: 'mx'
      });
    });

    it('should handle paid apps correctly', async () => {
      const paidAppData = { ...mockAppData, free: false, price: '$2.99' };
      gplay.app.mockResolvedValue(paidAppData);

      const result = await service.getAppDetails('com.example.app');

      expect(result.price).toBe('$2.99');
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.getAppDetails('')).rejects.toThrow(GooglePlayScraperError);
      await expect(service.getAppDetails('invalid-id')).rejects.toThrow(GooglePlayScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      gplay.app.mockRejectedValue(error);

      await expect(service.getAppDetails('com.example.app')).rejects.toThrow(GooglePlayScraperError);
    });
  });

  describe('getAppReviews', () => {
    const mockReviewsData = {
      data: [
        {
          id: 'review1',
          userName: 'User1',
          userImage: 'user1.jpg',
          score: 5,
          scoreText: '5',
          title: 'Great app!',
          text: 'This app is amazing',
          date: '2023-01-01',
          thumbsUp: 10,
          url: 'https://play.google.com/store/apps/details?id=com.example.app&reviewId=review1',
          replyDate: null,
          replyText: null,
          version: '1.0.0'
        },
        {
          id: 'review2',
          userName: 'User2',
          userImage: 'user2.jpg',
          score: 3,
          scoreText: '3',
          title: null,
          text: 'Could be better',
          date: '2023-01-02',
          thumbsUp: 2,
          url: 'https://play.google.com/store/apps/details?id=com.example.app&reviewId=review2',
          replyDate: null,
          replyText: null,
          version: '1.0.0'
        }
      ]
    };

    it('should fetch and transform app reviews successfully', async () => {
      gplay.reviews.mockResolvedValue(mockReviewsData);

      const result = await service.getAppReviews('com.example.app');

      expect(gplay.reviews).toHaveBeenCalledWith({
        appId: 'com.example.app',
        num: 100,
        sort: 1 // NEWEST
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'review1',
        userName: 'User1',
        rating: 5,
        title: 'Great app!',
        text: 'This app is amazing',
        date: new Date('2023-01-01'),
        helpful: 10
      });
      expect(result[1]).toEqual({
        id: 'review2',
        userName: 'User2',
        rating: 3,
        title: undefined,
        text: 'Could be better',
        date: new Date('2023-01-02'),
        helpful: 2
      });
    });

    it('should use custom options when provided', async () => {
      gplay.reviews.mockResolvedValue(mockReviewsData);

      await service.getAppReviews('com.example.app', {
        page: 1,
        num: 50,
        sort: 'rating'
      });

      expect(gplay.reviews).toHaveBeenCalledWith({
        appId: 'com.example.app',
        paginate: true,
        nextPaginationToken: 'page_1',
        num: 50,
        sort: 2 // RATING
      });
    });

    it('should limit excessive num parameter', async () => {
      gplay.reviews.mockResolvedValue(mockReviewsData);

      await service.getAppReviews('com.example.app', { num: 200 });

      expect(gplay.reviews).toHaveBeenCalledWith({
        appId: 'com.example.app',
        num: 150, // Limited to 150
        sort: 1
      });
    });

    it('should throw error for invalid app ID', async () => {
      await expect(service.getAppReviews('')).rejects.toThrow(GooglePlayScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      gplay.reviews.mockRejectedValue(error);

      await expect(service.getAppReviews('com.example.app')).rejects.toThrow(GooglePlayScraperError);
    });
  });

  describe('searchApps', () => {
    const mockSearchResults = [
      {
        appId: 'com.example.app1',
        title: 'App 1',
        summary: 'App 1 summary',
        developer: 'Developer 1',
        developerId: 'developer1',
        score: 4.5,
        scoreText: '4.5',
        free: true,
        price: null,
        priceText: 'Free',
        icon: 'icon1.jpg',
        url: 'https://play.google.com/store/apps/details?id=com.example.app1'
      },
      {
        appId: 'com.example.app2',
        title: 'App 2',
        summary: 'App 2 summary',
        developer: 'Developer 2',
        developerId: 'developer2',
        score: 3.8,
        scoreText: '3.8',
        free: false,
        price: '$1.99',
        priceText: '$1.99',
        icon: 'icon2.jpg',
        url: 'https://play.google.com/store/apps/details?id=com.example.app2'
      }
    ];

    it('should search and transform results successfully', async () => {
      gplay.search.mockResolvedValue(mockSearchResults);

      const result = await service.searchApps('test query');

      expect(gplay.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 50,
        lang: 'en',
        country: 'us',
        fullDetail: false
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'com.example.app1',
        title: 'App 1',
        developer: 'Developer 1',
        rating: 4.5,
        price: 'Free',
        icon: 'icon1.jpg',
        url: 'https://play.google.com/store/apps/details?id=com.example.app1'
      });
      expect(result[1]).toEqual({
        id: 'com.example.app2',
        title: 'App 2',
        developer: 'Developer 2',
        rating: 3.8,
        price: '$1.99',
        icon: 'icon2.jpg',
        url: 'https://play.google.com/store/apps/details?id=com.example.app2'
      });
    });

    it('should use custom options when provided', async () => {
      gplay.search.mockResolvedValue(mockSearchResults);

      await service.searchApps('test query', {
        num: 25,
        lang: 'es',
        country: 'mx',
        fullDetail: true
      });

      expect(gplay.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 25,
        lang: 'es',
        country: 'mx',
        fullDetail: true
      });
    });

    it('should limit excessive num parameter', async () => {
      gplay.search.mockResolvedValue(mockSearchResults);

      await service.searchApps('test query', { num: 200 });

      expect(gplay.search).toHaveBeenCalledWith({
        term: 'test query',
        num: 100, // Limited to 100
        lang: 'en',
        country: 'us',
        fullDetail: false
      });
    });

    it('should throw error for invalid search query', async () => {
      await expect(service.searchApps('')).rejects.toThrow(GooglePlayScraperError);
      await expect(service.searchApps('a')).rejects.toThrow(GooglePlayScraperError);
    });

    it('should handle scraper errors', async () => {
      const error = new Error('Network error');
      gplay.search.mockRejectedValue(error);

      await expect(service.searchApps('test query')).rejects.toThrow(GooglePlayScraperError);
    });
  });

  describe('Error handling', () => {
    it('should create proper error instances', () => {
      const originalError = new Error('Original error');
      const customError = new GooglePlayScraperError('Custom message', 'CUSTOM_CODE', originalError);

      expect(customError.name).toBe('GooglePlayScraperError');
      expect(customError.message).toBe('Custom message');
      expect(customError.code).toBe('CUSTOM_CODE');
      expect(customError.originalError).toBe(originalError);
    });
  });
});