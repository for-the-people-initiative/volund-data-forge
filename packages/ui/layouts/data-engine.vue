<script setup lang="ts">
const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix
const route = useRoute()

const { data: dynamicCollections, refresh: _refreshCollections } = useFetch<
  Array<{ name: string }>
>('/api/schema', {
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

const { theme, toggle: toggleTheme } = useTheme()

const router = useRouter()
const searchQuery = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null

function onSearchInput(value: string) {
  searchQuery.value = value
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    if (value.trim()) {
      router.push({ path: '/search', query: { q: value.trim() } })
    }
  }, 300)
}

function onSearchSubmit() {
  if (searchDebounce) clearTimeout(searchDebounce)
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
  }
}

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

// Close sidebar on navigation
watch(
  () => route.fullPath,
  () => {
    closeSidebar()
  },
)
</script>

<template>
  <div class="de-layout">
    <!-- Skip link -->
    <a href="#main-content" class="de-layout__skip-link">Ga naar inhoud</a>

    <!-- Hamburger button (mobile only) -->
    <button
      class="de-layout__hamburger"
      @click="toggleSidebar"
      aria-label="Menu"
      :aria-expanded="sidebarOpen"
      aria-controls="sidebar-nav"
    >
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
    </button>

    <!-- Overlay (mobile only) -->
    <div v-if="sidebarOpen" class="de-layout__overlay" @click="closeSidebar" />

    <aside id="sidebar-nav" class="de-layout__sidebar" :class="{ 'de-layout__sidebar--open': sidebarOpen }">
      <NuxtLink :to="routePrefix" class="de-layout__brand">
        <strong>Data Engine</strong>
      </NuxtLink>
      <form class="de-layout__search" @submit.prevent="onSearchSubmit" role="search">
        <input
          type="search"
          class="de-layout__search-input"
          placeholder="Zoeken..."
          :value="searchQuery"
          @input="onSearchInput(($event.target as HTMLInputElement).value)"
          aria-label="Zoek in alle collecties"
        />
      </form>
      <nav class="de-layout__nav" aria-label="Hoofdnavigatie">
        <NuxtLink
          to="/"
          class="de-layout__nav-item"
          :aria-current="route.path === '/' ? 'page' : undefined"
        >📊 Dashboard</NuxtLink>

        <div v-if="dynamicCollections?.length" class="de-layout__nav-section">
          <span class="de-layout__nav-label">Collecties</span>
          <NuxtLink
            v-for="col in dynamicCollections"
            :key="col.name"
            :to="`/collections/${col.name}`"
            class="de-layout__nav-item"
            :aria-current="route.path === `/collections/${col.name}` ? 'page' : undefined"
          >
            {{ getEmoji(col.name) }} {{ capitalize(col.name) }}
          </NuxtLink>
        </div>

        <NuxtLink
          to="/builder"
          class="de-layout__nav-item"
          :aria-current="route.path === '/builder' ? 'page' : undefined"
        >🏗️ Schema Builder</NuxtLink>

        <NuxtLink
          to="/webhooks"
          class="de-layout__nav-item"
          :aria-current="route.path === '/webhooks' ? 'page' : undefined"
        >🔔 Webhooks</NuxtLink>

        <NuxtLink
          to="/schema-overview"
          class="de-layout__nav-item"
          :aria-current="route.path === '/schema-overview' ? 'page' : undefined"
        >🗺️ Schema Overzicht</NuxtLink>

        <NuxtLink
          to="/activity"
          class="de-layout__nav-item"
          :aria-current="route.path === '/activity' ? 'page' : undefined"
        >📋 Activiteitenlog</NuxtLink>
      </nav>
      <div class="de-layout__nav-bottom">
        <button
          class="de-layout__theme-toggle"
          @click="toggleTheme"
          :aria-label="theme === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema'"
          :title="theme === 'dark' ? 'Licht thema' : 'Donker thema'"
        >
          <span v-if="theme === 'dark'">☀️</span>
          <span v-else>🌙</span>
          <span class="de-layout__theme-label">{{ theme === 'dark' ? 'Licht' : 'Donker' }}</span>
        </button>
        <NuxtLink
          to="/about"
          class="de-layout__nav-item"
          :aria-current="route.path === '/about' ? 'page' : undefined"
        >ℹ️ Over Volund</NuxtLink>
      </div>
    </aside>
    <main id="main-content" class="de-layout__main">
      <NuxtErrorBoundary>
        <slot />
        <template #error="{ error, clearError }">
          <ErrorFallback label="Deze pagina" @retry="clearError" />
        </template>
      </NuxtErrorBoundary>
    </main>
  </div>
</template>

<style scoped>
/* Skip link */
.de-layout__skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-s, 10px);
  z-index: 2000;
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border-radius: var(--radius-default, 5px);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
}

.de-layout__skip-link:focus {
  top: var(--space-s, 10px);
}

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

.de-layout__theme-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  background: transparent;
  border: 1px solid var(--border-default, #242e5c);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  width: 100%;
  text-align: left;
}

.de-layout__theme-toggle:hover {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

.de-layout__theme-label {
  flex: 1;
}

.de-layout__nav-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
  padding-top: var(--space-s, 10px);
  border-top: 1px solid var(--border-subtle, #1a2244);
}

.de-layout__search {
  margin: 0;
}

.de-layout__search-input {
  width: 100%;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  font-size: 0.8rem;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
}

.de-layout__search-input:focus {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
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
  transition:
    background 0.15s,
    color 0.15s;
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

/* Focus visible */
.de-layout__nav-item:focus-visible,
.de-layout__hamburger:focus-visible,
.de-layout__brand:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
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
