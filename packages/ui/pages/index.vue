<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl

const { data: collections, status, error: fetchError } = await useFetch<Array<{ name: string; count: number; fieldCount: number }>>(
  `${baseUrl}/collections-list`,
  { key: 'collections-list' },
)

const collectionLabels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}

const collectionIcons: Record<string, string> = {
  contacts: '👤',
  companies: '🏢',
}

function label(name: string) {
  return collectionLabels[name] ?? name
}

function icon(name: string) {
  return collectionIcons[name] ?? '📁'
}
</script>

<template>
  <div class="dashboard">
    <h1 class="dashboard__title">Dashboard</h1>
    <p class="dashboard__subtitle">CRM Overzicht</p>

    <div v-if="status === 'pending'" class="dashboard__loading">Laden...</div>

    <div v-else-if="fetchError" class="dashboard__loading" style="color: var(--feedback-error, #ef4444);">
      ⚠️ Fout bij laden: {{ (fetchError as any)?.data?.error?.message ?? fetchError?.message ?? 'Onbekende fout' }}
    </div>

    <div v-else class="dashboard__grid">
      <NuxtLink
        v-for="col in collections"
        :key="col.name"
        :to="`/collections/${col.name}`"
        class="dashboard__card"
      >
        <span class="dashboard__card-icon">{{ icon(col.name) }}</span>
        <div class="dashboard__card-body">
          <h3 class="dashboard__card-title">{{ label(col.name) }}</h3>
          <span class="dashboard__card-count">{{ col.count }} records</span>
        </div>
        <span class="dashboard__card-arrow">→</span>
      </NuxtLink>
    </div>

    <div class="dashboard__actions">
      <NuxtLink to="/collections/contacts/new" class="dashboard__btn">+ Nieuw contact</NuxtLink>
      <NuxtLink to="/collections/companies/new" class="dashboard__btn">+ Nieuw bedrijf</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 800px;
}

.dashboard__title {
  color: var(--text-heading, #fff);
  margin: 0 0 var(--space-2xs, 4px);
}

.dashboard__subtitle {
  color: var(--text-muted, #7680a9);
  margin: 0 0 var(--space-l, 28px);
  font-size: 0.9375rem;
}

.dashboard__loading {
  color: var(--text-muted, #7680a9);
  padding: var(--space-2xl, 68px) 0;
  text-align: center;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-m, 16px);
  margin-bottom: var(--space-l, 28px);
}

.dashboard__card {
  display: flex;
  align-items: center;
  gap: var(--space-m, 16px);
  padding: var(--space-m, 16px) var(--space-l, 28px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s, background 0.15s;
}

.dashboard__card:hover {
  border-color: var(--border-strong, #2e3b75);
  background: var(--surface-elevated, #161c3a);
}

.dashboard__card-icon {
  font-size: 2rem;
}

.dashboard__card-body {
  flex: 1;
}

.dashboard__card-title {
  margin: 0;
  color: var(--text-heading, #fff);
  font-size: 1.125rem;
}

.dashboard__card-count {
  color: var(--text-muted, #7680a9);
  font-size: 0.875rem;
}

.dashboard__card-arrow {
  color: var(--text-subtle, #525d8f);
  font-size: 1.25rem;
}

.dashboard__actions {
  display: flex;
  gap: var(--space-s, 10px);
}

.dashboard__btn {
  display: inline-block;
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border-radius: var(--radius-default, 5px);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
}

.dashboard__btn:hover {
  background: var(--intent-action-hover, #ea580c);
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }

  .dashboard__actions {
    flex-direction: column;
  }

  .dashboard__btn {
    text-align: center;
  }

  .dashboard__card {
    padding: var(--space-s, 10px) var(--space-m, 16px);
  }
}
</style>
