
import { _replaceAppConfig } from '#app/config'
import { defuFn } from 'defu'

const inlineConfig = {
  "nuxt": {}
}

// Vite - webpack is handled directly in #app/config
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    _replaceAppConfig(newModule.default)
  })
}

import cfg0 from "/home/claude/clawd/data-engine/packages/ui/app.config.js"

export default /*@__PURE__*/ defuFn(cfg0, inlineConfig)
