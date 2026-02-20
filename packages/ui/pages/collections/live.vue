<script setup lang="ts">
definePageMeta({ layout: 'data-engine' })

const { data, error, status } = await useFetch('/api/collections/contacts')
</script>

<template>
  <div class="collections-live">
    <h1>Live Data — Contacts</h1>
    <p>Data from SQLite in-memory via Data Engine</p>

    <div v-if="status === 'pending'">Loading...</div>
    <div v-else-if="error" class="error">Error: {{ error.message }}</div>

    <table v-else-if="data?.data?.length" class="data-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="contact in data.data" :key="contact.id">
          <td>{{ contact.id }}</td>
          <td>{{ contact.name }}</td>
          <td>{{ contact.email }}</td>
          <td>
            <span class="status-badge" :class="`status-badge--${contact.status}`">
              {{ contact.status }}
            </span>
          </td>
          <td>{{ contact.created_at }}</td>
        </tr>
      </tbody>
    </table>
    <div v-else>No contacts found.</div>

    <p class="meta" v-if="data?.meta">
      Total records: <strong>{{ data.meta.total }}</strong>
    </p>
  </div>
</template>

<style scoped>
.collections-live { max-width: 900px; margin: 0 auto; padding: 2rem; }
.data-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
.data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
.data-table th { font-weight: 600; background: #f7fafc; }
.status-badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
.status-badge--active { background: #c6f6d5; color: #22543d; }
.status-badge--inactive { background: #fed7d7; color: #742a2a; }
.status-badge--pending { background: #fefcbf; color: #744210; }
.error { color: red; padding: 1rem; border: 1px solid red; border-radius: 4px; }
.meta { margin-top: 1rem; opacity: 0.6; }
</style>
