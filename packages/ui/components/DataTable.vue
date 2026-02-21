<script setup lang="ts">
/**
 * Schema-driven data table component.
 * Renders columns and rows based on the collection schema.
 * Supports sorting, pagination, filtering (server-side), and saved views.
 *
 * Note: The native <table> is kept rather than FtpDataTable because this component
 * has complex inline editing, bulk selection, custom cell rendering, and action columns
 * that exceed FtpDataTable's API capabilities. All form elements within the table
 * (buttons, checkboxes, inputs, selects) use FTP design system components.
 */
import type { FilterValue } from './FilterBar.vue'
import DataForm from './DataForm.vue'

const props = defineProps<{
  collection: string
  pageSize?: number
}>()

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl
const { fields, schema, status: schemaStatus } = useSchema(toRef(() => props.collection))
const { deleteRecord } = useDataEngine()

const singularName = computed(() => {
  return (schema.value as any)?.singularName || props.collection
})

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

function toggleSelect(record: any) {
  const id = record.id ?? record._id
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

function toggleSelectAll() {
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

// ─── Edit state ─────────────────────────────────────────────
const editTarget = ref<{ id: string; record: Record<string, unknown> } | null>(null)
const editModalVisible = ref(false)

function confirmDelete(record: any, e: Event) {
  e.stopPropagation()
  const id = record.id ?? record._id
  const label = record.name ?? record.title ?? record.label ?? id
  deleteTarget.value = { id, label }
}

function confirmEdit(record: any, e: Event) {
  e.stopPropagation()
  const id = record.id ?? record._id
  editTarget.value = { id, record: { ...record } }
  editModalVisible.value = true
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

function handleEditSuccess() {
  editModalVisible.value = false
  editTarget.value = null
  showToast('Record bijgewerkt')
  refresh()
}

function handleEditCancel() {
  editModalVisible.value = false
  editTarget.value = null
}

// ─── Table state ────────────────────────────────────────────
const filters = ref<Record<string, FilterValue>>({})
const sortField = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('asc')
const currentPage = ref(1)
const effectivePageSize = computed(() => props.pageSize ?? 20)

// ─── Views functionality removed per VDF-016 ─────────────────

// loadViews function removed per VDF-016

// persistViews function removed per VDF-016

// saveView function removed per VDF-016

// viewOptions computed property removed per VDF-016

// switchView function removed per VDF-016

// deleteView function removed per VDF-016

// onMounted loadViews call removed per VDF-016

// ─── Build API URL with filter/sort params ──────────────────
const apiUrl = computed(() => {
  const params = new URLSearchParams()

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

  if (sortField.value) {
    params.set('sort', sortDir.value === 'desc' ? `-${sortField.value}` : sortField.value)
  }

  params.set('limit', String(effectivePageSize.value))
  params.set('offset', String((currentPage.value - 1) * effectivePageSize.value))

  const qs = params.toString()
  return `${baseUrl}/collections/${props.collection}${qs ? `?${qs}` : ''}`
})

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

const columns = computed(() => {
  return fields.value.filter((f) => !['id', 'created_at', 'updated_at'].includes(f.name))
})

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

// ─── Inline editing ─────────────────────────────────────────
const EDITABLE_TYPES = new Set(['text', 'string', 'number', 'integer', 'float', 'email', 'url', 'select'])

const editingCell = ref<{ rowId: string; field: string } | null>(null)
const editValue = ref<string>('')
const editSaving = ref(false)
const editError = ref<{ rowId: string; field: string; message: string } | null>(null)

function isEditable(col: { name: string; type: string }) {
  return EDITABLE_TYPES.has(col.type)
}

function startEdit(record: any, col: { name: string; type: string }, e: Event) {
  if (!isEditable(col)) return
  e.stopPropagation()
  const rowId = record.id ?? record._id
  editingCell.value = { rowId, field: col.name }
  // For select fields, use the raw value; for others, use the current value or empty string
  editValue.value = col.type === 'select' 
    ? ((record as any)[col.name] ?? '') 
    : ((record as any)[col.name] ?? '')
  editError.value = null
  nextTick(() => {
    const input = document.querySelector('.dt__inline-input--active') as HTMLInputElement | HTMLSelectElement
    if (input) {
      input.focus()
      // For text inputs, select all text for easy editing
      if (input instanceof HTMLInputElement && col.type !== 'select') {
        input.select()
      }
    }
  })
}

function cancelEdit() {
  editingCell.value = null
  editValue.value = ''
}

function validateField(col: any, value: string): string | null {
  if (col.required && !value && value !== '0') return 'Verplicht veld'
  if (col.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ongeldig e-mailadres'
  if (col.type === 'url' && value && !/^https?:\/\/.+/.test(value)) return 'Ongeldige URL'
  if (['number', 'integer', 'float'].includes(col.type) && value && isNaN(Number(value))) return 'Ongeldig getal'
  if (col.type === 'select' && col.options && value && !col.options.includes(value)) return 'Ongeldige optie'
  if (col.validations) {
    for (const v of col.validations) {
      if (v.rule === 'minLength' && value.length < Number(v.value)) return v.message ?? `Minimaal ${v.value} tekens`
      if (v.rule === 'maxLength' && value.length > Number(v.value)) return v.message ?? `Maximaal ${v.value} tekens`
      if (v.rule === 'min' && Number(value) < Number(v.value)) return v.message ?? `Minimaal ${v.value}`
      if (v.rule === 'max' && Number(value) > Number(v.value)) return v.message ?? `Maximaal ${v.value}`
      if (v.rule === 'pattern' && !new RegExp(v.value as string).test(value)) return v.message ?? 'Ongeldige waarde'
    }
  }
  return null
}

async function saveEdit() {
  if (!editingCell.value) return
  const { rowId, field } = editingCell.value
  const col = fields.value.find((f) => f.name === field)
  if (!col) return

  const validationError = validateField(col, editValue.value)
  if (validationError) {
    editError.value = { rowId, field, message: validationError }
    return
  }

  let patchValue: unknown = editValue.value
  if (['number', 'integer', 'float'].includes(col.type) && editValue.value !== '') {
    patchValue = Number(editValue.value)
  }
  if (editValue.value === '' && !col.required) {
    patchValue = null
  }

  editSaving.value = true
  editError.value = null
  try {
    await $fetch(`${baseUrl}/collections/${props.collection}/${rowId}`, {
      method: 'PUT',
      body: { [field]: patchValue },
    })
    editingCell.value = null
    editValue.value = ''
    await refresh()
  } catch (err: any) {
    editError.value = {
      rowId,
      field,
      message: err?.data?.error?.message ?? err?.message ?? 'Opslaan mislukt',
    }
  } finally {
    editSaving.value = false
  }
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    saveEdit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancelEdit()
  }
}

function isEditingCell(record: any, fieldName: string): boolean {
  if (!editingCell.value) return false
  const rowId = record.id ?? record._id
  return editingCell.value.rowId === rowId && editingCell.value.field === fieldName
}

function hasEditError(record: any, fieldName: string): boolean {
  if (!editError.value) return false
  const rowId = record.id ?? record._id
  return editError.value.rowId === rowId && editError.value.field === fieldName
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

function isImagePath(path: string): boolean {
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)
}

function fileNameFromPath(path: string): string {
  return path.split('/').pop() || 'bestand'
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
    <!-- Views functionality removed per VDF-016 -->

    <!-- Save dialog removed per VDF-016 -->

    <!-- FilterBar -->
    <FilterBar
      :fields="filterFields"
      :model-value="filters"
      @update:model-value="onFiltersUpdate"
      @clear="filters = {}; currentPage = 1"
    />

    <!-- Table info hint -->
    <div v-if="!isLoading && !fetchError && records.length" class="dt__table-hint">
      <span class="dt__hint-text">💡 Gebruik de ✏️ knop om te bewerken • Dubbelklik op een cel voor inline editing</span>
    </div>

    <!-- Bulk action bar -->
    <div v-if="!isLoading && !fetchError && selectedIds.size > 0" class="dt__bulk-bar">
      <span class="dt__bulk-count">{{ selectedIds.size }} geselecteerd</span>
      <FtpButton label="🗑️ Verwijderen" variant="primary" size="sm" class="dt__bulk-delete" @click="bulkDeleteTarget = true" />
      <FtpButton label="📥 Exporteren (JSON)" variant="secondary" size="sm" @click="exportSelectedJson" />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="dt__loading">
      <FtpProgressSpinner />
      <span>Laden...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="fetchError" class="dt__error">
      <FtpMessage severity="error">
        ⚠️ Fout bij laden:
        {{ (fetchError as any)?.data?.error?.message ?? fetchError?.message ?? 'Onbekende fout' }}
      </FtpMessage>
      <FtpButton label="Opnieuw proberen" variant="secondary" size="sm" @click="refresh()" />
    </div>

    <!-- Table -->
    <!-- Note: Native <table> retained for inline editing, bulk selection, and custom cell rendering
         that exceeds FtpDataTable's capabilities. All elements within use FTP components. -->
    <div v-else-if="records.length" class="dt__scroll">
      <table class="dt__table">
        <thead>
          <tr>
            <th scope="col" class="dt__th dt__th--checkbox" @click.stop>
              <FtpCheckbox
                :model-value="allSelected"
                aria-label="Selecteer alles"
                @update:model-value="toggleSelectAll"
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
          >
            <td class="dt__td dt__td--checkbox" @click.stop>
              <FtpCheckbox
                :model-value="selectedIds.has((record as any).id ?? (record as any)._id)"
                :aria-label="`Selecteer ${(record as any).name ?? (record as any).id ?? 'record'}`"
                @update:model-value="toggleSelect(record)"
              />
            </td>
            <td
              v-for="col in columns"
              :key="col.name"
              class="dt__td"
              :class="[
                `dt__td--${col.type}`,
                { 'dt__td--editable': isEditable(col), 'dt__td--editing': isEditingCell(record, col.name), 'dt__td--edit-error': hasEditError(record, col.name) }
              ]"
              @dblclick="isEditable(col) ? startEdit(record, col, $event) : undefined"
            >
              <!-- Editable fields: Always render input to prevent layout shift -->
              <template v-if="isEditable(col)">
                <!-- Select fields -->
                <template v-if="col.type === 'select'">
                  <!-- Active edit state -->
                  <select
                    v-if="isEditingCell(record, col.name)"
                    v-model="editValue"
                    class="dt__inline-input dt__inline-select dt__inline-input--active"
                    @blur="saveEdit"
                    @keydown="onEditKeydown"
                    @click.stop
                  >
                    <option v-if="!col.required" value="">—</option>
                    <option v-for="opt in (col as any).options ?? []" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <!-- Read-only state -->
                  <select
                    v-else
                    :value="(record as any)[col.name] ?? ''"
                    disabled
                    tabindex="-1"
                    class="dt__inline-input dt__inline-select dt__inline-input--readonly"
                  >
                    <option v-if="!col.required" value="">—</option>
                    <option v-for="opt in (col as any).options ?? []" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                </template>
                
                <!-- Text/number/email/url fields -->
                <template v-else>
                  <!-- Active edit state -->
                  <input
                    v-if="isEditingCell(record, col.name)"
                    v-model="editValue"
                    class="dt__inline-input dt__inline-input--active"
                    :type="['number', 'integer', 'float'].includes(col.type) ? 'number' : col.type === 'email' ? 'email' : col.type === 'url' ? 'url' : 'text'"
                    @blur="saveEdit"
                    @keydown="onEditKeydown"
                    @click.stop
                  />
                  <!-- Read-only state -->
                  <input
                    v-else
                    :value="formatValue((record as any)[col.name], col.type)"
                    readonly
                    tabindex="-1"
                    class="dt__inline-input dt__inline-input--readonly"
                    :type="['number', 'integer', 'float'].includes(col.type) ? 'number' : col.type === 'email' ? 'email' : col.type === 'url' ? 'url' : 'text'"
                  />
                </template>
                
                <span v-if="hasEditError(record, col.name)" class="dt__inline-error">{{ editError!.message }}</span>
              </template>
              
              <!-- Non-editable fields: Display only -->
              <template v-else>
                <FtpTag 
                  v-if="col.type === 'select'" 
                  :value="(record as any)[col.name] ?? '—'" 
                  class="dt__status-tag" 
                  :data-value="String((record as any)[col.name] ?? '').toLowerCase()"
                />
                <span
                  v-else-if="col.type === 'boolean'"
                  :class="(record as any)[col.name] ? 'dt__bool--true' : 'dt__bool--false'"
                >
                  {{ (record as any)[col.name] ? '✓' : '✗' }}
                </span>
                <span v-else-if="col.type === 'relation'" class="dt__relation">
                  {{ (record as any)[col.name] ?? '—' }}
                </span>
                <span v-else-if="col.type === 'file' && (record as any)[col.name]" class="dt__file" @click.stop>
                  <img
                    v-if="isImagePath(String((record as any)[col.name]))"
                    :src="String((record as any)[col.name])"
                    :alt="fileNameFromPath(String((record as any)[col.name]))"
                    class="dt__file-thumb"
                  />
                  <a v-else :href="String((record as any)[col.name])" target="_blank" class="dt__file-link">
                    📎 {{ fileNameFromPath(String((record as any)[col.name])) }}
                  </a>
                </span>
                <span v-else-if="col.type === 'file'">—</span>
                <span v-else>
                  {{ formatValue((record as any)[col.name], col.type) }}
                </span>
              </template>
            </td>
            <td class="dt__td dt__td--actions">
              <div class="dt__actions-group">
                <FtpButton
                  label="✏️"
                  variant="secondary"
                  size="sm"
                  class="dt__edit-btn"
                  :aria-label="`Bewerk ${(record as any).name ?? (record as any).title ?? (record as any).label ?? (record as any).id ?? 'record'}`"
                  @click="confirmEdit(record, $event)"
                />
                <FtpButton
                  label="🗑️"
                  variant="secondary"
                  size="sm"
                  class="dt__delete-btn"
                  :aria-label="`Verwijder ${(record as any).name ?? (record as any).title ?? (record as any).label ?? (record as any).id ?? 'record'}`"
                  @click="confirmDelete(record, $event)"
                />
              </div>
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
    <FtpDialog
      :visible="bulkDeleteTarget"
      header="Bulk verwijderen"
      :modal="true"
      size="sm"
      @update:visible="bulkDeleteTarget = $event"
    >
      <p>
        Weet je zeker dat je <strong>{{ selectedIds.size }} {{ selectedIds.size === 1 ? singularName : `${singularName}s` }}</strong> wilt verwijderen?
      </p>
      <template #footer>
        <div class="dt__dialog-actions">
          <FtpButton label="Annuleren" variant="secondary" :is-disabled="bulkDeleting" @click="bulkDeleteTarget = false" />
          <FtpButton
            :label="bulkDeleting ? 'Bezig...' : 'Verwijderen'"
            variant="primary"
            class="dt__dialog-delete"
            :is-disabled="bulkDeleting"
            :is-loading="bulkDeleting"
            @click="executeBulkDelete"
          />
        </div>
      </template>
    </FtpDialog>

    <!-- Delete confirmation dialog -->
    <FtpDialog
      :visible="!!deleteTarget"
      header="Record verwijderen"
      :modal="true"
      size="sm"
      @update:visible="!$event && cancelDelete()"
    >
      <p v-if="deleteTarget">
        Weet je zeker dat je deze {{ singularName }} <strong>{{ deleteTarget.label }}</strong> wilt verwijderen?
      </p>
      <FtpMessage v-if="deleteError" severity="error">{{ deleteError }}</FtpMessage>
      <template #footer>
        <div class="dt__dialog-actions">
          <FtpButton label="Annuleren" variant="secondary" :is-disabled="deleting" @click="cancelDelete" />
          <FtpButton
            :label="deleting ? 'Bezig...' : 'Verwijderen'"
            variant="primary"
            class="dt__dialog-delete"
            :is-disabled="deleting"
            :is-loading="deleting"
            @click="executeDelete"
          />
        </div>
      </template>
    </FtpDialog>

    <!-- Edit Modal -->
    <FtpDialog
      :visible="editModalVisible"
      :header="`Bewerk record`"
      :modal="true"
      size="lg"
      @update:visible="editModalVisible = $event"
    >
      <div v-if="editTarget" class="dt__edit-modal-content">
        <DataForm
          :collection="collection"
          :record-id="editTarget.id"
          @success="handleEditSuccess"
          @cancel="handleEditCancel"
        />
      </div>
    </FtpDialog>

    <!-- Success feedback -->
    <FtpMessage v-if="deleteSuccess || toastMessage" severity="success" class="dt__toast">
      {{ toastMessage || 'Record verwijderd' }}
    </FtpMessage>

    <!-- Pagination -->
    <div v-if="!isLoading && totalRecords > 0" class="dt__pagination">
      <FtpButton label="← Vorige" variant="secondary" size="sm" :is-disabled="currentPage <= 1" @click="prevPage" />
      <span class="dt__page-info">
        Pagina {{ currentPage }} van {{ totalPages }}
        <span class="dt__page-total">({{ totalRecords }} records)</span>
      </span>
      <FtpButton label="Volgende →" variant="secondary" size="sm" :is-disabled="currentPage >= totalPages" @click="nextPage" />
    </div>
  </div>
</template>

<style scoped>
.dt {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

/* dt__views-bar styles removed per VDF-016 */

/* dt__view-switcher styles removed per VDF-016 */

/* View dropdown styles removed per VDF-016 */

.dt__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-s, 10px);
  width: 100%;
}

.dt__dialog-delete :deep(.button) {
  background: var(--feedback-error);
}

.dt__table-hint {
  text-align: center;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
}

.dt__hint-text {
  font-size: 0.8125rem;
  color: var(--text-subtle);
  font-style: italic;
}

.dt__bulk-bar {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel);
  border: 1px solid var(--intent-action-default);
  border-radius: var(--radius-rounded, 8px);
}

.dt__bulk-count {
  font-size: 0.8125rem;
  color: var(--text-default);
  font-weight: 600;
  margin-right: auto;
}

.dt__bulk-delete :deep(.button) {
  background: var(--feedback-error);
  border-color: var(--feedback-error);
}

.dt__th--checkbox,
.dt__td--checkbox {
  width: 40px;
  text-align: center;
  padding: var(--space-s, 10px) var(--space-xs, 6px);
}

.dt__row--selected {
  background: var(--intent-secondary-hover);
}

.dt__scroll {
  overflow-x: auto;
  border: 1px solid var(--border-subtle);
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
  color: var(--text-secondary);
  background: var(--surface-muted);
  border-bottom: 1px solid var(--border-default);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: color 0.15s;
  text-transform: capitalize;
}

.dt__th:hover {
  color: var(--text-default);
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
  transition: background-color 0.15s;
}

.dt__row:hover {
  background: var(--surface-panel);
}

.dt__row:not(:last-child) .dt__td {
  border-bottom: 1px solid var(--border-subtle);
}

.dt__td {
  padding: var(--space-s, 10px) var(--space-m, 16px);
  color: var(--text-default);
  white-space: nowrap;
}

.dt__td--integer,
.dt__td--float,
.dt__td--number {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dt__bool--true {
  color: var(--feedback-success);
}

.dt__bool--false {
  color: var(--text-subtle);
}

.dt__relation {
  color: var(--text-link);
}

.dt__file-thumb {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.dt__file-link {
  color: var(--text-link);
  text-decoration: none;
  font-size: 0.8125rem;
}

.dt__file-link:hover {
  text-decoration: underline;
}

/* ─── Inline editing ─── */
.dt__td--editable {
  position: relative;
  cursor: pointer;
}

.dt__td--editing {
  background: var(--surface-panel);
}

.dt__td--edit-error {
  box-shadow: inset 0 0 0 2px var(--feedback-error);
}

/* Read-only input - looks like normal table text */
.dt__inline-input--readonly {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  font: inherit;
  padding: 0;
  cursor: default;
  pointer-events: none;
}

.dt__inline-input--readonly:disabled {
  opacity: 1;
  color: inherit;
}

.dt__inline-input--readonly.dt__inline-select {
  appearance: none;
  cursor: default;
}

/* Active edit input */
.dt__inline-input--active {
  width: 100%;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--surface-panel);
  border: 1px solid var(--border-focus);
  outline: none;
  border-radius: var(--radius-default, 4px);
  color: var(--text-default);
  font-size: inherit;
  font-family: inherit;
  cursor: text;
}

.dt__inline-input--active:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2);
}

.dt__inline-input--active.dt__inline-select {
  appearance: none;
  cursor: pointer;
}

/* Legacy styles for backward compatibility - now unused */
.dt__inline-input {
  width: 100%;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  color: var(--text-default);
  font-size: inherit;
  font-family: inherit;
  outline: none;
  height: 28px;
  border-radius: var(--radius-default, 4px);
}

.dt__inline-input:focus {
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2);
}

.dt__inline-select {
  appearance: none;
  cursor: pointer;
}

.dt__inline-error {
  display: block;
  font-size: 0.6875rem;
  color: var(--feedback-error);
  margin-top: 1px;
  white-space: nowrap;
}

.dt__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-s, 10px);
  padding: var(--space-2xl, 68px);
  color: var(--text-muted);
}

.dt__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-2xl, 68px);
}

.dt__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl, 68px);
  color: var(--text-muted);
  font-size: 0.875rem;
}

.dt__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-m, 16px);
  padding: var(--space-s, 10px) 0;
}

.dt__page-info {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.dt__page-total {
  color: var(--text-muted);
}

.dt__th--actions {
  width: 80px;
}

.dt__td--actions {
  text-align: center;
  width: 80px;
}

.dt__actions-group {
  display: flex;
  gap: var(--space-2xs, 2px);
  align-items: center;
  justify-content: center;
}

.dt__edit-btn,
.dt__delete-btn {
  opacity: 0.4;
  transition: opacity 0.15s;
  min-width: auto;
  padding: var(--space-3xs, 2px) var(--space-2xs, 4px);
}

.dt__row:hover .dt__edit-btn,
.dt__row:hover .dt__delete-btn {
  opacity: 0.8;
}

.dt__edit-btn:hover,
.dt__delete-btn:hover {
  opacity: 1 !important;
}

.dt__edit-modal-content {
  padding: var(--space-s, 10px) 0;
}

.dt__edit-modal-content :deep(.data-form) {
  max-width: 100%;
}

.dt__edit-modal-content :deep(.data-form__actions) {
  margin-top: var(--space-m, 16px);
  padding-top: var(--space-s, 10px);
  border-top: 1px solid var(--border-subtle);
}

.dt__toast {
  position: fixed;
  bottom: var(--space-l, 24px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 1001;
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

/* ─── Status tag overrides ─── */
.dt__status-tag :deep(.tag) {
  background: var(--surface-panel) !important;
  color: var(--text-default) !important;
  border: 1px solid var(--border-default) !important;
}

/* Success/active status - green */
.dt__status-tag[data-value*="actief"] :deep(.tag),
.dt__status-tag[data-value*="active"] :deep(.tag),
.dt__status-tag[data-value*="succes"] :deep(.tag),
.dt__status-tag[data-value*="success"] :deep(.tag),
.dt__status-tag[data-value*="voltooid"] :deep(.tag),
.dt__status-tag[data-value*="completed"] :deep(.tag) {
  background: var(--feedback-success) !important;
  color: white !important;
  border-color: var(--feedback-success) !important;
}

/* Warning status - orange */
.dt__status-tag[data-value*="pending"] :deep(.tag),
.dt__status-tag[data-value*="wachten"] :deep(.tag),
.dt__status-tag[data-value*="review"] :deep(.tag),
.dt__status-tag[data-value*="concept"] :deep(.tag),
.dt__status-tag[data-value*="draft"] :deep(.tag) {
  background: var(--feedback-warning) !important;
  color: white !important;
  border-color: var(--feedback-warning) !important;
}

/* Error status - red */
.dt__status-tag[data-value*="error"] :deep(.tag),
.dt__status-tag[data-value*="fout"] :deep(.tag),
.dt__status-tag[data-value*="rejected"] :deep(.tag),
.dt__status-tag[data-value*="afgewezen"] :deep(.tag),
.dt__status-tag[data-value*="failed"] :deep(.tag),
.dt__status-tag[data-value*="mislukt"] :deep(.tag) {
  background: var(--feedback-error) !important;
  color: white !important;
  border-color: var(--feedback-error) !important;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  /* dt__views-bar mobile styles removed per VDF-016 */

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
}
</style>
