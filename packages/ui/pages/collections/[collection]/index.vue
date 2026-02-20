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
      <div class="collection-header__actions">
        <NuxtLink :to="`/builder?collection=${collection}`" class="collection-header__btn collection-header__btn--edit">
          ✎ Bewerken
        </NuxtLink>
        <NuxtLink :to="`/collections/${collection}/new`" class="collection-header__btn">+ Nieuw</NuxtLink>
      </div>
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

.collection-header__actions {
  display: flex;
  gap: var(--space-s, 10px);
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

.collection-header__btn--edit {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-default, #fff);
  border: 1px solid var(--border-subtle, #1a2244);
}

.collection-header__btn--edit:hover {
  background: var(--surface-hover, #2d3566);
}
</style>
