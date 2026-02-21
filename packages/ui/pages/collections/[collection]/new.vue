<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)

const { schema } = useSchema(collection.value)

const capitalize = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const singularName = computed(() => {
  const name = (schema.value as any)?.singularName || collection.value
  return capitalize(name)
})

const capitalizedCollection = computed(() => {
  return capitalize(collection.value)
})
</script>

<template>
  <div>
    <NuxtLink :to="`/collections/${collection}`">
      <FtpButton :label="`← Terug naar ${capitalizedCollection}`" variant="secondary" size="sm" />
    </NuxtLink>
    <h1>{{ singularName }} toevoegen</h1>
    <NuxtErrorBoundary>
      <DataForm :collection="collection" />
      <template #error="{ error, clearError }">
        <ErrorFallback label="Het formulier" @retry="clearError" />
      </template>
    </NuxtErrorBoundary>
  </div>
</template>

<style scoped>
h1 {
  color: var(--text-heading);
  margin: var(--space-s) 0 var(--space-m);
}
</style>
