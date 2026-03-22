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
  { type: 'file', label: 'Bestand', icon: '📎' },
  { type: 'computed', label: 'Berekend', icon: '🧮' },
]
</script>

<template>
  <FtpDialog
    :visible="open"
    header="Kies veldtype"
    :modal="true"
    size="md"
    @update:visible="!$event && emit('close')"
  >
    <div class="sb-picker__grid" role="listbox" aria-label="Veldtypes">
      <FtpButton
        v-for="t in types"
        :key="t.type"
        role="option"
        variant="secondary"
        class="sb-picker__item"
        @click="emit('select', t.type)"
      >
        <span class="sb-picker__icon" aria-hidden="true">{{ t.icon }}</span>
        <span class="sb-picker__label">{{ t.label }}</span>
      </FtpButton>
    </div>
  </FtpDialog>
</template>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;

.sb-picker__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-s);
}

.sb-picker__item :deep(.button) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-m);
  padding: var(--space-s);
  width: 100%;
}

.sb-picker__icon {
  font-size: 1.5rem;
}
.sb-picker__label {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

@include breakpoint-to(tablet) {
  .sb-picker__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
