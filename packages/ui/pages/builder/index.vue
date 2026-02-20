<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const router = useRouter()

const initialCollection = computed(() => route.query.collection as string | undefined)

function onSaved(name: string) {
  // Update URL to edit mode if it was a new collection
  if (!route.query.collection) {
    router.replace({ query: { collection: name } })
  }
  // Trigger sidebar + dashboard refresh
  refreshNuxtData('sidebar-collections')
  refreshNuxtData('collections-list')
}

function onDeleted(_name: string) {
  router.replace({ path: '/builder' })
  refreshNuxtData('sidebar-collections')
  refreshNuxtData('collections-list')
}
</script>

<template>
  <NuxtErrorBoundary>
    <SchemaBuilderContainer
      :initial-collection="initialCollection"
      @saved="onSaved"
      @deleted="onDeleted"
    />
    <template #error="{ error, clearError }">
      <ErrorFallback label="De Schema Builder" @retry="clearError" />
    </template>
  </NuxtErrorBoundary>
</template>
