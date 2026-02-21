<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)
const id = computed(() => route.params.id as string)

const router = useRouter()
const { getRecord, deleteRecord } = useDataEngine()
const { fields, schema } = useSchema(collection.value)

const capitalize = (str: string) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const singularName = computed(() => {
  const name = (schema.value as any)?.singularName || collection.value
  return capitalize(name)
})

const capitalizedCollection = computed(() => {
  return capitalize(collection.value)
})

const editing = ref(false)
const showDeleteConfirm = ref(false)
const deleting = ref(false)

const {
  data: record,
  status: recordStatus,
  refresh: refreshRecord,
} = await useAsyncData(`record-${collection.value}-${id.value}`, async () => {
  const raw = await getRecord(collection.value, id.value)
  return (((raw as any)?.data ?? raw) as Record<string, unknown>) ?? null
})

const loading = computed(() => recordStatus.value === 'pending')

function onSuccess(_updated: Record<string, unknown>) {
  editing.value = false
  refreshRecord()
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
    <NuxtLink :to="`/collections/${collection}`" class="back-link"
      >← Terug naar {{ capitalizedCollection }}</NuxtLink
    >

    <div class="detail-header">
      <h1>{{ singularName }} bewerken</h1>
      <FtpButton v-if="!editing" label="Bewerken" variant="secondary" size="sm" @click="editing = true" />
      <FtpButton v-if="!editing" label="Verwijderen" variant="secondary" size="sm" class="delete-btn" @click="showDeleteConfirm = true" />
    </div>

    <div v-if="loading" class="loading">Laden...</div>

    <!-- Edit mode -->
    <NuxtErrorBoundary v-else-if="editing">
      <DataForm
        :collection="collection"
        :record-id="id"
        @success="onSuccess"
        @cancel="editing = false"
      />
      <template #error="{ error, clearError }">
        <ErrorFallback label="Het formulier" @retry="clearError" />
      </template>
    </NuxtErrorBoundary>

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
    <FtpDialog
      :visible="showDeleteConfirm"
      header="Record verwijderen"
      :modal="true"
      @update:visible="showDeleteConfirm = $event"
    >
      <p>Weet je zeker dat je deze {{ singularName }} wilt verwijderen?</p>
      <p v-if="deleteError" style="color: var(--feedback-error); font-size: 0.8125rem">
        {{ deleteError }}
      </p>
      <template #footer>
        <div class="delete-dialog-actions">
          <FtpButton
            label="Annuleren"
            variant="secondary"
            :is-disabled="deleting"
            @click="showDeleteConfirm = false"
          />
          <FtpButton
            :label="deleting ? 'Bezig...' : 'Verwijderen'"
            variant="primary"
            :is-disabled="deleting"
            class="delete-confirm-btn"
            @click="handleDelete"
          />
        </div>
      </template>
    </FtpDialog>
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
.delete-btn :deep(.button) {
  color: var(--feedback-error);
  border-color: var(--feedback-error);
}
.delete-confirm-btn :deep(.button) {
  background: var(--feedback-error);
}
.loading,
.error {
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
.delete-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-s, 10px);
}
</style>
