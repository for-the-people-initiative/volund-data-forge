<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

definePageMeta({ layout: 'data-engine' })

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl
const { activeSchema, schemaParams } = useDbSchema()

const {
  data: collections,
  status,
  error: fetchError,
} = await useFetch<Array<{ name: string; count: number; icon?: string }>>(`${baseUrl}/collections-list`, {
  key: computed(() => `collections-list-${activeSchema.value}`),
  params: schemaParams(),
  watch: [activeSchema],
})

// Client-side mounted state to prevent hydration mismatch
// (server may have data while client starts with 'pending')
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const labels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}

const defaultEmoji: Record<string, string> = {
  contacts: '👤',
  companies: '🏢',
}

function getCollectionIcon(col: { name: string; icon?: string }) {
  return col.icon || defaultEmoji[col.name] || '📁'
}

// --- New collection wizard ---
const showNewDialog = ref(false)
const isSaving = ref(false)
const saveError = ref<string | null>(null)

function openNewDialog() {
  saveError.value = null
  showNewDialog.value = true
}

async function handleCreate(schema: CollectionSchema) {
  isSaving.value = true
  saveError.value = null
  try {
    const payload = JSON.parse(JSON.stringify(toRaw(schema)))
    await $fetch('/api/schema', { method: 'POST', body: payload, params: schemaParams() })
    showNewDialog.value = false
    await refreshNuxtData('collections-list-page')
    await navigateTo(`/collections/${payload.name}`)
  } catch (err: unknown) {
    let msg = err instanceof Error ? ((err as Error & { data?: { error?: { message?: string; details?: string[] } } }).data?.error?.message || err.message) : 'Aanmaken mislukt'
    if (err instanceof Error) {
      const details = (err as Error & { data?: { error?: { details?: string[] } } }).data?.error?.details
      if (details && Array.isArray(details)) {
        msg += ': ' + details.join(', ')
      }
    }
    saveError.value = msg
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <h1>Collecties</h1>

    <FtpButton label="+ Nieuwe collectie" variant="primary" @click="openNewDialog" style="margin-top: var(--space-m, 16px); align-self: flex-start;" />

    <SchemaBuilderCollectionWizard
      :visible="showNewDialog"
      :is-saving="isSaving"
      :save-error="saveError"
      @update:visible="showNewDialog = $event"
      @update:save-error="saveError = $event"
      @create="handleCreate"
    />

    <!-- Use mounted check to prevent hydration mismatch between server/client loading state -->
    <div v-if="!mounted || status === 'pending'" class="collections-loading">
      <FtpProgressSpinner />
    </div>

    <FtpMessage v-else-if="fetchError" severity="error">
      ⚠️ Fout bij laden:
      {{ fetchError?.message ?? 'Onbekende fout' }}
    </FtpMessage>

    <div v-else class="collections-grid">
      <NuxtLink
        v-for="col in collections"
        :key="col.name"
        :to="`/collections/${col.name}`"
        class="collections-grid__link"
      >
        <FtpCard>
          <template #title>
            <span class="collections-grid__name">{{ getCollectionIcon(col) }} {{ labels[col.name] ?? col.name }}</span>
          </template>
          <template #content>
            <FtpBadge :value="`${col.count} records`" severity="info" />
          </template>
        </FtpCard>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.collections-loading {
  display: flex;
  justify-content: center;
  padding: var(--space-xl, 36px) 0;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-m, 16px);
  margin-top: var(--space-l, 28px);
}

.collections-grid__link {
  text-decoration: none;
  color: inherit;
}

.collections-grid__name {
  text-transform: capitalize;
}
</style>
