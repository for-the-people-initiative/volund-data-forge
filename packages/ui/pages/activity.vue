<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const selectedCollection = ref('')
const page = ref(1)
const limit = 30

const queryParams = computed(() => ({
  ...(selectedCollection.value ? { collection: selectedCollection.value } : {}),
  limit,
  offset: (page.value - 1) * limit,
}))

const { data: result, refresh } = useFetch('/api/activity', {
  query: queryParams,
  watch: [queryParams],
  default: () => ({ data: [], total: 0 }),
})

const { data: collections } = useFetch<Array<{ name: string }>>('/api/schema', {
  default: () => [],
})

const totalPages = computed(() => Math.ceil((result.value?.total ?? 0) / limit))

const actionEmoji: Record<string, string> = {
  create: '🟢',
  update: '🟡',
  delete: '🔴',
}

const actionLabel: Record<string, string> = {
  create: 'Aangemaakt',
  update: 'Bijgewerkt',
  delete: 'Verwijderd',
}

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatChanges(changesStr: string | null): Record<string, unknown> | null {
  if (!changesStr) return null
  try {
    return JSON.parse(changesStr)
  } catch {
    return null
  }
}

function resetFilter() {
  selectedCollection.value = ''
  page.value = 1
}

watch(selectedCollection, () => {
  page.value = 1
})
</script>

<template>
  <div class="activity-page">
    <div class="activity-page__header">
      <h1>📋 Activiteitenlog</h1>
      <div class="activity-page__filters">
        <select v-model="selectedCollection" class="activity-page__select">
          <option value="">Alle collecties</option>
          <option v-for="col in collections" :key="col.name" :value="col.name">
            {{ col.name }}
          </option>
        </select>
        <button v-if="selectedCollection" class="activity-page__btn-clear" @click="resetFilter">
          ✕ Reset
        </button>
        <button class="activity-page__btn-refresh" @click="refresh()">🔄</button>
      </div>
    </div>

    <div v-if="!result?.data?.length" class="activity-page__empty">
      <p>Geen activiteiten gevonden.</p>
    </div>

    <div v-else class="activity-page__timeline">
      <div
        v-for="entry in result.data"
        :key="entry.id"
        class="activity-page__entry"
      >
        <div class="activity-page__entry-icon">
          {{ actionEmoji[entry.action] || '⚪' }}
        </div>
        <div class="activity-page__entry-content">
          <div class="activity-page__entry-header">
            <span class="activity-page__action">{{ actionLabel[entry.action] || entry.action }}</span>
            <span class="activity-page__collection">{{ entry.collection }}</span>
            <span v-if="entry.record_id" class="activity-page__record-id">#{{ entry.record_id }}</span>
          </div>
          <div class="activity-page__entry-time">{{ formatTime(entry.timestamp) }}</div>
          <details v-if="formatChanges(entry.changes)" class="activity-page__changes">
            <summary>Wijzigingen</summary>
            <pre>{{ JSON.stringify(formatChanges(entry.changes), null, 2) }}</pre>
          </details>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="activity-page__pagination">
      <button :disabled="page <= 1" @click="page--">← Vorige</button>
      <span>Pagina {{ page }} / {{ totalPages }}</span>
      <button :disabled="page >= totalPages" @click="page++">Volgende →</button>
    </div>
  </div>
</template>

<style scoped>
.activity-page {
  max-width: 800px;
}

.activity-page__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-s, 10px);
  margin-bottom: var(--space-l, 28px);
}

.activity-page__header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-heading, #fff);
}

.activity-page__filters {
  display: flex;
  gap: var(--space-xs, 6px);
  align-items: center;
}

.activity-page__select {
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.875rem;
}

.activity-page__btn-clear,
.activity-page__btn-refresh {
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
  font-size: 0.875rem;
}

.activity-page__btn-clear:hover,
.activity-page__btn-refresh:hover {
  color: var(--text-default, #fff);
}

.activity-page__empty {
  color: var(--text-secondary, #9ea5c2);
  text-align: center;
  padding: var(--space-xl, 48px);
}

.activity-page__timeline {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 6px);
}

.activity-page__entry {
  display: flex;
  gap: var(--space-s, 10px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
}

.activity-page__entry-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  padding-top: 2px;
}

.activity-page__entry-content {
  flex: 1;
  min-width: 0;
}

.activity-page__entry-header {
  display: flex;
  gap: var(--space-xs, 6px);
  align-items: center;
  flex-wrap: wrap;
}

.activity-page__action {
  font-weight: 600;
  color: var(--text-default, #fff);
  font-size: 0.875rem;
}

.activity-page__collection {
  background: var(--surface-muted, #060813);
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
}

.activity-page__record-id {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
  opacity: 0.7;
}

.activity-page__entry-time {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
  margin-top: 2px;
}

.activity-page__changes {
  margin-top: var(--space-xs, 6px);
}

.activity-page__changes summary {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
}

.activity-page__changes pre {
  font-size: 0.75rem;
  background: var(--surface-muted, #060813);
  padding: var(--space-xs, 6px);
  border-radius: 3px;
  overflow-x: auto;
  color: var(--text-default, #fff);
  margin-top: var(--space-2xs, 4px);
}

.activity-page__pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-m, 16px);
  margin-top: var(--space-l, 28px);
}

.activity-page__pagination button {
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  cursor: pointer;
  font-size: 0.875rem;
}

.activity-page__pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.activity-page__pagination span {
  font-size: 0.875rem;
  color: var(--text-secondary, #9ea5c2);
}
</style>
