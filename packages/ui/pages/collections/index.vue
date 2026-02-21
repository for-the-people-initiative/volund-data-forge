<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const config = useRuntimeConfig()
const baseUrl = config.public.dataEngine.apiBaseUrl

const {
  data: collections,
  status,
  error: fetchError,
} = await useFetch<Array<{ name: string; count: number }>>(`${baseUrl}/collections-list`, {
  key: 'collections-list-page',
})

const labels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}
</script>

<template>
  <div>
    <h1>Collecties</h1>

    <div v-if="status === 'pending'" class="collections-loading">
      <FtpProgressSpinner />
    </div>

    <FtpMessage v-else-if="fetchError" severity="error">
      ⚠️ Fout bij laden:
      {{ (fetchError as any)?.data?.error?.message ?? fetchError?.message ?? 'Onbekende fout' }}
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
            <span class="collections-grid__name">{{ labels[col.name] ?? col.name }}</span>
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
