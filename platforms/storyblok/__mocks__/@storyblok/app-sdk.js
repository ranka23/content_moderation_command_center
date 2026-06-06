/**
 * Mock for @storyblok/app-sdk
 *
 * Provides a controllable StoryblokApp class for testing the
 * SDK initialization path in src/index.js.
 */

const mockGetContext = jest.fn()

class StoryblokApp {
  constructor(options = {}) {
    this.options = options
    this.getContext = mockGetContext
  }
}

StoryblokApp.__mockGetContext = mockGetContext
StoryblokApp.__reset = () => {
  mockGetContext.mockReset()
}

module.exports = { StoryblokApp }
