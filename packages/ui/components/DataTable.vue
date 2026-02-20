<script setup lang="ts">
/**
 * Schema-driven data table component.
 * Renders columns and rows based on the collection schema.
 * Supports sorting, pagination, filtering, and type-aware rendering.
 */

const props = defineProps<{
  collection: string
  pageSize?: number
}>()

const router = useRouter()
const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl
const { fields, status: schemaStatus } = useSchema(toRef(() => props.collection))

// Table state
const searchQuery = ref('')
const sortField = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const effectivePageSize = computed(() => props.pageSize ?? 20)

// Fetch records
const { data: response, status: dataStatus } = await useFetch(
  () => `${baseUrl}/collections/${props.collection}`,
  { key: `records-${props.collection}` },
)

const records = computed(() => {
  const raw = (response.value as any)?.data ?? (response.value as any) ?? []
  return Array.isArray(raw) ? raw : []
})

const totalRecords = computed(() => {
  return (response.value as any)?.meta?.total ?? records.value.length
})

// Filter records client-side on text fields
const filteredRecords = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return records.value

  const textFields = fields.value
    .filter(f => ['text', 'string', 'email', 'url', 'slug'].includes(f.type))
    .map(f => f.name)

  return records.value.filter((record: any) =>
    textFields.some(field => {
      const val = record[field]
      return val && String(val).toLowerCase().includes(q)
    })
  )
})

// Sort filtered records client-side
const sortedRecords = computed(() => {
  const data = [...filteredRecords.value]
  if (!sortField.value) return data

  const field = sortField.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  return data.sort((a: any, b: any) => {
    const va = a[field] ?? ''
    const vb = b[field] ?? ''
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
    return String(va).localeCompare(String(vb)) * dir
  })
})

// Paginated (client-side for now since API may not support it fully)
const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * effectivePageSize.value
  return sortedRecords.value.slice(start, start + effectivePageSize.value)
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / effectivePageSize.value)))

const isLoading = computed(() => schemaStatus.value === 'pending' || dataStatus.value === 'pending')

// Visible columns (exclude hidden system fields)
const columns = computed(() => {
  return fields.value.filter(f => !['id', 'created_at', 'updated_at'].includes(f.name))
})

function toggleSort(fieldName: string) {
  if (sortField.value === fieldName) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = fieldName
    sortDir.value = 'asc'
  }
}

function sortIcon(fieldName: string) {
  if (sortField.value !== fieldName) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function goToRecord(record: any) {
  const id = record.id ?? record._id
  if (id) {
    router.push(`/collections/${props.collection}/${id}`)
  }
}

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return '—'
  switch (type) {
    case 'boolean':
      return value ? '✓' : '✗'
    case 'datetime':
    case 'date':
      try {
        return new Date(value as string).toLocaleDateString('nl-NL', {
          year: 'numeric', month: 'short', day: 'numeric',
          ...(type === 'datetime' ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      } catch { return String(value) }
    case 'integer':
    case 'float':
    case 'number':
      return Number(value).toLocaleString('nl-NL')
    default:
      return String(value)
  }
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <div class="dt">
    <!-- Search bar -->
    <div class="dt__toolbar">
      <input
        v-model="searchQuery"
        type="search"
        class="dt__search"
        placeholder="Zoeken..."
        @input="currentPage = 1"
      />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="dt__loading">
      <div class="dt__spinner" />
      <span>Laden...</span>
    </div>

    <!-- Table -->
    <div v-else-if="paginatedRecords.length" class="dt__scroll">
      <table class="dt__table">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.name"
              class="dt__th"
              @click="toggleSort(col.name)"
            >
              <span class="dt__th-label">{{ col.label ?? col.name }}</span>
              <span class="dt__th-sort">{{ sortIcon(col.name) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(record, i) in paginatedRecords"
            :key="(record as any).id ?? i"
            class="dt__row"
            @click="goToRecord(record)"
          >
            <td
              v-for="col in columns"
              :key="col.name"
              class="dt__td"
              :class="`dt__td--${col.type}`"
            >
              <!-- Select type: badge -->
              <span v-if="col.type === 'select'" class="dt__badge">
                {{ (record as any)[col.name] ?? '—' }}
              </span>
              <!-- Boolean -->
              <span v-else-if="col.type === 'boolean'" :class="(record as any)[col.name] ? 'dt__bool--true' : 'dt__bool--false'">
                {{ (record as any)[col.name] ? '✓' : '✗' }}
              </span>
              <!-- Relation -->
              <span v-else-if="col.type === 'relation'" class="dt__relation">
                {{ (record as any)[col.name] ?? '—' }}
              </span>
              <!-- Default -->
              <span v-else>
                {{ formatValue((record as any)[col.name], col.type) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="dt__empty">
      <p>Geen records gevonden</p>
    </div>

    <!-- Pagination -->
    <div v-if="!isLoading && filteredRecords.length > 0" class="dt__pagination">
      <button class="dt__page-btn" :disabled="currentPage <= 1" @click="prevPage">
        ← Vorige
      </button>
      <span class="dt__page-info">
        Pagina {{ currentPage }} van {{ totalPages }}
        <span class="dt__page-total">({{ filteredRecords.length }} records)</span>
      </span>
      <button class="dt__page-btn" :disabled="currentPage >= totalPages" @click="nextPage">
        Volgende →
      </button>
    </div>
  </div>
</template>

<style scoped>
.dt {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.dt__toolbar {
  display: flex;
  align-items: center;
}

.dt__search {
  width: 100%;
  max-width: 320px;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}

.dt__search::placeholder {
  color: var(--text-subtle, #525d8f);
}

.dt__search:focus {
  border-color: var(--border-focus, #f97316);
}

.dt__scroll {
  overflow-x: auto;
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-rounded, 8px);
}

.dt__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.dt__th {
  padding: var(--space-s, 10px) var(--space-m, 16px);
  text-align: left;
  font-weight: 600;
  color: var(--text-secondary, #9ea5c2);
  background: var(--surface-muted, #060813);
  border-bottom: 1px solid var(--border-default, #242e5c);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s;
}

.dt__th:hover {
  color: var(--text-default, #fff);
}

.dt__th-label {
  margin-right: var(--space-xs, 6px);
}

.dt__th-sort {
  opacity: 0.5;
  font-size: 0.75rem;
}

.dt__th:hover .dt__th-sort {
  opacity: 1;
}

.dt__row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.dt__row:hover {
  background: var(--surface-panel, #11162d);
}

.dt__row:not(:last-child) .dt__td {
  border-bottom: 1px solid var(--border-subtle, #1a2244);
}

.dt__td {
  padding: var(--space-s, 10px) var(--space-m, 16px);
  color: var(--text-default, #fff);
  white-space: nowrap;
}

.dt__td--integer,
.dt__td--float,
.dt__td--number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dt__badge {
  display: inline-block;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--intent-secondary-hover, #1a2244);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
}

.dt__bool--true {
  color: var(--feedback-success, #22c55e);
}

.dt__bool--false {
  color: var(--text-subtle, #525d8f);
}

.dt__relation {
  color: var(--text-link, #fb923c);
}

.dt__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-s, 10px);
  padding: var(--space-2xl, 68px);
  color: var(--text-muted, #7680a9);
}

.dt__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-default, #242e5c);
  border-top-color: var(--intent-action-default, #f97316);
  border-radius: 50%;
  animation: dt-spin 0.6s linear infinite;
}

@keyframes dt-spin {
  to { transform: rotate(360deg); }
}

.dt__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl, 68px);
  color: var(--text-muted, #7680a9);
  font-size: 0.875rem;
}

.dt__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-m, 16px);
  padding: var(--space-s, 10px) 0;
}

.dt__page-btn {
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.dt__page-btn:hover:not(:disabled) {
  background: var(--intent-secondary-hover, #1a2244);
  border-color: var(--border-strong, #2e3b75);
}

.dt__page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dt__page-info {
  font-size: 0.8125rem;
  color: var(--text-secondary, #9ea5c2);
}

.dt__page-total {
  color: var(--text-muted, #7680a9);
}
</style>
