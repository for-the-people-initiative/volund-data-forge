<script setup lang="ts">
const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix

const { data: dynamicCollections, refresh: refreshCollections } = useFetch<Array<{ name: string }>>('/api/schema', {
  key: 'collections-list',
  default: () => [],
})

const collectionEmoji: Record<string, string> = {
  contacts: '👤',
  companies: '🏢',
}

function getEmoji(name: string) {
  return collectionEmoji[name] || '📁'
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}
</script>

<template>
  <div class="de-layout">
    <aside class="de-layout__sidebar">
      <NuxtLink :to="routePrefix" class="de-layout__brand">
        <strong>Data Engine</strong>
      </NuxtLink>
      <nav class="de-layout__nav">
        <NuxtLink to="/" class="de-layout__nav-item">📊 Dashboard</NuxtLink>

        <div v-if="dynamicCollections?.length" class="de-layout__nav-section">
          <span class="de-layout__nav-label">Collecties</span>
          <NuxtLink
            v-for="col in dynamicCollections"
            :key="col.name"
            :to="`/collections/${col.name}`"
            class="de-layout__nav-item"
          >
            {{ getEmoji(col.name) }} {{ capitalize(col.name) }}
          </NuxtLink>
        </div>

        <NuxtLink to="/builder" class="de-layout__nav-item">🏗️ Schema Builder</NuxtLink>
      </nav>
      <div class="de-layout__nav-bottom">
        <NuxtLink to="/about" class="de-layout__nav-item">ℹ️ Over Volund</NuxtLink>
      </div>
    </aside>
    <main class="de-layout__main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.de-layout {
  min-height: 100vh;
  display: flex;
}

.de-layout__sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--surface-muted, #060813);
  border-right: 1px solid var(--border-subtle, #1a2244);
  padding: var(--space-m, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.de-layout__nav-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
  padding-top: var(--space-s, 10px);
  border-top: 1px solid var(--border-subtle, #1a2244);
}

.de-layout__brand {
  text-decoration: none;
  color: var(--text-heading, #fff);
  font-size: 1rem;
  padding-bottom: var(--space-s, 10px);
  border-bottom: 1px solid var(--border-subtle, #1a2244);
}

.de-layout__nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.de-layout__nav-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.de-layout__nav-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, #9ea5c2);
  padding: var(--space-xs, 6px) var(--space-s, 10px) 0;
  opacity: 0.6;
}

.de-layout__nav-item {
  display: block;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  text-decoration: none;
  font-size: 0.875rem;
  transition: background 0.15s, color 0.15s;
}

.de-layout__nav-item:hover {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

.de-layout__nav-item.router-link-active {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

.de-layout__main {
  flex: 1;
  padding: var(--space-l, 28px);
  overflow-y: auto;
}
</style>
