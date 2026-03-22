<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{
  visible: boolean
  isSaving: boolean
  saveError: string | null
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'create': [schema: CollectionSchema]
  'update:saveError': [val: string | null]
}>()

// --- Steps ---
const activeStep = ref(0)
const steps = [
  { label: 'Basis' },
  { label: 'Velden' },
  { label: 'Overzicht' },
]

// --- Emoji picker ---
const emojiOptions = ['📁','📋','📊','📝','👤','🏢','📧','📅','🔔','💰','🎯','📦','🛒','🏷️','📌','🔗','🎨','🏠','💼','🔧','⚙️','📱','💬','🎵','📸','🌍','❤️','⭐','🚀']
const selectedIcon = ref('📁')

// --- Schema state ---
const schema = ref<CollectionSchema>({
  name: '',
  displayName: '',
  singularName: '',
  fields: [],
  ui: { icon: '📁' },
})

// --- Field types (excluding relation, lookup, computed) ---
const fieldTypes = [
  { type: 'text', label: 'Tekst', icon: '📝' },
  { type: 'integer', label: 'Geheel getal', icon: '🔢' },
  { type: 'float', label: 'Kommagetal', icon: '📊' },
  { type: 'boolean', label: 'Boolean', icon: '🔘' },
  { type: 'datetime', label: 'Datum/tijd', icon: '📅' },
  { type: 'select', label: 'Selectie', icon: '📋' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'file', label: 'Bestand', icon: '📎' },
]

const typeLabel: Record<string, string> = Object.fromEntries(fieldTypes.map(t => [t.type, t.label]))

// --- Field editing ---
interface WizardField {
  name: string
  type: string
  required: boolean
  unique: boolean
  default?: unknown
  options?: string[]
  validations?: { rule: string; value?: unknown; message?: string }[]
}

const fields = ref<WizardField[]>([])

// --- Field wizard dialog ---
const fieldWizardVisible = ref(false)
const editingField = ref<WizardField | null>(null)
const editingFieldIndex = ref<number | null>(null)

const typeIcon: Record<string, string> = Object.fromEntries(fieldTypes.map(t => [t.type, t.icon]))

function openAddField() {
  editingField.value = null
  editingFieldIndex.value = null
  fieldWizardVisible.value = true
}

function openEditField(index: number) {
  editingField.value = { ...fields.value[index], options: fields.value[index].options ? [...fields.value[index].options] : undefined, validations: fields.value[index].validations ? [...fields.value[index].validations] : undefined }
  editingFieldIndex.value = index
  fieldWizardVisible.value = true
}

function handleFieldSave(field: WizardField) {
  if (editingFieldIndex.value !== null) {
    fields.value[editingFieldIndex.value] = field
  } else {
    fields.value.push(field)
  }
  editingField.value = null
  editingFieldIndex.value = null
}

function removeField(index: number) {
  fields.value.splice(index, 1)
}

// --- Derived technical name ---
function deriveTechnicalName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const technicalName = computed(() => deriveTechnicalName(schema.value.displayName ?? ''))

// --- Validation ---
const step1Valid = computed(() =>
  (schema.value.displayName ?? '').trim() !== '' && (schema.value.singularName ?? '').trim() !== ''
)

const step2Valid = computed(() => fields.value.length > 0)

// --- Navigation ---
function next() {
  if (activeStep.value === 0 && !step1Valid.value) return
  if (activeStep.value === 1 && !step2Valid.value) return
  if (activeStep.value < 2) activeStep.value++
}

function prev() {
  if (activeStep.value > 0) activeStep.value--
}

function handleCreate() {
  const mappedFields = fields.value.map(f => ({
    name: f.name,
    type: f.type,
    required: f.required,
    unique: f.unique,
    default: f.default !== undefined && f.default !== '' ? f.default : undefined,
    options: f.type === 'select' && f.options?.length ? [...f.options] : undefined,
    validations: f.validations?.length ? [...f.validations] : undefined,
  }))
  const payload: CollectionSchema = {
    ...toRaw(schema.value),
    name: technicalName.value,
    fields: mappedFields,
  }
  emit('create', payload)
}

// --- Reset on open ---
watch(() => props.visible, (val) => {
  if (val) {
    activeStep.value = 0
    selectedIcon.value = '📁'
    schema.value = {
      name: '',
      displayName: '',
      singularName: '',
      fields: [],
      ui: { icon: '📁' },
    }
    fields.value = []
    nextTick(() => {
      document.getElementById('sb-display-name')?.focus()
    })
  }
})

// (field wizard handles per-field editing)
</script>

<template>
  <!-- Wrapper div to absorb Vue scoped style attributes (data-v-*) that FtpDialog cannot inherit -->
  <div class="collection-wizard">
    <FtpDialog
      :visible="visible"
      modal
      header="Nieuwe collectie"
      :closable="true"
      size="lg"
      @update:visible="emit('update:visible', $event)"
    >
    <FtpSteps :model="steps" :active-index="activeStep" :is-readonly="true" class="wizard-steps" />

    <FtpMessage v-if="saveError" severity="error" :closable="true" @close="emit('update:saveError', null)" class="wizard-error">
      {{ saveError }}
    </FtpMessage>

    <!-- Stap 1: Basis -->
    <div v-if="activeStep === 0" class="wizard-step">
      <SchemaBuilderCollectionEditor
        :schema="schema"
        @update:display-name="(v: string) => { schema.displayName = v; schema.name = deriveTechnicalName(v) }"
        @update:singular-name="(v: string) => { schema.singularName = v }"
      />
      <div class="wizard-emoji-picker">
        <label class="wizard-emoji-picker__label">Icoon</label>
        <div class="wizard-emoji-picker__grid">
          <button
            v-for="emoji in emojiOptions"
            :key="emoji"
            type="button"
            class="wizard-emoji-picker__item"
            :class="{ 'wizard-emoji-picker__item--selected': selectedIcon === emoji }"
            @click="selectedIcon = emoji; schema.ui = { ...schema.ui, icon: emoji }"
          >{{ emoji }}</button>
        </div>
      </div>
    </div>

    <!-- Stap 2: Velden -->
    <div v-if="activeStep === 1" class="wizard-step">
      <div v-if="fields.length" class="wizard-field-list">
        <div v-for="(field, idx) in fields" :key="idx" class="wizard-field-list__item">
          <span class="wizard-field-list__icon">{{ typeIcon[field.type] || '📄' }}</span>
          <span class="wizard-field-list__name">{{ field.name }}</span>
          <FtpBadge v-if="field.required" value="verplicht" severity="warn" />
          <div class="wizard-spacer" />
          <FtpButton label="✎" variant="secondary" size="small" class="wizard-field-btn" @click="openEditField(idx)" />
          <FtpButton label="✕" variant="secondary" size="small" class="wizard-field-btn" @click="removeField(idx)" />
        </div>
      </div>

      <FtpButton label="+ Veld toevoegen" variant="secondary" @click="openAddField" class="wizard-add-field" />

      <FtpMessage v-if="fields.length === 0" severity="warn" class="wizard-warn">
        Voeg minimaal één veld toe om verder te gaan.
      </FtpMessage>

      <SchemaBuilderFieldWizard
        :visible="fieldWizardVisible"
        :field="editingField"
        @update:visible="fieldWizardVisible = $event"
        @save="handleFieldSave"
      />
    </div>

    <!-- Stap 3: Overzicht -->
    <div v-if="activeStep === 2" class="wizard-step">
      <h4>Collectie</h4>
      <table class="wizard-summary">
        <tbody>
          <tr><td><strong>Icoon</strong></td><td>{{ selectedIcon }}</td></tr>
          <tr><td><strong>Naam</strong></td><td>{{ selectedIcon }} {{ schema.displayName }}</td></tr>
          <tr><td><strong>Tabelnaam</strong></td><td><code>{{ technicalName }}</code></td></tr>
          <tr><td><strong>Item naam</strong></td><td>{{ schema.singularName }}</td></tr>
        </tbody>
      </table>

      <h4 class="wizard-fields-heading">Velden ({{ fields.length }})</h4>
      <table class="wizard-fields-table">
        <thead>
          <tr>
            <th>Naam</th>
            <th>Type</th>
            <th>Verplicht</th>
            <th>Uniek</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(field, idx) in fields" :key="idx">
            <td>{{ field.name || '(naamloos)' }}</td>
            <td>{{ typeLabel[field.type] || field.type }}</td>
            <td>{{ field.required ? '✓' : '—' }}</td>
            <td>{{ field.unique ? '✓' : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="wizard-footer">
        <FtpButton v-if="activeStep > 0" label="Vorige" variant="secondary" @click="prev" />
        <div class="wizard-spacer" />
        <FtpButton v-if="activeStep < 2" label="Volgende" variant="primary" :is-disabled="(activeStep === 0 && !step1Valid) || (activeStep === 1 && !step2Valid)" @click="next" />
        <FtpButton v-if="activeStep === 2" label="Aanmaken" variant="primary" :is-disabled="isSaving" @click="handleCreate" />
      </div>
    </template>
    </FtpDialog>
  </div>
</template>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;

.wizard-step {
  min-height: 200px;
}

.wizard-emoji-picker {
  margin-top: var(--space-l);
  margin-bottom: var(--space-m);
}

.wizard-emoji-picker__label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: var(--space-xs);
}

.wizard-emoji-picker__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
}

.wizard-emoji-picker__item {
  width: calc(var(--space-xl) - var(--space-xs));
  height: calc(var(--space-xl) - var(--space-xs));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  border: 2px solid transparent;
  border-radius: var(--radius-default);
  background: var(--surface-muted);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.wizard-emoji-picker__item:hover {
  border-color: var(--border-default);
  transform: scale(1.1);
}

.wizard-emoji-picker__item--selected {
  border-color: var(--intent-action-default);
  background: var(--surface-panel);
  transform: scale(1.15);
}

.wizard-field-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
}

.wizard-field-list__item {
  display: flex;
  align-items: center;
  gap: var(--space-s);
  padding: var(--space-2xs) var(--space-s);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-rounded);
}

.wizard-field-list__icon {
  font-size: 1.2rem;
}

.wizard-field-list__name {
  font-weight: 500;
}

.wizard-summary {
  width: 100%;
  border-collapse: collapse;
}

.wizard-summary td {
  padding: var(--space-2xs) var(--space-2xs);
  border-bottom: 1px solid var(--border-default);
}

.wizard-fields-table {
  width: 100%;
  border-collapse: collapse;
}

.wizard-fields-table th,
.wizard-fields-table td {
  padding: var(--space-xs) var(--space-2xs);
  text-align: left;
  border-bottom: 1px solid var(--border-default);
}

.wizard-fields-table th {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.wizard-steps,
.wizard-error {
  margin-bottom: var(--space-m);
}

.wizard-spacer {
  flex: 1;
}

.wizard-field-btn {
  min-width: auto;
  padding: var(--space-3xs) var(--space-2xs);
}

.wizard-add-field {
  margin-top: var(--space-s);
}

.wizard-warn {
  margin-top: var(--space-m);
}

.wizard-fields-heading {
  margin-top: var(--space-m);
}

.wizard-footer {
  display: flex;
  gap: var(--space-s);
  align-items: center;
}

@include breakpoint-to(tablet) {
  .wizard-picker__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

<!-- Dialog width controlled via size="lg" prop -->
