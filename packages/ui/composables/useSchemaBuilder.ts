import type { CollectionSchema, FieldDefinition } from '@data-engine/schema'

/**
 * Composable that manages all schema builder state and logic.
 * Extracted from Container.vue to keep it a thin orchestration wrapper.
 */
export function useSchemaBuilder(options?: { initialCollection?: string }) {
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
  const showPreview = ref(false)

  const activeCollection = computed(
    () => collections.value.find((c) => c.name === activeCollectionName.value) ?? null,
  )

  const availableTargets = computed(() => collections.value.map((c) => c.name))

  // --- Feedback ---
  function showFeedback(type: 'success' | 'error', message: string) {
    feedback.value = { type, message }
    if (type === 'success') {
      setTimeout(() => {
        feedback.value = null
      }, 4000)
    }
  }

  function clearFeedback() {
    feedback.value = null
  }

  // --- API Integration ---
  async function loadAllSchemas() {
    try {
      const schemas = await $fetch<CollectionSchema[]>('/api/schema')
      collections.value = schemas || []
    } catch (err: any) {
      const msg = err?.data?.error?.message || err?.message || 'Kon schema\'s niet laden'
      showFeedback('error', msg)
    }
  }

  async function loadSchema(collectionName: string) {
    isLoading.value = true
    try {
      const schema = await $fetch<CollectionSchema>(`/api/schema/${collectionName}`)
      const idx = collections.value.findIndex((c) => c.name === schema.name)
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
      return payload.name
    } catch (err: any) {
      const errorData = err?.data?.error
      let msg = errorData?.message || err?.message || 'Opslaan mislukt'
      if (errorData?.details && Array.isArray(errorData.details)) {
        msg += ': ' + errorData.details.join(', ')
      }
      showFeedback('error', msg)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteSchema() {
    if (!activeCollection.value) return
    const name = activeCollection.value.name
    if (
      !confirm(
        `Weet je zeker dat je de collectie "${name}" wilt verwijderen? Dit kan niet ongedaan worden.`,
      )
    )
      return null

    isLoading.value = true
    clearFeedback()
    try {
      await $fetch(`/api/schema/${name}`, { method: 'DELETE' })
      collections.value = collections.value.filter((c) => c.name !== name)
      activeCollectionName.value = collections.value[0]?.name ?? null
      isEditMode.value = false
      isDirty.value = false
      showFeedback('success', `Collectie "${name}" verwijderd`)
      return name
    } catch (err: any) {
      const msg = err?.data?.error?.message || err?.message || 'Verwijderen mislukt'
      showFeedback('error', msg)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // --- Mark dirty ---
  function markDirty() {
    isDirty.value = true
  }

  // --- Collection CRUD ---
  function createCollection() {
    const baseName = 'nieuwe_collectie'
    let name = baseName
    let i = 1
    while (collections.value.some((c) => c.name === name)) {
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
    const col = collections.value.find((c) => c.name === name)
    if (!col) return

    if (isEditMode.value && activeCollectionName.value === name) {
      deleteSchema()
      return
    }

    collections.value = collections.value.filter((c) => c.name !== name)
    if (activeCollectionName.value === name) {
      activeCollectionName.value = collections.value[0]?.name ?? null
    }
  }

  function updateCollectionName(newName: string) {
    if (!activeCollection.value) return
    const trimmed = newName.trim().toLowerCase().replace(/\s+/g, '_')
    if (
      trimmed &&
      !collections.value.some((c) => c.name === trimmed && c !== activeCollection.value)
    ) {
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
      (f) =>
        f.name === field.name.trim() &&
        (editingField.value?.isNew || f !== editingField.value?.field),
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
      const targetCol = collections.value.find((c) => c.name === cleaned.relation!.target)
      if (targetCol) {
        const reverseFieldName = `${activeCollection.value.name}_koppeling`
        const hasReverse = targetCol.fields.some(
          (f) => f.type === 'relation' && f.relation?.target === activeCollection.value!.name,
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
              ...(cleaned.relation.junctionTable
                ? { junctionTable: cleaned.relation.junctionTable }
                : {}),
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
    const field = activeCollection.value.fields.find((f) => f.name === fieldName)
    if (field) editingField.value = { field, isNew: false }
    validationErrors.value = []
  }

  function onRemoveField(fieldName: string) {
    if (!activeCollection.value) return
    activeCollection.value.fields = activeCollection.value.fields.filter(
      (f) => f.name !== fieldName,
    )
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

  // --- Unsaved changes guard ---
  function setupUnsavedGuard() {
    if (!import.meta.client) return

    const _router = useRouter()

    onBeforeRouteLeave((_to, _from, next) => {
      if (isDirty.value) {
        const leave = confirm(
          'Je hebt onopgeslagen wijzigingen. Weet je zeker dat je wilt navigeren?',
        )
        next(leave)
      } else {
        next()
      }
    })

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty.value) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    onMounted(() => window.addEventListener('beforeunload', beforeUnload))
    onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
  }

  // --- Init ---
  function init() {
    setupUnsavedGuard()
    
    // Load all schemas on initialization
    onMounted(async () => {
      await loadAllSchemas()
      if (options?.initialCollection) {
        await loadSchema(options.initialCollection)
      }
    })
  }

  return {
    // State
    collections,
    activeCollectionName,
    activeCollection,
    availableTargets,
    showTypePicker,
    editingField,
    validationErrors,
    isDirty,
    isLoading,
    feedback,
    isEditMode,
    showPreview,
    // Feedback
    clearFeedback,
    // API
    loadAllSchemas,
    loadSchema,
    saveSchema,
    deleteSchema,
    // Collection CRUD
    createCollection,
    selectCollection,
    deleteCollection,
    updateCollectionName,
    // Field CRUD
    onAddField,
    onTypeSelected,
    onSaveField,
    onEditField,
    onRemoveField,
    onReorder,
    onCancelEdit,
    // Lifecycle
    init,
  }
}
