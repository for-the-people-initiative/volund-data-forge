<script setup lang="ts">
import type { RelationDefinition, RelationType, OnDeletePolicy } from '@data-engine/schema'

const props = defineProps<{
  relation: RelationDefinition | undefined
  sourceCollection: string
  availableTargets: string[]
}>()

const emit = defineEmits<{ 'update:relation': [relation: RelationDefinition] }>()

const target = ref(props.relation?.target ?? '')
const maxOne = ref(props.relation?.type === 'manyToOne' || props.relation?.type === 'oneToOne')
const deletePolicy = ref<'none' | 'cascade' | 'restrict'>(
  props.relation?.onDelete === 'cascade' ? 'cascade'
    : props.relation?.onDelete === 'restrict' ? 'restrict'
    : 'none'
)
const showAdvanced = ref(false)
const selfRefWarning = ref(false)

// Filter out current collection from targets, but allow self-reference with warning
const filteredTargets = computed(() => props.availableTargets)

watch(target, (val) => {
  selfRefWarning.value = val === props.sourceCollection
  emitRelation()
})

watch(maxOne, () => emitRelation())
watch(deletePolicy, () => emitRelation())

// Initialize from props
watch(() => props.relation, (r) => {
  if (r) {
    target.value = r.target
    maxOne.value = r.type === 'manyToOne' || r.type === 'oneToOne'
    deletePolicy.value = r.onDelete === 'cascade' ? 'cascade'
      : r.onDelete === 'restrict' ? 'restrict'
      : 'none'
  }
}, { immediate: true })

function emitRelation() {
  if (!target.value) return
  const type: RelationType = maxOne.value ? 'manyToOne' : 'manyToMany'
  const foreignKey = `${props.sourceCollection}_${target.value}_fk`
  const onDelete: OnDeletePolicy | undefined =
    deletePolicy.value === 'cascade' ? 'cascade'
      : deletePolicy.value === 'restrict' ? 'restrict'
      : undefined  // default (setNull) — omit from schema
  const relation: RelationDefinition = {
    target: target.value,
    type,
    foreignKey,
    ...(onDelete && { onDelete }),
  }
  if (type === 'manyToMany') {
    relation.junctionTable = `${props.sourceCollection}_${target.value}`
  }
  emit('update:relation', relation)
}
</script>

<template>
  <div class="sb-relation">
    <label class="sb-relation__label">Doeltabel</label>
    <select v-model="target" class="sb-relation__select">
      <option value="" disabled>Kies een collectie…</option>
      <option v-for="t in filteredTargets" :key="t" :value="t">{{ t }}</option>
    </select>

    <p v-if="selfRefWarning" class="sb-relation__warning">
      ⚠️ Je koppelt deze collectie aan zichzelf. Dit kan nuttig zijn (bijv. hiërarchie), maar controleer of dit de bedoeling is.
    </p>

    <p v-if="!filteredTargets.length" class="sb-relation__hint">
      Maak eerst een andere collectie aan om een koppeling te maken.
    </p>

    <SchemaBuilderRelationDiagram
      v-if="target"
      :source-collection="sourceCollection"
      :target-collection="target"
      :max-one="maxOne"
    />

    <button
      class="sb-relation__advanced-toggle"
      @click="showAdvanced = !showAdvanced"
    >
      {{ showAdvanced ? '▾ Geavanceerd' : '▸ Geavanceerd' }}
    </button>

    <div v-if="showAdvanced" class="sb-relation__advanced">
      <label class="sb-relation__toggle-label">
        <input type="checkbox" v-model="maxOne" />
        Maximaal één koppeling per record
      </label>

      <label class="sb-relation__label">Wat gebeurt er bij verwijderen?</label>
      <select v-model="deletePolicy" class="sb-relation__select">
        <option value="none">Niets doen</option>
        <option value="cascade">Ook verwijderen</option>
        <option value="restrict">Blokkeren</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.sb-relation {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.sb-relation__label {
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
}

.sb-relation__select {
  width: 100%;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.85rem;
  box-sizing: border-box;
}
.sb-relation__select:focus {
  outline: none;
  border-color: var(--border-focus, #4a6cf7);
}

.sb-relation__warning {
  margin: 0;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: rgba(255, 170, 0, 0.1);
  border: 1px solid rgba(255, 170, 0, 0.3);
  border-radius: var(--radius-default, 5px);
  color: #ffaa00;
  font-size: 0.8rem;
}

.sb-relation__hint {
  margin: 0;
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.8rem;
  font-style: italic;
}

.sb-relation__advanced-toggle {
  background: none;
  border: none;
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  text-align: left;
}
.sb-relation__advanced-toggle:hover {
  color: var(--text-default, #fff);
}

.sb-relation__advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
  padding: var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
}

.sb-relation__toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.85rem;
  cursor: pointer;
}
</style>
