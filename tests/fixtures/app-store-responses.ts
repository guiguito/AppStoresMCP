/**
 * Test fixtures and mock responses for App Store scraping
 * Provides consistent test data for unit and integration tests
 */

export const GOOGLE_PLAY_FIXTURES = {
  // Valid app details response
  validAppDetails: {
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger',
    summary: 'Simple. Reliable. Secure.',
    developer: 'WhatsApp LLC',
    developerId: '5700313618786177705',
    icon: 'https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN',
    score: 4.2,
    scoreText: '4.2',
    priceText: 'Free',
    free: true,
    currency: 'USD',
    price: 0,
    url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
    genre: 'Communication',
    genreId: 'COMMUNICATION',
    familyGenre: 'Communication',
    familyGenreId: 'COMMUNICATION',
    description: 'WhatsApp from Facebook is a FREE messaging and video calling app.',
    descriptionHTML: 'WhatsApp from Facebook is a FREE messaging and video calling app.',
    version: '2.23.24.76',
    size: 'Varies with device',
    androidVersion: 'Varies with device',
    androidVersionText: 'Varies with device',
    developer: 'WhatsApp LLC',
    developerId: '5700313618786177705',
    developerEmail: 'android-support@whatsapp.com',
    developerWebsite: 'https://www.whatsapp.com/',
    developerAddress: 'WhatsApp LLC\n1601 Willow Rd.\nMenlo Park, CA 94025',
    privacyPolicy: 'https://www.whatsapp.com/legal/#privacy-policy',
    developerInternalID: '5700313618786177705',
    screenshots: [
      'https://play-lh.googleusercontent.com/example1.png',
      'https://play-lh.googleusercontent.com/example2.png'
    ],
    video: null,
    videoImage: null,
    contentRating: 'Everyone',
    contentRatingDescription: null,
    adSupported: false,
    released: 'May 3, 2009',
    updated: 1699920000000,
    histogram: { 1: 123456, 2: 234567, 3: 345678, 4: 456789, 5: 2345678 },
    reviews: 12345678,
    ratings: 12345678,
    comments: []
  },

  // Valid app reviews response
  validAppReviews: [
    {
      id: 'gp:AOqpTOH-review1',
      userName: 'John Doe',
      userImage: 'https://play-lh.googleusercontent.com/user1.jpg',
      date: '2023-11-15T10:30:00.000Z',
      score: 5,
      scoreText: '5',
      url: 'https://play.google.com/store/apps/details?id=com.whatsapp&reviewId=gp:AOqpTOH-review1',
      title: 'Great app!',
      text: 'This app works perfectly for messaging and calling.',
      replyDate: null,
      replyText: null,
      version: '2.23.24.76',
      thumbsUp: 15,
      criterias: []
    },
    {
      id: 'gp:AOqpTOH-review2',
      userName: 'Jane Smith',
      userImage: 'https://play-lh.googleusercontent.com/user2.jpg',
      date: '2023-11-14T15:45:00.000Z',
      score: 4,
      scoreText: '4',
      url: 'https://play.google.com/store/apps/details?id=com.whatsapp&reviewId=gp:AOqpTOH-review2',
      title: 'Good but could be better',
      text: 'Works well most of the time, but sometimes has connectivity issues.',
      replyDate: null,
      replyText: null,
      version: '2.23.24.75',
      thumbsUp: 8,
      criterias: []
    }
  ],

  // Valid search results response
  validSearchResults: [
    {
      appId: 'com.whatsapp',
      title: 'WhatsApp Messenger',
      developer: 'WhatsApp LLC',
      developerId: '5700313618786177705',
      icon: 'https://play-lh.googleusercontent.com/bYtqbOcTYOlgc6gqZ2rwb8lptHuwlNE75zYJu6Bn076-hTmvd96HH-6v7S0YUAAJXoJN',
      score: 4.2,
      scoreText: '4.2',
      priceText: 'Free',
      free: true,
      summary: 'Simple. Reliable. Secure.',
      currency: 'USD',
      price: 0,
      url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
      genre: 'Communication',
      genreId: 'COMMUNICATION'
    },
    {
      appId: 'com.whatsapp.w4b',
      title: 'WhatsApp Business',
      developer: 'WhatsApp LLC',
      developerId: '5700313618786177705',
      icon: 'https://play-lh.googleusercontent.com/business-icon.png',
      score: 4.1,
      scoreText: '4.1',
      priceText: 'Free',
      free: true,
      summary: 'A simple tool for businesses to talk to their customers.',
      currency: 'USD',
      price: 0,
      url: 'https://play.google.com/store/apps/details?id=com.whatsapp.w4b',
      genre: 'Business',
      genreId: 'BUSINESS'
    }
  ],

  // Error responses
  appNotFoundError: new Error('App not found'),
  networkError: new Error('Network request failed'),
  timeoutError: new Error('Request timeout')
};

export const APP_STORE_FIXTURES = {
  // Valid app details response
  validAppDetails: {
    id: 310633997,
    appId: 'id310633997',
    title: 'WhatsApp Messenger',
    url: 'https://apps.apple.com/us/app/whatsapp-messenger/id310633997?uo=4',
    description: 'WhatsApp from Facebook is a FREE messaging and video calling app.',
    icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/example.png',
    genres: ['Social Networking'],
    genreIds: ['6005'],
    primaryGenre: 'Social Networking',
    primaryGenreId: 6005,
    contentRating: '4+',
    languages: ['EN', 'ES', 'FR'],
    size: '201326592',
    requiredOsVersion: '12.0',
    released: '2009-05-03T07:00:00Z',
    updated: '2023-11-10T08:00:00Z',
    releaseNotes: 'Bug fixes and improvements.',
    version: '23.21.79',
    price: 0,
    currency: 'USD',
    free: true,
    developerId: 310633997,
    developer: 'WhatsApp Inc.',
    developerUrl: 'https://apps.apple.com/us/developer/whatsapp-inc/id310633997?uo=4',
    developerWebsite: 'https://www.whatsapp.com/',
    score: 4.5,
    reviews: 5432109,
    currentVersionScore: 4.5,
    currentVersionReviews: 12345,
    screenshots: [
      'https://is1-ssl.mzstatic.com/image/thumb/screenshot1.png',
      'https://is1-ssl.mzstatic.com/image/thumb/screenshot2.png'
    ],
    ipadScreenshots: [],
    appletvScreenshots: [],
    supportedDevices: ['iPhone', 'iPad', 'iPod touch']
  },

  // Valid app reviews response
  validAppReviews: [
    {
      id: '123456789',
      userName: 'AppUser123',
      rating: 5,
      title: 'Excellent messaging app',
      text: 'WhatsApp is the best messaging app I have ever used. Highly recommended!',
      date: '2023-11-15T10:30:00Z',
      version: '23.21.79'
    },
    {
      id: '987654321',
      userName: 'TechReviewer',
      rating: 4,
      title: 'Good but has room for improvement',
      text: 'Great app overall, but sometimes messages take time to deliver.',
      date: '2023-11-14T15:45:00Z',
      version: '23.21.78'
    }
  ],

  // Valid search results response
  validSearchResults: [
    {
      id: 310633997,
      appId: 'id310633997',
      title: 'WhatsApp Messenger',
      developer: 'WhatsApp Inc.',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/Purple123/v4/example.png',
      score: 4.5,
      price: 0,
      free: true,
      summary: 'Simple. Reliable. Secure.',
      url: 'https://apps.apple.com/us/app/whatsapp-messenger/id310633997?uo=4',
      genre: 'Social Networking',
      genreId: '6005'
    },
    {
      id: 1033342685,
      appId: 'id1033342685',
      title: 'WhatsApp Business',
      developer: 'WhatsApp Inc.',
      icon: 'https://is1-ssl.mzstatic.com/image/thumb/business-icon.png',
      score: 4.3,
      price: 0,
      free: true,
      summary: 'A simple tool for businesses to talk to their customers.',
      url: 'https://apps.apple.com/us/app/whatsapp-business/id1033342685?uo=4',
      genre: 'Business',
      genreId: '6000'
    }
  ],

  // Error responses
  appNotFoundError: new Error('App not found'),
  networkError: new Error('Network request failed'),
  timeoutError: new Error('Request timeout')
};

// Mock response generators for consistent testing
export const createMockGooglePlayResponse = (type: 'details' | 'reviews' | 'search', success: boolean = true) => {
  if (!success) {
    throw GOOGLE_PLAY_FIXTURES.appNotFoundError;
  }

  switch (type) {
    case 'details':
      return GOOGLE_PLAY_FIXTURES.validAppDetails;
    case 'reviews':
      return GOOGLE_PLAY_FIXTURES.validAppReviews;
    case 'search':
      return GOOGLE_PLAY_FIXTURES.validSearchResults;
    default:
      throw new Error('Invalid mock type');
  }
};

export const createMockAppStoreResponse = (type: 'details' | 'reviews' | 'search', success: boolean = true) => {
  if (!success) {
    throw APP_STORE_FIXTURES.appNotFoundError;
  }

  switch (type) {
    case 'details':
      return APP_STORE_FIXTURES.validAppDetails;
    case 'reviews':
      return APP_STORE_FIXTURES.validAppReviews;
    case 'search':
      return APP_STORE_FIXTURES.validSearchResults;
    default:
      throw new Error('Invalid mock type');
  }
};

// Rate limiting test utilities
export const RATE_LIMIT_CONFIG = {
  DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds
  MAX_REQUESTS_PER_MINUTE: 30,
  TIMEOUT_DURATION: 15000 // 15 seconds
};

export const createRateLimitedTest = (testFn: () => Promise<void>, delay: number = RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS) => {
  return async () => {
    await new Promise(resolve => setTimeout(resolve, delay));
    return testFn();
  };
};