<script setup lang="ts">
import type { DatabaseHealth } from '~/types/database-health'

const routePrefix = useRuntimeConfig().public.dataEngine.routePrefix
const route = useRoute()

const { activeSchema, schemaParams } = useDbSchema()

const { data: dynamicCollections, refresh: refreshCollections } = useFetch<
  Array<{ name: string; icon?: string }>
>('/api/schema', {
  key: computed(() => `sidebar-collections-${activeSchema.value}`),
  params: computed(() => schemaParams()),
  watch: [activeSchema],
  default: () => [],
})

const collectionEmoji: Record<string, string> = {
  contacts: '👤',
  companies: '🏢',
}

function getEmoji(col: { name: string; icon?: string }) {
  return col.icon || collectionEmoji[col.name] || '📁'
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1)
}

// Theme toggle removed - VDF uses dark mode only

const router = useRouter()

function onSchemaChange() {
  refreshCollections()
  router.push('/')
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
  { to: '/webhooks', emoji: '🔔', label: 'Webhooks' },
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

// Health indicator
const healthPopoverOpen = ref(false)
const { data: healthData } = useFetch<DatabaseHealth>('/api/health', {
  default: () => ({ adapter: 'unknown', version: '', host: '', database: '', status: 'disconnected' as const, latencyMs: 0 }),
})

const healthDot = computed(() => {
  switch (healthData.value?.status) {
    case 'connected': return '🟢'
    case 'slow': return '🟡'
    case 'disconnected': return '🔴'
    default: return '⚪'
  }
})

const healthLabel = computed(() => {
  const a = healthData.value?.adapter
  if (a === 'postgres') return 'PostgreSQL'
  if (a === 'sqlite') return 'SQLite'
  if (a === 'mysql') return 'MySQL'
  return a ?? 'Database'
})

function toggleHealthPopover() {
  healthPopoverOpen.value = !healthPopoverOpen.value
}

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

    <!-- Topbar (full width) -->
    <header class="de-layout__topbar">
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

      <SchemaSelector class="de-layout__topbar-schema" @change="onSchemaChange" />
      <div class="de-layout__health-wrapper">
        <FtpButton
          class="de-layout__health-btn"
          variant="secondary"
          size="sm"
          :title="`Database: ${healthLabel} (${healthData?.status})`"
          @click="toggleHealthPopover"
        >
          <span class="de-layout__health-dot">{{ healthDot }}</span>
          <span class="de-layout__health-label">{{ healthLabel }}</span>
        </FtpButton>
        <div v-if="healthPopoverOpen" class="de-layout__health-popover">
          <div class="de-layout__health-popover-header">
            <span>{{ healthDot }} Database Status</span>
            <FtpButton class="de-layout__health-close" variant="secondary" size="sm" @click="healthPopoverOpen = false">&times;</FtpButton>
          </div>
          <div class="de-layout__health-popover-body">
            <div class="de-layout__health-row"><span class="de-layout__health-key">Adapter</span><span>{{ healthLabel }}</span></div>
            <div class="de-layout__health-row"><span class="de-layout__health-key">Status</span><FtpBadge :severity="healthData?.status === 'connected' ? 'success' : healthData?.status === 'slow' ? 'warning' : 'danger'" size="sm">{{ healthData?.status }}</FtpBadge></div>
            <div class="de-layout__health-row"><span class="de-layout__health-key">Versie</span><span>{{ healthData?.version || '—' }}</span></div>
            <div class="de-layout__health-row"><span class="de-layout__health-key">Host</span><span class="de-layout__health-mono">{{ healthData?.host || '—' }}</span></div>
            <div class="de-layout__health-row"><span class="de-layout__health-key">Database</span><span class="de-layout__health-mono">{{ healthData?.database || '—' }}</span></div>
            <div class="de-layout__health-row"><span class="de-layout__health-key">Latency</span><span>{{ healthData?.latencyMs ?? 0 }}ms</span></div>
            <div v-if="healthData?.connectedSince" class="de-layout__health-row"><span class="de-layout__health-key">Verbonden sinds</span><span>{{ new Date(healthData.connectedSince).toLocaleString('nl-NL') }}</span></div>
            <div v-if="healthData?.error" class="de-layout__health-row de-layout__health-error"><span class="de-layout__health-key">Fout</span><span>{{ healthData.error }}</span></div>
          </div>
        </div>
      </div>
      <NuxtLink :to="routePrefix" class="de-layout__home-link" title="Home">
        🏠
      </NuxtLink>
    </header>

    <!-- Overlay (mobile only) -->
    <div v-if="sidebarOpen" class="de-layout__overlay" @click="closeSidebar" />

    <div class="de-layout__body">
      <aside id="sidebar-nav" class="de-layout__sidebar" :class="{ 'de-layout__sidebar--open': sidebarOpen }">
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
        >📊 Collecties</NuxtLink>

        <div v-if="filteredCollections.length" class="de-layout__nav-section">
          <span class="de-layout__nav-label">Collecties</span>
          <NuxtLink
            v-for="col in filteredCollections"
            :key="col.name"
            :to="`/collections/${col.name}`"
            class="de-layout__nav-item"
            :aria-current="route.path === `/collections/${col.name}` ? 'page' : undefined"
          >
            {{ getEmoji(col) }} {{ capitalize(col.name) }}
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
  </div>
</template>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;
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
  flex-direction: column;
}

/* Topbar */
.de-layout__topbar {
  height: var(--topbar-height, 52px);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: var(--space-m, 16px);
  padding: 0 var(--space-l, 28px);
  background: var(--surface-default, #1a1a2e);
  border-bottom: 2px solid var(--border-subtle, #333);
  z-index: 1001;
  position: relative;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.de-layout__topbar-schema {
  min-width: 200px;
  max-width: 320px;
}

/* Health indicator */
.de-layout__health-wrapper {
  position: relative;
  margin-left: auto;
}

.de-layout__health-btn {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  background: none;
  border: 1px solid var(--border-subtle, #444);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs) var(--space-s);
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.de-layout__health-btn:hover {
  background: var(--surface-muted);
  border-color: var(--border-default, #666);
}

.de-layout__health-dot {
  font-size: 0.6rem;
  line-height: 1;
}

.de-layout__health-label {
  white-space: nowrap;
}

.de-layout__health-popover {
  position: absolute;
  top: calc(100% + var(--space-xs));
  right: 0;
  width: 320px;
  background: var(--surface-panel, #1e1e2e);
  border: 1px solid var(--border-subtle, #444);
  border-radius: var(--radius-default, 5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 2000;
  overflow: hidden;
}

.de-layout__health-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-s) var(--space-m);
  border-bottom: 1px solid var(--border-subtle, #444);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-default);
}

.de-layout__health-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 var(--space-2xs);
  line-height: 1;
}

.de-layout__health-close:hover {
  color: var(--text-default);
}

.de-layout__health-popover-body {
  padding: var(--space-s) var(--space-m);
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.de-layout__health-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.de-layout__health-key {
  color: var(--text-default);
  font-weight: 500;
  min-width: 100px;
}

.de-layout__health-mono {
  font-family: monospace;
  font-size: 0.75rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.de-layout__health-error {
  color: var(--intent-danger-default, #ef4444);
}

.de-layout__topbar .de-layout__home-link {
  flex-shrink: 0;
}

.de-layout__body {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* Hamburger button — mobile only */
.de-layout__hamburger {
  display: none;
}

.de-layout__hamburger-line {
  display: block;
  width: 20px;
  height: var(--space-3xs);
  background: var(--text-default);
  border-radius: 1px;
  margin: var(--space-3xs) 0;
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

.de-layout__home-link {
  text-decoration: none;
  font-size: 1rem;
  opacity: 0.6;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.de-layout__home-link:hover {
  opacity: 1;
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
.de-layout__home-link:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

/* ─── Mobile < 768px ─── */
@include breakpoint-to(tablet) {
  .de-layout__hamburger {
    display: flex;
    flex-shrink: 0;
  }

  .de-layout__overlay {
    display: block;
  }

  .de-layout__sidebar {
    position: fixed;
    top: var(--topbar-height, 52px);
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
  }
}
</style>
