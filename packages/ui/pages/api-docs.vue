<script setup lang="ts">
definePageMeta({
  layout: 'data-engine',
})

const { activeSchema } = useDbSchema()

const specUrl = computed(() => {
  const base = '/api/openapi.json'
  return activeSchema.value ? `${base}?schema=${activeSchema.value}` : base
})
</script>

<template>
  <div class="api-docs">
    <ClientOnly>
      <SwaggerUi :spec-url="specUrl" />
      <template #fallback>
        <p>Loading API documentation...</p>
      </template>
    </ClientOnly>
  </div>
</template>

<style scoped>
.api-docs {
  margin: calc(-1 * var(--space-l, 28px));
  min-height: 100vh;
}
</style>
