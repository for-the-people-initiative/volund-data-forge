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
    '~/assets/css/design-system.css',
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

  vite: {
    resolve: {
      alias: {
        // Resolve design system CSS exports to actual dist files
        '@for-the-people-initiative/design-system/css/theme-dark.css': resolve(__dirname, 'node_modules/@for-the-people-initiative/design-system/dist/css/theme-dark.css'),
        '@for-the-people-initiative/design-system/css': resolve(__dirname, 'node_modules/@for-the-people-initiative/design-system/dist/css/tokens.css'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          // @ts-expect-error - Vite 5+ sass api option, types not updated
          api: 'modern-compiler',
          loadPaths: [
            resolve(__dirname, 'node_modules'),
          ],
        },
      },
    },
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
