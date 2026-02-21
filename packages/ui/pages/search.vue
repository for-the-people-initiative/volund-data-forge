<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const searchQuery = ref((route.query.q as string) || '')
const results = ref<Array<{ collection: string; records: Record<string, unknown>[] }>>([])
const loading = ref(false)
const searched = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function getRecordLabel(record: Record<string, unknown>): string {
  // Try common label fields
  for (const key of ['name', 'title', 'label', 'email', 'subject']) {
    if (record[key] && typeof record[key] === 'string') return record[key] as string
  }
  return `#${record.id || '?'}`
}

async function doSearch(q: string) {
  const term = q.trim()
  if (!term) {
    results.value = []
    searched.value = false
    return
  }

  loading.value = true
  try {
    const data = await $fetch<{ results: typeof results.value }>('/api/search', {
      params: { q: term, limit: 10 },
    })
    results.value = data.results
    searched.value = true
  } catch {
    results.value = []
    searched.value = true
  } finally {
    loading.value = false
  }
}

function onInput(value: string) {
  searchQuery.value = value
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => doSearch(value), 300)
}

// Search on mount if query param present
onMounted(() => {
  if (searchQuery.value) doSearch(searchQuery.value)
})
</script>

<template>
  <div class="search-page">
    <h1>🔍 Zoeken</h1>

    <input
      type="search"
      class="search-page__input"
      placeholder="Zoek in alle collecties..."
      :value="searchQuery"
      @input="onInput(($event.target as HTMLInputElement).value)"
      autofocus
    />

    <div v-if="loading" class="search-page__loading">Zoeken...</div>

    <div v-else-if="searched && results.length === 0" class="search-page__empty">
      Geen resultaten gevonden voor "<strong>{{ searchQuery }}</strong>"
    </div>

    <div v-else class="search-page__results">
      <section v-for="group in results" :key="group.collection" class="search-page__group">
        <h2 class="search-page__group-title">
          📁 {{ capitalize(group.collection) }}
          <span class="search-page__group-count">({{ group.records.length }})</span>
        </h2>
        <ul class="search-page__list">
          <li v-for="record in group.records" :key="String(record.id)" class="search-page__item">
            <NuxtLink
              :to="`/collections/${group.collection}/${record.id}`"
              class="search-page__link"
            >
              {{ getRecordLabel(record) }}
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 700px;
}

.search-page__input {
  width: 100%;
  padding: var(--space-s, 10px) var(--space-m, 16px);
  font-size: 1rem;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  margin-bottom: var(--space-l, 28px);
}

.search-page__input:focus {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

.search-page__loading,
.search-page__empty {
  color: var(--text-secondary, #9ea5c2);
  padding: var(--space-m, 16px) 0;
}

.search-page__group {
  margin-bottom: var(--space-l, 28px);
}

.search-page__group-title {
  font-size: 1rem;
  margin-bottom: var(--space-s, 10px);
  color: var(--text-heading, #fff);
}

.search-page__group-count {
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
  font-weight: normal;
}

.search-page__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.search-page__link {
  display: block;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  text-decoration: none;
  background: var(--surface-panel, #11162d);
  transition: background 0.15s;
}

.search-page__link:hover {
  background: var(--surface-muted, #060813);
}

.search-page__link:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}
</style>
