<script setup lang="ts">
import type { FieldDefinition } from '@data-engine/schema'
import { useDraggable } from 'vue-draggable-plus'

const props = defineProps<{ fields: FieldDefinition[] }>()
const emit = defineEmits<{
  add: []
  edit: [name: string]
  remove: [name: string]
  reorder: [fields: FieldDefinition[]]
}>()

const listRef = ref<HTMLElement | null>(null)
const localFields = ref([...props.fields])

watch(
  () => props.fields,
  (f) => {
    localFields.value = [...f]
  },
  { deep: true },
)

useDraggable(listRef, localFields, {
  handle: '.sb-field__handle',
  animation: 150,
  onEnd: () => {
    emit('reorder', [...localFields.value])
  },
})

const typeLabels: Record<string, string> = {
  text: 'tekst',
  integer: 'geheel',
  float: 'komma',
  boolean: 'boolean',
  datetime: 'datum',
  select: 'selectie',
  email: 'email',
  relation: 'koppeling',
  lookup: 'ophalen',
}
</script>

<template>
  <div class="sb-fields">
    <div class="sb-fields__header">
      <h4>Velden</h4>
      <button class="sb-btn" @click="emit('add')">+ Veld toevoegen</button>
    </div>
    <div ref="listRef" class="sb-fields__list">
      <div v-for="field in localFields" :key="field.name || Math.random()" class="sb-field">
        <span class="sb-field__handle" title="Sleep om te verplaatsen" aria-label="Versleep om volgorde te wijzigen" role="img">≡</span>
        <span class="sb-field__name">{{ field.name || '(naamloos)' }}</span>
        <span class="sb-field__type">{{ typeLabels[field.type] || field.type }}</span>
        <span v-if="field.required" class="sb-field__badge">verplicht</span>
        <div class="sb-field__actions">
          <button @click="emit('edit', field.name)" :aria-label="`Bewerk ${field.name || 'veld'}`">✎</button>
          <button @click="emit('remove', field.name)" :aria-label="`Verwijder ${field.name || 'veld'}`">✕</button>
        </div>
      </div>
    </div>
    <p v-if="!fields.length" class="sb-fields__empty">
      Nog geen velden. Klik op "+ Veld toevoegen".
    </p>
  </div>
</template>

<style scoped>
.sb-fields {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
}

.sb-fields__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-s, 10px);
}

.sb-fields__header h4 {
  margin: 0;
  color: var(--text-heading, #fff);
  font-size: 0.9rem;
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

.sb-fields__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.sb-field {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
}

.sb-field__handle {
  cursor: grab;
  color: var(--text-secondary, #9ea5c2);
  user-select: none;
}

.sb-field__name {
  flex: 1;
  color: var(--text-default, #fff);
  font-size: 0.85rem;
}

.sb-field__type {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-secondary, #9ea5c2);
  padding: 2px 8px;
  border-radius: var(--radius-default, 5px);
  font-size: 0.75rem;
}

.sb-field__badge {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-accent, #4a6cf7);
  padding: 2px 6px;
  border-radius: var(--radius-default, 5px);
  font-size: 0.7rem;
}

.sb-field__actions {
  display: flex;
  gap: var(--space-2xs, 4px);
}

.sb-field__actions button {
  background: none;
  border: none;
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
  font-size: 0.85rem;
}
.sb-field__actions button:hover {
  color: var(--text-default, #fff);
}
.sb-field__actions button:focus-visible,
.sb-btn:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

.sb-fields__empty {
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8rem;
  text-align: center;
  margin: var(--space-m, 16px) 0 0;
}
</style>
