<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const { data, error, status } = await useFetch<{
  data: Array<Record<string, unknown>>
  meta?: { total: number }
}>('/api/collections/contacts')

const columns = [
  { field: 'id', header: 'ID', sortable: true },
  { field: 'name', header: 'Name', sortable: true },
  { field: 'email', header: 'Email', sortable: true },
  { field: 'status', header: 'Status' },
  { field: 'created_at', header: 'Created', sortable: true },
]
</script>

<template>
  <div class="collections-live">
    <h1>Live Data — Contacten</h1>
    <p>Data vanuit SQLite in-memory via Data Engine</p>

    <div v-if="status === 'pending'">
      <FtpProgressSpinner />
    </div>
    <FtpMessage v-else-if="error" severity="error">Error: {{ error.message }}</FtpMessage>

    <FtpDataTable
      v-else-if="data?.data?.length"
      :value="data.data"
      :columns="columns"
      striped
      hoverable
    >
      <template #column-status="{ data: row }">
        <FtpTag :value="row.status" :color="row.status === 'active' ? 'success' : row.status === 'inactive' ? 'danger' : 'warning'" rounded />
      </template>
    </FtpDataTable>
    <div v-else>Geen contacten gevonden.</div>

    <p class="meta" v-if="data?.meta">
      Totaal aantal records: <strong>{{ data.meta.total }}</strong>
    </p>
  </div>
</template>

<style scoped>
.collections-live {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--space-xl);
}
.meta {
  margin-top: var(--space-m);
  opacity: 0.6;
}
</style>
