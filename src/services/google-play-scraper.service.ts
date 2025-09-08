/**
 * Google Play Store scraper service wrapper
 * Wraps google-play-scraper library with standardized interfaces and error handling
 */

const gplay = require('google-play-scraper').default || require('google-play-scraper');
import { AppDetails, Review, SearchResult, ReviewsOptions, SearchOptions, AppDetailsOptions } from '../types/app-store';

/**
 * Custom error class for Google Play Store scraping operations
 */
export class GooglePlayScraperError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GooglePlayScraperError';
  }
}

/**
 * Google Play Store scraper service class
 * Provides methods for app details, reviews, and search functionality
 */
export class GooglePlayScraperService {
  /**
   * Get detailed information about a Google Play Store app
   * @param appId - The app ID (package name) from Google Play Store
   * @param options - Optional parameters for the request
   * @returns Promise resolving to standardized AppDetails
   */
  async getAppDetails(appId: string, options?: AppDetailsOptions): Promise<AppDetails> {
    this.validateAppId(appId);

    try {
      const appData = await gplay.app({
        appId,
        lang: options?.lang || 'en',
        country: options?.country || 'us'
      });

      return this.transformAppDetails(appData);
    } catch (error) {
      throw this.handleError('Failed to fetch app details', 'APP_DETAILS_ERROR', error as Error);
    }
  }

  /**
   * Get reviews for a Google Play Store app
   * @param appId - The app ID (package name) from Google Play Store
   * @param options - Optional parameters for pagination and sorting
   * @returns Promise resolving to array of standardized Reviews
   */
  async getAppReviews(appId: string, options?: ReviewsOptions): Promise<Review[]> {
    this.validateAppId(appId);

    try {
      const reviewsOptions: any = {
        appId,
        num: Math.min(options?.num || 100, 150), // Limit to prevent excessive requests
        sort: this.mapSortOption(options?.sort)
      };

      if (options?.page !== undefined) {
        reviewsOptions.paginate = true;
        reviewsOptions.nextPaginationToken = `page_${options.page}`;
      }

      const reviewsData = await gplay.reviews(reviewsOptions);

      return reviewsData.data.map((review: any) => this.transformReview(review));
    } catch (error) {
      throw this.handleError('Failed to fetch app reviews', 'APP_REVIEWS_ERROR', error as Error);
    }
  }

  /**
   * Search for apps in Google Play Store
   * @param query - Search query string
   * @param options - Optional parameters for search
   * @returns Promise resolving to array of standardized SearchResults
   */
  async searchApps(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    this.validateSearchQuery(query);

    try {
      const searchResults = await gplay.search({
        term: query,
        num: Math.min(options?.num || 50, 100), // Limit to prevent excessive requests
        lang: options?.lang || 'en',
        country: options?.country || 'us',
        fullDetail: options?.fullDetail || false
      });

      return searchResults.map((result: any) => this.transformSearchResult(result));
    } catch (error) {
      throw this.handleError('Failed to search apps', 'APP_SEARCH_ERROR', error as Error);
    }
  }

  /**
   * Get app lists from Google Play Store collections
   * @param options - Parameters for list request
   * @returns Promise resolving to raw list data
   */
  async list(options: any): Promise<any> {
    try {
      const listData = await gplay.list(options);
      return listData;
    } catch (error) {
      throw this.handleError('Failed to fetch app list', 'APP_LIST_ERROR', error as Error);
    }
  }

  /**
   * Get apps by developer from Google Play Store
   * @param options - Parameters for developer request
   * @returns Promise resolving to raw developer data
   */
  async developer(options: any): Promise<any> {
    try {
      const developerData = await gplay.developer(options);
      return developerData;
    } catch (error) {
      throw this.handleError('Failed to fetch developer apps', 'DEVELOPER_ERROR', error as Error);
    }
  }

  /**
   * Get search suggestions from Google Play Store
   * @param options - Parameters for suggest request
   * @returns Promise resolving to raw suggest data
   */
  async suggest(options: any): Promise<any> {
    try {
      const suggestData = await gplay.suggest(options);
      return suggestData;
    } catch (error) {
      throw this.handleError('Failed to fetch search suggestions', 'SUGGEST_ERROR', error as Error);
    }
  }

  /**
   * Get similar apps from Google Play Store
   * @param options - Parameters for similar request
   * @returns Promise resolving to raw similar data
   */
  async similar(options: any): Promise<any> {
    try {
      const similarData = await gplay.similar(options);
      return similarData;
    } catch (error) {
      throw this.handleError('Failed to fetch similar apps', 'SIMILAR_ERROR', error as Error);
    }
  }

  /**
   * Get app permissions from Google Play Store
   * @param options - Parameters for permissions request
   * @returns Promise resolving to raw permissions data
   */
  async permissions(options: any): Promise<any> {
    try {
      const permissionsData = await gplay.permissions(options);
      return permissionsData;
    } catch (error) {
      throw this.handleError('Failed to fetch app permissions', 'PERMISSIONS_ERROR', error as Error);
    }
  }

  /**
   * Get app data safety information from Google Play Store
   * @param options - Parameters for datasafety request
   * @returns Promise resolving to raw datasafety data
   */
  async datasafety(options: any): Promise<any> {
    try {
      const datasafetyData = await gplay.datasafety(options);
      return datasafetyData;
    } catch (error) {
      throw this.handleError('Failed to fetch app data safety information', 'DATASAFETY_ERROR', error as Error);
    }
  }

  /**
   * Get available categories from Google Play Store
   * @returns Promise resolving to raw categories data
   */
  async categories(): Promise<any> {
    try {
      const categoriesData = await gplay.categories();
      return categoriesData;
    } catch (error) {
      throw this.handleError('Failed to fetch categories', 'CATEGORIES_ERROR', error as Error);
    }
  }

  /**
   * Validate app ID parameter
   * @private
   */
  private validateAppId(appId: string): void {
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      throw new GooglePlayScraperError('App ID is required and must be a non-empty string', 'INVALID_APP_ID');
    }

    // Basic validation for Google Play package name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(appId)) {
      throw new GooglePlayScraperError('App ID must be a valid package name format', 'INVALID_APP_ID_FORMAT');
    }
  }

  /**
   * Validate search query parameter
   * @private
   */
  private validateSearchQuery(query: string): void {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new GooglePlayScraperError('Search query is required and must be a non-empty string', 'INVALID_SEARCH_QUERY');
    }

    if (query.trim().length < 2) {
      throw new GooglePlayScraperError('Search query must be at least 2 characters long', 'SEARCH_QUERY_TOO_SHORT');
    }
  }

  /**
   * Transform google-play-scraper app data to standardized AppDetails
   * @private
   */
  private transformAppDetails(appData: any): AppDetails {
    return {
      id: appData.appId || '',
      title: appData.title || '',
      description: appData.description || '',
      developer: appData.developer || '',
      rating: parseFloat(appData.score) || 0,
      ratingCount: parseInt(appData.reviews) || 0,
      version: appData.version || '',
      size: appData.size || '',
      category: appData.genre || '',
      price: appData.free ? 'Free' : (appData.price || ''),
      screenshots: appData.screenshots || [],
      icon: appData.icon || '',
      url: appData.url || ''
    };
  }

  /**
   * Transform google-play-scraper review data to standardized Review
   * @private
   */
  private transformReview(reviewData: any): Review {
    return {
      id: reviewData.id || '',
      userName: reviewData.userName || 'Anonymous',
      rating: parseInt(reviewData.score) || 0,
      title: reviewData.title || undefined,
      text: reviewData.text || '',
      date: new Date(reviewData.date || Date.now()),
      helpful: reviewData.thumbsUp || undefined
    };
  }

  /**
   * Transform google-play-scraper search result to standardized SearchResult
   * @private
   */
  private transformSearchResult(resultData: any): SearchResult {
    return {
      id: resultData.appId || '',
      title: resultData.title || '',
      developer: resultData.developer || '',
      rating: parseFloat(resultData.score) || 0,
      price: resultData.free ? 'Free' : (resultData.price || ''),
      icon: resultData.icon || '',
      url: resultData.url || ''
    };
  }

  /**
   * Map sort option to google-play-scraper format
   * @private
   */
  private mapSortOption(sort?: string): number {
    switch (sort) {
      case 'newest':
        return gplay.sort.NEWEST;
      case 'rating':
        return gplay.sort.RATING;
      case 'helpfulness':
        return gplay.sort.HELPFULNESS;
      default:
        return gplay.sort.NEWEST;
    }
  }

  /**
   * Handle and wrap errors with additional context
   * @private
   */
  private handleError(message: string, code: string, originalError: Error): GooglePlayScraperError {
    const errorMessage = `${message}: ${originalError.message}`;
    return new GooglePlayScraperError(errorMessage, code, originalError);
  }
}