<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ select: [type: string]; close: [] }>()

const types = [
  { type: 'text', label: 'Tekst', icon: '📝' },
  { type: 'integer', label: 'Geheel getal', icon: '🔢' },
  { type: 'float', label: 'Kommagetal', icon: '📊' },
  { type: 'boolean', label: 'Boolean', icon: '🔘' },
  { type: 'datetime', label: 'Datum/tijd', icon: '📅' },
  { type: 'select', label: 'Selectie', icon: '📋' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'relation', label: 'Koppeling', icon: '🔗' },
  { type: 'lookup', label: 'Ophalen', icon: '🔍' },
]
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sb-picker-overlay" @click.self="emit('close')">
      <div class="sb-picker">
        <h3 class="sb-picker__title">Kies veldtype</h3>
        <div class="sb-picker__grid">
          <button
            v-for="t in types"
            :key="t.type"
            class="sb-picker__item"
            @click="emit('select', t.type)"
          >
            <span class="sb-picker__icon">{{ t.icon }}</span>
            <span class="sb-picker__label">{{ t.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sb-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.sb-picker {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-l, 28px);
  min-width: 340px;
}

.sb-picker__title {
  margin: 0 0 var(--space-m, 16px);
  color: var(--text-heading, #fff);
  font-size: 1rem;
}

.sb-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-s, 10px);
}

.sb-picker__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2xs, 4px);
  padding: var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  cursor: pointer;
  color: var(--text-default, #fff);
  transition:
    border-color 0.15s,
    background 0.15s;
}
.sb-picker__item:hover {
  border-color: var(--border-focus, #4a6cf7);
  background: var(--surface-interactive, #232a4d);
}

.sb-picker__icon {
  font-size: 1.5rem;
}
.sb-picker__label {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
}

/* ─── Mobile < 768px ─── */
@media (max-width: 767px) {
  .sb-picker {
    min-width: 0;
    width: 90%;
    max-width: 340px;
    padding: var(--space-m, 16px);
  }

  .sb-picker__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
