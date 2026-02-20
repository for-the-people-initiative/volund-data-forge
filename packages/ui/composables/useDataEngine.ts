/**
 * Composable for Data Engine API calls.
 * Uses $fetch for mutations (create/update/delete) and imperative fetches.
 * useFetch should only be used top-level in setup for reactive data (see DataTable, pages).
 */
export function useDataEngine() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.dataEngine.apiBaseUrl

  async function listCollections() {
    return $fetch<{ name: string; count: number }[]>(`${baseUrl}/collections`)
  }

  async function getCollection(name: string) {
    return $fetch(`${baseUrl}/collections/${name}`)
  }

  async function listRecords(collection: string, params?: { page?: number; limit?: number }) {
    return $fetch(`${baseUrl}/collections/${collection}/records`, { params })
  }

  async function getRecord(collection: string, id: string) {
    return $fetch<Record<string, unknown>>(`${baseUrl}/collections/${collection}/records/${id}`)
  }

  async function createRecord(collection: string, data: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${baseUrl}/collections/${collection}/records`, {
      method: 'POST',
      body: data,
    })
  }

  async function updateRecord(collection: string, id: string, data: Record<string, unknown>) {
    return $fetch<Record<string, unknown>>(`${baseUrl}/collections/${collection}/records/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async function deleteRecord(collection: string, id: string) {
    return $fetch(`${baseUrl}/collections/${collection}/records/${id}`, {
      method: 'DELETE',
    })
  }

  return {
    listCollections,
    getCollection,
    listRecords,
    getRecord,
    createRecord,
    updateRecord,
    deleteRecord,
  }
}
