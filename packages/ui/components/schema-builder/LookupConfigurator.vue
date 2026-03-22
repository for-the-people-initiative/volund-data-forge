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
  props.collectionFields.filter((f) => f.type === 'relation' && f.relation?.target),
)

const relationOptions = computed(() =>
  relationFields.value.map((f) => ({
    label: `${f.name} → ${f.relation?.target}`,
    value: f.name,
  })),
)

// Once a relation is chosen, find the target collection's fields
const targetFields = computed(() => {
  if (!selectedRelation.value) return []
  const relField = relationFields.value.find((f) => f.name === selectedRelation.value)
  if (!relField?.relation?.target) return []
  const targetSchema = props.allSchemas.find((s) => s.name === relField.relation!.target)
  if (!targetSchema) return []
  return targetSchema.fields.filter(
    (f) =>
      !['id', 'created_at', 'updated_at'].includes(f.name) &&
      f.type !== 'relation' &&
      f.type !== 'lookup',
  )
})

const targetFieldOptions = computed(() =>
  targetFields.value.map((f) => ({ label: f.name, value: f.name })),
)

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
watch(
  () => props.lookup,
  (l) => {
    if (l) {
      selectedRelation.value = l.relation
      selectedField.value = l.field
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="sb-lookup">
    <FtpFormField label="Koppeling-veld">
      <FtpSelect
        v-model="selectedRelation"
        :options="relationOptions"
      />
    </FtpFormField>

    <FtpMessage v-if="!relationFields.length" severity="info">
      Voeg eerst een koppeling-veld toe om data op te halen.
    </FtpMessage>

    <template v-if="selectedRelation && targetFields.length">
      <FtpFormField label="Veld ophalen">
        <FtpSelect
          v-model="selectedField"
          :options="targetFieldOptions"
        />
      </FtpFormField>
    </template>

    <FtpMessage v-if="selectedRelation && selectedField" severity="info">
      📋 Haalt <strong>{{ selectedField }}</strong> op via <strong>{{ selectedRelation }}</strong>
    </FtpMessage>
  </div>
</template>

<style scoped>
.sb-lookup {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}
</style>
