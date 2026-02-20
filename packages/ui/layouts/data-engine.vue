<script setup lang="ts">
const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix
const route = useRoute()

const { data: dynamicCollections, refresh: refreshCollections } = useFetch<Array<{ name: string }>>('/api/schema', {
  key: 'sidebar-collections',
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

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

// Close sidebar on navigation
watch(() => route.fullPath, () => {
  closeSidebar()
})
</script>

<template>
  <div class="de-layout">
    <!-- Hamburger button (mobile only) -->
    <button class="de-layout__hamburger" @click="toggleSidebar" aria-label="Menu">
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
    </button>

    <!-- Overlay (mobile only) -->
    <div
      v-if="sidebarOpen"
      class="de-layout__overlay"
      @click="closeSidebar"
    />

    <aside class="de-layout__sidebar" :class="{ 'de-layout__sidebar--open': sidebarOpen }">
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

/* Hamburger button — mobile only */
.de-layout__hamburger {
  display: none;
  position: fixed;
  top: var(--space-s, 10px);
  left: var(--space-s, 10px);
  z-index: 1001;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  padding: 8px;
  cursor: pointer;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.de-layout__hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-default, #fff);
  border-radius: 1px;
}

/* Overlay — mobile only */
.de-layout__overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
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
  min-width: 0;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .de-layout__hamburger {
    display: flex;
  }

  .de-layout__overlay {
    display: block;
  }

  .de-layout__sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .de-layout__sidebar--open {
    transform: translateX(0);
  }

  .de-layout__main {
    padding: var(--space-m, 16px);
    padding-top: 56px; /* space for hamburger */
  }
}
</style>
