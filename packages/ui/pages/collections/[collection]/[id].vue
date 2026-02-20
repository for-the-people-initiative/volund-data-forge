<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const route = useRoute()
const collection = computed(() => route.params.collection as string)
const id = computed(() => route.params.id as string)

const { getRecord } = useDataEngine()
const { fields } = useSchema(collection.value)

const editing = ref(false)
const record = ref<Record<string, unknown> | null>(null)
const loading = ref(true)

async function loadRecord() {
  loading.value = true
  try {
    const { data } = await getRecord(collection.value, id.value)
    const raw = data.value as Record<string, unknown>
    record.value = ((raw?.data ?? raw) as Record<string, unknown>) ?? null
  } finally {
    loading.value = false
  }
}

onMounted(loadRecord)

function onSuccess(updated: Record<string, unknown>) {
  record.value = updated
  editing.value = false
  loadRecord() // refresh from server
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
