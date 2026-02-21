<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

interface Webhook {
  id: number
  collection: string
  event: string
  url: string
  secret: string
  active: boolean | number
  created_at: string
}

const { data: webhooks, refresh } = useFetch<Webhook[]>('/api/webhooks', {
  default: () => [],
})

const { data: collections } = useFetch<Array<{ name: string }>>('/api/schema', {
  default: () => [],
})

const form = reactive({
  collection: '',
  event: 'all',
  url: '',
  secret: '',
})

const collectionOptions = computed(() => [
  { label: 'Alle collecties', value: '*' },
  ...(collections.value ?? []).map((col) => ({ label: col.name, value: col.name })),
])

const eventOptions = [
  { value: 'all', label: 'Alle events' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
]

const submitting = ref(false)

async function addWebhook() {
  if (!form.collection || !form.url || !form.secret) return
  submitting.value = true
  try {
    await $fetch('/api/webhooks', {
      method: 'POST',
      body: { ...form },
    })
    form.collection = ''
    form.event = 'all'
    form.url = ''
    form.secret = ''
    await refresh()
  } finally {
    submitting.value = false
  }
}

async function removeWebhook(id: number) {
  await $fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
  await refresh()
}

async function toggleActive(wh: Webhook) {
  const newActive = !(wh.active === true || wh.active === 1)
  await $fetch(`/api/webhooks/${wh.id}`, {
    method: 'PATCH',
    body: { active: newActive },
  })
  await refresh()
}

function isActive(wh: Webhook): boolean {
  return wh.active === true || wh.active === 1
}
</script>

<template>
  <div class="webhooks-page">
    <h1>🔔 Webhooks</h1>
    <p class="webhooks-page__desc">
      Registreer webhooks om HTTP callbacks te ontvangen bij CRUD events.
    </p>

    <!-- Form -->
    <FtpCard class="webhooks-form-card">
      <form class="webhooks-form" @submit.prevent="addWebhook">
        <div class="webhooks-form__row">
          <div class="webhooks-form__field">
            <span class="webhooks-form__label">Collectie</span>
            <FtpSelect
              v-model="form.collection"
              :options="collectionOptions"
              option-label="label"
              option-value="value"
            />
          </div>

          <div class="webhooks-form__field">
            <span class="webhooks-form__label">Event</span>
            <FtpSelect
              v-model="form.event"
              :options="eventOptions"
              option-label="label"
              option-value="value"
            />
          </div>
        </div>

        <div class="webhooks-form__field">
          <span class="webhooks-form__label">URL</span>
          <FtpInputText v-model="form.url" />
        </div>

        <div class="webhooks-form__field">
          <span class="webhooks-form__label">Secret</span>
          <FtpInputText v-model="form.secret" />
        </div>

        <FtpButton
          :label="submitting ? 'Bezig…' : '+ Webhook toevoegen'"
          variant="primary"
          :is-disabled="submitting"
          @click="addWebhook"
        />
      </form>
    </FtpCard>

    <!-- List -->
    <div class="webhooks-list">
      <div v-if="!webhooks?.length" class="webhooks-list__empty">
        Geen webhooks geregistreerd.
      </div>
      <div v-for="wh in webhooks" :key="wh.id" class="webhooks-list__item">
        <div class="webhooks-list__info">
          <div class="webhooks-list__meta">
            <FtpTag :value="wh.collection" />
            <FtpTag :value="wh.event" color="info" />
            <FtpTag
              :value="isActive(wh) ? 'Actief' : 'Inactief'"
              :color="isActive(wh) ? 'success' : 'danger'"
            />
          </div>
          <div class="webhooks-list__url">{{ wh.url }}</div>
        </div>
        <div class="webhooks-list__actions">
          <FtpButton
            :label="isActive(wh) ? '⏸️' : '▶️'"
            variant="secondary"
            size="sm"
            :title="isActive(wh) ? 'Deactiveren' : 'Activeren'"
            @click="toggleActive(wh)"
          />
          <FtpButton
            label="🗑️"
            variant="secondary"
            size="sm"
            title="Verwijderen"
            @click="removeWebhook(wh.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.webhooks-page {
  max-width: 720px;
}

.webhooks-page h1 {
  margin: 0 0 var(--space-xs, 6px);
  font-size: 1.5rem;
  color: var(--text-heading);
}

.webhooks-page__desc {
  color: var(--text-secondary);
  margin: 0 0 var(--space-l, 28px);
  font-size: 0.875rem;
}

.webhooks-form-card {
  margin-bottom: var(--space-l, 28px);
}

.webhooks-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.webhooks-form__row {
  display: flex;
  gap: var(--space-s, 10px);
}

.webhooks-form__row > * {
  flex: 1;
}

.webhooks-form__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.webhooks-form__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.webhooks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 6px);
}

.webhooks-list__empty {
  color: var(--text-secondary);
  font-size: 0.875rem;
  padding: var(--space-m, 16px);
  text-align: center;
}

.webhooks-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
}

.webhooks-list__info {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
  min-width: 0;
}

.webhooks-list__meta {
  display: flex;
  gap: var(--space-xs, 6px);
  flex-wrap: wrap;
}

.webhooks-list__url {
  font-size: 0.8rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhooks-list__actions {
  display: flex;
  gap: var(--space-xs, 6px);
  flex-shrink: 0;
}
</style>
