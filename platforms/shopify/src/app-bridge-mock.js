/**
 * CMCC Shopify App Bridge Mock for Local Development
 *
 * The real @shopify/app-bridge-react is not available in all environments.
 * This mock provides a minimal Provider that renders children without
 * requiring the actual Shopify App Bridge SDK.
 */

import React from 'react'

const AppBridgeContext = React.createContext({
  app: {
    getState: () => ({}),
    subscribe: () => () => {},
    dispatch: () => {},
  },
})

export function Provider({ children, config }) {
  return React.createElement(AppBridgeContext.Provider, {
    value: {
      config: config || {},
      app: {
        getState: () => ({ config }),
        subscribe: () => () => {},
        dispatch: () => {},
      },
    },
  }, children)
}

export function useAppBridge() {
  return React.useContext(AppBridgeContext)
}

export default { Provider, useAppBridge }
