/**
 * Advanced TypeScript MCP Client for App Store MCP Server
 * 
 * This example demonstrates advanced usage patterns including:
 * - TypeScript interfaces for type safety
 * - Error handling and retry logic
 * - Batch operations
 * - Response caching
 * - Rate limiting awareness
 */

import * as http from 'http';
import * as https from 'https';

// Type definitions for MCP protocol
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: MCPError;
}

interface MCPError {
  code: number;
  message: string;
  data?: any;
}

// Tool response interfaces
interface AppDetails {
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

interface AppReview {
  id: string;
  userName: string;
  rating: number;
  title?: string;
  text: string;
  date: Date;
  helpful?: number;
}

interface SearchResult {
  id: string;
  title: string;
  developer: string;
  rating: number;
  price: string;
  icon: string;
  url: string;
}

interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    source: string;
    timestamp: string;
    [key: string]: any;
  };
}

// Client configuration
interface ClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  enableCache: boolean;
  cacheTimeout: number;
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Advanced MCP Client with TypeScript support
 */
export class AdvancedMCPClient {
  private config: ClientConfig;
  private requestId: number = 1;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(config: Partial<ClientConfig> = {}) {
    this.config = {
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      enableCache: true,
      cacheTimeout: 300000, // 5 minutes
      ...config
    };
  }

  /**
   * Make an MCP request with retry logic and caching
   */
  private async makeRequest<T>(method: string, params?: any, cacheKey?: string): Promise<T> {
    // Check cache first
    if (cacheKey && this.config.enableCache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method,
      params
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.sendHttpRequest(request);
        
        if (response.error) {
          throw new Error(`MCP Error [${response.error.code}]: ${response.error.message}`);
        }

        const result = response.result as T;
        
        // Cache successful responses
        if (cacheKey && this.config.enableCache) {
          this.setCache(cacheKey, result);
        }

        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on validation errors or not found errors
        if (error instanceof Error && (
          error.message.includes('validation_error') ||
          error.message.includes('not_found') ||
          error.message.includes('INVALID_PARAMS')
        )) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Send HTTP request to MCP server
   */
  private async sendHttpRequest(request: MCPRequest): Promise<MCPResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL('/mcp', this.config.baseUrl);
      const postData = JSON.stringify(request);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'AdvancedMCPClient/1.0'
        },
        timeout: this.config.timeout
      };

      const httpModule = url.protocol === 'https:' ? https : http;
      
      const req = httpModule.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data) as MCPResponse;
            resolve(response);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTimeout
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods

  /**
   * List all available tools
   */
  async listTools(): Promise<{ tools: Array<{ name: string; description: string; inputSchema: any }> }> {
    return this.makeRequest('tools/list');
  }

  /**
   * Get Google Play app details with caching
   */
  async getGooglePlayAppDetails(
    appId: string, 
    options: { lang?: string; country?: string } = {}
  ): Promise<ToolResponse<AppDetails>> {
    const cacheKey = `gp-details-${appId}-${JSON.stringify(options)}`;
    return this.makeRequest('tools/call', {
      name: 'google-play-app-details',
      arguments: { appId, ...options }
    }, cacheKey);
  }

  /**
   * Get Google Play app reviews
   */
  async getGooglePlayAppReviews(
    appId: string,
    options: { lang?: string; country?: string; sort?: string; num?: number } = {}
  ): Promise<ToolResponse<{ reviews: AppReview[]; appId: string; count: number; requested: number }>> {
    return this.makeRequest('tools/call', {
      name: 'google-play-app-reviews',
      arguments: { appId, ...options }
    });
  }

  /**
   * Search Google Play Store
   */
  async searchGooglePlay(
    query: string,
    options: { num?: number; lang?: string; country?: string; fullDetail?: boolean } = {}
  ): Promise<ToolResponse<{ results: SearchResult[]; query: string; count: number; requested: number }>> {
    const cacheKey = `gp-search-${query}-${JSON.stringify(options)}`;
    return this.makeRequest('tools/call', {
      name: 'google-play-search',
      arguments: { query, ...options }
    }, cacheKey);
  }

  /**
   * Get Apple App Store app details with caching
   */
  async getAppStoreAppDetails(
    appId: string,
    options: { country?: string } = {}
  ): Promise<ToolResponse<AppDetails>> {
    const cacheKey = `as-details-${appId}-${JSON.stringify(options)}`;
    return this.makeRequest('tools/call', {
      name: 'app-store-app-details',
      arguments: { appId, ...options }
    }, cacheKey);
  }

  /**
   * Get Apple App Store app reviews
   */
  async getAppStoreAppReviews(
    appId: string,
    options: { country?: string; sort?: string; num?: number } = {}
  ): Promise<ToolResponse<{ reviews: AppReview[]; appId: string; count: number; requested: number }>> {
    return this.makeRequest('tools/call', {
      name: 'app-store-app-reviews',
      arguments: { appId, ...options }
    });
  }

  /**
   * Search Apple App Store
   */
  async searchAppStore(
    query: string,
    options: { num?: number; country?: string } = {}
  ): Promise<ToolResponse<{ results: SearchResult[]; query: string; count: number; requested: number }>> {
    const cacheKey = `as-search-${query}-${JSON.stringify(options)}`;
    return this.makeRequest('tools/call', {
      name: 'app-store-search',
      arguments: { query, ...options }
    }, cacheKey);
  }

  // Advanced batch operations

  /**
   * Compare app details across both stores
   */
  async compareAppAcrossStores(googlePlayId: string, appStoreId: string): Promise<{
    googlePlay: ToolResponse<AppDetails> | null;
    appStore: ToolResponse<AppDetails> | null;
    comparison: {
      titleMatch: boolean;
      developerMatch: boolean;
      ratingDifference: number;
    } | null;
  }> {
    try {
      const [googlePlayResult, appStoreResult] = await Promise.allSettled([
        this.getGooglePlayAppDetails(googlePlayId),
        this.getAppStoreAppDetails(appStoreId)
      ]);

      const googlePlay = googlePlayResult.status === 'fulfilled' ? googlePlayResult.value : null;
      const appStore = appStoreResult.status === 'fulfilled' ? appStoreResult.value : null;

      let comparison = null;
      if (googlePlay?.success && appStore?.success && googlePlay.data && appStore.data) {
        comparison = {
          titleMatch: googlePlay.data.title.toLowerCase() === appStore.data.title.toLowerCase(),
          developerMatch: googlePlay.data.developer.toLowerCase().includes(appStore.data.developer.toLowerCase()) ||
                          appStore.data.developer.toLowerCase().includes(googlePlay.data.developer.toLowerCase()),
          ratingDifference: Math.abs(googlePlay.data.rating - appStore.data.rating)
        };
      }

      return { googlePlay, appStore, comparison };
    } catch (error) {
      throw new Error(`Failed to compare apps: ${error}`);
    }
  }

  /**
   * Get comprehensive app analysis
   */
  async getAppAnalysis(appId: string, store: 'google-play' | 'app-store'): Promise<{
    details: ToolResponse<AppDetails>;
    reviews: ToolResponse<{ reviews: AppReview[]; appId: string; count: number; requested: number }>;
    analysis: {
      averageRating: number;
      totalReviews: number;
      recentReviewsSentiment: 'positive' | 'neutral' | 'negative';
      commonKeywords: string[];
    };
  }> {
    try {
      const [details, reviews] = await Promise.all([
        store === 'google-play' 
          ? this.getGooglePlayAppDetails(appId)
          : this.getAppStoreAppDetails(appId),
        store === 'google-play'
          ? this.getGooglePlayAppReviews(appId, { num: 50 })
          : this.getAppStoreAppReviews(appId, { num: 50 })
      ]);

      let analysis = {
        averageRating: 0,
        totalReviews: 0,
        recentReviewsSentiment: 'neutral' as const,
        commonKeywords: [] as string[]
      };

      if (details.success && reviews.success && details.data && reviews.data) {
        analysis.averageRating = details.data.rating;
        analysis.totalReviews = details.data.ratingCount;

        // Simple sentiment analysis based on ratings
        const recentRatings = reviews.data.reviews.map(r => r.rating);
        const avgRecentRating = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length;
        
        if (avgRecentRating >= 4) {
          analysis.recentReviewsSentiment = 'positive';
        } else if (avgRecentRating <= 2.5) {
          analysis.recentReviewsSentiment = 'negative';
        }

        // Extract common keywords from review text
        const allText = reviews.data.reviews.map(r => r.text.toLowerCase()).join(' ');
        const words = allText.match(/\b\w{4,}\b/g) || [];
        const wordCount = words.reduce((acc, word) => {
          acc[word] = (acc[word] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        analysis.commonKeywords = Object.entries(wordCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([word]) => word);
      }

      return { details, reviews, analysis };
    } catch (error) {
      throw new Error(`Failed to get app analysis: ${error}`);
    }
  }

  /**
   * Batch search across both stores
   */
  async searchBothStores(query: string, limit: number = 10): Promise<{
    googlePlay: ToolResponse<{ results: SearchResult[]; query: string; count: number; requested: number }>;
    appStore: ToolResponse<{ results: SearchResult[]; query: string; count: number; requested: number }>;
    combined: SearchResult[];
  }> {
    try {
      const [googlePlayResult, appStoreResult] = await Promise.allSettled([
        this.searchGooglePlay(query, { num: limit }),
        this.searchAppStore(query, { num: limit })
      ]);

      const googlePlay = googlePlayResult.status === 'fulfilled' ? googlePlayResult.value : 
        { success: false, error: { type: 'request_failed', code: 'SEARCH_FAILED', message: 'Google Play search failed' } } as any;
      
      const appStore = appStoreResult.status === 'fulfilled' ? appStoreResult.value :
        { success: false, error: { type: 'request_failed', code: 'SEARCH_FAILED', message: 'App Store search failed' } } as any;

      // Combine and deduplicate results by title similarity
      const combined: SearchResult[] = [];
      const seenTitles = new Set<string>();

      if (googlePlay.success && googlePlay.data) {
        googlePlay.data.results.forEach((app: SearchResult) => {
          const normalizedTitle = app.title.toLowerCase().replace(/[^\w\s]/g, '');
          if (!seenTitles.has(normalizedTitle)) {
            combined.push({ ...app, source: 'google-play' } as any);
            seenTitles.add(normalizedTitle);
          }
        });
      }

      if (appStore.success && appStore.data) {
        appStore.data.results.forEach((app: SearchResult) => {
          const normalizedTitle = app.title.toLowerCase().replace(/[^\w\s]/g, '');
          if (!seenTitles.has(normalizedTitle)) {
            combined.push({ ...app, source: 'app-store' } as any);
            seenTitles.add(normalizedTitle);
          }
        });
      }

      return { googlePlay, appStore, combined };
    } catch (error) {
      throw new Error(`Failed to search both stores: ${error}`);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Example usage
async function demonstrateAdvancedUsage() {
  const client = new AdvancedMCPClient({
    timeout: 15000,
    retries: 2,
    enableCache: true
  });

  try {
    console.log('=== Advanced MCP Client Demo ===\n');

    // 1. App comparison across stores
    console.log('1. Comparing WhatsApp across both stores...');
    const comparison = await client.compareAppAcrossStores('com.whatsapp', '310633997');
    
    if (comparison.googlePlay?.success && comparison.appStore?.success) {
      console.log('Comparison results:');
      console.log(`  Title match: ${comparison.comparison?.titleMatch}`);
      console.log(`  Developer match: ${comparison.comparison?.developerMatch}`);
      console.log(`  Rating difference: ${comparison.comparison?.ratingDifference?.toFixed(2)}`);
      console.log(`  Google Play rating: ${comparison.googlePlay.data?.rating}`);
      console.log(`  App Store rating: ${comparison.appStore.data?.rating}`);
    }
    console.log();

    // 2. Comprehensive app analysis
    console.log('2. Getting comprehensive analysis for Instagram...');
    const analysis = await client.getAppAnalysis('com.instagram.android', 'google-play');
    
    if (analysis.details.success) {
      console.log('Analysis results:');
      console.log(`  App: ${analysis.details.data?.title}`);
      console.log(`  Average rating: ${analysis.analysis.averageRating}`);
      console.log(`  Total reviews: ${analysis.analysis.totalReviews.toLocaleString()}`);
      console.log(`  Recent sentiment: ${analysis.analysis.recentReviewsSentiment}`);
      console.log(`  Common keywords: ${analysis.analysis.commonKeywords.slice(0, 5).join(', ')}`);
    }
    console.log();

    // 3. Batch search across both stores
    console.log('3. Searching for "photo editor" apps across both stores...');
    const batchSearch = await client.searchBothStores('photo editor', 5);
    
    console.log(`Combined results (${batchSearch.combined.length} unique apps):`);
    batchSearch.combined.forEach((app: any) => {
      console.log(`  - ${app.title} (${app.source}) - ${app.rating}★`);
    });
    console.log();

    // 4. Cache statistics
    console.log('4. Cache statistics:');
    const cacheStats = client.getCacheStats();
    console.log(`  Cached entries: ${cacheStats.size}`);
    console.log(`  Cache keys: ${cacheStats.entries.slice(0, 3).join(', ')}${cacheStats.entries.length > 3 ? '...' : ''}`);

  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use as a module
export default AdvancedMCPClient;

// Run demo if executed directly
if (require.main === module) {
  demonstrateAdvancedUsage();
}