/**
 * Composable for managing database schemas (namespaces).
 * Not to be confused with useSchema which handles collection field schemas.
 */
const STORAGE_KEY = 'vdf-active-schema'

const activeSchema = ref<string>('public')
const schemas = ref<string[]>([])
const loading = ref(false)

let initialized = false

export function useDbSchema() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.dataEngine.apiBaseUrl

  // Restore from localStorage on first use (client only)
  if (import.meta.client && !initialized) {
    initialized = true
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) activeSchema.value = stored
  }

  function persistSchema(name: string) {
    activeSchema.value = name
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, name)
    }
  }

  async function fetchSchemas() {
    loading.value = true
    try {
      const res = await $fetch<{ data: string[] }>(`${baseUrl}/schemas`)
      const list = res.data ?? []
      // Always include 'public' as first option
      if (!list.includes('public')) list.unshift('public')
      schemas.value = list
      // Ensure activeSchema is valid
      if (!schemas.value.includes(activeSchema.value)) {
        persistSchema('public')
      }
    } catch (e) {
      console.error('Failed to fetch schemas:', e)
    } finally {
      loading.value = false
    }
  }

  async function createSchema(name: string) {
    await $fetch(`${baseUrl}/schemas`, {
      method: 'POST',
      body: { name },
    })
    await fetchSchemas()
  }

  async function deleteSchema(name: string, cascade = false) {
    await $fetch(`${baseUrl}/schemas/${name}`, {
      method: 'DELETE',
      params: cascade ? { cascade: 'true' } : undefined,
    })
    if (activeSchema.value === name) {
      persistSchema('public')
    }
    await fetchSchemas()
  }

  function switchSchema(name: string) {
    persistSchema(name)
  }

  /**
   * Returns query params object with schema included (if not public).
   */
  function schemaParams(extra?: Record<string, unknown>): Record<string, unknown> {
    const params: Record<string, unknown> = { ...extra }
    if (activeSchema.value && activeSchema.value !== 'public') {
      params.schema = activeSchema.value
    }
    return params
  }

  return {
    activeSchema: readonly(activeSchema),
    schemas: readonly(schemas),
    loading: readonly(loading),
    fetchSchemas,
    createSchema,
    deleteSchema,
    switchSchema,
    schemaParams,
  }
}
