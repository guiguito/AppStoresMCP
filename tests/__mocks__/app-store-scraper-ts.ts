/**
 * Jest mock for app-store-scraper-ts (wired via moduleNameMapper).
 * Constants come from the real library so the mock can't drift from it.
 */

export const { constants } = jest.requireActual('../../node_modules/app-store-scraper-ts');

export const app = jest.fn();
export const ratings = jest.fn();
export const list = jest.fn();
export const search = jest.fn();
export const developer = jest.fn();
export const suggest = jest.fn();
export const similar = jest.fn();
export const reviews = jest.fn();
export const privacy = jest.fn();
