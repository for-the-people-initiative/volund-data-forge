import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',

  // Make this a Nuxt layer
  // When used via `extends`, these settings merge into the consuming app

  components: [
    { path: '~/components' },
  ],

  css: [
    '@for-the-people-initiative/design-system/css',
    '@for-the-people-initiative/design-system/css/theme-dark.css',
    '~/assets/css/fonts.css',
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
