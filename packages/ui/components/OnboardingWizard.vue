<script setup lang="ts">
/**
 * Onboarding Wizard — guides new users through creating their first collection.
 * Shows as a modal overlay when no custom collections exist.
 */

const emit = defineEmits<{ done: [] }>()

const step = ref(1)
const totalSteps = 4
const wizardVisible = ref(true)

// Step 2: collection name
const collectionName = ref('')
const nameError = ref('')

// Step 3: fields
interface WizardField {
  name: string
  type: string
}

const fields = ref<WizardField[]>([
  { name: '', type: 'text' },
  { name: '', type: 'text' },
])

const fieldTypeOptions = [
  { value: 'text', label: 'Tekst' },
  { value: 'integer', label: 'Geheel getal' },
  { value: 'float', label: 'Decimaal getal' },
  { value: 'boolean', label: 'Ja/Nee' },
  { value: 'datetime', label: 'Datum/tijd' },
  { value: 'email', label: 'E-mail' },
]

const creating = ref(false)
const createError = ref('')
const createdName = ref('')

function sanitizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

function nextStep() {
  if (step.value === 2) {
    const sanitized = sanitizeName(collectionName.value)
    if (!sanitized || sanitized.length < 2) {
      nameError.value = 'Voer een naam in van minimaal 2 tekens.'
      return
    }
    nameError.value = ''
  }
  step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

function addField() {
  if (fields.value.length < 10) {
    fields.value.push({ name: '', type: 'text' })
  }
}

function removeField(i: number) {
  if (fields.value.length > 1) {
    fields.value.splice(i, 1)
  }
}

function dismiss() {
  localStorage.setItem('onboarding-wizard-dismissed', 'true')
  wizardVisible.value = false
  emit('done')
}

// Auto-focus first input when step changes
watch(step, (newStep) => {
  if (newStep === 2) {
    nextTick(() => {
      const input = document.querySelector('.wizard__step input') as HTMLInputElement
      input?.focus()
    })
  }
})

async function createCollection() {
  creating.value = true
  createError.value = ''

  const name = sanitizeName(collectionName.value)
  const schemaFields = fields.value
    .filter((f) => f.name.trim())
    .map((f) => ({
      name: sanitizeName(f.name),
      type: f.type,
    }))

  if (schemaFields.length === 0) {
    createError.value = 'Voeg minimaal één veld toe met een naam.'
    creating.value = false
    return
  }

  try {
    const res = await $fetch('/api/schema', {
      method: 'POST',
      body: { name, fields: schemaFields },
    })
    if ((res as any)?.error) {
      createError.value = (res as any).error.message || 'Onbekende fout'
    } else {
      createdName.value = name
      step.value = 4
    }
  } catch (err: any) {
    createError.value = err?.data?.error?.message || err?.message || 'Fout bij aanmaken'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <FtpDialog
    :visible="wizardVisible"
    :closable="true"
    :modal="true"
    :dismiss-able-mask="true"
    size="md"
    @update:visible="!$event && dismiss()"
  >
    <template #header>
      <!-- Progress indicator -->
      <FtpSteps
        :items="[{ label: 'Welkom' }, { label: 'Naam' }, { label: 'Velden' }, { label: 'Klaar' }]"
        :active-index="step - 1"
      />
    </template>

    <!-- Step 1: Welcome -->
    <div v-if="step === 1" class="wizard__step">
      <h2 class="wizard__title">🔥 Welkom bij Volund Data Forge!</h2>
      <p class="wizard__text">
        Laten we je eerste collectie aanmaken. Een collectie is een plek om gestructureerde
        gegevens op te slaan — zoals producten, klanten of taken.
      </p>
    </div>

    <!-- Step 2: Name -->
    <div v-if="step === 2" class="wizard__step">
      <h2 class="wizard__title">📝 Hoe wil je je gegevens noemen?</h2>
      <p class="wizard__text">
        Kies een naam voor je collectie, bijvoorbeeld "producten", "klanten" of "taken".
      </p>
      <FtpInputText
        v-model="collectionName"
        @keydown.enter="nextStep"
      />
      <p v-if="nameError" class="wizard__error">{{ nameError }}</p>
    </div>

    <!-- Step 3: Fields -->
    <div v-if="step === 3" class="wizard__step">
      <h2 class="wizard__title">📋 Welke informatie wil je bijhouden?</h2>
      <p class="wizard__text">Voeg velden toe aan je collectie. Je kunt later altijd meer toevoegen.</p>

      <div class="wizard__fields">
        <div v-for="(field, i) in fields" :key="i" class="wizard__field-row">
          <FtpInputText
            v-model="field.name"
            size="sm"
          />
          <FtpSelect
            v-model="field.type"
            :options="fieldTypeOptions"
            option-label="label"
            option-value="value"
            size="sm"
          />
          <FtpButton
            v-if="fields.length > 1"
            label="✕"
            variant="secondary"
            size="sm"
            @click="removeField(i)"
          />
        </div>
      </div>

      <FtpButton v-if="fields.length < 10" label="+ Veld toevoegen" variant="secondary" size="sm" @click="addField" />

      <p v-if="createError" class="wizard__error">{{ createError }}</p>
    </div>

    <!-- Step 4: Done -->
    <div v-if="step === 4" class="wizard__step">
      <h2 class="wizard__title">🎉 Je collectie is aangemaakt!</h2>
      <p class="wizard__text">
        Je collectie <strong>"{{ createdName }}"</strong> is klaar. Ga erheen om je eerste
        gegevens in te voeren.
      </p>
    </div>

    <template #footer>
      <!-- Step 1 actions -->
      <div v-if="step === 1" class="wizard__actions">
        <FtpButton label="Overslaan" variant="secondary" @click="dismiss" />
        <FtpButton label="Aan de slag →" variant="primary" @click="nextStep" />
      </div>

      <!-- Step 2 actions -->
      <div v-if="step === 2" class="wizard__actions">
        <FtpButton label="← Terug" variant="secondary" @click="prevStep" />
        <FtpButton label="Volgende →" variant="primary" @click="nextStep" />
      </div>

      <!-- Step 3 actions -->
      <div v-if="step === 3" class="wizard__actions">
        <FtpButton label="← Terug" variant="secondary" @click="prevStep" />
        <FtpButton
          :label="creating ? 'Bezig...' : 'Collectie aanmaken ✓'"
          variant="primary"
          :is-disabled="creating"
          :is-loading="creating"
          @click="createCollection"
        />
      </div>

      <!-- Step 4 actions -->
      <div v-if="step === 4" class="wizard__actions">
        <NuxtLink :to="`/collections/${createdName}`" class="wizard__nav-link">
          <FtpButton :label="`Ga naar ${createdName} →`" variant="primary" />
        </NuxtLink>
      </div>
    </template>
  </FtpDialog>
</template>

<style scoped>
.wizard__step {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.wizard__title {
  color: var(--text-heading);
  margin: 0;
  font-size: 1.25rem;
}

.wizard__text {
  color: var(--text-default);
  margin: 0;
  line-height: 1.6;
}

.wizard__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.wizard__field-row {
  display: flex;
  gap: var(--space-s, 10px);
  align-items: center;
}

.wizard__field-row :deep(.input-text) {
  flex: 1;
}

.wizard__field-row :deep(.select) {
  min-width: 130px;
}

.wizard__error {
  color: var(--feedback-error);
  font-size: 0.875rem;
  margin: 0;
}

.wizard__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-s, 10px);
  width: 100%;
}

.wizard__nav-link {
  text-decoration: none;
}
</style>
