<script setup lang="ts">
interface WizardField {
  name: string
  type: string
  required: boolean
  unique: boolean
  default?: any
  options?: string[]
  validations?: { rule: string; value?: unknown; message?: string }[]
}

const props = defineProps<{
  visible: boolean
  field?: WizardField | null
}>()

const emit = defineEmits<{
  'update:visible': [val: boolean]
  'save': [field: WizardField]
}>()

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

const activeStep = ref(0)
const steps = [
  { label: 'Naam' },
  { label: 'Type' },
  { label: 'Opties' },
]

// --- State ---
const fieldName = ref('')
const fieldType = ref('')
const fieldRequired = ref(false)
const fieldUnique = ref(false)
const fieldDefault = ref<any>(undefined)
const fieldOptions = ref<string[]>([])
const newOption = ref('')
const minLength = ref<number | undefined>(undefined)
const maxLength = ref<number | undefined>(undefined)
const minValue = ref<number | undefined>(undefined)
const maxValue = ref<number | undefined>(undefined)
const boolDefault = ref(false)

const isEditMode = computed(() => !!props.field)

function deriveTechnicalName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const technicalName = computed(() => deriveTechnicalName(fieldName.value))

function getValidationValue(field: WizardField, rule: string): number | undefined {
  const v = field.validations?.find(v => v.rule === rule)
  return v?.value as number | undefined
}

function resetForm() {
  activeStep.value = 0
  fieldName.value = ''
  fieldType.value = ''
  fieldRequired.value = false
  fieldUnique.value = false
  fieldDefault.value = undefined
  fieldOptions.value = []
  newOption.value = ''
  minLength.value = undefined
  maxLength.value = undefined
  minValue.value = undefined
  maxValue.value = undefined
  boolDefault.value = false
}

function prefillFrom(field: WizardField) {
  fieldName.value = field.name
  fieldType.value = field.type
  fieldRequired.value = field.required
  fieldUnique.value = field.unique
  fieldOptions.value = field.options ? [...field.options] : []
  minLength.value = getValidationValue(field, 'minLength')
  maxLength.value = getValidationValue(field, 'maxLength')
  minValue.value = getValidationValue(field, 'min')
  maxValue.value = getValidationValue(field, 'max')
  if (field.type === 'boolean') {
    boolDefault.value = !!field.default
  } else {
    fieldDefault.value = field.default
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    resetForm()
    if (props.field) {
      prefillFrom(props.field)
    }
    nextTick(() => {
      document.getElementById('fw-field-name')?.focus()
    })
  }
})

// --- Validation ---
const step1Valid = computed(() => fieldName.value.trim() !== '')
const step2Valid = computed(() => fieldType.value !== '')

function next() {
  if (activeStep.value === 0 && !step1Valid.value) return
  if (activeStep.value === 1 && !step2Valid.value) return
  if (activeStep.value < 2) activeStep.value++
}

function prev() {
  if (activeStep.value > 0) activeStep.value--
}

function addOption() {
  const val = newOption.value.trim()
  if (!val) return
  fieldOptions.value.push(val)
  newOption.value = ''
}

function removeOption(index: number) {
  fieldOptions.value.splice(index, 1)
}

function handleSave() {
  const validations: { rule: string; value?: unknown; message?: string }[] = []
  if (['text', 'email'].includes(fieldType.value)) {
    if (minLength.value !== undefined && minLength.value !== null) validations.push({ rule: 'minLength', value: minLength.value })
    if (maxLength.value !== undefined && maxLength.value !== null) validations.push({ rule: 'maxLength', value: maxLength.value })
  }
  if (['integer', 'float'].includes(fieldType.value)) {
    if (minValue.value !== undefined && minValue.value !== null) validations.push({ rule: 'min', value: minValue.value })
    if (maxValue.value !== undefined && maxValue.value !== null) validations.push({ rule: 'max', value: maxValue.value })
  }

  const result: WizardField = {
    name: fieldName.value.trim(),
    type: fieldType.value,
    required: fieldRequired.value,
    unique: fieldUnique.value,
  }

  if (fieldType.value === 'boolean') {
    result.default = boolDefault.value
  } else if (fieldDefault.value !== undefined && fieldDefault.value !== '') {
    result.default = fieldDefault.value
  }

  if (fieldType.value === 'select' && fieldOptions.value.length) {
    result.options = [...fieldOptions.value]
  }

  if (validations.length) {
    result.validations = validations
  }

  emit('save', result)
  emit('update:visible', false)
}
</script>

<template>
  <FtpDialog
    :visible="visible"
    modal
    :header="isEditMode ? 'Veld bewerken' : 'Veld toevoegen'"
    :closable="true"
    size="md"
    @update:visible="emit('update:visible', $event)"
  >
    <FtpSteps :model="steps" :active-index="activeStep" :is-readonly="true" class="fw-steps" />

    <!-- Step 1: Naam -->
    <div v-if="activeStep === 0" class="fw-step">
      <FtpFormField label="Veldnaam" :required="true" label-for="fw-field-name">
        <FtpInputText id="fw-field-name" v-model="fieldName" placeholder="Bijv. Voornaam" />
      </FtpFormField>
      <p class="fw-hint">Technische naam: <code>{{ technicalName || '...' }}</code></p>
    </div>

    <!-- Step 2: Type -->
    <div v-if="activeStep === 1" class="fw-step">
      <p class="fw-hint">Kies een veldtype:</p>
      <div class="fw-type-grid">
        <button
          v-for="t in fieldTypes"
          :key="t.type"
          type="button"
          class="fw-type-btn"
          :class="{ 'fw-type-btn--selected': fieldType === t.type }"
          @click="fieldType = t.type"
        >
          <span class="fw-type-btn__icon">{{ t.icon }}</span>
          <span class="fw-type-btn__label">{{ t.label }}</span>
        </button>
      </div>
    </div>

    <!-- Step 3: Constraints -->
    <div v-if="activeStep === 2" class="fw-step">
      <div class="fw-toggles">
        <FtpCheckbox v-model="fieldRequired" label="Verplicht" />
        <FtpCheckbox v-model="fieldUnique" label="Uniek" />
      </div>

      <!-- Default value -->
      <template v-if="fieldType === 'boolean'">
        <FtpFormField label="Standaardwaarde">
          <FtpCheckbox v-model="boolDefault" label="Aan (true)" />
        </FtpFormField>
      </template>
      <template v-else>
        <FtpFormField label="Standaardwaarde" label-for="fw-default">
          <FtpInputText id="fw-default" v-model="fieldDefault" placeholder="Optioneel" />
        </FtpFormField>
      </template>

      <!-- Select options -->
      <template v-if="fieldType === 'select'">
        <FtpFormField label="Selectie opties" label-for="fw-option">
          <div class="fw-select-input">
            <FtpInputText id="fw-option" v-model="newOption" placeholder="Nieuwe optie" @keydown.enter="addOption" />
            <FtpButton label="+" variant="secondary" size="small" @click="addOption" />
          </div>
          <div v-if="fieldOptions.length" class="fw-tags">
            <FtpTag
              v-for="(opt, i) in fieldOptions"
              :key="i"
              :value="opt"
              severity="info"
              @remove="removeOption(i)"
            />
          </div>
        </FtpFormField>
      </template>

      <!-- Text/email: min/max length -->
      <template v-if="['text', 'email'].includes(fieldType)">
        <div class="fw-number-row">
          <FtpFormField label="Min. lengte" label-for="fw-minlen">
            <FtpInputText id="fw-minlen" v-model.number="minLength" type="number" placeholder="Optioneel" />
          </FtpFormField>
          <FtpFormField label="Max. lengte" label-for="fw-maxlen">
            <FtpInputText id="fw-maxlen" v-model.number="maxLength" type="number" placeholder="Optioneel" />
          </FtpFormField>
        </div>
      </template>

      <!-- Integer/float: min/max value -->
      <template v-if="['integer', 'float'].includes(fieldType)">
        <div class="fw-number-row">
          <FtpFormField label="Min. waarde" label-for="fw-minval">
            <FtpInputText id="fw-minval" v-model.number="minValue" type="number" placeholder="Optioneel" />
          </FtpFormField>
          <FtpFormField label="Max. waarde" label-for="fw-maxval">
            <FtpInputText id="fw-maxval" v-model.number="maxValue" type="number" placeholder="Optioneel" />
          </FtpFormField>
        </div>
      </template>
    </div>

    <template #footer>
      <div class="fw-footer">
        <FtpButton v-if="activeStep > 0" label="Vorige" variant="secondary" @click="prev" />
        <div class="fw-spacer" />
        <FtpButton
          v-if="activeStep < 2"
          label="Volgende"
          variant="primary"
          :is-disabled="(activeStep === 0 && !step1Valid) || (activeStep === 1 && !step2Valid)"
          @click="next"
        />
        <FtpButton
          v-if="activeStep === 2"
          :label="isEditMode ? 'Opslaan' : 'Toevoegen'"
          variant="primary"
          @click="handleSave"
        />
      </div>
    </template>
  </FtpDialog>
</template>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;
.fw-steps {
  margin-bottom: var(--space-m);
}

.fw-step {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: var(--space-s);
}

.fw-hint {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.fw-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-s);
}

.fw-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-s);
  border: 2px solid transparent;
  border-radius: var(--radius-default);
  background: var(--surface-muted);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}

.fw-type-btn:hover {
  border-color: var(--border-default);
  transform: scale(1.05);
}

.fw-type-btn--selected {
  border-color: var(--intent-action-default);
  background: var(--surface-panel);
  transform: scale(1.08);
}

.fw-type-btn__icon {
  font-size: 1.5rem;
}

.fw-type-btn__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.fw-toggles {
  display: flex;
  gap: var(--space-m);
}

.fw-select-input {
  display: flex;
  gap: var(--space-s);
  align-items: center;
}

.fw-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
  margin-top: var(--space-s);
}

.fw-number-row {
  display: flex;
  gap: var(--space-m);
}

.fw-number-row > * {
  flex: 1;
}

.fw-spacer {
  flex: 1;
}

.fw-footer {
  display: flex;
  gap: var(--space-s);
  align-items: center;
}

@include breakpoint-to(tablet) {
  .fw-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
