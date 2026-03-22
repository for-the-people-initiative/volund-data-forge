<script setup lang="ts">
const { activeSchema, schemas, loading, fetchSchemas, createSchema, deleteSchema, switchSchema, updateSchemaMeta } = useDbSchema()

const emit = defineEmits<{
  (e: 'change', schema: string): void
}>()

// Popover state
const popoverOpen = ref(false)
const triggerRef = ref<InstanceType<typeof FtpButton> | null>(null)

// Client-side mounted state for hydration-safe rendering
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

// Dialog state
const showCreateDialog = ref(false)
const newSchemaName = ref('')
const creating = ref(false)

const showDeleteDialog = ref(false)
const schemaToDelete = ref('')
const cascadeDelete = ref(false)
const deleting = ref(false)

// Inline description edit state
const editingDescription = ref<string | null>(null) // schema name being edited
const editDescriptionValue = ref('')

onMounted(() => {
  fetchSchemas()
})

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function togglePopover() {
  popoverOpen.value = !popoverOpen.value
  if (!popoverOpen.value) {
    editingDescription.value = null
  }
}

function closePopover() {
  popoverOpen.value = false
  editingDescription.value = null
}

function selectSchema(name: string) {
  switchSchema(name)
  emit('change', name)
  closePopover()
}

function openCreateDialog() {
  closePopover()
  showCreateDialog.value = true
  // Auto-focus input when dialog opens
  nextTick(() => {
    const input = document.getElementById('new-schema-name') as HTMLInputElement
    input?.focus()
  })
}

function confirmDelete(name: string) {
  closePopover()
  schemaToDelete.value = name
  cascadeDelete.value = false
  showDeleteDialog.value = true
}

function startEditDescription(schemaName: string, currentDescription?: string) {
  editingDescription.value = schemaName
  editDescriptionValue.value = currentDescription || ''
}

async function saveDescription() {
  if (editingDescription.value === null) return
  const name = editingDescription.value
  const desc = editDescriptionValue.value.trim()
  const schema = schemas.value.find(s => s.name === name)
  // Only save if changed
  if (schema && (schema.description || '') !== desc) {
    try {
      await updateSchemaMeta(name, { description: desc || undefined })
    } catch (e) {
      console.error('Failed to update schema description:', e)
    }
  }
  editingDescription.value = null
}

function onDescriptionKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    saveDescription()
  } else if (e.key === 'Escape') {
    editingDescription.value = null
  }
}

/** Get the active schema's description */
const activeSchemaDescription = computed(() => {
  return schemas.value.find(s => s.name === activeSchema.value)?.description
})

async function onCreateSchema() {
  const name = newSchemaName.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  if (!name) return
  creating.value = true
  try {
    await createSchema(name)
    switchSchema(name)
    emit('change', name)
    showCreateDialog.value = false
    newSchemaName.value = ''
  } catch (e) {
    console.error('Failed to create schema:', e)
  } finally {
    creating.value = false
  }
}

async function onDeleteSchema() {
  deleting.value = true
  try {
    await deleteSchema(schemaToDelete.value, cascadeDelete.value)
    emit('change', activeSchema.value)
    showDeleteDialog.value = false
  } catch (e) {
    console.error('Failed to delete schema:', e)
  } finally {
    deleting.value = false
  }
}

// Close on click outside
function onDocumentClick(e: MouseEvent) {
  if (!popoverOpen.value) return
  const target = e.target as HTMLElement
  // triggerRef is a component ref, use $el to get the DOM element
  const triggerEl = triggerRef.value?.$el as HTMLElement | undefined
  if (triggerEl?.contains(target)) return
  const popover = document.querySelector('.schema-selector__popover')
  if (popover?.contains(target)) return
  closePopover()
}

// Close on Escape
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && popoverOpen.value) {
    closePopover()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="schema-selector">
    <FtpButton
      ref="triggerRef"
      class="schema-selector__trigger"
      :title="activeSchemaDescription || undefined"
      variant="secondary"
      @click="togglePopover"
      :aria-expanded="popoverOpen"
      aria-haspopup="listbox"
    >
      <!-- Use mounted check to prevent hydration mismatch (server='public', client=localStorage value) -->
      <span class="schema-selector__name">{{ mounted ? capitalize(activeSchema) : 'Schema' }}</span>
      <span class="schema-selector__chevron">▾</span>
    </FtpButton>

    <div v-if="popoverOpen" class="schema-selector__popover">
      <ul class="schema-selector__list" role="listbox">
        <li
          v-for="s in schemas"
          :key="s.name"
          class="schema-selector__item"
          :class="{ 'schema-selector__item--active': s.name === activeSchema }"
          role="option"
          :aria-selected="s.name === activeSchema"
          @click="selectSchema(s.name)"
        >
          <span class="schema-selector__indicator">{{ s.name === activeSchema ? '●' : '' }}</span>
          <div class="schema-selector__item-content">
            <span class="schema-selector__item-name">{{ capitalize(s.name) }}</span>
            <!-- Inline description edit for active schema -->
            <template v-if="s.name === activeSchema && editingDescription === s.name">
              <FtpInputText
                class="schema-selector__desc-input"
                v-model="editDescriptionValue"
                placeholder="Beschrijving toevoegen…"
                @blur="saveDescription"
                @keydown="onDescriptionKeydown"
                @click.stop
                ref="descInput"
                autofocus
              />
            </template>
            <template v-else-if="s.description || s.name === activeSchema">
              <span
                class="schema-selector__item-desc"
                :class="{ 'schema-selector__item-desc--editable': s.name === activeSchema }"
                @click.stop="s.name === activeSchema && startEditDescription(s.name, s.description)"
              >
                {{ s.description || (s.name === activeSchema ? 'Beschrijving toevoegen…' : '') }}
              </span>
            </template>
          </div>
          <FtpButton
            v-if="s.name !== 'public'"
            class="schema-selector__item-delete"
            title="Schema verwijderen"
            variant="secondary"
            size="sm"
            @click.stop="confirmDelete(s.name)"
          >🗑️</FtpButton>
        </li>
      </ul>
      <div class="schema-selector__divider" />
      <FtpButton class="schema-selector__create" variant="secondary" @click="openCreateDialog">
        + Nieuw schema
      </FtpButton>
    </div>

    <!-- Create Dialog -->
    <FtpDialog
      v-model:visible="showCreateDialog"
      header="Nieuw Schema"
      :modal="true"
      size="sm"
    >
      <div class="schema-selector__dialog-body">
        <label for="new-schema-name">Schemanaam</label>
        <FtpInputText
          id="new-schema-name"
          v-model="newSchemaName"
          placeholder="bijv. staging"
          size="sm"
          @keyup.enter="onCreateSchema"
        />
        <small class="schema-selector__hint">Alleen letters, cijfers en underscores</small>
      </div>
      <template #footer>
        <FtpButton variant="secondary" size="sm" @click="showCreateDialog = false">Annuleren</FtpButton>
        <FtpButton size="sm" :disabled="!newSchemaName.trim() || creating" @click="onCreateSchema">
          {{ creating ? 'Bezig...' : 'Aanmaken' }}
        </FtpButton>
      </template>
    </FtpDialog>

    <!-- Delete Confirmation Dialog -->
    <FtpDialog
      v-model:visible="showDeleteDialog"
      header="Schema Verwijderen"
      :modal="true"
      size="sm"
    >
      <div class="schema-selector__dialog-body">
        <p>Weet je zeker dat je schema <strong>{{ schemaToDelete }}</strong> wilt verwijderen?</p>
        <label class="schema-selector__cascade">
          <FtpCheckbox v-model="cascadeDelete" :binary="true" />
          <span>Cascade (verwijder ook alle tabellen)</span>
        </label>
      </div>
      <template #footer>
        <FtpButton variant="secondary" size="sm" @click="showDeleteDialog = false">Annuleren</FtpButton>
        <FtpButton size="sm" severity="danger" :disabled="deleting" @click="onDeleteSchema">
          {{ deleting ? 'Bezig...' : 'Verwijderen' }}
        </FtpButton>
      </template>
    </FtpDialog>
  </div>
</template>

<style scoped>
.schema-selector {
  position: relative;
}

.schema-selector__trigger {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  border-radius: var(--radius-default, 5px);
  transition: background 0.15s, color 0.15s;
}

.schema-selector__trigger:hover {
  background: var(--surface-muted, #1e1e2e);
}

.schema-selector__trigger:focus-visible {
  outline: 2px solid var(--border-focus, #f97316);
  outline-offset: 2px;
}

.schema-selector__name {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-heading, #cdd6f4);
}

.schema-selector__chevron {
  font-size: 0.9rem;
  color: var(--text-secondary, #a6adc8);
  margin-left: var(--space-3xs);
}

/* Popover */
.schema-selector__popover {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: var(--space-2xs, 4px);
  min-width: 240px;
  background: var(--surface-panel, #181825);
  border: 1px solid var(--border-subtle, #45475a);
  border-radius: var(--radius-rounded, 8px);
  box-shadow: var(--shadow-m);
  z-index: 1100;
  padding: var(--space-2xs, 4px) 0;
}

.schema-selector__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.schema-selector__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-xs, 6px);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-secondary, #a6adc8);
  transition: background 0.12s, color 0.12s;
}

.schema-selector__item:hover {
  background: var(--surface-muted, #1e1e2e);
  color: var(--text-default, #cdd6f4);
}

.schema-selector__item--active {
  color: var(--text-default, #cdd6f4);
}

.schema-selector__indicator {
  width: 14px;
  text-align: center;
  font-size: 0.6rem;
  color: var(--intent-action-default, #f97316);
  flex-shrink: 0;
  margin-top: var(--space-2xs);
}

.schema-selector__item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.schema-selector__item-name {
  font-weight: 600;
  line-height: 1.3;
}

.schema-selector__item-desc {
  font-size: 0.75rem;
  color: var(--text-secondary, #a6adc8);
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schema-selector__item-desc--editable {
  cursor: text;
  opacity: 0.7;
  transition: opacity 0.15s;
}

.schema-selector__item-desc--editable:hover {
  opacity: 1;
  text-decoration: underline dotted;
}

.schema-selector__desc-input {
  font-size: 0.75rem;
  color: var(--text-default, #cdd6f4);
  background: var(--surface-muted, #1e1e2e);
  border: 1px solid var(--border-subtle, #45475a);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-3xs) var(--space-2xs);
  width: 100%;
  outline: none;
  margin-top: var(--space-3xs);
}

.schema-selector__desc-input:focus {
  border-color: var(--intent-action-default, #f97316);
}

.schema-selector__item-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  padding: var(--space-3xs) var(--space-2xs);
  border-radius: var(--radius-default, 5px);
  opacity: 0;
  transition: opacity 0.15s;
  margin-top: var(--space-3xs);
}

.schema-selector__item:hover .schema-selector__item-delete {
  opacity: 0.6;
}

.schema-selector__item:hover .schema-selector__item-delete:hover {
  opacity: 1;
}

.schema-selector__divider {
  height: 1px;
  background: var(--border-subtle, #45475a);
  margin: var(--space-2xs, 4px) 0;
}

.schema-selector__create {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  font-size: 0.875rem;
  color: var(--text-secondary, #a6adc8);
  transition: background 0.12s, color 0.12s;
}

.schema-selector__create:hover {
  background: var(--surface-muted, #1e1e2e);
  color: var(--text-default, #cdd6f4);
}

/* Dialog styles */
.schema-selector__dialog-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs, 6px);
}

.schema-selector__dialog-body label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.schema-selector__hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
  opacity: 0.6;
}

.schema-selector__cascade {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  font-size: 0.85rem;
  cursor: pointer;
}
</style>

<!-- Dialog width controlled via size prop -->
