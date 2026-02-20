export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    const componentName =
      instance?.$options?.name || instance?.$options?.__name || 'Onbekend component'
    console.error(`[Error Handler] Fout in ${componentName}:`, error)
    console.error(`[Error Handler] Info: ${info}`)

    if (error instanceof Error) {
      console.error(`[Error Handler] Stack:`, error.stack)
    }
  }

  nuxtApp.hook('vue:error', (error, _instance, _info) => {
    console.error('[vue:error]', error)
  })
})
