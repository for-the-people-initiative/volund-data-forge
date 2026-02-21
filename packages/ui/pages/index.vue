<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl

const {
  data: collections,
  status,
  error: fetchError,
  refresh: refreshCollections,
} = await useFetch<Array<{ name: string; count: number; fieldCount: number }>>(
  `${baseUrl}/collections-list`,
  { key: 'collections-list' },
)

const defaultCollections = ['contacts', 'companies']
const showWizard = ref(false)

function checkWizard() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('onboarding-wizard-dismissed') === 'true') return
  const cols = collections.value ?? []
  const hasCustom = cols.some((c) => !defaultCollections.includes(c.name))
  showWizard.value = !hasCustom
}

function onWizardDone() {
  showWizard.value = false
  refreshCollections()
}

onMounted(checkWizard)
watch(collections, checkWizard)

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
    <OnboardingWizard v-if="showWizard" @done="onWizardDone" />
    <h1 class="dashboard__title">Dashboard</h1>
    <p class="dashboard__subtitle">CRM Overzicht</p>

    <div v-if="status === 'pending'" class="dashboard__loading">
      <FtpProgressSpinner />
    </div>

    <FtpMessage
      v-else-if="fetchError"
      severity="error"
    >
      ⚠️ Fout bij laden:
      {{ (fetchError as any)?.data?.error?.message ?? fetchError?.message ?? 'Onbekende fout' }}
    </FtpMessage>

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
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 800px;
}

.dashboard__title {
  color: var(--text-heading);
  margin: 0 0 var(--space-2xs, 4px);
}

.dashboard__subtitle {
  color: var(--text-muted);
  margin: 0 0 var(--space-l, 28px);
  font-size: 0.9375rem;
}

.dashboard__loading {
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
  transition:
    border-color 0.15s,
    background 0.15s;
}

.dashboard__card:hover {
  border-color: var(--border-strong);
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
  color: var(--text-heading);
  font-size: 1.125rem;
}

.dashboard__card-count {
  color: var(--text-muted);
  font-size: 0.875rem;
}

.dashboard__card-arrow {
  color: var(--text-subtle);
  font-size: 1.25rem;
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .dashboard__grid {
    grid-template-columns: 1fr;
  }

  .dashboard__card {
    padding: var(--space-s, 10px) var(--space-m, 16px);
  }
}
</style>