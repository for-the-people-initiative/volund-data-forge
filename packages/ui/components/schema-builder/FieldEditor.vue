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

function save() {
  emit('save', { ...toRaw(local) })
}
</script>

<template>
  <Teleport to="body">
    <div class="sb-drawer-overlay" @click.self="emit('cancel')" @keydown.escape="emit('cancel')">
      <div class="sb-drawer" role="dialog" aria-modal="true" aria-labelledby="sb-drawer-title">
        <h3 id="sb-drawer-title">
          {{ isNew ? 'Nieuw veld' : 'Veld bewerken' }} — {{ typeLabel[local.type] || local.type }}
        </h3>

        <div v-if="errors.length" class="sb-drawer__errors">
          <p v-for="e in errors" :key="e">⚠️ {{ e }}</p>
        </div>

        <label for="sb-field-name" class="sb-drawer__label">Veldnaam</label>
        <input id="sb-field-name" v-model="local.name" class="sb-drawer__input" placeholder="bijv. voornaam" />

        <div v-if="local.type !== 'lookup' && local.type !== 'computed'" class="sb-drawer__toggles">
          <label><input type="checkbox" v-model="local.required" /> Verplicht</label>
          <label><input type="checkbox" v-model="local.unique" /> Uniek</label>
        </div>

        <template v-if="local.type !== 'relation' && local.type !== 'lookup' && local.type !== 'computed'">
          <label for="sb-field-default" class="sb-drawer__label">Standaardwaarde</label>
          <input
            v-if="local.type !== 'boolean'"
            id="sb-field-default"
            v-model="local.default"
            class="sb-drawer__input"
            placeholder="Optioneel"
          />
          <select v-else id="sb-field-default" v-model="local.default" class="sb-drawer__input">
            <option :value="undefined">Geen</option>
            <option :value="true">Waar</option>
            <option :value="false">Onwaar</option>
          </select>
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
          <input
            v-model="local.computed!.formula"
            class="sb-drawer__input"
            placeholder="bijv. {price} * {quantity}"
            @focus="local.computed = local.computed ?? { formula: '', returnType: 'text' }"
          />
          <div v-if="availableFieldNames.length" class="sb-drawer__field-chips">
            <span class="sb-drawer__label">Beschikbare velden:</span>
            <div class="sb-drawer__chips">
              <button
                v-for="fn in availableFieldNames"
                :key="fn"
                type="button"
                class="sb-drawer__chip"
                @click="insertFieldRef(fn)"
              >
                {{ fn }}
              </button>
            </div>
          </div>
          <label class="sb-drawer__label">Resultaattype</label>
          <select
            v-model="local.computed!.returnType"
            class="sb-drawer__input"
            @focus="local.computed = local.computed ?? { formula: '', returnType: 'text' }"
          >
            <option value="text">Tekst</option>
            <option value="number">Getal</option>
          </select>
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
          <button class="sb-btn sb-btn--primary" @click="save">
            {{ isNew ? 'Toevoegen' : 'Opslaan' }}
          </button>
          <button class="sb-btn" @click="emit('cancel')">Annuleren</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sb-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: flex-end;
  z-index: 101;
}

.sb-drawer {
  width: 380px;
  background: var(--surface-panel, #11162d);
  border-left: 1px solid var(--border-subtle, #1a2244);
  padding: var(--space-l, 28px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.sb-drawer h3 {
  margin: 0;
  color: var(--text-heading, #fff);
  font-size: 1rem;
}

.sb-drawer__errors p {
  color: var(--text-error, #ff6b6b);
  font-size: 0.8rem;
  margin: 0;
}

.sb-drawer__label {
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
}

.sb-drawer__input {
  width: 100%;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.85rem;
  box-sizing: border-box;
}
.sb-drawer__input:focus {
  outline: none;
  border-color: var(--border-focus, #4a6cf7);
}

.sb-drawer__toggles {
  display: flex;
  gap: var(--space-m, 16px);
}
.sb-drawer__toggles label {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.85rem;
  cursor: pointer;
}

.sb-drawer__placeholder {
  padding: var(--space-m, 16px);
  background: var(--surface-muted, #060813);
  border: 1px dashed var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  text-align: center;
  font-size: 0.85rem;
}

.sb-drawer__actions {
  display: flex;
  gap: var(--space-s, 10px);
  margin-top: var(--space-m, 16px);
}

.sb-btn {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-default, #fff);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  cursor: pointer;
  font-size: 0.85rem;
}
.sb-btn:hover {
  background: var(--surface-hover, #2d3566);
}
.sb-btn--primary {
  background: var(--surface-accent, #4a6cf7);
  border-color: var(--surface-accent, #4a6cf7);
}
.sb-btn--primary:hover {
  opacity: 0.9;
}
.sb-drawer__input:focus-visible,
.sb-btn:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
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
  padding: 2px 8px;
  background: var(--surface-interactive, #232a4d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-pill, 9999px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.sb-drawer__chip:hover {
  border-color: var(--border-focus, #4a6cf7);
  color: var(--text-default, #fff);
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .sb-drawer {
    width: 100%;
  }
}
</style>
