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
    <form class="webhooks-form" @submit.prevent="addWebhook">
      <div class="webhooks-form__row">
        <label class="webhooks-form__field">
          <span>Collectie</span>
          <select v-model="form.collection" required>
            <option value="" disabled>Kies collectie…</option>
            <option value="*">Alle collecties</option>
            <option v-for="col in collections" :key="col.name" :value="col.name">
              {{ col.name }}
            </option>
          </select>
        </label>

        <label class="webhooks-form__field">
          <span>Event</span>
          <select v-model="form.event" required>
            <option v-for="opt in eventOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="webhooks-form__field">
        <span>URL</span>
        <input v-model="form.url" type="url" placeholder="https://example.com/webhook" required />
      </label>

      <label class="webhooks-form__field">
        <span>Secret</span>
        <input v-model="form.secret" type="text" placeholder="Geheim voor HMAC signature" required />
      </label>

      <button type="submit" class="webhooks-form__submit" :disabled="submitting">
        {{ submitting ? 'Bezig…' : '+ Webhook toevoegen' }}
      </button>
    </form>

    <!-- List -->
    <div class="webhooks-list">
      <div v-if="!webhooks?.length" class="webhooks-list__empty">
        Geen webhooks geregistreerd.
      </div>
      <div v-for="wh in webhooks" :key="wh.id" class="webhooks-list__item">
        <div class="webhooks-list__info">
          <div class="webhooks-list__meta">
            <span class="webhooks-list__badge">{{ wh.collection }}</span>
            <span class="webhooks-list__badge webhooks-list__badge--event">{{ wh.event }}</span>
            <span
              class="webhooks-list__badge"
              :class="isActive(wh) ? 'webhooks-list__badge--active' : 'webhooks-list__badge--inactive'"
            >
              {{ isActive(wh) ? 'Actief' : 'Inactief' }}
            </span>
          </div>
          <div class="webhooks-list__url">{{ wh.url }}</div>
        </div>
        <div class="webhooks-list__actions">
          <button
            class="webhooks-list__btn webhooks-list__btn--toggle"
            @click="toggleActive(wh)"
            :title="isActive(wh) ? 'Deactiveren' : 'Activeren'"
          >
            {{ isActive(wh) ? '⏸️' : '▶️' }}
          </button>
          <button
            class="webhooks-list__btn webhooks-list__btn--delete"
            @click="removeWebhook(wh.id)"
            title="Verwijderen"
          >
            🗑️
          </button>
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
  color: var(--text-heading, #fff);
}

.webhooks-page__desc {
  color: var(--text-secondary, #9ea5c2);
  margin: 0 0 var(--space-l, 28px);
  font-size: 0.875rem;
}

.webhooks-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
  padding: var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  margin-bottom: var(--space-l, 28px);
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

.webhooks-form__field span {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.webhooks-form__field input,
.webhooks-form__field select {
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.875rem;
}

.webhooks-form__field input:focus,
.webhooks-form__field select:focus {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: -1px;
}

.webhooks-form__submit {
  align-self: flex-start;
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border: none;
  border-radius: var(--radius-default, 5px);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

.webhooks-form__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.webhooks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 6px);
}

.webhooks-list__empty {
  color: var(--text-secondary, #9ea5c2);
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

.webhooks-list__badge {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--surface-muted, #060813);
  color: var(--text-secondary, #9ea5c2);
}

.webhooks-list__badge--event {
  background: var(--intent-info-muted, #1e3a5f);
  color: var(--intent-info-default, #60a5fa);
}

.webhooks-list__badge--active {
  background: var(--intent-success-muted, #0f3d2c);
  color: var(--intent-success-default, #34d399);
}

.webhooks-list__badge--inactive {
  background: var(--intent-danger-muted, #3d1f1f);
  color: var(--intent-danger-default, #f87171);
}

.webhooks-list__url {
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.webhooks-list__actions {
  display: flex;
  gap: var(--space-xs, 6px);
  flex-shrink: 0;
}

.webhooks-list__btn {
  background: none;
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  cursor: pointer;
  font-size: 1rem;
}

.webhooks-list__btn:hover {
  background: var(--surface-muted, #060813);
}
</style>
