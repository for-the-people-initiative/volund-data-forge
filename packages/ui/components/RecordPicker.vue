<script setup lang="ts">
/**
 * RecordPicker — modal search-and-select UI for relation fields.
 * Supports single (manyToOne) and multi (manyToMany) selection.
 */

const props = defineProps<{
  /** Target collection to pick records from */
  collection: string
  /** Current selected value(s) — id string or array of id strings */
  modelValue: string | string[] | null
  /** Allow multiple selection (manyToMany) */
  multiple?: boolean
  /** Placeholder text */
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const { listRecords } = useDataEngine()

const open = ref(false)
const search = ref('')
const allRecords = ref<Array<{ id: string; label: string }>>([])
const loading = ref(false)

// Normalize selected values to array
const selectedIds = computed<string[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

// Selected record objects (for chips display)
const selectedRecords = computed(
  () =>
    selectedIds.value
      .map((id) => allRecords.value.find((r) => r.id === id))
      .filter(Boolean) as Array<{ id: string; label: string }>,
)

// Filtered records based on search
const filteredRecords = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allRecords.value
  return allRecords.value.filter((r) => r.label.toLowerCase().includes(q))
})

// Load records when opened
async function loadRecords() {
  if (allRecords.value.length > 0) return // already loaded
  loading.value = true
  try {
    const result = await listRecords(props.collection, { limit: 100 })
    const records = (result as any)?.data ?? result ?? []
    allRecords.value = Array.isArray(records)
      ? records.map((r: any) => ({
          id: String(r.id),
          label: r.name ?? r.title ?? r.label ?? String(r.id),
        }))
      : []
  } catch {
    allRecords.value = []
  } finally {
    loading.value = false
  }
}

function openModal() {
  open.value = true
  search.value = ''
  loadRecords()
}

function closeModal() {
  open.value = false
}

function isSelected(id: string) {
  return selectedIds.value.includes(id)
}

function selectRecord(record: { id: string; label: string }) {
  if (props.multiple) {
    const current = [...selectedIds.value]
    const idx = current.indexOf(record.id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(record.id)
    }
    emit('update:modelValue', current)
  } else {
    emit('update:modelValue', record.id)
    closeModal()
  }
}

function removeSelected(id: string) {
  if (props.multiple) {
    emit(
      'update:modelValue',
      selectedIds.value.filter((v) => v !== id),
    )
  } else {
    emit('update:modelValue', null)
  }
}

// Close on Escape
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeModal()
}
</script>

<template>
  <div class="record-picker">
    <!-- Chips display + trigger -->
    <div class="record-picker__display" @click="openModal">
      <span v-for="rec in selectedRecords" :key="rec.id" class="record-picker__chip">
        {{ rec.label }}
        <button
          type="button"
          class="record-picker__chip-remove"
          aria-label="Verwijder"
          @click.stop="removeSelected(rec.id)"
        >
          ×
        </button>
      </span>
      <span v-if="!selectedRecords.length" class="record-picker__placeholder">
        {{ placeholder ?? `Kies ${collection}...` }}
      </span>
      <span class="record-picker__trigger-icon" aria-hidden="true">▾</span>
    </div>

    <!-- Modal overlay -->
    <Teleport to="body">
      <div
        v-if="open"
        class="record-picker__overlay"
        @click.self="closeModal"
        @keydown="handleKeydown"
      >
        <div class="record-picker__modal" role="dialog" aria-label="Record kiezen">
          <div class="record-picker__header">
            <h3 class="record-picker__title">{{ collection }}</h3>
            <button
              type="button"
              class="record-picker__close"
              @click="closeModal"
              aria-label="Sluiten"
            >
              ×
            </button>
          </div>

          <!-- Search -->
          <div class="record-picker__search-wrap">
            <input
              ref="searchInput"
              v-model="search"
              type="text"
              class="record-picker__search"
              placeholder="Zoeken..."
              autofocus
            />
          </div>

          <!-- Record list -->
          <div class="record-picker__list">
            <div v-if="loading" class="record-picker__empty">Laden...</div>
            <div v-else-if="!filteredRecords.length" class="record-picker__empty">
              Geen resultaten gevonden
            </div>
            <button
              v-for="rec in filteredRecords"
              v-else
              :key="rec.id"
              type="button"
              class="record-picker__item"
              :class="{ 'record-picker__item--selected': isSelected(rec.id) }"
              @click="selectRecord(rec)"
            >
              <span class="record-picker__item-label">{{ rec.label }}</span>
              <span v-if="isSelected(rec.id)" class="record-picker__item-check" aria-hidden="true"
                >✓</span
              >
            </button>
          </div>

          <!-- Footer -->
          <div class="record-picker__footer">
            <button
              type="button"
              class="record-picker__new-btn"
              disabled
              title="Binnenkort beschikbaar"
            >
              + Nieuw aanmaken
            </button>
            <button
              v-if="multiple"
              type="button"
              class="record-picker__done-btn"
              @click="closeModal"
            >
              Klaar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.record-picker__display {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2xs);
  min-height: 38px;
  padding: var(--space-2xs) var(--space-s);
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  cursor: pointer;
  transition: border-color 0.15s;
}

.record-picker__display:hover {
  border-color: var(--border-focus);
}

.record-picker__placeholder {
  color: var(--text-subtle);
  font-size: 0.9375rem;
}

.record-picker__trigger-icon {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: 0.75rem;
}

.record-picker__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: 2px var(--space-xs);
  background: var(--intent-action-default);
  color: var(--text-inverse);
  border-radius: var(--radius-pill, 999px);
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
}

.record-picker__chip-remove {
  all: unset;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.8;
  padding: 0 2px;
}

.record-picker__chip-remove:hover {
  opacity: 1;
}

/* Modal overlay */
.record-picker__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.record-picker__modal {
  background: var(--surface-elevated, var(--surface-panel));
  border-radius: var(--radius-default);
  width: 90%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.record-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s) var(--space-m);
  border-bottom: 1px solid var(--border-default);
}

.record-picker__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-default);
  text-transform: capitalize;
}

.record-picker__close {
  all: unset;
  cursor: pointer;
  font-size: 1.25rem;
  color: var(--text-muted);
  padding: var(--space-2xs);
  line-height: 1;
}

.record-picker__close:hover {
  color: var(--text-default);
}

.record-picker__search-wrap {
  padding: var(--space-s) var(--space-m);
}

.record-picker__search {
  width: 100%;
  padding: var(--space-xs) var(--space-s);
  background: var(--surface-panel);
  color: var(--text-default);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  font-size: 0.9375rem;
  font-family: inherit;
}

.record-picker__search:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.record-picker__search::placeholder {
  color: var(--text-subtle);
}

.record-picker__list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--space-xs);
  max-height: 320px;
}

.record-picker__empty {
  padding: var(--space-l) var(--space-m);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.record-picker__item {
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-xs) var(--space-s);
  border-radius: var(--radius-default);
  cursor: pointer;
  font-size: 0.9375rem;
  color: var(--text-default);
  box-sizing: border-box;
  transition: background 0.1s;
}

.record-picker__item:hover {
  background: var(--surface-hover, rgba(255, 255, 255, 0.05));
}

.record-picker__item--selected {
  background: var(--intent-action-default);
  color: var(--text-inverse);
}

.record-picker__item--selected:hover {
  background: var(--intent-action-hover);
}

.record-picker__item-check {
  font-size: 0.875rem;
  font-weight: bold;
}

.record-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s) var(--space-m);
  border-top: 1px solid var(--border-default);
}

.record-picker__new-btn {
  all: unset;
  cursor: not-allowed;
  font-size: 0.8125rem;
  color: var(--text-subtle);
  opacity: 0.6;
}

.record-picker__done-btn {
  padding: var(--space-2xs) var(--space-s);
  background: var(--intent-action-default);
  color: var(--text-inverse);
  border: none;
  border-radius: var(--radius-default);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.record-picker__done-btn:hover {
  background: var(--intent-action-hover);
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .record-picker__modal {
    width: 100%;
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
    border-radius: 0;
  }

  .record-picker__list {
    max-height: none;
    flex: 1;
  }
}
</style>
