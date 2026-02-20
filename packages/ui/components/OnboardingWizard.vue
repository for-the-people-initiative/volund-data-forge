<script setup lang="ts">
/**
 * Onboarding Wizard — guides new users through creating their first collection.
 * Shows as a modal overlay when no custom collections exist.
 */

const emit = defineEmits<{ done: [] }>()

const step = ref(1)
const totalSteps = 4

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

const fieldTypes = [
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
  emit('done')
}

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
  <div class="wizard-overlay" @click.self="dismiss">
    <div class="wizard">
      <!-- Progress indicator -->
      <div class="wizard__progress">
        <span
          v-for="s in totalSteps"
          :key="s"
          class="wizard__dot"
          :class="{ 'wizard__dot--active': s === step, 'wizard__dot--done': s < step }"
        />
        <span class="wizard__step-label">{{ step }}/{{ totalSteps }}</span>
      </div>

      <!-- Step 1: Welcome -->
      <div v-if="step === 1" class="wizard__step">
        <h2 class="wizard__title">🔥 Welkom bij Volund Data Forge!</h2>
        <p class="wizard__text">
          Laten we je eerste collectie aanmaken. Een collectie is een plek om gestructureerde
          gegevens op te slaan — zoals producten, klanten of taken.
        </p>
        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--secondary" @click="dismiss">Overslaan</button>
          <button class="wizard__btn wizard__btn--primary" @click="nextStep">
            Aan de slag →
          </button>
        </div>
      </div>

      <!-- Step 2: Name -->
      <div v-if="step === 2" class="wizard__step">
        <h2 class="wizard__title">📝 Hoe wil je je gegevens noemen?</h2>
        <p class="wizard__text">
          Kies een naam voor je collectie, bijvoorbeeld "producten", "klanten" of "taken".
        </p>
        <input
          v-model="collectionName"
          class="wizard__input"
          type="text"
          placeholder="bijv. producten"
          @keyup.enter="nextStep"
        />
        <p v-if="nameError" class="wizard__error">{{ nameError }}</p>
        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--secondary" @click="prevStep">← Terug</button>
          <button class="wizard__btn wizard__btn--primary" @click="nextStep">Volgende →</button>
        </div>
      </div>

      <!-- Step 3: Fields -->
      <div v-if="step === 3" class="wizard__step">
        <h2 class="wizard__title">📋 Welke informatie wil je bijhouden?</h2>
        <p class="wizard__text">Voeg velden toe aan je collectie. Je kunt later altijd meer toevoegen.</p>

        <div class="wizard__fields">
          <div v-for="(field, i) in fields" :key="i" class="wizard__field-row">
            <input
              v-model="field.name"
              class="wizard__input wizard__input--field"
              type="text"
              placeholder="Veldnaam"
            />
            <select v-model="field.type" class="wizard__select">
              <option v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">
                {{ ft.label }}
              </option>
            </select>
            <button
              v-if="fields.length > 1"
              class="wizard__btn wizard__btn--icon"
              @click="removeField(i)"
            >
              ✕
            </button>
          </div>
        </div>

        <button v-if="fields.length < 10" class="wizard__btn wizard__btn--link" @click="addField">
          + Veld toevoegen
        </button>

        <p v-if="createError" class="wizard__error">{{ createError }}</p>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--secondary" @click="prevStep">← Terug</button>
          <button
            class="wizard__btn wizard__btn--primary"
            :disabled="creating"
            @click="createCollection"
          >
            {{ creating ? 'Bezig...' : 'Collectie aanmaken ✓' }}
          </button>
        </div>
      </div>

      <!-- Step 4: Done -->
      <div v-if="step === 4" class="wizard__step">
        <h2 class="wizard__title">🎉 Je collectie is aangemaakt!</h2>
        <p class="wizard__text">
          Je collectie <strong>"{{ createdName }}"</strong> is klaar. Ga erheen om je eerste
          gegevens in te voeren.
        </p>
        <div class="wizard__actions">
          <NuxtLink :to="`/collections/${createdName}`" class="wizard__btn wizard__btn--primary">
            Ga naar {{ createdName }} →
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wizard-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.wizard {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  padding: var(--space-xl, 40px);
  max-width: 520px;
  width: 90vw;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}

.wizard__progress {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  margin-bottom: var(--space-l, 28px);
}

.wizard__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border-default, #242e5c);
  transition: background 0.2s;
}

.wizard__dot--active {
  background: var(--intent-action-default, #f97316);
  box-shadow: 0 0 6px var(--intent-action-default, #f97316);
}

.wizard__dot--done {
  background: var(--feedback-success, #22c55e);
}

.wizard__step-label {
  margin-left: auto;
  color: var(--text-muted, #7680a9);
  font-size: 0.8125rem;
}

.wizard__title {
  color: var(--text-heading, #fff);
  margin: 0 0 var(--space-s, 10px);
  font-size: 1.25rem;
}

.wizard__text {
  color: var(--text-body, #c1c8e4);
  margin: 0 0 var(--space-l, 28px);
  line-height: 1.6;
}

.wizard__input {
  width: 100%;
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-sunken, #0b0f1f);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-body, #c1c8e4);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.wizard__input:focus {
  border-color: var(--intent-action-default, #f97316);
}

.wizard__input--field {
  flex: 1;
}

.wizard__select {
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-sunken, #0b0f1f);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-body, #c1c8e4);
  font-size: 0.875rem;
  outline: none;
  min-width: 130px;
}

.wizard__select:focus {
  border-color: var(--intent-action-default, #f97316);
}

.wizard__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
  margin-bottom: var(--space-m, 16px);
}

.wizard__field-row {
  display: flex;
  gap: var(--space-s, 10px);
  align-items: center;
}

.wizard__error {
  color: var(--feedback-error, #ef4444);
  font-size: 0.875rem;
  margin: var(--space-s, 10px) 0;
}

.wizard__actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-s, 10px);
  margin-top: var(--space-l, 28px);
}

.wizard__btn {
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  border-radius: var(--radius-default, 5px);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
  text-decoration: none;
  transition: background 0.15s;
}

.wizard__btn--primary {
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
}

.wizard__btn--primary:hover {
  background: var(--intent-action-hover, #ea580c);
}

.wizard__btn--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wizard__btn--secondary {
  background: transparent;
  color: var(--text-muted, #7680a9);
  border: 1px solid var(--border-default, #242e5c);
}

.wizard__btn--secondary:hover {
  border-color: var(--border-strong, #2e3b75);
  color: var(--text-body, #c1c8e4);
}

.wizard__btn--link {
  background: none;
  color: var(--intent-action-default, #f97316);
  padding: var(--space-2xs, 4px) 0;
  font-size: 0.8125rem;
}

.wizard__btn--link:hover {
  text-decoration: underline;
}

.wizard__btn--icon {
  background: transparent;
  color: var(--text-muted, #7680a9);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  font-size: 1rem;
  line-height: 1;
}

.wizard__btn--icon:hover {
  color: var(--feedback-error, #ef4444);
}
</style>
