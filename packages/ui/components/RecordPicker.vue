<script setup lang="ts">
/**
 * RecordPicker — modal search-and-select UI for relation fields.
 * Supports single (manyToOne) and multi (manyToMany) selection.
 */
import type { CollectionRecord } from '../types/collection-record'
import type { CollectionListResponse } from '../types/api-response'

const props = defineProps<{
  collection: string
  modelValue: string | string[] | null
  multiple?: boolean
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
const triggerRef = ref<HTMLElement | null>(null)

const selectedIds = computed<string[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const selectedRecords = computed(
  () =>
    selectedIds.value
      .map((id) => allRecords.value.find((r) => r.id === id))
      .filter(Boolean) as Array<{ id: string; label: string }>,
)

const filteredRecords = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return allRecords.value
  return allRecords.value.filter((r) => r.label.toLowerCase().includes(q))
})

async function loadRecords() {
  if (allRecords.value.length > 0) return
  loading.value = true
  try {
    const result = await listRecords(props.collection, { limit: 100 })
    const response = result as CollectionListResponse | CollectionRecord[]
    const records = Array.isArray(response) ? response : (response.data ?? [])
    allRecords.value = Array.isArray(records)
      ? records.map((r: CollectionRecord) => ({
          id: String(r.id),
          label: String(r.name ?? r.title ?? r.label ?? r.id),
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
  // Auto-focus search input when dialog opens
  nextTick(() => {
    const input = document.querySelector('.record-picker__search-wrap input') as HTMLInputElement
    input?.focus()
  })
}

function closeModal() {
  open.value = false
  nextTick(() => triggerRef.value?.focus())
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
</script>

<template>
  <div class="record-picker">
    <!-- Chips display + trigger -->
    <div ref="triggerRef" class="record-picker__display" tabindex="0" role="combobox" :aria-expanded="open" aria-haspopup="dialog" @click="openModal" @keydown.enter.prevent="openModal" @keydown.space.prevent="openModal">
      <span v-for="rec in selectedRecords" :key="rec.id" class="record-picker__chip">
        {{ rec.label }}
        <FtpButton
          label="×"
          variant="secondary"
          size="sm"
          class="record-picker__chip-remove"
          aria-label="Verwijder"
          @click.stop="removeSelected(rec.id)"
        />
      </span>
      <span v-if="!selectedRecords.length" class="record-picker__placeholder">
        {{ placeholder ?? `Kies ${collection}...` }}
      </span>
      <span class="record-picker__trigger-icon" aria-hidden="true">▾</span>
    </div>

    <!-- Modal -->
    <FtpDialog
      :visible="open"
      :header="collection"
      :modal="true"
      size="md"
      @update:visible="!$event && closeModal()"
    >
      <!-- Search -->
      <div class="record-picker__search-wrap">
        <FtpInputText
          v-model="search"
          placeholder="Zoeken..."
        />
      </div>

      <!-- Record list -->
      <div class="record-picker__list">
        <div v-if="loading" class="record-picker__empty">Laden...</div>
        <div v-else-if="!filteredRecords.length" class="record-picker__empty">
          Geen resultaten gevonden
        </div>
        <FtpButton
          v-for="rec in filteredRecords"
          v-else
          :key="rec.id"
          :label="rec.label"
          :variant="isSelected(rec.id) ? 'primary' : 'secondary'"
          class="record-picker__item"
          @click="selectRecord(rec)"
        >
          <span class="record-picker__item-label">{{ rec.label }}</span>
          <span v-if="isSelected(rec.id)" class="record-picker__item-check" aria-hidden="true">✓</span>
        </FtpButton>
      </div>

      <template #footer>
        <div class="record-picker__footer">
          <FtpButton
            label="+ Nieuw aanmaken"
            variant="secondary"
            size="sm"
            :is-disabled="true"
            title="Binnenkort beschikbaar"
          />
          <FtpButton
            v-if="multiple"
            label="Klaar"
            variant="primary"
            size="sm"
            @click="closeModal"
          />
        </div>
      </template>
    </FtpDialog>
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

.record-picker__chip-remove :deep(.button) {
  all: unset;
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.8;
  padding: 0 2px;
}

.record-picker__chip-remove :deep(.button:hover) {
  opacity: 1;
}

.record-picker__search-wrap {
  margin-bottom: var(--space-s);
}

.record-picker__search-wrap :deep(.input-text) {
  width: 100%;
}

.record-picker__list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.record-picker__empty {
  padding: var(--space-l) var(--space-m);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.record-picker__item {
  width: 100%;
}

.record-picker__item :deep(.button) {
  width: 100%;
  display: flex;
  justify-content: space-between;
  text-align: left;
}

.record-picker__item-check {
  font-size: 0.875rem;
  font-weight: bold;
}

.record-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.record-picker__display:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

@media (max-width: 767px) {
  .record-picker__list {
    max-height: none;
    flex: 1;
  }
}
</style>
