<script setup lang="ts">
import type { CollectionSchema, FieldDefinition } from '@data-engine/schema'

// --- State ---
const collections = ref<CollectionSchema[]>([])
const activeCollectionName = ref<string | null>(null)
const showTypePicker = ref(false)
const editingField = ref<{ field: FieldDefinition; isNew: boolean } | null>(null)
const validationErrors = ref<string[]>([])

const activeCollection = computed(() =>
  collections.value.find(c => c.name === activeCollectionName.value) ?? null
)

const availableTargets = computed(() => collections.value.map(c => c.name))

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
  validationErrors.value = []
}

function selectCollection(name: string) {
  activeCollectionName.value = name
  editingField.value = null
  validationErrors.value = []
}

function deleteCollection(name: string) {
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
  // Validate
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
  if (!cleaned.default && cleaned.default !== false) delete cleaned.default

  if (editingField.value?.isNew) {
    activeCollection.value.fields.push(cleaned)
  } else {
    const idx = activeCollection.value.fields.indexOf(editingField.value!.field)
    if (idx >= 0) activeCollection.value.fields[idx] = cleaned
  }

  // Auto-reverse: voeg reciproque veld toe in doelcollectie
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
}

function onReorder(fields: FieldDefinition[]) {
  if (!activeCollection.value) return
  activeCollection.value.fields = fields
}

function onCancelEdit() {
  editingField.value = null
  validationErrors.value = []
}

// --- Schema Preview ---
const showPreview = ref(false)
</script>

<template>
  <div class="sb-container">
    <SchemaBuilderCollectionList
      :collections="collections"
      :active-name="activeCollectionName"
      @select="selectCollection"
      @create="createCollection"
      @delete="deleteCollection"
    />

    <div class="sb-main">
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
      @save="onSaveField"
      @cancel="onCancelEdit"
    />
  </div>
</template>

<style scoped>
.sb-container {
  display: flex;
  gap: var(--space-l, 28px);
  min-height: 70vh;
}

.sb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
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
</style>
