/**
 * App Store data models for standardized app information
 * Used across both Google Play Store and Apple App Store scrapers
 */

/**
 * Standardized app details structure
 */
export interface AppDetails {
  id: string;
  title: string;
  description: string;
  developer: string;
  rating: number;
  ratingCount: number;
  version: string;
  size: string;
  category: string;
  price: string;
  screenshots: string[];
  icon: string;
  url: string;
}

/**
 * Standardized app review structure
 */
export interface Review {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  text: string;
  date: Date;
  helpful?: number;
}

/**
 * Standardized search result structure
 */
export interface SearchResult {
  id: string;
  title: string;
  developer: string;
  rating: number;
  price: string;
  icon: string;
  url: string;
}

/**
 * Options for app reviews fetching
 */
export interface ReviewsOptions {
  page?: number;
  num?: number;
  sort?: 'newest' | 'rating' | 'helpfulness';
}

/**
 * Options for app search
 */
export interface SearchOptions {
  num?: number;
  lang?: string;
  country?: string;
  fullDetail?: boolean;
}

/**
 * Options for app details fetching
 */
export interface AppDetailsOptions {
  lang?: string;
  country?: string;
}