<script setup lang="ts">
/**
 * Configurator for lookup fields.
 * Step 1: Choose an existing relation field in this collection.
 * Step 2: Choose which field from the target collection to fetch.
 */
import type { FieldDefinition } from '@data-engine/schema'

const props = defineProps<{
  lookup: { relation: string; field: string } | undefined
  /** All fields of the current collection (to find relation fields) */
  collectionFields: FieldDefinition[]
  /** All collection schemas available (to look up target fields) */
  allSchemas: Array<{ name: string; fields: FieldDefinition[] }>
}>()

const emit = defineEmits<{ 'update:lookup': [lookup: { relation: string; field: string }] }>()

const selectedRelation = ref(props.lookup?.relation ?? '')
const selectedField = ref(props.lookup?.field ?? '')

// Only show relation-type fields from the current collection
const relationFields = computed(() =>
  props.collectionFields.filter(f => f.type === 'relation' && f.relation?.target)
)

// Once a relation is chosen, find the target collection's fields
const targetFields = computed(() => {
  if (!selectedRelation.value) return []
  const relField = relationFields.value.find(f => f.name === selectedRelation.value)
  if (!relField?.relation?.target) return []
  const targetSchema = props.allSchemas.find(s => s.name === relField.relation!.target)
  if (!targetSchema) return []
  // Exclude system fields and relation/lookup fields
  return targetSchema.fields.filter(f =>
    !['id', 'created_at', 'updated_at'].includes(f.name) &&
    f.type !== 'relation' &&
    f.type !== 'lookup'
  )
})

watch([selectedRelation, selectedField], ([rel, field]) => {
  if (rel && field) {
    emit('update:lookup', { relation: rel, field })
  }
})

// Reset field when relation changes
watch(selectedRelation, () => {
  selectedField.value = ''
})

// Init from props
watch(() => props.lookup, (l) => {
  if (l) {
    selectedRelation.value = l.relation
    selectedField.value = l.field
  }
}, { immediate: true })
</script>

<template>
  <div class="sb-lookup">
    <label class="sb-lookup__label">Koppeling-veld</label>
    <select v-model="selectedRelation" class="sb-lookup__select">
      <option value="" disabled>Kies een koppeling…</option>
      <option v-for="f in relationFields" :key="f.name" :value="f.name">
        {{ f.name }} → {{ f.relation?.target }}
      </option>
    </select>

    <p v-if="!relationFields.length" class="sb-lookup__hint">
      Voeg eerst een koppeling-veld toe om data op te halen.
    </p>

    <template v-if="selectedRelation && targetFields.length">
      <label class="sb-lookup__label">Veld ophalen</label>
      <select v-model="selectedField" class="sb-lookup__select">
        <option value="" disabled>Kies een veld…</option>
        <option v-for="f in targetFields" :key="f.name" :value="f.name">
          {{ f.name }}
        </option>
      </select>
    </template>

    <p v-if="selectedRelation && selectedField" class="sb-lookup__preview">
      📋 Haalt <strong>{{ selectedField }}</strong> op via <strong>{{ selectedRelation }}</strong>
    </p>
  </div>
</template>

<style scoped>
.sb-lookup {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.sb-lookup__label {
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
}

.sb-lookup__select {
  width: 100%;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.85rem;
  box-sizing: border-box;
}
.sb-lookup__select:focus {
  outline: none;
  border-color: var(--border-focus, #4a6cf7);
}

.sb-lookup__hint {
  margin: 0;
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8rem;
  font-style: italic;
}

.sb-lookup__preview {
  margin: 0;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: rgba(74, 108, 247, 0.1);
  border: 1px solid rgba(74, 108, 247, 0.3);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8rem;
}
</style>
