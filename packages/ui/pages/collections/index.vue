<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl

const { data: collections, status } = await useFetch<Array<{ name: string; count: number }>>(
  `${baseUrl}/collections-list`,
  { key: 'collections-list-page' },
)

const labels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}
</script>

<template>
  <div>
    <h1>Collecties</h1>

    <div v-if="status === 'pending'">Laden...</div>

    <div v-else class="collections-grid">
      <NuxtLink
        v-for="col in collections"
        :key="col.name"
        :to="`/collections/${col.name}`"
        class="collection-card"
      >
        <h3>{{ labels[col.name] ?? col.name }}</h3>
        <span class="collection-card__count">{{ col.count }} records</span>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-m, 16px);
  margin-top: var(--space-l, 28px);
}

.collection-card {
  display: block;
  padding: var(--space-m, 16px);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  background: var(--surface-panel, #11162d);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}

.collection-card:hover {
  border-color: var(--border-strong, #2e3b75);
}

.collection-card h3 {
  margin: 0 0 var(--space-xs, 6px);
  color: var(--text-heading, #fff);
  text-transform: capitalize;
}

.collection-card__count {
  font-size: 0.8125rem;
  color: var(--text-muted, #7680a9);
}
</style>
