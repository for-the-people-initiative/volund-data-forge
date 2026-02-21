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
  props.relation?.onDelete === 'cascade'
    ? 'cascade'
    : props.relation?.onDelete === 'restrict'
      ? 'restrict'
      : 'none',
)
const showAdvanced = ref(false)
const selfRefWarning = ref(false)

const filteredTargets = computed(() => props.availableTargets)

const targetOptions = computed(() =>
  filteredTargets.value.map((t) => ({ label: t, value: t })),
)

const deletePolicyOptions = [
  { label: 'Niets doen', value: 'none' },
  { label: 'Ook verwijderen', value: 'cascade' },
  { label: 'Blokkeren', value: 'restrict' },
]

watch(target, (val) => {
  selfRefWarning.value = val === props.sourceCollection
  emitRelation()
})

watch(maxOne, () => emitRelation())
watch(deletePolicy, () => emitRelation())

// Initialize from props
watch(
  () => props.relation,
  (r) => {
    if (r) {
      target.value = r.target
      maxOne.value = r.type === 'manyToOne' || r.type === 'oneToOne'
      deletePolicy.value =
        r.onDelete === 'cascade' ? 'cascade' : r.onDelete === 'restrict' ? 'restrict' : 'none'
    }
  },
  { immediate: true },
)

function emitRelation() {
  if (!target.value) return
  const type: RelationType = maxOne.value ? 'manyToOne' : 'manyToMany'
  const foreignKey = `${props.sourceCollection}_${target.value}_fk`
  const onDelete: OnDeletePolicy | undefined =
    deletePolicy.value === 'cascade'
      ? 'cascade'
      : deletePolicy.value === 'restrict'
        ? 'restrict'
        : undefined
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
    <FtpSelect
      v-model="target"
      :options="targetOptions"
    />

    <FtpMessage v-if="selfRefWarning" severity="warn">
      ⚠️ Je koppelt deze collectie aan zichzelf. Dit kan nuttig zijn (bijv. hiërarchie), maar
      controleer of dit de bedoeling is.
    </FtpMessage>

    <FtpMessage v-if="!filteredTargets.length" severity="info">
      Maak eerst een andere collectie aan om een koppeling te maken.
    </FtpMessage>

    <SchemaBuilderRelationDiagram
      v-if="target"
      :source-collection="sourceCollection"
      :target-collection="target"
      :max-one="maxOne"
    />

    <FtpButton
      :label="showAdvanced ? '▾ Geavanceerd' : '▸ Geavanceerd'"
      variant="secondary"
      size="sm"
      @click="showAdvanced = !showAdvanced"
    />

    <FtpPanel v-if="showAdvanced" header="Geavanceerd">
      <div class="sb-relation__advanced">
        <FtpCheckbox v-model="maxOne" label="Maximaal één koppeling per record" />

        <label class="sb-relation__label">Wat gebeurt er bij verwijderen?</label>
        <FtpSelect
          v-model="deletePolicy"
          :options="deletePolicyOptions"
        />
      </div>
    </FtpPanel>
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
  color: var(--text-secondary);
}

.sb-relation__advanced {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}
</style>
