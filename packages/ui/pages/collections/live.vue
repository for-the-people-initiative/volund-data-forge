<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const { data, error, status } = await useFetch<{
  data: Array<Record<string, any>>
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
    <h1>Live Data — Contacts</h1>
    <p>Data from SQLite in-memory via Data Engine</p>

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
    <div v-else>No contacts found.</div>

    <p class="meta" v-if="data?.meta">
      Total records: <strong>{{ data.meta.total }}</strong>
    </p>
  </div>
</template>

<style scoped>
.collections-live {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
}
.meta {
  margin-top: 1rem;
  opacity: 0.6;
}
</style>
