<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const handleClear = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="error-page">
    <div class="error-page__card">
      <div class="error-page__icon">⚠️</div>
      <h1 class="error-page__title">Er ging iets mis</h1>
      <p class="error-page__message">
        {{
          error.statusCode === 404
            ? 'Deze pagina bestaat niet.'
            : 'Er is een onverwachte fout opgetreden.'
        }}
      </p>
      <p v-if="error.statusCode" class="error-page__code">Foutcode: {{ error.statusCode }}</p>
      <FtpButton label="Probeer opnieuw" variant="primary" @click="handleClear" />
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-muted, #060813);
  padding: var(--space-m, 16px);
}

.error-page__card {
  text-align: center;
  max-width: 420px;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-l, 12px);
  padding: var(--space-xl, 40px) var(--space-l, 28px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-s, 10px);
}

.error-page__icon {
  font-size: 3rem;
}

.error-page__title {
  color: var(--text-heading);
  font-size: 1.5rem;
  margin: 0;
}

.error-page__message {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin: 0;
}

.error-page__code {
  color: var(--text-secondary);
  font-size: 0.8rem;
  opacity: 0.6;
  margin: 0;
}
</style>
