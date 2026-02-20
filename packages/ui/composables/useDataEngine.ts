/**
 * Composable for Data Engine API calls.
 * Wraps useFetch with the configured base URL and provides
 * typed methods for CRUD operations on collections.
 */
export function useDataEngine() {
  const config = useRuntimeConfig()
  const baseUrl = config.public.dataEngine.apiBaseUrl

  async function listCollections() {
    return useFetch<{ name: string; count: number }[]>(`${baseUrl}/collections`)
  }

  async function getCollection(name: string) {
    return useFetch(`${baseUrl}/collections/${name}`)
  }

  async function listRecords(collection: string, params?: { page?: number; limit?: number }) {
    return useFetch(`${baseUrl}/collections/${collection}/records`, { params })
  }

  async function getRecord(collection: string, id: string) {
    return useFetch(`${baseUrl}/collections/${collection}/records/${id}`)
  }

  async function createRecord(collection: string, data: Record<string, unknown>) {
    return useFetch(`${baseUrl}/collections/${collection}/records`, {
      method: 'POST',
      body: data,
    })
  }

  async function updateRecord(collection: string, id: string, data: Record<string, unknown>) {
    return useFetch(`${baseUrl}/collections/${collection}/records/${id}`, {
      method: 'PUT',
      body: data,
    })
  }

  async function deleteRecord(collection: string, id: string) {
    return useFetch(`${baseUrl}/collections/${collection}/records/${id}`, {
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
