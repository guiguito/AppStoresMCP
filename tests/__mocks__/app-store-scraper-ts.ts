/**
 * Global mock for app-store-scraper-ts
 * This mock is used by all test files to provide consistent Jest mock functions
 */

export const mockApp = jest.fn();
export const mockRatings = jest.fn();
export const mockList = jest.fn();
export const mockSearch = jest.fn();
export const mockDeveloper = jest.fn();
export const mockSuggest = jest.fn();
export const mockSimilar = jest.fn();
export const mockReviews = jest.fn();
export const mockPrivacy = jest.fn();

export const app = mockApp;
export const ratings = mockRatings;
export const list = mockList;
export const search = mockSearch;
export const developer = mockDeveloper;
export const suggest = mockSuggest;
export const similar = mockSimilar;
export const reviews = mockReviews;
export const privacy = mockPrivacy;

export const constants = {
  collection: {
    TOP_FREE_IOS: 'topfreeapplications',
    TOP_PAID_IOS: 'toppaidapplications',
    TOP_GROSSING_IOS: 'topgrossingapplications',
    TOP_FREE_IPAD: 'topfreeipad',
    TOP_PAID_IPAD: 'toppaidipad',
    TOP_GROSSING_IPAD: 'topgrossingipad'
  },
  sort: {
    RECENT: 'mostRecent',
    HELPFUL: 'mostHelpful'
  },
  category: {
    GAMES: 6014,
    BUSINESS: 6000,
    EDUCATION: 6017
  }
};
