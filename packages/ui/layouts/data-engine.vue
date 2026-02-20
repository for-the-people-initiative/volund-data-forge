<script setup lang="ts">
const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix
</script>

<template>
  <div class="de-layout">
    <aside class="de-layout__sidebar">
      <NuxtLink :to="routePrefix" class="de-layout__brand">
        <strong>Data Engine</strong>
      </NuxtLink>
      <nav class="de-layout__nav">
        <NuxtLink to="/" class="de-layout__nav-item">📊 Dashboard</NuxtLink>
        <NuxtLink to="/collections/contacts" class="de-layout__nav-item">👤 Contacten</NuxtLink>
        <NuxtLink to="/collections/companies" class="de-layout__nav-item">🏢 Bedrijven</NuxtLink>
      </nav>
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
