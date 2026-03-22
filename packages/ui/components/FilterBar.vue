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
  props.fields.filter(
    (f) =>
      !['id', 'created_at', 'updated_at', 'json', 'relation'].includes(f.type) &&
      !['id', 'created_at', 'updated_at'].includes(f.name),
  ),
)

// Build select options for FtpSelect
function buildSelectOptions(options: string[]): Array<{ label: string; value: string }> {
  return [{ label: 'Alle', value: '' }, ...options.map((opt) => ({ label: opt, value: opt }))]
}

const boolOptions = [
  { label: 'Alle', value: '' },
  { label: 'Waar', value: 'true' },
  { label: 'Onwaar', value: 'false' },
]
</script>

<template>
  <FtpPanel class="fb" :toggleable="true">
    <template #header>
      <div class="fb__header">
        <span class="fb__title" @click="expanded = !expanded">
          Filters
          <FtpBadge v-if="activeCount" :value="String(activeCount)" severity="warn" />
        </span>
        <FtpButton v-if="activeCount" label="Wis filters" variant="secondary" size="sm" @click.stop="clearAll" />
      </div>
    </template>

    <div class="fb__grid">
      <div v-for="field in filterableFields" :key="field.name" class="fb__field">
        <label :for="`fb-${field.name}`" class="fb__label">{{ field.label ?? field.name }}</label>

        <!-- Select -->
        <FtpSelect
          v-if="field.type === 'select' && field.options?.length"
          :id="`fb-${field.name}`"
          :model-value="getSelectValue(field.name)"
          :options="buildSelectOptions(field.options!)"
          @update:model-value="
            updateFilter(
              field.name,
              $event ? { operator: 'eq', value: $event } : null,
            )
          "
        />

        <!-- Boolean -->
        <FtpSelect
          v-else-if="field.type === 'boolean'"
          :id="`fb-${field.name}`"
          :model-value="getBoolValue(field.name)"
          :options="boolOptions"
          @update:model-value="
            updateFilter(
              field.name,
              $event !== '' ? { operator: 'eq', value: $event === 'true' } : null,
            )
          "
        />

        <!-- Date -->
        <div v-else-if="field.type === 'date' || field.type === 'datetime'" class="fb__date-range">
          <label :for="`fb-${field.name}-from`" class="sr-only">{{ field.label ?? field.name }} van</label>
          <input
            :id="`fb-${field.name}-from`"
            type="date"
            class="fb__date-input"
            :value="getDateFrom(field.name)"
            @input="
              updateDateRange(
                field.name,
                ($event.target as HTMLInputElement).value,
                getDateTo(field.name),
              )
            "
          />
          <span class="fb__date-sep" aria-hidden="true">–</span>
          <label :for="`fb-${field.name}-to`" class="sr-only">{{ field.label ?? field.name }} tot</label>
          <input
            :id="`fb-${field.name}-to`"
            type="date"
            class="fb__date-input"
            :value="getDateTo(field.name)"
            @input="
              updateDateRange(
                field.name,
                getDateFrom(field.name),
                ($event.target as HTMLInputElement).value,
              )
            "
          />
        </div>

        <!-- Number -->
        <FtpInputText
          v-else-if="['integer', 'float', 'number'].includes(field.type)"
          :id="`fb-${field.name}`"
          :model-value="getTextValue(field.name)"
          @update:model-value="updateNumberFilter(field.name, $event)"
        />

        <!-- Text (default) -->
        <FtpInputText
          v-else
          :id="`fb-${field.name}`"
          :model-value="getTextValue(field.name)"
          @update:model-value="updateTextFilter(field.name, $event)"
        />
      </div>
    </div>
  </FtpPanel>
</template>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;

.fb__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.fb__title {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-secondary);
  font-size: var(--text-sm, 0.875rem);
  font-weight: 600;
  cursor: pointer;
}

.fb__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-s);
}

.fb__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}

.fb__label {
  font-size: 0.6875rem;
  color: var(--text-subtle);
  text-transform: capitalize;
  letter-spacing: 0.03em;
}

.fb__date-range {
  display: flex;
  align-items: center;
  gap: var(--space-3xs);
}

/* Native date input — no FTP equivalent */
.fb__date-input {
  flex: 1;
  min-width: 0;
  padding: var(--space-3xs) var(--space-xs);
  background: var(--surface-panel);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  color: var(--text-default);
  font-size: var(--text-sm, 0.8125rem);
  outline: none;
  height: 30px;
}

/* Override FTP component styles for panel context */
.fb__field :deep(.input-text),
.fb__field :deep(.input-text input),
.fb__field :deep(.select-wrapper),
.fb__field :deep(.select-wrapper .select) {
  background: var(--surface-panel);
  color: var(--text-default);
}

.fb__field :deep(.input-text::placeholder),
.fb__field :deep(.input-text input::placeholder) {
  color: var(--text-subtle);
}

.fb__date-input:focus {
  border-color: var(--border-focus);
}

.fb__date-sep {
  color: var(--text-subtle);
  font-size: 0.75rem;
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

@include breakpoint-to(phone) {
  .fb__grid {
    grid-template-columns: 1fr;
  }
}
</style>
