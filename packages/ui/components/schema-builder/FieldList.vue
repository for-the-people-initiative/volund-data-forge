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
  <FtpPanel header="Velden">
    <template #header>
      <div class="sb-fields__header">
        <h4>Velden</h4>
        <FtpButton label="+ Veld toevoegen" variant="secondary" size="sm" @click="emit('add')" />
      </div>
    </template>

    <div ref="listRef" class="sb-fields__list">
      <div v-for="field in localFields" :key="field.name || Math.random()" class="sb-field">
        <span class="sb-field__handle" title="Sleep om te verplaatsen" aria-label="Versleep om volgorde te wijzigen" role="img">≡</span>
        <span class="sb-field__name">{{ field.name || '(naamloos)' }}</span>
        <FtpTag :value="typeLabels[field.type] || field.type" severity="info" />
        <FtpTag v-if="field.required" value="verplicht" severity="warn" />
        <div class="sb-field__actions">
          <FtpButton label="✎" variant="secondary" size="sm" :aria-label="`Bewerk ${field.name || 'veld'}`" @click="emit('edit', field.name)" />
          <FtpButton label="✕" variant="secondary" size="sm" :aria-label="`Verwijder ${field.name || 'veld'}`" @click="emit('remove', field.name)" />
        </div>
      </div>
    </div>
    <p v-if="!fields.length" class="sb-fields__empty">
      Nog geen velden. Klik op "+ Veld toevoegen".
    </p>
  </FtpPanel>
</template>

<style scoped>
.sb-fields__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.sb-fields__header h4 {
  margin: 0;
  color: var(--text-heading);
  font-size: 0.9rem;
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
  color: var(--text-secondary);
  user-select: none;
}

.sb-field__name {
  flex: 1;
  color: var(--text-default);
  font-size: 0.85rem;
}

.sb-field__actions {
  display: flex;
  gap: var(--space-2xs, 4px);
}

.sb-fields__empty {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-align: center;
  margin: var(--space-m, 16px) 0 0;
}
</style>
