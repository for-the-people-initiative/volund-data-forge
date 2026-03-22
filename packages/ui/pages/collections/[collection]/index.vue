<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const router = useRouter()
const collection = computed(() => route.params.collection as string)

const activeTab = ref<'records' | 'structure'>('records')

const { schema } = useSchema(collection.value)

const capitalize = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const collectionName = computed(() => {
  const name = (schema.value as any)?.name || collection.value
  return capitalize(name)
})

const singularName = computed(() => {
  const name = (schema.value as any)?.singularName || collection.value
  return capitalize(name)
})

function onSchemaSaved(_name: string) {
  refreshNuxtData('sidebar-collections')
  refreshNuxtData('collections-list')
  // Switch back to records to see updated data
  activeTab.value = 'records'
}

function onSchemaDeleted(_name: string) {
  refreshNuxtData('sidebar-collections')
  refreshNuxtData('collections-list')
  router.replace('/')
}
</script>

<template>
  <div>
    <div class="collection-header">
      <h1 class="collection-header__title">{{ collectionName }}</h1>
      <div class="collection-header__actions">
        <NuxtLink v-if="activeTab === 'records'" :to="`/collections/${collection}/new`">
          <FtpButton :label="`${singularName} toevoegen`" variant="primary" size="sm" />
        </NuxtLink>
      </div>
    </div>

    <div class="collection-tabs">
      <FtpButton
        class="collection-tabs__tab"
        :class="{ 'collection-tabs__tab--active': activeTab === 'records' }"
        variant="secondary"
        size="sm"
        @click="activeTab = 'records'"
      >
        Records
      </FtpButton>
      <FtpButton
        class="collection-tabs__tab"
        :class="{ 'collection-tabs__tab--active': activeTab === 'structure' }"
        variant="secondary"
        size="sm"
        @click="activeTab = 'structure'"
      >
        Structuur
      </FtpButton>
    </div>

    <NuxtErrorBoundary v-if="activeTab === 'records'">
      <DataTable :collection="collection" :page-size="20" />
      <template #error="{ error, clearError }">
        <ErrorFallback label="De tabel" @retry="clearError" />
      </template>
    </NuxtErrorBoundary>

    <NuxtErrorBoundary v-if="activeTab === 'structure'">
      <SchemaBuilderContainer
        :initial-collection="collection"
        @saved="onSchemaSaved"
        @deleted="onSchemaDeleted"
      />
      <template #error="{ error, clearError }">
        <ErrorFallback label="De Schema Builder" @retry="clearError" />
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

.collection-tabs {
  display: flex;
  gap: var(--space-xs, 4px);
  margin-bottom: var(--space-m, 16px);
  border-bottom: 1px solid var(--border-default);
}

.collection-tabs__tab {
  padding: var(--space-s, 10px) var(--space-m, 16px);
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.collection-tabs__tab:hover {
  color: var(--text-default);
}

.collection-tabs__tab--active {
  color: var(--intent-action-default);
  border-bottom-color: var(--intent-action-default);
  font-weight: 600;
}
</style>
