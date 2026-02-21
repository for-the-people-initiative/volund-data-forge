<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)

const { schema } = useSchema(collection.value)

// Fallback labels for backward compatibility
const labels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}

const capitalize = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const collectionName = computed(() => {
  const name = (schema.value as any)?.name || labels[collection.value] || collection.value
  return capitalize(name)
})

const singularName = computed(() => {
  const name = (schema.value as any)?.singularName || labels[collection.value] || collection.value
  return capitalize(name)
})
</script>

<template>
  <div>
    <div class="collection-header">
      <h1 class="collection-header__title">{{ collectionName }}</h1>
      <div class="collection-header__actions">
        <NuxtLink :to="`/builder?collection=${collection}`">
          <FtpButton label="✎ Schema bewerken" variant="secondary" size="sm" />
        </NuxtLink>
        <NuxtLink :to="`/collections/${collection}/new`">
          <FtpButton :label="`${singularName} toevoegen`" variant="primary" size="sm" />
        </NuxtLink>
      </div>
    </div>
    <NuxtErrorBoundary>
      <DataTable :collection="collection" :page-size="20" />
      <template #error="{ error, clearError }">
        <ErrorFallback label="De tabel" @retry="clearError" />
      </template>
    </NuxtErrorBoundary>
  </div>
</template>

<style scoped>
.collection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-m, 16px);
}

.collection-header__title {
  color: var(--text-heading);
  margin: 0;
}

.collection-header__actions {
  display: flex;
  gap: var(--space-s, 10px);
}
</style>
