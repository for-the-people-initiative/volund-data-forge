import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Make this a Nuxt layer
  // When used via `extends`, these settings merge into the consuming app

  css: [
    resolve(__dirname, 'node_modules/for-the-people-design-system/dist/css/tokens.css'),
    resolve(__dirname, 'assets/css/theme-light.css'),
  ],

  app: {
    head: {
      htmlAttrs: { lang: 'nl' },
    },
  },

  typescript: {
    strict: true,
  },

  // Runtime config defaults (overridable by consuming app)
  runtimeConfig: {
    public: {
      dataEngine: {
        apiBaseUrl: '/api',
        routePrefix: '/collections',
      },
    },
  },
})
