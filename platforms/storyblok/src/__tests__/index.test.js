/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'

// Set up DOM container before any imports
beforeEach(() => {
  document.body.innerHTML = '<div id="cmcc-app"></div>'
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  document.body.innerHTML = ''
  jest.restoreAllMocks()
})

describe('Storyblok App Initialization', () => {
  it('shows loading state before SDK initializes', async () => {
    // Don't mock the SDK - just check the loading HTML is set
    // before init completes by having getContext hang
    jest.doMock('@storyblok/app-sdk', () => ({
      StoryblokApp: jest.fn().mockImplementation(() => ({
        getContext: () => new Promise(() => {}), // Never resolves
      })),
    }))

    // Import triggers the DOMContentLoaded listener automatically
    await jest.isolateModulesAsync(async () => {
      // We need to set readyState to 'loading' for the listener to fire
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        writable: true,
        configurable: true,
      })

      require('../index')

      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'))
    })

    // Should show loading HTML
    const container = document.getElementById('cmcc-app')
    expect(container.innerHTML).toContain('Loading CMCC Moderation Dashboard')
  })

  it('shows error UI when SDK initialization fails', async () => {
    // Need to use isolateModules to get a fresh require
    jest.doMock('@storyblok/app-sdk', () => ({
      StoryblokApp: jest.fn().mockImplementation(() => ({
        getContext: () => Promise.reject(new Error('Auth failed')),
      })),
    }))

    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        writable: true,
        configurable: true,
      })

      require('../index')

      document.dispatchEvent(new Event('DOMContentLoaded'))

      // Wait for promise microtasks
      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    const container = document.getElementById('cmcc-app')
    expect(container.querySelector('.cmcc-error')).toBeInTheDocument()
    expect(container.textContent).toContain('Failed to connect to Storyblok')
  })

  it('handles missing mount container gracefully', async () => {
    document.body.innerHTML = ''

    jest.doMock('@storyblok/app-sdk', () => ({
      StoryblokApp: jest.fn().mockImplementation(() => ({
        getContext: () => Promise.reject(new Error('Should not be called')),
      })),
    }))

    await jest.isolateModulesAsync(async () => {
      Object.defineProperty(document, 'readyState', {
        value: 'loading',
        writable: true,
        configurable: true,
      })

      require('../index')

      document.dispatchEvent(new Event('DOMContentLoaded'))

      await new Promise((resolve) => setTimeout(resolve, 100))
    })

    expect(console.error).toHaveBeenCalledWith(
      '[CMCC] Mount container #cmcc-app not found in the DOM',
    )
  })
})
