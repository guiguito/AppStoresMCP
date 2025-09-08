/**
 * Apple App Store scraper service wrapper
 * Wraps app-store-scraper library with standardized interfaces and error handling
 */

const store = require('app-store-scraper');
import { AppDetails, Review, SearchResult, ReviewsOptions, SearchOptions, AppDetailsOptions } from '../types/app-store';

/**
 * Custom error class for Apple App Store scraping operations
 */
export class AppStoreScraperError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly originalError?: Error
    ) {
        super(message);
        this.name = 'AppStoreScraperError';
    }
}

/**
 * Apple App Store scraper service class
 * Provides methods for app details, reviews, and search functionality
 */
export class AppStoreScraperService {
    /**
     * Get detailed information about an Apple App Store app
     * @param appId - The app ID (numeric ID) from Apple App Store
     * @param options - Optional parameters for the request
     * @returns Promise resolving to standardized AppDetails
     */
    async getAppDetails(appId: string, options?: AppDetailsOptions): Promise<AppDetails> {
        this.validateAppId(appId);

        try {
            const appData = await store.app({
                id: appId,
                country: options?.country || 'us'
            });

            return this.transformAppDetails(appData);
        } catch (error) {
            throw this.handleError('Failed to fetch app details', 'APP_DETAILS_ERROR', error as Error);
        }
    }

    /**
     * Get reviews for an Apple App Store app
     * @param appId - The app ID (numeric ID) from Apple App Store
     * @param options - Optional parameters for pagination and sorting
     * @returns Promise resolving to array of standardized Reviews
     */
    async getAppReviews(appId: string, options?: ReviewsOptions): Promise<Review[]> {
        this.validateAppId(appId);

        try {
            const reviewsOptions: any = {
                id: appId,
                page: options?.page || 1,
                sort: this.mapSortOption(options?.sort),
                country: 'us'
            };

            const reviewsData = await store.reviews(reviewsOptions);

            return reviewsData.map((review: any) => this.transformReview(review));
        } catch (error) {
            throw this.handleError('Failed to fetch app reviews', 'APP_REVIEWS_ERROR', error as Error);
        }
    }

    /**
     * Search for apps in Apple App Store
     * @param query - Search query string
     * @param options - Optional parameters for search
     * @returns Promise resolving to array of standardized SearchResults
     */
    async searchApps(query: string, options?: SearchOptions): Promise<SearchResult[]> {
        this.validateSearchQuery(query);

        try {
            const searchResults = await store.search({
                term: query,
                num: Math.min(options?.num || 50, 100), // Limit to prevent excessive requests
                country: options?.country || 'us'
            });

            return searchResults.map((result: any) => this.transformSearchResult(result));
        } catch (error) {
            throw this.handleError('Failed to search apps', 'APP_SEARCH_ERROR', error as Error);
        }
    }

    /**
     * Get app lists from collections and categories in Apple App Store
     * @param options - Optional parameters for list request
     * @returns Promise resolving to raw list data from app-store-scraper
     */
    async list(options?: {
        collection?: string;
        category?: string;
        country?: string;
        lang?: string;
        num?: number;
        fullDetail?: boolean;
    }): Promise<any> {
        try {
            const listParams: any = {
                collection: options?.collection || store.collection.TOP_FREE,
                country: options?.country || 'us',
                lang: options?.lang || 'en',
                num: options?.num ? Math.min(options.num, 100) : 50,
                fullDetail: options?.fullDetail || false
            };

            // Add category if specified
            if (options?.category) {
                listParams.category = options.category;
            }

            const listData = await store.list(listParams);
            return listData;
        } catch (error) {
            throw this.handleError('Failed to fetch app list', 'APP_LIST_ERROR', error as Error);
        }
    }

    /**
     * Get privacy information for an Apple App Store app
     * @param appId - The app ID (numeric ID) from Apple App Store
     * @returns Promise resolving to raw privacy data from app-store-scraper
     */
    async privacy(appId: string): Promise<any> {
        this.validateAppId(appId);

        try {
            const privacyData = await store.privacy({
                id: appId
            });
            return privacyData;
        } catch (error) {
            throw this.handleError('Failed to fetch app privacy information', 'APP_PRIVACY_ERROR', error as Error);
        }
    }

    /**
     * Get search suggestions for Apple App Store
     * @param term - Search term to get suggestions for
     * @param options - Optional parameters for suggest request
     * @returns Promise resolving to raw suggest data from app-store-scraper
     */
    async suggest(term: string, options?: {
        country?: string;
    }): Promise<any> {
        this.validateSearchQuery(term);

        try {
            const suggestParams: any = {
                term: term
            };

            // Add country if specified
            if (options?.country) {
                suggestParams.country = options.country;
            }

            const suggestData = await store.suggest(suggestParams);
            return suggestData;
        } catch (error) {
            throw this.handleError('Failed to fetch search suggestions', 'APP_SUGGEST_ERROR', error as Error);
        }
    }

    /**
     * Get similar apps for an Apple App Store app
     * @param appId - The app ID (numeric ID) from Apple App Store
     * @param options - Optional parameters for similar request
     * @returns Promise resolving to raw similar apps data from app-store-scraper
     */
    async similar(appId: string, options?: {
        country?: string;
    }): Promise<any> {
        this.validateAppId(appId);

        try {
            const similarParams: any = {
                id: appId
            };

            // Add country if specified
            if (options?.country) {
                similarParams.country = options.country;
            }

            const similarData = await store.similar(similarParams);
            return similarData;
        } catch (error) {
            throw this.handleError('Failed to fetch similar apps', 'APP_SIMILAR_ERROR', error as Error);
        }
    }

    /**
     * Get ratings breakdown for an Apple App Store app
     * @param appId - The app ID (numeric ID) from Apple App Store
     * @param options - Optional parameters for ratings request
     * @returns Promise resolving to raw ratings data from app-store-scraper
     */
    async ratings(appId: string, options?: {
        country?: string;
    }): Promise<any> {
        this.validateAppId(appId);

        try {
            const ratingsParams: any = {
                id: appId
            };

            // Add country if specified
            if (options?.country) {
                ratingsParams.country = options.country;
            }

            const ratingsData = await store.ratings(ratingsParams);
            return ratingsData;
        } catch (error) {
            throw this.handleError('Failed to fetch app ratings', 'APP_RATINGS_ERROR', error as Error);
        }
    }

    /**
     * Validate app ID parameter
     * @private
     */
    private validateAppId(appId: string): void {
        if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
            throw new AppStoreScraperError('App ID is required and must be a non-empty string', 'INVALID_APP_ID');
        }

        // Basic validation for Apple App Store ID format (numeric)
        if (!/^\d+$/.test(appId.trim())) {
            throw new AppStoreScraperError('App ID must be a numeric string for Apple App Store', 'INVALID_APP_ID_FORMAT');
        }
    }

    /**
     * Validate search query parameter
     * @private
     */
    private validateSearchQuery(query: string): void {
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            throw new AppStoreScraperError('Search query is required and must be a non-empty string', 'INVALID_SEARCH_QUERY');
        }

        if (query.trim().length < 2) {
            throw new AppStoreScraperError('Search query must be at least 2 characters long', 'SEARCH_QUERY_TOO_SHORT');
        }
    }

    /**
     * Transform app-store-scraper app data to standardized AppDetails
     * @private
     */
    private transformAppDetails(appData: any): AppDetails {
        return {
            id: appData.id?.toString() || '',
            title: appData.title || '',
            description: appData.description || '',
            developer: appData.developer || '',
            rating: parseFloat(appData.score) || 0,
            ratingCount: parseInt(appData.reviews) || 0,
            version: appData.version || '',
            size: appData.size || '',
            category: appData.primaryGenre || appData.genre || '',
            price: appData.free ? 'Free' : (appData.price?.toString() || ''),
            screenshots: appData.screenshots || [],
            icon: appData.icon || '',
            url: appData.url || ''
        };
    }

    /**
     * Transform app-store-scraper review data to standardized Review
     * @private
     */
    private transformReview(reviewData: any): Review {
        const review: Review = {
            id: reviewData.id?.toString() || '',
            userName: reviewData.userName || 'Anonymous',
            rating: parseInt(reviewData.score) || 0,
            title: reviewData.title || undefined,
            text: reviewData.text || '',
            date: new Date(reviewData.date || Date.now())
        };

        // Apple App Store reviews don't have helpful count, so we omit this property
        return review;
    }

    /**
     * Transform app-store-scraper search result to standardized SearchResult
     * @private
     */
    private transformSearchResult(resultData: any): SearchResult {
        return {
            id: resultData.id?.toString() || '',
            title: resultData.title || '',
            developer: resultData.developer || '',
            rating: parseFloat(resultData.score) || 0,
            price: resultData.free ? 'Free' : (resultData.price?.toString() || ''),
            icon: resultData.icon || '',
            url: resultData.url || ''
        };
    }

    /**
     * Map sort option to app-store-scraper format
     * @private
     */
    private mapSortOption(sort?: string): string {
        switch (sort) {
            case 'newest':
                return store.sort.RECENT;
            case 'rating':
                return store.sort.HELPFUL;
            case 'helpfulness':
                return store.sort.HELPFUL;
            default:
                return store.sort.RECENT;
        }
    }

    /**
     * Handle and wrap errors with additional context
     * @private
     */
    private handleError(message: string, code: string, originalError: Error): AppStoreScraperError {
        const errorMessage = `${message}: ${originalError.message}`;
        return new AppStoreScraperError(errorMessage, code, originalError);
    }
}