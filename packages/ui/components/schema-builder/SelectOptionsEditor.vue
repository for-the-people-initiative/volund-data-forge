<script setup lang="ts">
const props = defineProps<{ options: string[] }>()
const emit = defineEmits<{ 'update:options': [options: string[]] }>()

const newOption = ref('')

function addOption() {
  const val = newOption.value.trim()
  if (val && !props.options.includes(val)) {
    emit('update:options', [...props.options, val])
    newOption.value = ''
  }
}

function removeOption(idx: number) {
  const updated = [...props.options]
  updated.splice(idx, 1)
  emit('update:options', updated)
}
</script>

<template>
  <div class="sb-options">
    <label class="sb-options__label">Selectie-opties</label>
    <div v-for="(opt, i) in options" :key="i" class="sb-options__item">
      <span>{{ opt }}</span>
      <FtpButton label="✕" variant="secondary" size="sm" title="Verwijderen" @click="removeOption(i)" />
    </div>
    <div class="sb-options__add">
      <FtpInputText
        v-model="newOption"
        @keydown.enter="addOption"
      />
      <FtpButton label="+" variant="secondary" size="sm" @click="addOption" />
    </div>
  </div>
</template>

<style scoped>
.sb-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}
.sb-options__label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.sb-options__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default);
  font-size: 0.85rem;
}

.sb-options__add {
  display: flex;
  gap: var(--space-2xs, 4px);
}
</style>
