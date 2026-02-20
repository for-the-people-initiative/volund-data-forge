<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

defineProps<{
  collections: CollectionSchema[]
  activeName: string | null
}>()

const emit = defineEmits<{
  select: [name: string]
  create: []
  delete: [name: string]
}>()
</script>

<template>
  <aside class="sb-collections">
    <div class="sb-collections__header">
      <h3>Collecties</h3>
      <button class="sb-btn sb-btn--small" @click="emit('create')">+ Nieuw</button>
    </div>
    <ul class="sb-collections__list">
      <li
        v-for="col in collections"
        :key="col.name"
        class="sb-collections__item"
        :class="{ 'sb-collections__item--active': col.name === activeName }"
        @click="emit('select', col.name)"
      >
        <span class="sb-collections__name">{{ col.name }}</span>
        <button
          class="sb-collections__delete"
          title="Verwijderen"
          @click.stop="emit('delete', col.name)"
        >
          ✕
        </button>
      </li>
    </ul>
    <p v-if="!collections.length" class="sb-collections__empty">Nog geen collecties</p>
  </aside>
</template>

<style scoped>
.sb-collections {
  width: 200px;
  flex-shrink: 0;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
}

.sb-collections__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-s, 10px);
}

.sb-collections__header h3 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-heading, #fff);
}

.sb-btn {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-default, #fff);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  cursor: pointer;
  font-size: 0.8rem;
}
.sb-btn:hover {
  background: var(--surface-hover, #2d3566);
}

.sb-btn--small {
  font-size: 0.75rem;
}

.sb-collections__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.sb-collections__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  cursor: pointer;
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.85rem;
}
.sb-collections__item:hover {
  background: var(--surface-muted, #060813);
}
.sb-collections__item--active {
  background: var(--surface-muted, #060813);
  color: var(--text-default, #fff);
}

.sb-collections__delete {
  background: none;
  border: none;
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0;
  transition: opacity 0.15s;
}
.sb-collections__item:hover .sb-collections__delete {
  opacity: 1;
}
.sb-collections__delete:hover {
  color: var(--text-error, #ff6b6b);
}

.sb-collections__empty {
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8rem;
  text-align: center;
  margin-top: var(--space-m, 16px);
}
</style>
