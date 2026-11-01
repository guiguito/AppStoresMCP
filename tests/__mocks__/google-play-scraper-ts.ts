/**
 * Jest mock for google-play-scraper-ts (wired via moduleNameMapper).
 * Constants come from the real library so the mock can't drift from it.
 */

export const { constants } = jest.requireActual('../../node_modules/google-play-scraper-ts');

const mock = {
  ...constants,
  app: jest.fn(),
  reviews: jest.fn(),
  search: jest.fn(),
  categories: jest.fn(),
  datasafety: jest.fn(),
  developer: jest.fn(),
  list: jest.fn(),
  permissions: jest.fn(),
  similar: jest.fn(),
  suggest: jest.fn()
};

export default mock;
