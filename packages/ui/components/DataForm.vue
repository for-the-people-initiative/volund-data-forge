<script setup lang="ts">
/**
 * Schema-driven form component.
 * Renders form fields based on the collection schema.
 * Supports create mode (empty) and edit mode (pre-filled by recordId).
 */

const props = defineProps<{
  collection: string
  recordId?: string
}>()

const emit = defineEmits<{
  success: [record: Record<string, unknown>]
  cancel: []
}>()

const router = useRouter()
const { getRecord, createRecord, updateRecord, listRecords } = useDataEngine()
const { fields, status: schemaStatus } = useSchema(props.collection)

const isEditMode = computed(() => !!props.recordId)
const formData = ref<Record<string, unknown>>({})
const errors = ref<Record<string, string>>({})
const serverError = ref('')
const submitting = ref(false)
const loading = ref(false)

// Relation options cache: { fieldName: [{ id, label }] }
const relationOptions = ref<Record<string, Array<{ id: string; label: string }>>>({})

// Initialize form data from schema defaults
watch(fields, (f) => {
  if (!f?.length || isEditMode.value) return
  const data: Record<string, unknown> = {}
  for (const field of f) {
    if (field.type === 'boolean') data[field.name] = false
    else data[field.name] = field.default ?? ''
  }
  formData.value = data
}, { immediate: true })

// Load record data in edit mode
watch(() => props.recordId, async (id) => {
  if (!id) return
  loading.value = true
  try {
    const raw = await getRecord(props.collection, id)
    const record = ((raw as any)?.data ?? raw) as Record<string, unknown>
    formData.value = { ...record }
  } catch (err: any) {
    serverError.value = err?.data?.error?.message ?? err?.message ?? 'Record laden mislukt'
  } finally {
    loading.value = false
  }
}, { immediate: true })

// Load relation options for relation fields
watch(fields, async (f) => {
  if (!f?.length) return
  for (const field of f) {
    if (field.type === 'relation' && field.relation?.target) {
      try {
        const result = await listRecords(field.relation.target, { limit: 100 })
        const records = (result as any)?.data ?? result ?? []
        relationOptions.value[field.name] = Array.isArray(records)
          ? records.map((r: any) => ({
              id: String(r.id),
              label: r.name ?? r.title ?? r.label ?? String(r.id),
            }))
          : []
      } catch {
        relationOptions.value[field.name] = []
      }
    }
  }
}, { immediate: true })

function validate(): boolean {
  const errs: Record<string, string> = {}
  for (const field of fields.value) {
    if (field.type === 'lookup') continue
    const val = formData.value[field.name]
    if (field.required && (val === '' || val === null || val === undefined)) {
      errs[field.name] = `${field.label ?? field.name} is verplicht`
      continue
    }
    if (val !== '' && val !== null && val !== undefined) {
      if ((field.type === 'integer' || field.type === 'float') && isNaN(Number(val))) {
        errs[field.name] = `${field.label ?? field.name} moet een getal zijn`
      }
      if (field.type === 'email' && typeof val === 'string' && val.length > 0) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          errs[field.name] = 'Ongeldig e-mailadres'
        }
      }
    }
  }
  errors.value = errs
  return Object.keys(errs).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  serverError.value = ''

  const payload: Record<string, unknown> = {}
  for (const field of fields.value) {
    if (field.type === 'lookup') continue
    let val = formData.value[field.name]
    if (field.type === 'integer' && val !== '' && val !== null) val = parseInt(String(val), 10)
    if (field.type === 'float' && val !== '' && val !== null) val = parseFloat(String(val))
    payload[field.name] = val
  }

  try {
    if (isEditMode.value && props.recordId) {
      const result = await updateRecord(props.collection, props.recordId, payload)
      const record = ((result as any)?.data ?? result) as Record<string, unknown>
      emit('success', record ?? payload)
    } else {
      const result = await createRecord(props.collection, payload)
      const record = ((result as any)?.data ?? result) as Record<string, unknown>
      emit('success', record ?? payload)
      const newId = record?.id
      if (newId) {
        router.push(`/collections/${props.collection}/${newId}`)
      }
    }
  } catch (err: any) {
    serverError.value = err?.data?.error?.message ?? err?.message ?? 'Opslaan mislukt'
  } finally {
    submitting.value = false
  }
}

function handleCancel() {
  emit('cancel')
  router.back()
}

function fieldId(name: string) {
  return `df-${props.collection}-${name}`
}
</script>

<template>
  <div class="data-form" v-if="schemaStatus === 'success'">
    <div v-if="serverError" class="data-form__server-error" role="alert">
      {{ serverError }}
    </div>

    <div v-if="loading" class="data-form__loading">Laden...</div>

    <form v-else @submit.prevent="handleSubmit" novalidate>
      <div
        v-for="field in fields"
        :key="field.name"
        class="data-form__field"
        :class="{ 'data-form__field--error': errors[field.name] }"
      >
        <label :for="fieldId(field.name)" class="data-form__label">
          {{ field.label ?? field.name }}
          <span v-if="field.required" class="data-form__required" aria-label="verplicht">*</span>
        </label>

        <!-- Lookup: read-only display -->
        <div v-if="field.type === 'lookup'" class="data-form__lookup">
          {{ formData[field.name] ?? '—' }}
        </div>

        <!-- Boolean: toggle/checkbox -->
        <div v-else-if="field.type === 'boolean'" class="data-form__toggle-wrap">
          <input
            :id="fieldId(field.name)"
            type="checkbox"
            :checked="!!formData[field.name]"
            :aria-invalid="!!errors[field.name]"
            :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
            class="data-form__checkbox"
            @change="formData[field.name] = ($event.target as HTMLInputElement).checked"
          />
        </div>

        <!-- Select: dropdown -->
        <select
          v-else-if="field.type === 'select' && field.options?.length"
          :id="fieldId(field.name)"
          :value="formData[field.name] ?? ''"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__select"
          @change="formData[field.name] = ($event.target as HTMLSelectElement).value"
        >
          <option value="" disabled>Kies...</option>
          <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
        </select>

        <!-- Relation: RecordPicker -->
        <RecordPicker
          v-else-if="field.type === 'relation'"
          :collection="field.relation?.target ?? field.name"
          :model-value="(formData[field.name] as string | string[] | null) ?? null"
          :multiple="field.relation?.type === 'manyToMany'"
          :placeholder="`Kies ${field.relation?.target ?? field.name}...`"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- Datetime -->
        <input
          v-else-if="field.type === 'datetime'"
          :id="fieldId(field.name)"
          type="datetime-local"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Number (integer) -->
        <input
          v-else-if="field.type === 'integer'"
          :id="fieldId(field.name)"
          type="number"
          step="1"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Number (float) -->
        <input
          v-else-if="field.type === 'float'"
          :id="fieldId(field.name)"
          type="number"
          step="0.01"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Email -->
        <input
          v-else-if="field.type === 'email'"
          :id="fieldId(field.name)"
          type="email"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :placeholder="field.label ?? field.name"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Text (default) -->
        <input
          v-else
          :id="fieldId(field.name)"
          type="text"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :placeholder="field.label ?? field.name"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Inline error -->
        <p
          v-if="errors[field.name]"
          :id="`${fieldId(field.name)}-err`"
          class="data-form__error"
          role="alert"
        >
          {{ errors[field.name] }}
        </p>
      </div>

      <div class="data-form__actions">
        <button type="submit" class="data-form__btn data-form__btn--primary" :disabled="submitting">
          {{ submitting ? 'Bezig...' : (isEditMode ? 'Opslaan' : 'Aanmaken') }}
        </button>
        <button type="button" class="data-form__btn data-form__btn--secondary" @click="handleCancel">
          Annuleren
        </button>
      </div>
    </form>
  </div>

  <div v-else-if="schemaStatus === 'pending'" class="data-form__loading">
    Schema laden...
  </div>

  <div v-else class="data-form__server-error" role="alert">
    Schema kon niet geladen worden.
  </div>
</template>

<style scoped>
.data-form {
  max-width: 600px;
}

.data-form__loading {
  color: var(--text-muted);
  padding: var(--space-m);
}

.data-form__server-error {
  background: var(--feedback-errorSubtle);
  color: var(--feedback-errorEmphasis);
  padding: var(--space-s) var(--space-m);
  border-radius: var(--radius-default);
  margin-bottom: var(--space-m);
}

.data-form__field {
  margin-bottom: var(--space-m);
}

.data-form__label {
  display: block;
  margin-bottom: var(--space-2xs);
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 500;
}

.data-form__required {
  color: var(--feedback-error);
  margin-left: 2px;
}

.data-form__input,
.data-form__select {
  width: 100%;
  padding: var(--space-xs) var(--space-s);
  background: var(--surface-panel);
  color: var(--text-default);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.15s;
}

.data-form__input:focus,
.data-form__select:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.data-form__field--error .data-form__input,
.data-form__field--error .data-form__select {
  border-color: var(--feedback-error);
}

.data-form__input::placeholder {
  color: var(--text-subtle);
}

.data-form__select option {
  background: var(--surface-elevated);
  color: var(--text-default);
}

.data-form__checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--intent-action-default);
  cursor: pointer;
}

.data-form__lookup {
  padding: var(--space-xs) var(--space-s);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.9375rem;
  font-style: italic;
}

.data-form__toggle-wrap {
  padding-top: var(--space-2xs);
}

.data-form__error {
  color: var(--feedback-errorEmphasis);
  font-size: 0.8125rem;
  margin: var(--space-2xs) 0 0;
}

.data-form__actions {
  display: flex;
  gap: var(--space-s);
  margin-top: var(--space-l);
}

.data-form__btn {
  padding: var(--space-xs) var(--space-m);
  border-radius: var(--radius-default);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
}

.data-form__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.data-form__btn--primary {
  background: var(--intent-action-default);
  color: var(--text-inverse);
}

.data-form__btn--primary:hover:not(:disabled) {
  background: var(--intent-action-hover);
}

.data-form__btn--primary:active:not(:disabled) {
  background: var(--intent-action-active);
}

.data-form__btn--secondary {
  background: var(--intent-secondary-default);
  color: var(--text-secondary);
  border: 1px solid var(--intent-secondary-border);
}

.data-form__btn--secondary:hover {
  background: var(--intent-secondary-hover);
}

@media (max-width: 767px) {
  .data-form {
    max-width: 100%;
  }

  .data-form__actions {
    flex-direction: column;
  }

  .data-form__btn {
    width: 100%;
    text-align: center;
  }
}
</style>
