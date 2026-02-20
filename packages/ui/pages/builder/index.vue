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
  // Trigger sidebar refresh
  refreshNuxtData('collections-list')
}

function onDeleted(_name: string) {
  router.replace({ path: '/builder' })
  refreshNuxtData('collections-list')
}
</script>

<template>
  <SchemaBuilderContainer
    :initial-collection="initialCollection"
    @saved="onSaved"
    @deleted="onDeleted"
  />
</template>
