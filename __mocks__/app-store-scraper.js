/**
 * Manual mock for app-store-scraper module
 * This mock is automatically used by Jest when tests import 'app-store-scraper'
 */

const mockAppStoreScraper = {
  // Mock functions
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  list: jest.fn(),
  developer: jest.fn(),
  suggest: jest.fn(),
  similar: jest.fn(),
  ratings: jest.fn(),
  privacy: jest.fn(),
  
  // Constants for sort options
  sort: {
    RECENT: 'recent',
    HELPFUL: 'helpful'
  },
  
  // Constants for collections
  collection: {
    TOP_FREE: 'top-free',
    TOP_PAID: 'top-paid',
    TOP_GROSSING: 'top-grossing',
    TOP_FREE_IOS: 'top-free',
    TOP_PAID_IOS: 'top-paid',
    TOP_GROSSING_IOS: 'top-grossing',
    TOP_FREE_IPAD: 'top-free-ipad',
    TOP_PAID_IPAD: 'top-paid-ipad',
    NEW_IOS: 'new',
    NEW_FREE_IOS: 'new-free',
    NEW_PAID_IOS: 'new-paid'
  },
  
  // Constants for categories
  category: {
    BOOKS: 6018,
    BUSINESS: 6000,
    CATALOGS: 6022,
    EDUCATION: 6017,
    ENTERTAINMENT: 6016,
    FINANCE: 6015,
    FOOD_DRINK: 6023,
    GAMES: 6014,
    HEALTH_FITNESS: 6013,
    LIFESTYLE: 6012,
    MAGAZINES_NEWSPAPERS: 6021,
    MEDICAL: 6020,
    MUSIC: 6011,
    NAVIGATION: 6010,
    NEWS: 6009,
    PHOTO_VIDEO: 6008,
    PRODUCTIVITY: 6007,
    REFERENCE: 6006,
    SHOPPING: 6024,
    SOCIAL_NETWORKING: 6005,
    SPORTS: 6004,
    TRAVEL: 6003,
    UTILITIES: 6002,
    WEATHER: 6001
  }
};

module.exports = mockAppStoreScraper;
