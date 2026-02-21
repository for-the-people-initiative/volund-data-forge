<script setup lang="ts">
import type { FieldDefinition, RelationDefinition } from '@data-engine/schema'

const props = defineProps<{
  field: FieldDefinition
  isNew: boolean
  availableTargets: string[]
  errors: string[]
  activeCollectionName: string
  /** All fields of current collection (for lookup configurator) */
  collectionFields?: FieldDefinition[]
  /** All schemas (for lookup configurator to find target fields) */
  allSchemas?: Array<{ name: string; fields: FieldDefinition[] }>
}>()

const emit = defineEmits<{ save: [field: FieldDefinition]; cancel: [] }>()

const local = reactive<FieldDefinition>({
  name: props.field.name,
  type: props.field.type,
  required: props.field.required ?? false,
  unique: props.field.unique ?? false,
  default: props.field.default,
  options: props.field.options ? [...props.field.options] : [],
  relation: props.field.relation ? { ...props.field.relation } : undefined,
  lookup: props.field.lookup ? { ...props.field.lookup } : undefined,
  computed: props.field.computed ? { ...props.field.computed } : undefined,
})

// Available field names for formula autocomplete (exclude current computed field)
const availableFieldNames = computed(() => {
  return (props.collectionFields ?? [])
    .filter((f) => f.name !== local.name && f.type !== 'computed')
    .map((f) => f.name)
})

function insertFieldRef(fieldName: string) {
  local.computed = local.computed ?? { formula: '', returnType: 'text' }
  local.computed.formula += `{${fieldName}}`
}

function onRelationUpdate(relation: RelationDefinition) {
  local.relation = relation
}

function onLookupUpdate(lookup: { relation: string; field: string }) {
  local.lookup = lookup
}

watch(
  () => props.field,
  (f) => {
    Object.assign(local, {
      ...f,
      options: f.options ? [...f.options] : [],
      relation: f.relation ? { ...f.relation } : undefined,
      lookup: f.lookup ? { ...f.lookup } : undefined,
      computed: f.computed ? { ...f.computed } : undefined,
    })
  },
  { deep: true },
)

const typeLabel: Record<string, string> = {
  text: 'Tekst',
  integer: 'Geheel getal',
  float: 'Kommagetal',
  boolean: 'Boolean',
  datetime: 'Datum/tijd',
  select: 'Selectie',
  email: 'Email',
  relation: 'Koppeling',
  lookup: 'Ophalen',
  computed: 'Berekend',
}

const drawerVisible = ref(true)

const booleanDefaultOptions = [
  { label: 'Geen', value: undefined },
  { label: 'Waar', value: true },
  { label: 'Onwaar', value: false },
]

const computedReturnTypeOptions = [
  { label: 'Tekst', value: 'text' },
  { label: 'Getal', value: 'number' },
]

function save() {
  emit('save', { ...toRaw(local) })
}

function onClose() {
  emit('cancel')
}
</script>

<template>
  <FtpDrawer
    :visible="drawerVisible"
    :header="`${isNew ? 'Nieuw veld' : 'Veld bewerken'} — ${typeLabel[local.type] || local.type}`"
    @update:visible="onClose"
  >
    <div class="sb-drawer-content">
      <FtpMessage v-if="errors.length" severity="error">
        <p v-for="e in errors" :key="e" class="sb-drawer__error-line">⚠️ {{ e }}</p>
      </FtpMessage>

      <label for="sb-field-name" class="sb-drawer__label">Veldnaam</label>
      <FtpInputText id="sb-field-name" v-model="local.name" />

      <div v-if="local.type !== 'lookup' && local.type !== 'computed'" class="sb-drawer__toggles">
        <FtpCheckbox v-model="local.required" label="Verplicht" />
        <FtpCheckbox v-model="local.unique" label="Uniek" />
      </div>

      <template v-if="local.type !== 'relation' && local.type !== 'lookup' && local.type !== 'computed'">
        <label for="sb-field-default" class="sb-drawer__label">Standaardwaarde</label>
        <FtpInputText
          v-if="local.type !== 'boolean'"
          id="sb-field-default"
          v-model="local.default"
        />
        <FtpSelect
          v-else
          id="sb-field-default"
          v-model="local.default"
          :options="booleanDefaultOptions"
          placeholder="Geen"
        />
      </template>

      <template v-if="local.type === 'select'">
        <SchemaBuilderSelectOptionsEditor
          :options="local.options || []"
          @update:options="local.options = $event"
        />
      </template>

      <template v-if="local.type === 'lookup'">
        <SchemaBuilderLookupConfigurator
          :lookup="local.lookup"
          :collection-fields="props.collectionFields ?? []"
          :all-schemas="props.allSchemas ?? []"
          @update:lookup="onLookupUpdate"
        />
      </template>

      <template v-if="local.type === 'computed'">
        <label class="sb-drawer__label">Formule</label>
        <FtpInputText
          v-model="local.computed!.formula"
          @focus="local.computed = local.computed ?? { formula: '', returnType: 'text' }"
        />
        <div v-if="availableFieldNames.length" class="sb-drawer__field-chips">
          <span class="sb-drawer__label">Beschikbare velden:</span>
          <div class="sb-drawer__chips">
            <FtpTag
              v-for="fn in availableFieldNames"
              :key="fn"
              :value="fn"
              severity="info"
              class="sb-drawer__chip"
              @click="insertFieldRef(fn)"
            />
          </div>
        </div>
        <label class="sb-drawer__label">Resultaattype</label>
        <FtpSelect
          v-model="local.computed!.returnType"
          :options="computedReturnTypeOptions"
          @focus="local.computed = local.computed ?? { formula: '', returnType: 'text' }"
        />
      </template>

      <template v-if="local.type === 'relation'">
        <SchemaBuilderRelationConfigurator
          :relation="local.relation"
          :source-collection="activeCollectionName"
          :available-targets="availableTargets"
          @update:relation="onRelationUpdate"
        />
      </template>

      <div class="sb-drawer__actions">
        <FtpButton :label="isNew ? 'Toevoegen' : 'Opslaan'" variant="primary" @click="save" />
        <FtpButton label="Annuleren" variant="secondary" @click="emit('cancel')" />
      </div>
    </div>
  </FtpDrawer>
</template>

<style scoped>
.sb-drawer-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.sb-drawer__error-line {
  margin: 0;
  font-size: 0.8rem;
}

.sb-drawer__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.sb-drawer__toggles {
  display: flex;
  gap: var(--space-m, 16px);
}

.sb-drawer__field-chips {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.sb-drawer__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs, 4px);
}

.sb-drawer__chip {
  cursor: pointer;
}

.sb-drawer__actions {
  display: flex;
  gap: var(--space-s, 10px);
  margin-top: var(--space-m, 16px);
}
</style>
