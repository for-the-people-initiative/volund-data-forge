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

const relationOptions = ref<Record<string, Array<{ id: string; label: string }>>>({})

watch(
  fields,
  (f) => {
    if (!f?.length || isEditMode.value) return
    const data: Record<string, unknown> = {}
    for (const field of f) {
      if (field.type === 'boolean') data[field.name] = false
      else data[field.name] = field.default ?? ''
    }
    formData.value = data
  },
  { immediate: true },
)

watch(
  () => props.recordId,
  async (id) => {
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
  },
  { immediate: true },
)

watch(
  fields,
  async (f) => {
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
  },
  { immediate: true },
)

// ─── File upload state ──────────────────────────────────────
const fileUploading = ref<Record<string, boolean>>({})
const fileMeta = ref<Record<string, { filename: string; mimetype: string }>>({})

async function handleFileUpload(fieldName: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileUploading.value[fieldName] = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    const result = await $fetch<{ path: string; filename: string; mimetype: string; size: number }>('/api/uploads', {
      method: 'POST',
      body: fd,
    })
    formData.value[fieldName] = result.path
    fileMeta.value[fieldName] = { filename: result.filename, mimetype: result.mimetype }
  } catch (err: any) {
    errors.value[fieldName] = err?.data?.error?.message ?? 'Upload mislukt'
  } finally {
    fileUploading.value[fieldName] = false
  }
}

watch(
  [fields, formData],
  () => {
    for (const field of fields.value) {
      if (field.type === 'file' && formData.value[field.name] && !fileMeta.value[field.name]) {
        const path = String(formData.value[field.name])
        const filename = path.split('/').pop() || 'bestand'
        const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
        const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        const mimetype = imageExts.includes(ext) ? `image/${ext.replace('.', '').replace('jpg', 'jpeg')}` : 'application/octet-stream'
        fileMeta.value[field.name] = { filename, mimetype }
      }
    }
  },
  { immediate: true, deep: true },
)

function validate(): boolean {
  const errs: Record<string, string> = {}
  for (const field of fields.value) {
    if (field.type === 'lookup' || field.type === 'computed') continue
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
  if (Object.keys(errs).length > 0) {
    nextTick(() => {
      const firstErrorField = Object.keys(errs)[0]
      const el = document.getElementById(fieldId(firstErrorField))
      el?.focus()
    })
  }
  return Object.keys(errs).length === 0
}

async function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  serverError.value = ''

  const payload: Record<string, unknown> = {}
  for (const field of fields.value) {
    if (field.type === 'lookup' || field.type === 'computed') continue
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
      // Only navigate when not in modal context
      const newId = record?.id
      if (newId && router.currentRoute.value.path.includes('/new')) {
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
  // Only navigate back if not in modal context
  if (!props.recordId || router.currentRoute.value.path.includes('/new')) {
    router.back()
  }
}

function fieldId(name: string) {
  return `df-${props.collection}-${name}`
}

function getSelectOptions(field: any) {
  return (field.options ?? []).map((opt: string) => ({ label: opt, value: opt }))
}
</script>

<template>
  <div class="data-form" v-if="schemaStatus === 'success'">
    <FtpMessage v-if="serverError" severity="error">
      {{ serverError }}
    </FtpMessage>

    <div v-if="loading" class="data-form__loading">
      <FtpProgressSpinner />
      <span>Laden...</span>
    </div>

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

        <!-- Computed: read-only display with calculator icon -->
        <div v-if="field.type === 'computed'" class="data-form__lookup">
          <span class="data-form__computed-icon" aria-hidden="true">🧮</span>
          {{ formData[field.name] ?? '—' }}
        </div>

        <!-- Lookup: read-only display -->
        <div v-else-if="field.type === 'lookup'" class="data-form__lookup">
          {{ formData[field.name] ?? '—' }}
        </div>

        <!-- Boolean: checkbox -->
        <div v-else-if="field.type === 'boolean'" class="data-form__toggle-wrap">
          <FtpCheckbox
            :id="fieldId(field.name)"
            :model-value="!!formData[field.name]"
            :is-invalid="!!errors[field.name]"
            :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
            @update:model-value="formData[field.name] = $event"
          />
        </div>

        <!-- Select: dropdown -->
        <FtpSelect
          v-else-if="field.type === 'select' && field.options?.length"
          :id="fieldId(field.name)"
          :model-value="(formData[field.name] as string) ?? ''"
          :options="getSelectOptions(field)"
          option-label="label"
          option-value="value"
          placeholder="Kies..."
          :is-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- Relation: RecordPicker -->
        <RecordPicker
          v-else-if="field.type === 'relation'"
          :collection="field.relation?.target ?? field.name"
          :model-value="(formData[field.name] as string | string[] | null) ?? null"
          :multiple="field.relation?.type === 'manyToMany'"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- Datetime -->
        <!-- Note: kept as native input type="datetime-local" — no FTP DateTimePicker with time support -->
        <input
          v-else-if="field.type === 'datetime'"
          :id="fieldId(field.name)"
          type="datetime-local"
          :value="formData[field.name] ?? ''"
          :required="field.required"
          :aria-required="field.required || undefined"
          :aria-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          class="data-form__native-input"
          @input="formData[field.name] = ($event.target as HTMLInputElement).value"
        />

        <!-- Number (integer) -->
        <FtpInputNumber
          v-else-if="field.type === 'integer'"
          :id="fieldId(field.name)"
          :model-value="formData[field.name] != null && formData[field.name] !== '' ? Number(formData[field.name]) : null"
          :step="1"
          :min-fraction-digits="0"
          :max-fraction-digits="0"
          :is-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- Number (float) -->
        <FtpInputNumber
          v-else-if="field.type === 'float'"
          :id="fieldId(field.name)"
          :model-value="formData[field.name] != null && formData[field.name] !== '' ? Number(formData[field.name]) : null"
          :step="0.01"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          :is-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- Email -->
        <FtpInputText
          v-else-if="field.type === 'email'"
          :id="fieldId(field.name)"
          type="email"
          :model-value="(formData[field.name] as string) ?? ''"
          :is-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          @update:model-value="formData[field.name] = $event"
        />

        <!-- File upload -->
        <!-- Note: kept as native input type="file" — no FTP FileUpload equivalent -->
        <div v-else-if="field.type === 'file'" class="data-form__file-wrap">
          <input
            :id="fieldId(field.name)"
            type="file"
            :aria-required="field.required || undefined"
            :aria-invalid="!!errors[field.name]"
            :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
            class="data-form__native-input data-form__file-input"
            @change="handleFileUpload(field.name, $event)"
          />
          <div v-if="fileUploading[field.name]" class="data-form__file-uploading">
            <FtpProgressSpinner /> Uploaden...
          </div>
          <div v-if="formData[field.name]" class="data-form__file-preview">
            <img
              v-if="fileMeta[field.name]?.mimetype?.startsWith('image/')"
              :src="String(formData[field.name])"
              :alt="fileMeta[field.name]?.filename || 'preview'"
              class="data-form__file-thumb"
            />
            <a v-else :href="String(formData[field.name])" target="_blank" class="data-form__file-link">
              📎 {{ fileMeta[field.name]?.filename || 'Bestand' }}
            </a>
          </div>
        </div>

        <!-- Text (default) -->
        <FtpInputText
          v-else
          :id="fieldId(field.name)"
          :model-value="(formData[field.name] as string) ?? ''"
          :is-invalid="!!errors[field.name]"
          :aria-describedby="errors[field.name] ? `${fieldId(field.name)}-err` : undefined"
          @update:model-value="formData[field.name] = $event"
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
        <FtpButton
          :label="submitting ? 'Bezig...' : isEditMode ? 'Opslaan' : 'Aanmaken'"
          variant="primary"
          :is-disabled="submitting"
          :is-loading="submitting"
          @click="handleSubmit"
        />
        <FtpButton
          label="Annuleren"
          variant="secondary"
          @click="handleCancel"
        />
      </div>
    </form>
  </div>

  <div v-else-if="schemaStatus === 'pending'" class="data-form__loading">
    <FtpProgressSpinner />
    <span>Schema laden...</span>
  </div>

  <FtpMessage v-else severity="error">Schema kon niet geladen worden.</FtpMessage>
</template>

<style scoped>
.data-form {
  max-width: 600px;
}

.data-form__loading {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  color: var(--text-muted);
  padding: var(--space-m);
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
  text-transform: capitalize;
}

.data-form__required {
  color: var(--feedback-error);
  margin-left: 2px;
}

.data-form__field :deep(.input-text),
.data-form__field :deep(.select),
.data-form__field :deep(.input-number) {
  width: 100%;
}

/* Native inputs for datetime-local and file (no FTP equivalent) */
.data-form__native-input {
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

.data-form__native-input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
}

.data-form__field--error .data-form__native-input {
  border-color: var(--feedback-error);
}

.data-form__lookup {
  padding: var(--space-xs) var(--space-s);
  background: var(--surface-muted);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-default);
  color: var(--text-secondary);
  font-size: 0.9375rem;
  font-style: italic;
}

.data-form__computed-icon {
  margin-right: var(--space-2xs, 4px);
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

.data-form__file-wrap {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.data-form__file-input {
  cursor: pointer;
}

.data-form__file-uploading {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.data-form__file-preview {
  margin-top: var(--space-2xs);
}

.data-form__file-thumb {
  max-width: 200px;
  max-height: 150px;
  border-radius: var(--radius-default);
  border: 1px solid var(--border-default);
  object-fit: cover;
}

.data-form__file-link {
  color: var(--text-link);
  text-decoration: none;
  font-size: 0.875rem;
}

.data-form__file-link:hover {
  text-decoration: underline;
}

@media (max-width: 767px) {
  .data-form {
    max-width: 100%;
  }

  .data-form__actions {
    flex-direction: column;
  }
}
</style>
