<script setup lang="ts">
/**
 * FilterBar — Per-column filters for DataTable.
 * Emits filter changes as a Record<string, FilterValue>.
 */

export interface FieldDef {
  name: string
  type: string
  label?: string
  options?: string[]
}

export interface FilterValue {
  operator: string
  value: unknown
}

const props = defineProps<{
  fields: FieldDef[]
  modelValue: Record<string, FilterValue>
}>()

const emit = defineEmits<{
  'update:modelValue': [filters: Record<string, FilterValue>]
  clear: []
}>()

const expanded = ref(true)

function getFilter(field: string): FilterValue | undefined {
  return props.modelValue[field]
}

// Local text input state for debouncing
const localText = ref<Record<string, string>>({})
let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

function updateFilter(field: string, filter: FilterValue | null) {
  const next = { ...props.modelValue }
  if (filter && filter.value !== '' && filter.value !== null && filter.value !== undefined) {
    next[field] = filter
  } else {
    delete next[field]
  }
  emit('update:modelValue', next)
}

function updateTextFilter(field: string, rawValue: string) {
  localText.value = { ...localText.value, [field]: rawValue }
  if (debounceTimers[field]) clearTimeout(debounceTimers[field])
  debounceTimers[field] = setTimeout(() => {
    updateFilter(field, rawValue ? { operator: 'like', value: `%${rawValue}%` } : null)
  }, 300)
}

function updateNumberFilter(field: string, rawValue: string) {
  localText.value = { ...localText.value, [field]: rawValue }
  if (debounceTimers[field]) clearTimeout(debounceTimers[field])
  debounceTimers[field] = setTimeout(() => {
    updateFilter(field, rawValue ? { operator: 'eq', value: Number(rawValue) } : null)
  }, 300)
}

function clearAll() {
  localText.value = {}
  emit('update:modelValue', {})
  emit('clear')
}

const activeCount = computed(() => Object.keys(props.modelValue).length)

function getTextValue(field: string): string {
  if (field in localText.value) return localText.value[field]
  const f = getFilter(field)
  if (!f) return ''
  // Strip % from like values for display
  const v = String(f.value ?? '')
  return v.replace(/^%|%$/g, '')
}

function getSelectValue(field: string): string {
  const f = getFilter(field)
  return f ? String(f.value ?? '') : ''
}

function getBoolValue(field: string): string {
  const f = getFilter(field)
  if (!f) return ''
  return String(f.value)
}

function getDateFrom(field: string): string {
  const f = getFilter(field)
  if (!f || f.operator !== 'between') return ''
  const arr = f.value as [string, string]
  return arr?.[0] ?? ''
}

function getDateTo(field: string): string {
  const f = getFilter(field)
  if (!f || f.operator !== 'between') return ''
  const arr = f.value as [string, string]
  return arr?.[1] ?? ''
}

function updateDateRange(field: string, from: string, to: string) {
  if (!from && !to) {
    updateFilter(field, null)
    return
  }
  updateFilter(field, {
    operator: 'between',
    value: [from || '1970-01-01', to || '2099-12-31'],
  })
}

const filterableFields = computed(() =>
  props.fields.filter(f => !['id', 'created_at', 'updated_at', 'json', 'relation'].includes(f.type) && !['id', 'created_at', 'updated_at'].includes(f.name))
)
</script>

<template>
  <div class="fb">
    <div class="fb__header">
      <button class="fb__toggle" @click="expanded = !expanded">
        <span class="fb__title">Filters</span>
        <span v-if="activeCount" class="fb__count">{{ activeCount }}</span>
        <span class="fb__chevron" :class="{ 'fb__chevron--open': expanded }">▾</span>
      </button>
      <button v-if="activeCount" class="fb__clear" @click="clearAll">
        Wis filters
      </button>
    </div>

    <div v-if="expanded" class="fb__grid">
      <div v-for="field in filterableFields" :key="field.name" class="fb__field">
        <label class="fb__label">{{ field.label ?? field.name }}</label>

        <!-- Select -->
        <select
          v-if="field.type === 'select' && field.options?.length"
          class="fb__input fb__select"
          :value="getSelectValue(field.name)"
          @change="updateFilter(field.name, ($event.target as HTMLSelectElement).value ? { operator: 'eq', value: ($event.target as HTMLSelectElement).value } : null)"
        >
          <option value="">Alle</option>
          <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <!-- Boolean -->
        <select
          v-else-if="field.type === 'boolean'"
          class="fb__input fb__select"
          :value="getBoolValue(field.name)"
          @change="updateFilter(field.name, ($event.target as HTMLSelectElement).value !== '' ? { operator: 'eq', value: ($event.target as HTMLSelectElement).value === 'true' } : null)"
        >
          <option value="">Alle</option>
          <option value="true">Waar</option>
          <option value="false">Onwaar</option>
        </select>

        <!-- Date -->
        <div v-else-if="field.type === 'date' || field.type === 'datetime'" class="fb__date-range">
          <input
            type="date"
            class="fb__input fb__date"
            :value="getDateFrom(field.name)"
            placeholder="Van"
            @input="updateDateRange(field.name, ($event.target as HTMLInputElement).value, getDateTo(field.name))"
          />
          <span class="fb__date-sep">–</span>
          <input
            type="date"
            class="fb__input fb__date"
            :value="getDateTo(field.name)"
            placeholder="Tot"
            @input="updateDateRange(field.name, getDateFrom(field.name), ($event.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Number -->
        <input
          v-else-if="['integer', 'float', 'number'].includes(field.type)"
          type="number"
          class="fb__input"
          :value="getTextValue(field.name)"
          :placeholder="`Filter ${field.label ?? field.name}...`"
          @input="updateNumberFilter(field.name, ($event.target as HTMLInputElement).value)"
        />

        <!-- Text (default) -->
        <input
          v-else
          type="text"
          class="fb__input"
          :value="getTextValue(field.name)"
          :placeholder="`Filter ${field.label ?? field.name}...`"
          @input="updateTextFilter(field.name, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fb {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
}

.fb__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fb__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  background: none;
  border: none;
  color: var(--text-default, #fff);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.fb__title {
  color: var(--text-secondary, #9ea5c2);
}

.fb__count {
  background: var(--intent-action-default, #f97316);
  color: #fff;
  font-size: 0.6875rem;
  padding: 1px 6px;
  border-radius: var(--radius-pill, 9999px);
  font-weight: 700;
}

.fb__chevron {
  color: var(--text-subtle, #525d8f);
  font-size: 0.75rem;
  transition: transform 0.15s;
}

.fb__chevron--open {
  transform: rotate(0deg);
}

.fb__chevron:not(.fb__chevron--open) {
  transform: rotate(-90deg);
}

.fb__clear {
  background: none;
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.75rem;
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.fb__clear:hover {
  color: var(--feedback-error, #ef4444);
  border-color: var(--feedback-error, #ef4444);
}

.fb__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-s, 10px);
  margin-top: var(--space-s, 10px);
}

.fb__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs, 2px);
}

.fb__label {
  font-size: 0.6875rem;
  color: var(--text-subtle, #525d8f);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.fb__input {
  padding: var(--space-3xs, 2px) var(--space-xs, 6px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.8125rem;
  outline: none;
  height: 30px;
}

.fb__input:focus {
  border-color: var(--border-focus, #f97316);
}

.fb__input::placeholder {
  color: var(--text-subtle, #525d8f);
}

.fb__select {
  appearance: none;
  cursor: pointer;
}

.fb__date-range {
  display: flex;
  align-items: center;
  gap: var(--space-3xs, 2px);
}

.fb__date {
  flex: 1;
  min-width: 0;
}

.fb__date-sep {
  color: var(--text-subtle, #525d8f);
  font-size: 0.75rem;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .fb__grid {
    grid-template-columns: 1fr;
  }
}
</style>
