<script setup lang="ts">
/**
 * Schema-driven data table component.
 * Renders columns and rows based on the collection schema.
 * Supports sorting, pagination, filtering (server-side), and saved views.
 */
import type { FilterValue } from './FilterBar.vue'

const props = defineProps<{
  collection: string
  pageSize?: number
}>()

const router = useRouter()
const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl
const { fields, status: schemaStatus } = useSchema(toRef(() => props.collection))
const { deleteRecord } = useDataEngine()

// ─── Bulk selection ─────────────────────────────────────────
const selectedIds = ref<Set<string>>(new Set())
const bulkDeleting = ref(false)
const bulkDeleteTarget = ref(false)
const toastMessage = ref('')

const allSelected = computed({
  get: () => records.value.length > 0 && records.value.every((r: any) => selectedIds.value.has(r.id ?? r._id)),
  set: (val: boolean) => {
    if (val) {
      records.value.forEach((r: any) => selectedIds.value.add(r.id ?? r._id))
    } else {
      selectedIds.value.clear()
    }
  },
})

function toggleSelect(record: any, e: Event) {
  e.stopPropagation()
  const id = record.id ?? record._id
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  // Trigger reactivity
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll(e: Event) {
  e.stopPropagation()
  allSelected.value = !allSelected.value
  selectedIds.value = new Set(selectedIds.value)
}

function showToast(msg: string) {
  toastMessage.value = msg
  setTimeout(() => { toastMessage.value = '' }, 2500)
}

async function executeBulkDelete() {
  bulkDeleting.value = true
  try {
    const ids = [...selectedIds.value]
    await Promise.all(ids.map((id) => deleteRecord(props.collection, id)))
    const count = ids.length
    selectedIds.value = new Set()
    bulkDeleteTarget.value = false
    showToast(`${count} record(s) verwijderd`)
    await refresh()
  } catch (err: any) {
    showToast('Bulk verwijderen mislukt')
  } finally {
    bulkDeleting.value = false
  }
}

function exportSelectedJson() {
  const selected = records.value.filter((r: any) => selectedIds.value.has(r.id ?? r._id))
  const json = JSON.stringify(selected, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.collection}-export.json`
  a.click()
  URL.revokeObjectURL(url)
  const count = selected.length
  selectedIds.value = new Set()
  showToast(`${count} record(s) geëxporteerd`)
}

// ─── Delete state ───────────────────────────────────────────
const deleteTarget = ref<{ id: string; label: string } | null>(null)
const deleting = ref(false)
const deleteSuccess = ref(false)

function confirmDelete(record: any, e: Event) {
  e.stopPropagation()
  const id = record.id ?? record._id
  const label = record.name ?? record.title ?? record.label ?? id
  deleteTarget.value = { id, label }
}

const deleteError = ref('')

async function executeDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteRecord(props.collection, deleteTarget.value.id)
    deleteTarget.value = null
    deleteSuccess.value = true
    setTimeout(() => {
      deleteSuccess.value = false
    }, 2000)
    await refresh()
  } catch (err: any) {
    deleteError.value = err?.data?.error?.message ?? err?.message ?? 'Verwijderen mislukt'
  } finally {
    deleting.value = false
  }
}

function cancelDelete() {
  deleteTarget.value = null
}

// ─── Table state ────────────────────────────────────────────
const filters = ref<Record<string, FilterValue>>({})
const sortField = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const effectivePageSize = computed(() => props.pageSize ?? 20)

// ─── Saved Views ────────────────────────────────────────────
interface SavedView {
  name: string
  filters: Record<string, FilterValue>
  sortField: string | null
  sortDir: 'asc' | 'desc'
}

const VIEWS_KEY = computed(() => `data-engine-views-${props.collection}`)
const savedViews = ref<SavedView[]>([])
const currentViewName = ref<string>('Standaard')
const showSaveDialog = ref(false)
const newViewName = ref('')

function loadViews() {
  if (import.meta.server) return
  try {
    const raw = localStorage.getItem(VIEWS_KEY.value)
    savedViews.value = raw ? JSON.parse(raw) : []
  } catch {
    savedViews.value = []
  }
}

function persistViews() {
  if (import.meta.server) return
  localStorage.setItem(VIEWS_KEY.value, JSON.stringify(savedViews.value))
}

function saveView() {
  const name = newViewName.value.trim()
  if (!name) return
  const existing = savedViews.value.findIndex((v) => v.name === name)
  const view: SavedView = {
    name,
    filters: { ...filters.value },
    sortField: sortField.value,
    sortDir: sortDir.value,
  }
  if (existing >= 0) {
    savedViews.value[existing] = view
  } else {
    savedViews.value.push(view)
  }
  persistViews()
  currentViewName.value = name
  showSaveDialog.value = false
  newViewName.value = ''
}

function switchView(name: string) {
  currentViewName.value = name
  if (name === 'Standaard') {
    filters.value = {}
    sortField.value = null
    sortDir.value = 'asc'
  } else {
    const view = savedViews.value.find((v) => v.name === name)
    if (view) {
      filters.value = { ...view.filters }
      sortField.value = view.sortField
      sortDir.value = view.sortDir
    }
  }
  currentPage.value = 1
}

function deleteView(name: string) {
  savedViews.value = savedViews.value.filter((v) => v.name !== name)
  persistViews()
  if (currentViewName.value === name) {
    switchView('Standaard')
  }
}

onMounted(() => loadViews())

// ─── Build API URL with filter/sort params ──────────────────
const apiUrl = computed(() => {
  const params = new URLSearchParams()

  // Filters
  for (const [field, fv] of Object.entries(filters.value)) {
    if (fv.operator === 'like') {
      params.set(`filter[${field}][${fv.operator}]`, String(fv.value))
    } else if (fv.operator === 'between') {
      params.set(`filter[${field}][between]`, (fv.value as [string, string]).join(','))
    } else if (fv.operator === 'eq') {
      params.set(`filter[${field}]`, String(fv.value))
    } else {
      params.set(`filter[${field}][${fv.operator}]`, String(fv.value))
    }
  }

  // Sort
  if (sortField.value) {
    params.set('sort', sortDir.value === 'desc' ? `-${sortField.value}` : sortField.value)
  }

  // Pagination
  params.set('limit', String(effectivePageSize.value))
  params.set('offset', String((currentPage.value - 1) * effectivePageSize.value))

  const qs = params.toString()
  return `${baseUrl}/collections/${props.collection}${qs ? `?${qs}` : ''}`
})

// ─── Fetch records (reactive to apiUrl) ─────────────────────
const {
  data: response,
  status: dataStatus,
  error: fetchError,
  refresh,
} = await useFetch(apiUrl, { key: `records-${props.collection}`, watch: [apiUrl] })

const records = computed(() => {
  const raw = (response.value as any)?.data ?? (response.value as any) ?? []
  return Array.isArray(raw) ? raw : []
})

const totalRecords = computed(() => {
  return (response.value as any)?.meta?.total ?? records.value.length
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalRecords.value / effectivePageSize.value)),
)

const isLoading = computed(() => schemaStatus.value === 'pending' || dataStatus.value === 'pending')

function onFiltersUpdate(newFilters: Record<string, FilterValue>) {
  filters.value = newFilters
  currentPage.value = 1
}

// ─── Visible columns ───────────────────────────────────────
const columns = computed(() => {
  return fields.value.filter((f) => !['id', 'created_at', 'updated_at'].includes(f.name))
})

// ─── Filterable fields (with options for select) ────────────
const filterFields = computed(() => {
  return fields.value
    .filter((f) => !['id', 'created_at', 'updated_at'].includes(f.name))
    .map((f) => ({
      name: f.name,
      type: f.type,
      label: f.label,
      options: (f as any).options,
    }))
})

function toggleSort(fieldName: string) {
  if (sortField.value === fieldName) {
    if (sortDir.value === 'asc') {
      sortDir.value = 'desc'
    } else {
      // Third click: clear sort
      sortField.value = null
      sortDir.value = 'asc'
    }
  } else {
    sortField.value = fieldName
    sortDir.value = 'asc'
  }
  currentPage.value = 1
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
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          ...(type === 'datetime' ? { hour: '2-digit', minute: '2-digit' } : {}),
        })
      } catch {
        return String(value)
      }
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
    <!-- Views & Filter bar -->
    <div class="dt__views-bar">
      <div class="dt__view-switcher">
        <label for="dt-view-select" class="sr-only">Weergave</label>
        <select
          id="dt-view-select"
          class="dt__view-select"
          :value="currentViewName"
          @change="switchView(($event.target as HTMLSelectElement).value)"
        >
          <option value="Standaard">Standaard</option>
          <option v-for="v in savedViews" :key="v.name" :value="v.name">{{ v.name }}</option>
        </select>
        <button
          v-if="currentViewName !== 'Standaard'"
          class="dt__view-delete"
          title="Verwijder weergave"
          @click="deleteView(currentViewName)"
        >
          ✕
        </button>
      </div>
      <button class="dt__view-save" @click="showSaveDialog = true">Opslaan als weergave</button>
    </div>

    <!-- Save dialog -->
    <div v-if="showSaveDialog" class="dt__save-dialog">
      <label for="dt-save-view-name" class="sr-only">Naam van de weergave</label>
      <input
        id="dt-save-view-name"
        v-model="newViewName"
        class="dt__save-input"
        placeholder="Naam van de weergave..."
        @keyup.enter="saveView"
      />
      <button class="dt__save-btn" :disabled="!newViewName.trim()" @click="saveView">
        Opslaan
      </button>
      <button class="dt__save-cancel" @click="showSaveDialog = false">Annuleren</button>
    </div>

    <!-- FilterBar -->
    <FilterBar
      :fields="filterFields"
      :model-value="filters"
      @update:model-value="onFiltersUpdate"
      @clear="filters = {}; currentPage = 1"
    />

    <!-- Bulk action bar -->
    <div v-if="!isLoading && !fetchError && selectedIds.size > 0" class="dt__bulk-bar">
      <span class="dt__bulk-count">{{ selectedIds.size }} geselecteerd</span>
      <button class="dt__bulk-btn dt__bulk-btn--delete" @click="bulkDeleteTarget = true">
        🗑️ Verwijderen
      </button>
      <button class="dt__bulk-btn dt__bulk-btn--export" @click="exportSelectedJson">
        📥 Exporteren (JSON)
      </button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="dt__loading">
      <div class="dt__spinner" />
      <span>Laden...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="fetchError" class="dt__error">
      <p>
        ⚠️ Fout bij laden:
        {{ (fetchError as any)?.data?.error?.message ?? fetchError?.message ?? 'Onbekende fout' }}
      </p>
      <button class="dt__error-retry" @click="refresh()">Opnieuw proberen</button>
    </div>

    <!-- Table -->
    <div v-else-if="records.length" class="dt__scroll">
      <table class="dt__table">
        <thead>
          <tr>
            <th scope="col" class="dt__th dt__th--checkbox" @click.stop>
              <input
                type="checkbox"
                class="dt__checkbox"
                :checked="allSelected"
                aria-label="Selecteer alles"
                @change="toggleSelectAll($event)"
              />
            </th>
            <th
              v-for="col in columns"
              :key="col.name"
              scope="col"
              class="dt__th"
              :aria-sort="sortField === col.name ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'"
              @click="toggleSort(col.name)"
            >
              <span class="dt__th-label">{{ col.label ?? col.name }}</span>
              <span class="dt__th-sort" aria-hidden="true">{{ sortIcon(col.name) }}</span>
            </th>
            <th scope="col" class="dt__th dt__th--actions">
              <span class="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(record, i) in records"
            :key="(record as any).id ?? i"
            class="dt__row"
            :class="{ 'dt__row--selected': selectedIds.has((record as any).id ?? (record as any)._id) }"
            @click="goToRecord(record)"
          >
            <td class="dt__td dt__td--checkbox" @click.stop>
              <input
                type="checkbox"
                class="dt__checkbox"
                :checked="selectedIds.has((record as any).id ?? (record as any)._id)"
                :aria-label="`Selecteer ${(record as any).name ?? (record as any).id ?? 'record'}`"
                @change="toggleSelect(record, $event)"
              />
            </td>
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
              <span
                v-else-if="col.type === 'boolean'"
                :class="(record as any)[col.name] ? 'dt__bool--true' : 'dt__bool--false'"
              >
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
            <td class="dt__td dt__td--actions">
              <button
                class="dt__delete-btn"
                :aria-label="`Verwijder ${(record as any).name ?? (record as any).title ?? (record as any).label ?? (record as any).id ?? 'record'}`"
                @click="confirmDelete(record, $event)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="dt__empty">
      <p>Geen records gevonden</p>
    </div>

    <!-- Bulk delete confirmation dialog -->
    <Teleport to="body">
      <div v-if="bulkDeleteTarget" class="dt__overlay" @click.self="bulkDeleteTarget = false" @keydown.escape="bulkDeleteTarget = false">
        <div class="dt__dialog" role="dialog" aria-modal="true" aria-labelledby="dt-bulk-delete-title">
          <p id="dt-bulk-delete-title">
            Weet je zeker dat je <strong>{{ selectedIds.size }} records</strong> wilt verwijderen?
          </p>
          <div class="dt__dialog-actions">
            <button class="dt__dialog-cancel" @click="bulkDeleteTarget = false" :disabled="bulkDeleting">
              Annuleren
            </button>
            <button class="dt__dialog-confirm" @click="executeBulkDelete" :disabled="bulkDeleting">
              {{ bulkDeleting ? 'Bezig...' : 'Verwijderen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation dialog -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="dt__overlay" @click.self="cancelDelete" @keydown.escape="cancelDelete">
        <div class="dt__dialog" role="dialog" aria-modal="true" aria-labelledby="dt-delete-title">
          <p id="dt-delete-title">
            Weet je zeker dat je <strong>{{ deleteTarget.label }}</strong> wilt verwijderen?
          </p>
          <p v-if="deleteError" class="dt__dialog-error">{{ deleteError }}</p>
          <div class="dt__dialog-actions">
            <button class="dt__dialog-cancel" @click="cancelDelete" :disabled="deleting">
              Annuleren
            </button>
            <button class="dt__dialog-confirm" @click="executeDelete" :disabled="deleting">
              {{ deleting ? 'Bezig...' : 'Verwijderen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Success feedback -->
    <div v-if="deleteSuccess || toastMessage" class="dt__toast">{{ toastMessage || 'Record verwijderd' }}</div>

    <!-- Pagination -->
    <div v-if="!isLoading && totalRecords > 0" class="dt__pagination">
      <button class="dt__page-btn" :disabled="currentPage <= 1" @click="prevPage">← Vorige</button>
      <span class="dt__page-info">
        Pagina {{ currentPage }} van {{ totalPages }}
        <span class="dt__page-total">({{ totalRecords }} records)</span>
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

.dt__views-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-s, 10px);
}

.dt__view-switcher {
  display: flex;
  align-items: center;
  gap: var(--space-3xs, 2px);
}

.dt__view-select {
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.8125rem;
  height: 30px;
  cursor: pointer;
  appearance: none;
}

.dt__view-delete {
  background: none;
  border: none;
  color: var(--text-subtle, #525d8f);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 4px;
}

.dt__view-delete:hover {
  color: var(--feedback-error, #ef4444);
}

.dt__view-save {
  padding: var(--space-3xs, 2px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8125rem;
  cursor: pointer;
  height: 30px;
  white-space: nowrap;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.dt__view-save:hover {
  border-color: var(--intent-action-default, #f97316);
  color: var(--text-default, #fff);
}

.dt__save-dialog {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
}

.dt__save-input {
  flex: 1;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.8125rem;
  height: 28px;
  outline: none;
}

.dt__save-input:focus {
  border-color: var(--border-focus, #f97316);
}

.dt__save-btn {
  padding: var(--space-3xs, 2px) var(--space-s, 10px);
  background: var(--intent-action-default, #f97316);
  border: none;
  border-radius: var(--radius-default, 5px);
  color: #fff;
  font-size: 0.8125rem;
  cursor: pointer;
  height: 28px;
}

.dt__save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dt__save-cancel {
  background: none;
  border: none;
  color: var(--text-subtle, #525d8f);
  font-size: 0.8125rem;
  cursor: pointer;
}

.dt__bulk-bar {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--intent-action-default, #f97316);
  border-radius: var(--radius-rounded, 8px);
}

.dt__bulk-count {
  font-size: 0.8125rem;
  color: var(--text-default, #fff);
  font-weight: 600;
  margin-right: auto;
}

.dt__bulk-btn {
  padding: var(--space-3xs, 2px) var(--space-s, 10px);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  font-size: 0.8125rem;
  cursor: pointer;
  height: 30px;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}

.dt__bulk-btn--delete {
  background: var(--feedback-error, #ef4444);
  border-color: var(--feedback-error, #ef4444);
  color: #fff;
}

.dt__bulk-btn--delete:hover {
  opacity: 0.9;
}

.dt__bulk-btn--export {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

.dt__bulk-btn--export:hover {
  border-color: var(--intent-action-default, #f97316);
}

.dt__th--checkbox,
.dt__td--checkbox {
  width: 40px;
  text-align: center;
  padding: var(--space-s, 10px) var(--space-xs, 6px);
}

.dt__checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--intent-action-default, #f97316);
}

.dt__row--selected {
  background: var(--intent-secondary-hover, #1a2244);
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
  to {
    transform: rotate(360deg);
  }
}

.dt__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-2xl, 68px);
  color: var(--feedback-error, #ef4444);
  font-size: 0.875rem;
}

.dt__error p {
  margin: 0;
}

.dt__error-retry {
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.8125rem;
  cursor: pointer;
}

.dt__error-retry:hover {
  border-color: var(--intent-action-default, #f97316);
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
  transition:
    background-color 0.15s,
    border-color 0.15s;
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

.dt__th--actions {
  width: 48px;
}

.dt__td--actions {
  text-align: center;
  width: 48px;
}

.dt__delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 4px;
  opacity: 0.4;
  transition: opacity 0.15s;
}

.dt__row:hover .dt__delete-btn {
  opacity: 0.8;
}

.dt__delete-btn:hover {
  opacity: 1 !important;
}

.dt__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dt__dialog {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  padding: var(--space-l, 24px);
  max-width: 400px;
  width: 90%;
  color: var(--text-default, #fff);
}

.dt__dialog p {
  margin: 0 0 var(--space-m, 16px);
  font-size: 0.9375rem;
  line-height: 1.5;
}

.dt__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-s, 10px);
}

.dt__dialog-cancel {
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
  font-size: 0.8125rem;
}

.dt__dialog-confirm {
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--feedback-error, #ef4444);
  border: none;
  border-radius: var(--radius-default, 5px);
  color: #fff;
  cursor: pointer;
  font-size: 0.8125rem;
}

.dt__dialog-error {
  color: var(--feedback-error, #ef4444);
  font-size: 0.8125rem;
  margin: 0 0 var(--space-s, 10px);
}

.dt__dialog-confirm:disabled,
.dt__dialog-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dt__toast {
  position: fixed;
  bottom: var(--space-l, 24px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--feedback-success, #22c55e);
  color: #fff;
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  border-radius: var(--radius-pill, 9999px);
  font-size: 0.8125rem;
  z-index: 1001;
  animation: dt-toast 2s ease-in-out;
}

@keyframes dt-toast {
  0%,
  80% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus visible */
.dt__th:focus-visible,
.dt__delete-btn:focus-visible,
.dt__page-btn:focus-visible,
.dt__view-select:focus-visible,
.dt__view-save:focus-visible,
.dt__view-delete:focus-visible,
.dt__save-btn:focus-visible,
.dt__save-cancel:focus-visible,
.dt__error-retry:focus-visible,
.dt__dialog-cancel:focus-visible,
.dt__dialog-confirm:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .dt__views-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .dt__table {
    font-size: 0.8125rem;
  }

  .dt__th {
    padding: var(--space-xs, 6px) var(--space-s, 10px);
  }

  .dt__td {
    padding: var(--space-xs, 6px) var(--space-s, 10px);
  }

  .dt__pagination {
    flex-wrap: wrap;
    gap: var(--space-xs, 6px);
  }

  .dt__save-dialog {
    flex-wrap: wrap;
  }
}
</style>
