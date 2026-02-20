<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)
</script>

<template>
  <div>
    <NuxtLink :to="`/collections/${collection}`" class="back-link">← Terug naar {{ collection }}</NuxtLink>
    <h1>Nieuw {{ collection }} record</h1>
    <DataForm :collection="collection" />
  </div>
</template>

<style scoped>
.back-link {
  color: var(--text-link);
  text-decoration: none;
  font-size: 0.875rem;
}
.back-link:hover {
  color: var(--text-linkHover);
}
h1 {
  color: var(--text-heading);
  margin: var(--space-s) 0 var(--space-m);
}
</style>
