<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{
  schema: CollectionSchema
}>()

const emit = defineEmits<{
  saved: []
}>()

const apiEnabled = ref(props.schema.api?.enabled !== false)
const operations = ref({
  list: props.schema.api?.operations?.list !== false,
  read: props.schema.api?.operations?.read !== false,
  create: props.schema.api?.operations?.create !== false,
  update: props.schema.api?.operations?.update !== false,
  delete: props.schema.api?.operations?.delete !== false,
})
const hiddenFields = ref<Set<string>>(new Set(props.schema.api?.hiddenFields ?? []))
const saving = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

watch(() => props.schema, (s) => {
  apiEnabled.value = s.api?.enabled !== false
  operations.value = {
    list: s.api?.operations?.list !== false,
    read: s.api?.operations?.read !== false,
    create: s.api?.operations?.create !== false,
    update: s.api?.operations?.update !== false,
    delete: s.api?.operations?.delete !== false,
  }
  hiddenFields.value = new Set(s.api?.hiddenFields ?? [])
}, { deep: true })

function toggleField(fieldName: string) {
  if (hiddenFields.value.has(fieldName)) {
    hiddenFields.value.delete(fieldName)
  } else {
    hiddenFields.value.add(fieldName)
  }
  // Force reactivity
  hiddenFields.value = new Set(hiddenFields.value)
}

const operationLabels: Record<string, string> = {
  list: '📋 Ophalen (GET lijst)',
  read: '🔍 Lezen (GET enkel)',
  create: '➕ Aanmaken (POST)',
  update: '✏️ Bijwerken (PUT)',
  delete: '🗑️ Verwijderen (DELETE)',
}

async function save() {
  saving.value = true
  feedback.value = null
  try {
    const apiConfig = {
      enabled: apiEnabled.value,
      operations: { ...operations.value },
      hiddenFields: [...hiddenFields.value],
    }

    const body = {
      ...props.schema,
      api: apiConfig,
    }

    const res = await $fetch(`/api/schema/${props.schema.name}`, {
      method: 'PUT',
      body,
    })

    const resObj = res as Record<string, unknown> | null
    const resError = resObj?.error as { message: string } | undefined
    if (resError) {
      feedback.value = { type: 'error', message: resError.message }
    } else {
      feedback.value = { type: 'success', message: 'API configuratie opgeslagen!' }
      emit('saved')
    }
  } catch (err: unknown) {
    feedback.value = { type: 'error', message: err instanceof Error ? ((err as Error & { data?: { error?: { message: string } } }).data?.error?.message || err.message) : 'Opslaan mislukt' }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="api-surface">
    <h3 class="api-surface__title">🌐 API Configuratie</h3>

    <Transition name="api-feedback">
      <FtpMessage
        v-if="feedback"
        :severity="feedback.type === 'success' ? 'success' : 'error'"
        :closable="true"
        @close="feedback = null"
      >
        {{ feedback.message }}
      </FtpMessage>
    </Transition>

    <!-- API enabled toggle -->
    <div class="api-surface__section">
      <label class="api-surface__toggle">
        <input type="checkbox" v-model="apiEnabled" />
        <span>API ingeschakeld</span>
      </label>
      <p class="api-surface__hint">Schakel uit om deze collectie volledig te verbergen in de API</p>
    </div>

    <!-- Operations -->
    <div class="api-surface__section" v-if="apiEnabled">
      <h4 class="api-surface__subtitle">Operaties</h4>
      <div class="api-surface__ops">
        <label
          v-for="(label, key) in operationLabels"
          :key="key"
          class="api-surface__toggle"
        >
          <input type="checkbox" v-model="operations[key as keyof typeof operations]" />
          <span>{{ label }}</span>
        </label>
      </div>
    </div>

    <!-- Field visibility -->
    <div class="api-surface__section" v-if="apiEnabled">
      <h4 class="api-surface__subtitle">Veld zichtbaarheid</h4>
      <p class="api-surface__hint">Vink uit om velden te verbergen in API responses en OpenAPI spec</p>
      <div class="api-surface__fields">
        <label
          v-for="field in schema.fields"
          :key="field.name"
          class="api-surface__toggle"
        >
          <input
            type="checkbox"
            :checked="!hiddenFields.has(field.name)"
            @change="toggleField(field.name)"
          />
          <span>{{ field.name }} <span class="api-surface__field-type">({{ field.type }})</span></span>
        </label>
      </div>
    </div>

    <!-- Save -->
    <div class="api-surface__actions">
      <FtpButton
        label="💾 API configuratie opslaan"
        variant="primary"
        :is-disabled="saving"
        @click="save"
      />
    </div>
  </div>
</template>

<style scoped>
.api-surface {
  background: var(--surface-card, #0d1117);
  border: 1px solid var(--border-default, #30363d);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-l, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.api-surface__title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary, #e6edf3);
}

.api-surface__subtitle {
  margin: 0 0 var(--space-xs, 6px) 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #8b949e);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.api-surface__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 6px);
}

.api-surface__hint {
  font-size: 0.75rem;
  color: var(--text-secondary, #8b949e);
  margin: 0;
}

.api-surface__ops,
.api-surface__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.api-surface__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 8px);
  cursor: pointer;
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  border-radius: var(--radius-default, 4px);
  color: var(--text-primary, #e6edf3);
  font-size: 0.85rem;
}

.api-surface__toggle:hover {
  background: var(--surface-hover, rgba(255, 255, 255, 0.05));
}

.api-surface__toggle input[type="checkbox"] {
  accent-color: var(--intent-action-default, #58a6ff);
  width: 16px;
  height: 16px;
}

.api-surface__field-type {
  color: var(--text-secondary, #8b949e);
  font-size: 0.75rem;
}

.api-surface__actions {
  padding-top: var(--space-s, 10px);
}

.api-feedback-enter-active,
.api-feedback-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.api-feedback-enter-from,
.api-feedback-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
