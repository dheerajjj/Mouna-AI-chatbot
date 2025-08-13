// Test setup file for Jest
require('dotenv').config({ path: '.env' });

// Mock console.log during tests to reduce noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly needed
beforeAll(() => {
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

// Restore console after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_API_KEY = 'test-api-key-for-testing';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Global test timeout
jest.setTimeout(10000);
