<script setup lang="ts">
const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix
const route = useRoute()

const { activeSchema, schemaParams } = useDbSchema()

const { data: dynamicCollections, refresh: refreshCollections } = useFetch<
  Array<{ name: string }>
>('/api/schema', {
  key: 'sidebar-collections',
  params: computed(() => schemaParams()),
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

// Theme toggle removed - VDF uses dark mode only

const router = useRouter()

function onSchemaChange() {
  refreshCollections()
}

function onSearchSubmit() {
  if (sidebarFilter.value.trim()) {
    router.push({ path: '/search', query: { q: sidebarFilter.value.trim() } })
  }
}

// Sidebar filter
const sidebarFilter = ref('')

const filteredCollections = computed(() => {
  if (!dynamicCollections.value?.length) return []
  if (!sidebarFilter.value.trim()) return dynamicCollections.value
  const q = sidebarFilter.value.trim().toLowerCase()
  return dynamicCollections.value.filter((col) =>
    capitalize(col.name).toLowerCase().includes(q),
  )
})

const overigItems = [
  { to: '/builder', emoji: '🏗️', label: 'Schema Builder' },
  { to: '/webhooks', emoji: '🔔', label: 'Webhooks' },
  { to: '/schema-overview', emoji: '🗺️', label: 'Schema Overzicht' },
  { to: '/activity', emoji: '📋', label: 'Activiteitenlog' },
  { to: '/api-docs', emoji: '📡', label: 'API Docs' },
  { to: '/sdk', emoji: '🔧', label: "SDK's" },
]

const filteredOverig = computed(() => {
  if (!sidebarFilter.value.trim()) return overigItems
  const q = sidebarFilter.value.trim().toLowerCase()
  return overigItems.filter((item) => item.label.toLowerCase().includes(q))
})

const showDashboard = computed(() => {
  if (!sidebarFilter.value.trim()) return true
  return 'dashboard'.includes(sidebarFilter.value.trim().toLowerCase())
})

const showAbout = computed(() => {
  if (!sidebarFilter.value.trim()) return true
  return 'over volund'.includes(sidebarFilter.value.trim().toLowerCase())
})

const sidebarOpen = ref(false)

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function closeSidebar() {
  sidebarOpen.value = false
}

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
    <FtpButton
      class="de-layout__hamburger"
      :aria-expanded="sidebarOpen"
      aria-controls="sidebar-nav"
      aria-label="Menu"
      variant="secondary"
      size="sm"
      @click="toggleSidebar"
    >
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
      <span class="de-layout__hamburger-line" />
    </FtpButton>

    <!-- Overlay (mobile only) -->
    <div v-if="sidebarOpen" class="de-layout__overlay" @click="closeSidebar" />

    <aside id="sidebar-nav" class="de-layout__sidebar" :class="{ 'de-layout__sidebar--open': sidebarOpen }">
      <NuxtLink :to="routePrefix" class="de-layout__brand">
        <strong>Data Engine</strong>
      </NuxtLink>
      <SchemaSelector @change="onSchemaChange" />
      <form class="de-layout__search" @submit.prevent="onSearchSubmit" role="search">
        <FtpInputText
          v-model="sidebarFilter"
          placeholder="Zoeken..."
          size="sm"
          aria-label="Filter sidebar navigatie"
        />
      </form>
      <nav class="de-layout__nav" aria-label="Hoofdnavigatie">
        <NuxtLink
          v-if="showDashboard"
          to="/"
          class="de-layout__nav-item"
          :aria-current="route.path === '/' ? 'page' : undefined"
        >📊 Dashboard</NuxtLink>

        <div v-if="filteredCollections.length" class="de-layout__nav-section">
          <span class="de-layout__nav-label">Collecties</span>
          <NuxtLink
            v-for="col in filteredCollections"
            :key="col.name"
            :to="`/collections/${col.name}`"
            class="de-layout__nav-item"
            :aria-current="route.path === `/collections/${col.name}` ? 'page' : undefined"
          >
            {{ getEmoji(col.name) }} {{ capitalize(col.name) }}
          </NuxtLink>
        </div>

        <div v-if="filteredOverig.length" class="de-layout__nav-section">
          <span class="de-layout__nav-label">Overige</span>
          <NuxtLink
            v-for="item in filteredOverig"
            :key="item.to"
            :to="item.to"
            class="de-layout__nav-item"
            :aria-current="route.path === item.to ? 'page' : undefined"
          >{{ item.emoji }} {{ item.label }}</NuxtLink>
        </div>
      </nav>
      <div class="de-layout__nav-bottom">
        <NuxtLink
          v-if="showAbout"
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
  color: var(--text-inverse);
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
}

.de-layout__hamburger-line {
  display: block;
  width: 20px;
  height: 2px;
  background: var(--text-default);
  border-radius: 1px;
  margin: 2px 0;
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
  background: var(--surface-panel);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-m, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

/* Theme toggle styles removed - VDF uses dark mode only */

.de-layout__nav-bottom {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
  padding-top: var(--space-s, 10px);
  border-top: 1px solid var(--border-subtle);
}

.de-layout__search {
  margin: 0;
}

.de-layout__search :deep(.input-text) {
  width: 100%;
  font-size: 0.8rem;
}

.de-layout__brand {
  text-decoration: none;
  color: var(--text-heading);
  font-size: 1rem;
  padding-bottom: var(--space-s, 10px);
  border-bottom: 1px solid var(--border-subtle);
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
  color: var(--text-secondary);
  padding: var(--space-xs, 6px) var(--space-s, 10px) 0;
  opacity: 0.6;
}

.de-layout__nav-item {
  display: block;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.875rem;
  transition:
    background 0.15s,
    color 0.15s;
}

.de-layout__nav-item:hover {
  background: var(--surface-muted);
  color: var(--text-default);
}

.de-layout__nav-item.router-link-active {
  background: var(--surface-muted);
  color: var(--text-default);
}

.de-layout__main {
  flex: 1;
  padding: var(--space-l, 28px);
  overflow-y: auto;
  min-width: 0;
}

/* Focus visible */
.de-layout__nav-item:focus-visible,
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
    padding-top: 56px;
  }
}
</style>
