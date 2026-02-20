<script setup lang="ts">
import type { CollectionSchema, FieldDefinition } from '@data-engine/schema'

const props = defineProps<{
  initialCollection?: string
}>()

const emit = defineEmits<{
  saved: [name: string]
  deleted: [name: string]
}>()

// --- State ---
const collections = ref<CollectionSchema[]>([])
const activeCollectionName = ref<string | null>(null)
const showTypePicker = ref(false)
const editingField = ref<{ field: FieldDefinition; isNew: boolean } | null>(null)
const validationErrors = ref<string[]>([])
const isDirty = ref(false)
const isLoading = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const isEditMode = ref(false)

const activeCollection = computed(() =>
  collections.value.find(c => c.name === activeCollectionName.value) ?? null
)

const availableTargets = computed(() => collections.value.map(c => c.name))

// --- Feedback ---
function showFeedback(type: 'success' | 'error', message: string) {
  feedback.value = { type, message }
  if (type === 'success') {
    setTimeout(() => { feedback.value = null }, 4000)
  }
}

function clearFeedback() {
  feedback.value = null
}

// --- API Integration ---
async function loadSchema(collectionName: string) {
  isLoading.value = true
  try {
    const schema = await $fetch<CollectionSchema>(`/api/schema/${collectionName}`)
    // Replace or add to local collections
    const idx = collections.value.findIndex(c => c.name === schema.name)
    if (idx >= 0) {
      collections.value[idx] = schema
    } else {
      collections.value.push(schema)
    }
    activeCollectionName.value = schema.name
    isEditMode.value = true
    isDirty.value = false
  } catch (err: any) {
    const msg = err?.data?.error?.message || err?.message || 'Kon schema niet laden'
    showFeedback('error', msg)
  } finally {
    isLoading.value = false
  }
}

async function saveSchema() {
  if (!activeCollection.value) return
  isLoading.value = true
  clearFeedback()

  const schema = toRaw(activeCollection.value)
  // Deep clone to avoid reactivity issues
  const payload = JSON.parse(JSON.stringify(schema))

  try {
    if (isEditMode.value) {
      await $fetch(`/api/schema/${payload.name}`, { method: 'PUT', body: payload })
      showFeedback('success', `Collectie "${payload.name}" bijgewerkt`)
    } else {
      await $fetch('/api/schema', { method: 'POST', body: payload })
      isEditMode.value = true
      showFeedback('success', `Collectie "${payload.name}" aangemaakt`)
    }
    isDirty.value = false
    emit('saved', payload.name)
  } catch (err: any) {
    const errorData = err?.data?.error
    let msg = errorData?.message || err?.message || 'Opslaan mislukt'
    if (errorData?.details && Array.isArray(errorData.details)) {
      msg += ': ' + errorData.details.join(', ')
    }
    showFeedback('error', msg)
  } finally {
    isLoading.value = false
  }
}

async function deleteSchema() {
  if (!activeCollection.value) return
  const name = activeCollection.value.name
  if (!confirm(`Weet je zeker dat je de collectie "${name}" wilt verwijderen? Dit kan niet ongedaan worden.`)) return

  isLoading.value = true
  clearFeedback()
  try {
    await $fetch(`/api/schema/${name}`, { method: 'DELETE' })
    collections.value = collections.value.filter(c => c.name !== name)
    activeCollectionName.value = collections.value[0]?.name ?? null
    isEditMode.value = false
    isDirty.value = false
    showFeedback('success', `Collectie "${name}" verwijderd`)
    emit('deleted', name)
  } catch (err: any) {
    const msg = err?.data?.error?.message || err?.message || 'Verwijderen mislukt'
    showFeedback('error', msg)
  } finally {
    isLoading.value = false
  }
}

// --- Unsaved changes guard ---
onBeforeUnmount(() => {
  // The onBeforeRouteLeave handles Vue Router navigation
})

if (import.meta.client) {
  const router = useRouter()
  
  onBeforeRouteLeave((_to, _from, next) => {
    if (isDirty.value) {
      const leave = confirm('Je hebt onopgeslagen wijzigingen. Weet je zeker dat je wilt navigeren?')
      next(leave)
    } else {
      next()
    }
  })

  // Browser close/refresh
  const beforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty.value) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  onMounted(() => window.addEventListener('beforeunload', beforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
}

// --- Mark dirty on changes ---
function markDirty() {
  isDirty.value = true
}

// --- Collection CRUD ---
function createCollection() {
  const baseName = 'nieuwe_collectie'
  let name = baseName
  let i = 1
  while (collections.value.some(c => c.name === name)) {
    name = `${baseName}_${i++}`
  }
  const schema: CollectionSchema = { name, fields: [] }
  collections.value.push(schema)
  activeCollectionName.value = name
  isEditMode.value = false
  isDirty.value = true
  validationErrors.value = []
  clearFeedback()
}

function selectCollection(name: string) {
  activeCollectionName.value = name
  editingField.value = null
  validationErrors.value = []
}

function deleteCollection(name: string) {
  // For local-only collections, just remove from list
  const col = collections.value.find(c => c.name === name)
  if (!col) return
  
  // If it's a saved collection, use API delete
  if (isEditMode.value && activeCollectionName.value === name) {
    deleteSchema()
    return
  }
  
  collections.value = collections.value.filter(c => c.name !== name)
  if (activeCollectionName.value === name) {
    activeCollectionName.value = collections.value[0]?.name ?? null
  }
}

function updateCollectionName(newName: string) {
  if (!activeCollection.value) return
  const trimmed = newName.trim().toLowerCase().replace(/\s+/g, '_')
  if (trimmed && !collections.value.some(c => c.name === trimmed && c !== activeCollection.value)) {
    activeCollection.value.name = trimmed
    activeCollectionName.value = trimmed
    markDirty()
  }
}

// --- Field CRUD ---
function onAddField() {
  showTypePicker.value = true
}

function onTypeSelected(type: string) {
  showTypePicker.value = false
  const newField: FieldDefinition = { name: '', type, required: false, unique: false }
  if (type === 'select') newField.options = []
  editingField.value = { field: newField, isNew: true }
}

function onSaveField(field: FieldDefinition) {
  if (!activeCollection.value) return
  const errors: string[] = []
  if (!field.name.trim()) errors.push('Veldnaam is verplicht')
  const existing = activeCollection.value.fields.find(
    f => f.name === field.name.trim() && (editingField.value?.isNew || f !== editingField.value?.field)
  )
  if (existing) errors.push('Veldnaam moet uniek zijn binnen de collectie')

  if (errors.length) {
    validationErrors.value = errors
    return
  }

  const cleaned = { ...field, name: field.name.trim() }
  if (cleaned.type !== 'select') delete cleaned.options
  if (cleaned.type !== 'relation') delete cleaned.relation
  if (cleaned.type !== 'lookup') delete cleaned.lookup
  if (!cleaned.default && cleaned.default !== false) delete cleaned.default

  if (editingField.value?.isNew) {
    activeCollection.value.fields.push(cleaned)
  } else {
    const idx = activeCollection.value.fields.indexOf(editingField.value!.field)
    if (idx >= 0) activeCollection.value.fields[idx] = cleaned
  }

  // Auto-reverse relation
  if (cleaned.type === 'relation' && cleaned.relation?.target) {
    const targetCol = collections.value.find(c => c.name === cleaned.relation!.target)
    if (targetCol) {
      const reverseFieldName = `${activeCollection.value.name}_koppeling`
      const hasReverse = targetCol.fields.some(
        f => f.type === 'relation' && f.relation?.target === activeCollection.value!.name
      )
      if (!hasReverse) {
        targetCol.fields.push({
          name: reverseFieldName,
          type: 'relation',
          required: false,
          unique: false,
          relation: {
            target: activeCollection.value.name,
            type: cleaned.relation.type === 'manyToOne' ? 'oneToMany' : 'manyToMany',
            foreignKey: cleaned.relation.foreignKey,
            ...(cleaned.relation.junctionTable ? { junctionTable: cleaned.relation.junctionTable } : {}),
          },
        })
      }
    }
  }
  editingField.value = null
  validationErrors.value = []
  markDirty()
}

function onEditField(fieldName: string) {
  if (!activeCollection.value) return
  const field = activeCollection.value.fields.find(f => f.name === fieldName)
  if (field) editingField.value = { field, isNew: false }
  validationErrors.value = []
}

function onRemoveField(fieldName: string) {
  if (!activeCollection.value) return
  activeCollection.value.fields = activeCollection.value.fields.filter(f => f.name !== fieldName)
  markDirty()
}

function onReorder(fields: FieldDefinition[]) {
  if (!activeCollection.value) return
  activeCollection.value.fields = fields
  markDirty()
}

function onCancelEdit() {
  editingField.value = null
  validationErrors.value = []
}

// --- Schema Preview ---
const showPreview = ref(false)

// --- Init: load collection if provided ---
onMounted(() => {
  if (props.initialCollection) {
    loadSchema(props.initialCollection)
  }
})
</script>

<template>
  <div class="sb-container">
    <!-- Feedback banner -->
    <Transition name="sb-feedback">
      <div v-if="feedback" :class="['sb-feedback', `sb-feedback--${feedback.type}`]" @click="clearFeedback">
        <span>{{ feedback.type === 'success' ? '✓' : '✕' }}</span>
        <span>{{ feedback.message }}</span>
        <button class="sb-feedback__close" @click.stop="clearFeedback">✕</button>
      </div>
    </Transition>

    <SchemaBuilderCollectionList
      :collections="collections"
      :active-name="activeCollectionName"
      @select="selectCollection"
      @create="createCollection"
      @delete="deleteCollection"
    />

    <div class="sb-main">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="sb-loading">
        <span>Laden...</span>
      </div>

      <template v-if="activeCollection">
        <SchemaBuilderCollectionEditor
          :schema="activeCollection"
          @update:name="updateCollectionName"
        />

        <SchemaBuilderFieldList
          :fields="activeCollection.fields"
          @add="onAddField"
          @edit="onEditField"
          @remove="onRemoveField"
          @reorder="onReorder"
        />

        <!-- Action buttons -->
        <div class="sb-actions">
          <button
            class="sb-actions__save"
            :disabled="isLoading"
            @click="saveSchema"
          >
            {{ isEditMode ? '💾 Opslaan' : '💾 Collectie aanmaken' }}
          </button>

          <button
            v-if="isEditMode"
            class="sb-actions__delete"
            :disabled="isLoading"
            @click="deleteSchema"
          >
            🗑️ Verwijderen
          </button>

          <span v-if="isDirty" class="sb-actions__dirty">● Onopgeslagen wijzigingen</span>
        </div>

        <button class="sb-preview-toggle" @click="showPreview = !showPreview">
          {{ showPreview ? '🔽 Verberg preview' : '🔼 Toon schema preview' }}
        </button>

        <SchemaBuilderSchemaPreview v-if="showPreview" :schema="activeCollection" />
      </template>

      <div v-else class="sb-empty">
        <p>Selecteer of maak een collectie aan om te beginnen.</p>
      </div>
    </div>

    <SchemaBuilderFieldTypePicker
      :open="showTypePicker"
      @select="onTypeSelected"
      @close="showTypePicker = false"
    />

    <SchemaBuilderFieldEditor
      v-if="editingField"
      :field="editingField.field"
      :is-new="editingField.isNew"
      :available-targets="availableTargets"
      :errors="validationErrors"
      :active-collection-name="activeCollectionName ?? ''"
      :collection-fields="activeCollection?.fields ?? []"
      :all-schemas="collections"
      @save="onSaveField"
      @cancel="onCancelEdit"
    />
  </div>
</template>

<style scoped>
.sb-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-l, 28px);
  min-height: 70vh;
  position: relative;
}

.sb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
  position: relative;
}

.sb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.95rem;
}

.sb-preview-toggle {
  background: none;
  border: 1px solid var(--border-subtle, #1a2244);
  color: var(--text-secondary, #9ea5c2);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  cursor: pointer;
  font-size: 0.85rem;
  align-self: flex-start;
}
.sb-preview-toggle:hover {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

/* Feedback banner */
.sb-feedback {
  position: fixed;
  top: var(--space-m, 16px);
  right: var(--space-m, 16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
  border-radius: var(--radius-default, 5px);
  font-size: 0.875rem;
  cursor: pointer;
  max-width: 400px;
}

.sb-feedback--success {
  background: #0a2e1a;
  border: 1px solid #16a34a;
  color: #4ade80;
}

.sb-feedback--error {
  background: #2e0a0a;
  border: 1px solid #dc2626;
  color: #f87171;
}

.sb-feedback__close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  margin-left: auto;
  font-size: 0.8rem;
}

.sb-feedback-enter-active,
.sb-feedback-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.sb-feedback-enter-from,
.sb-feedback-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Action buttons */
.sb-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
}

.sb-actions__save {
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border: none;
  border-radius: var(--radius-default, 5px);
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
}
.sb-actions__save:hover { background: var(--intent-action-hover, #ea580c); }
.sb-actions__save:disabled { opacity: 0.5; cursor: not-allowed; }

.sb-actions__delete {
  background: none;
  border: 1px solid #dc2626;
  color: #f87171;
  border-radius: var(--radius-default, 5px);
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.sb-actions__delete:hover { background: #2e0a0a; }
.sb-actions__delete:disabled { opacity: 0.5; cursor: not-allowed; }

.sb-actions__dirty {
  color: var(--intent-action-default, #f97316);
  font-size: 0.8rem;
}

/* Loading */
.sb-loading {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 19, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.9rem;
}
</style>
