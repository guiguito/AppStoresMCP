/**
 * Global mock for google-play-scraper-ts
 * This mock is used by all test files to provide consistent Jest mock functions
 */

export const mockApp = jest.fn();
export const mockReviews = jest.fn();
export const mockSearch = jest.fn();
export const mockCategories = jest.fn();
export const mockDatasafety = jest.fn();
export const mockDeveloper = jest.fn();
export const mockList = jest.fn();
export const mockPermissions = jest.fn();
export const mockSimilar = jest.fn();
export const mockSuggest = jest.fn();

const mock = {
  app: mockApp,
  reviews: mockReviews,
  search: mockSearch,
  categories: mockCategories,
  datasafety: mockDatasafety,
  developer: mockDeveloper,
  list: mockList,
  permissions: mockPermissions,
  similar: mockSimilar,
  suggest: mockSuggest,
  collection: {
    TOP_FREE: 'TOP_FREE',
    TOP_PAID: 'TOP_PAID',
    GROSSING: 'GROSSING'
  },
  sort: {
    NEWEST: 2,
    RATING: 3,
    HELPFULNESS: 1
  },
  category: {
    GAME: 'GAME',
    FAMILY: 'FAMILY'
  },
  age: {
    FIVE_UNDER: 'AGE_RANGE1',
    SIX_EIGHT: 'AGE_RANGE2',
    NINE_UP: 'AGE_RANGE3'
  }
};

export default mock;
