import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'node:util';

// Replace the browser-only import.meta.env adapter by module identity, not import spelling.
jest.mock('../shared/config', () => jest.requireActual('./config'));

Object.assign(globalThis, { TextEncoder, TextDecoder });
window.scrollTo = jest.fn();
Element.prototype.scrollTo = jest.fn();
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: function (this: HTMLDialogElement) {
    this.open = true;
  },
});
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value: function (this: HTMLDialogElement) {
    this.open = false;
  },
});
beforeEach(() => {
  window.matchMedia = jest.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});
