<script setup lang="ts">
const { activeSchema, schemas, loading, fetchSchemas, createSchema, deleteSchema, switchSchema } = useDbSchema()

const emit = defineEmits<{
  (e: 'change', schema: string): void
}>()

// Dialog state
const showCreateDialog = ref(false)
const newSchemaName = ref('')
const creating = ref(false)

const showDeleteDialog = ref(false)
const schemaToDelete = ref('')
const cascadeDelete = ref(false)
const deleting = ref(false)

// Fetch schemas on mount
onMounted(() => {
  fetchSchemas()
})

function onSelect(name: string) {
  if (name === '__create__') {
    showCreateDialog.value = true
    return
  }
  switchSchema(name)
  emit('change', name)
}

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

function confirmDelete(name: string) {
  schemaToDelete.value = name
  cascadeDelete.value = false
  showDeleteDialog.value = true
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
</script>

<template>
  <div class="schema-selector">
    <span class="schema-selector__label">Schema</span>
    <div class="schema-selector__controls">
      <select
        class="schema-selector__select"
        :value="activeSchema"
        @change="onSelect(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="s in schemas" :key="s" :value="s">{{ s }}</option>
        <option value="__create__">+ Nieuw schema...</option>
      </select>
      <button
        v-if="activeSchema !== 'public'"
        class="schema-selector__delete-btn"
        title="Schema verwijderen"
        @click="confirmDelete(activeSchema)"
      >🗑️</button>
    </div>

    <!-- Create Dialog -->
    <FtpDialog
      v-model:visible="showCreateDialog"
      header="Nieuw Schema"
      :modal="true"
      :style="{ width: '360px' }"
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
      :style="{ width: '400px' }"
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
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.schema-selector__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  opacity: 0.6;
  padding: 0 var(--space-s, 10px);
}

.schema-selector__controls {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  padding: 0 var(--space-xs, 6px);
}

.schema-selector__select {
  flex: 1;
  background: var(--surface-muted, #1e1e2e);
  color: var(--text-default, #cdd6f4);
  border: 1px solid var(--border-subtle, #45475a);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  font-size: 0.8rem;
  cursor: pointer;
  outline: none;
}

.schema-selector__select:focus {
  border-color: var(--border-focus, #f97316);
}

.schema-selector__select option {
  background: var(--surface-panel, #181825);
  color: var(--text-default, #cdd6f4);
}

.schema-selector__delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px 4px;
  border-radius: var(--radius-default, 5px);
  opacity: 0.6;
  transition: opacity 0.15s;
}

.schema-selector__delete-btn:hover {
  opacity: 1;
}

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
