<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)

const labels: Record<string, string> = {
  contacts: 'Contacten',
  companies: 'Bedrijven',
}
</script>

<template>
  <div>
    <div class="collection-header">
      <h1 class="collection-header__title">{{ labels[collection] ?? collection }}</h1>
      <NuxtLink :to="`/collections/${collection}/new`" class="collection-header__btn">+ Nieuw</NuxtLink>
    </div>
    <DataTable :collection="collection" :page-size="20" />
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
  color: var(--text-heading, #fff);
  margin: 0;
}

.collection-header__btn {
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border-radius: var(--radius-default, 5px);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
}

.collection-header__btn:hover {
  background: var(--intent-action-hover, #ea580c);
}
</style>
