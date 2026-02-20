/**
 * Composable for fetching and caching collection schemas.
 * Provides schema definitions that drive table columns, form fields, etc.
 */
export function useSchema(collectionName: MaybeRef<string>) {
  const config = useRuntimeConfig()
  const baseUrl = config.public.dataEngine.apiBaseUrl
  const name = toValue(collectionName)

  const { data: schema, status, error, refresh } = useFetch(
    `${baseUrl}/schema/${name}`,
    {
      key: `schema-${name}`,
      // Cache schema for the session
      getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] || nuxtApp.static.data[key],
    },
  )

  const fields = computed(() => {
    if (!schema.value) return []
    const s = schema.value as Record<string, unknown>
    return (s.fields ?? s.columns ?? []) as Array<{
      name: string
      type: string
      label?: string
      required?: boolean
    }>
  })

  return {
    schema,
    fields,
    status,
    error,
    refresh,
  }
}
