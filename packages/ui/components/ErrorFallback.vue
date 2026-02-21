<script setup lang="ts">
defineProps<{ label?: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error-fallback">
    <div class="error-fallback__icon">⚠️</div>
    <p class="error-fallback__text">{{ label || 'Dit onderdeel' }} kon niet worden geladen.</p>
    <FtpButton label="Probeer opnieuw" size="sm" @click="emit('retry')" />
  </div>
</template>

<style scoped>
.error-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs, 6px);
  padding: var(--space-l, 28px);
  background: var(--surface-panel, #11162d);
  border: 1px dashed var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  text-align: center;
}

.error-fallback__icon {
  font-size: 1.5rem;
}

.error-fallback__text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}
</style>
