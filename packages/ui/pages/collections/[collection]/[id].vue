<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)
const id = computed(() => route.params.id as string)

const router = useRouter()
const { getRecord, deleteRecord } = useDataEngine()
const { fields } = useSchema(collection.value)

const editing = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const { data: record, status: recordStatus, refresh: refreshRecord } = await useAsyncData(
  `record-${collection.value}-${id.value}`,
  async () => {
    const raw = await getRecord(collection.value, id.value)
    return ((raw as any)?.data ?? raw) as Record<string, unknown> ?? null
  },
)

const loading = computed(() => recordStatus.value === 'pending')

function onSuccess(_updated: Record<string, unknown>) {
  editing.value = false
  refreshRecord() // refresh from server
}

const deleteError = ref('')

async function handleDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteRecord(collection.value, id.value)
    router.push(`/collections/${collection.value}`)
  } catch (err: any) {
    deleteError.value = err?.data?.error?.message ?? err?.message ?? 'Verwijderen mislukt'
  } finally {
    deleting.value = false
  }
}

function fieldLabel(name: string) {
  const f = fields.value.find((f: any) => f.name === name)
  return f?.label ?? name
}
</script>

<template>
  <div>
    <NuxtLink :to="`/collections/${collection}`" class="back-link">← Terug naar {{ collection }}</NuxtLink>

    <div class="detail-header">
      <h1>{{ collection }} / {{ id }}</h1>
      <button v-if="!editing" class="edit-btn" @click="editing = true">Bewerken</button>
      <button v-if="!editing" class="delete-btn" @click="showDeleteConfirm = true">Verwijderen</button>
    </div>

    <div v-if="loading" class="loading">Laden...</div>

    <!-- Edit mode -->
    <DataForm
      v-else-if="editing"
      :collection="collection"
      :record-id="id"
      @success="onSuccess"
      @cancel="editing = false"
    />

    <!-- Detail view -->
    <div v-else-if="record" class="detail-view">
      <dl class="detail-list">
        <template v-for="field in fields" :key="field.name">
          <dt>{{ fieldLabel(field.name) }}</dt>
          <dd>{{ record[field.name] ?? '—' }}</dd>
        </template>
      </dl>
    </div>

    <div v-else class="error">Record niet gevonden.</div>

    <!-- Delete confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="delete-overlay" @click.self="showDeleteConfirm = false">
        <div class="delete-dialog">
          <p>Weet je zeker dat je dit record wilt verwijderen?</p>
          <p v-if="deleteError" style="color: var(--feedback-error, #ef4444); font-size: 0.8125rem;">{{ deleteError }}</p>
          <div class="delete-dialog-actions">
            <button class="delete-dialog-cancel" @click="showDeleteConfirm = false" :disabled="deleting">Annuleren</button>
            <button class="delete-dialog-confirm" @click="handleDelete" :disabled="deleting">
              {{ deleting ? 'Bezig...' : 'Verwijderen' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.back-link {
  color: var(--text-link);
  text-decoration: none;
  font-size: 0.875rem;
}
.back-link:hover {
  color: var(--text-linkHover);
}
.detail-header {
  display: flex;
  align-items: center;
  gap: var(--space-m);
  margin: var(--space-s) 0 var(--space-m);
}
.detail-header h1 {
  color: var(--text-heading);
  margin: 0;
}
.edit-btn {
  padding: var(--space-2xs) var(--space-s);
  background: var(--intent-secondary-default);
  color: var(--text-secondary);
  border: 1px solid var(--intent-secondary-border);
  border-radius: var(--radius-default);
  cursor: pointer;
  font-size: 0.875rem;
}
.edit-btn:hover {
  background: var(--intent-secondary-hover);
}
.delete-btn {
  padding: var(--space-2xs) var(--space-s);
  background: none;
  color: var(--feedback-error, #ef4444);
  border: 1px solid var(--feedback-error, #ef4444);
  border-radius: var(--radius-default);
  cursor: pointer;
  font-size: 0.875rem;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.delete-btn:hover {
  opacity: 1;
}
.delete-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.delete-dialog {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-rounded, 8px);
  padding: var(--space-l, 24px);
  max-width: 400px;
  width: 90%;
  color: var(--text-default, #fff);
}
.delete-dialog p {
  margin: 0 0 var(--space-m, 16px);
  line-height: 1.5;
}
.delete-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-s, 10px);
}
.delete-dialog-cancel {
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  cursor: pointer;
}
.delete-dialog-confirm {
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--feedback-error, #ef4444);
  border: none;
  border-radius: var(--radius-default, 5px);
  color: #fff;
  cursor: pointer;
}
.delete-dialog-confirm:disabled,
.delete-dialog-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.loading, .error {
  color: var(--text-muted);
  padding: var(--space-m) 0;
}
.detail-view {
  max-width: 600px;
}
.detail-list {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: var(--space-xs) var(--space-m);
}
.detail-list dt {
  color: var(--text-muted);
  font-size: 0.875rem;
}
.detail-list dd {
  color: var(--text-default);
  margin: 0;
}
</style>
