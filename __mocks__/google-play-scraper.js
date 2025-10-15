/**
 * Manual mock for google-play-scraper module
 * This mock is automatically used by Jest when tests import 'google-play-scraper'
 */

const mockGooglePlayScraper = {
  // Mock functions
  app: jest.fn(),
  list: jest.fn(),
  search: jest.fn(),
  developer: jest.fn(),
  suggest: jest.fn(),
  reviews: jest.fn(),
  similar: jest.fn(),
  permissions: jest.fn(),
  datasafety: jest.fn(),
  categories: jest.fn(),
  
  // Constants for collections
  collection: {
    TOP_FREE: 'topselling_free',
    TOP_PAID: 'topselling_paid',
    GROSSING: 'topgrossing',
    TRENDING: 'movers_shakers',
    TOP_FREE_GAMES: 'topselling_free_GAME',
    TOP_PAID_GAMES: 'topselling_paid_GAME',
    TOP_GROSSING_GAMES: 'topgrossing_GAME',
    NEW_FREE: 'topnewfree',
    NEW_PAID: 'topnewpaid',
    NEW_FREE_GAMES: 'topselling_new_free_GAME',
    NEW_PAID_GAMES: 'topselling_new_paid_GAME'
  },
  
  // Constants for categories
  category: {
    APPLICATION: 'APPLICATION',
    ANDROID_WEAR: 'ANDROID_WEAR',
    ART_AND_DESIGN: 'ART_AND_DESIGN',
    AUTO_AND_VEHICLES: 'AUTO_AND_VEHICLES',
    BEAUTY: 'BEAUTY',
    BOOKS_AND_REFERENCE: 'BOOKS_AND_REFERENCE',
    BUSINESS: 'BUSINESS',
    COMICS: 'COMICS',
    COMMUNICATION: 'COMMUNICATION',
    DATING: 'DATING',
    EDUCATION: 'EDUCATION',
    ENTERTAINMENT: 'ENTERTAINMENT',
    EVENTS: 'EVENTS',
    FAMILY: 'FAMILY',
    FINANCE: 'FINANCE',
    FOOD_AND_DRINK: 'FOOD_AND_DRINK',
    GAME: 'GAME',
    GAME_ACTION: 'GAME_ACTION',
    GAME_ADVENTURE: 'GAME_ADVENTURE',
    GAME_ARCADE: 'GAME_ARCADE',
    GAME_BOARD: 'GAME_BOARD',
    GAME_CARD: 'GAME_CARD',
    GAME_CASINO: 'GAME_CASINO',
    GAME_CASUAL: 'GAME_CASUAL',
    GAME_EDUCATIONAL: 'GAME_EDUCATIONAL',
    GAME_MUSIC: 'GAME_MUSIC',
    GAME_PUZZLE: 'GAME_PUZZLE',
    GAME_RACING: 'GAME_RACING',
    GAME_ROLE_PLAYING: 'GAME_ROLE_PLAYING',
    GAME_SIMULATION: 'GAME_SIMULATION',
    GAME_SPORTS: 'GAME_SPORTS',
    GAME_STRATEGY: 'GAME_STRATEGY',
    GAME_TRIVIA: 'GAME_TRIVIA',
    GAME_WORD: 'GAME_WORD',
    HEALTH_AND_FITNESS: 'HEALTH_AND_FITNESS',
    HOUSE_AND_HOME: 'HOUSE_AND_HOME',
    LIBRARIES_AND_DEMO: 'LIBRARIES_AND_DEMO',
    LIFESTYLE: 'LIFESTYLE',
    MAPS_AND_NAVIGATION: 'MAPS_AND_NAVIGATION',
    MEDICAL: 'MEDICAL',
    MUSIC_AND_AUDIO: 'MUSIC_AND_AUDIO',
    NEWS_AND_MAGAZINES: 'NEWS_AND_MAGAZINES',
    PARENTING: 'PARENTING',
    PERSONALIZATION: 'PERSONALIZATION',
    PHOTOGRAPHY: 'PHOTOGRAPHY',
    PRODUCTIVITY: 'PRODUCTIVITY',
    SHOPPING: 'SHOPPING',
    SOCIAL: 'SOCIAL',
    SPORTS: 'SPORTS',
    TOOLS: 'TOOLS',
    TRAVEL_AND_LOCAL: 'TRAVEL_AND_LOCAL',
    VIDEO_PLAYERS: 'VIDEO_PLAYERS',
    WATCH_FACE: 'WATCH_FACE',
    WEATHER: 'WEATHER'
  },
  
  // Constants for sort options
  sort: {
    NEWEST: 1,
    RATING: 2,
    HELPFULNESS: 3
  },
  
  // Constants for age ranges
  age: {
    FIVE_UNDER: 'AGE_RANGE1',
    SIX_EIGHT: 'AGE_RANGE2',
    NINE_UP: 'AGE_RANGE3'
  }
};

module.exports = mockGooglePlayScraper;
