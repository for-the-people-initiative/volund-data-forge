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
      <button @click="removeOption(i)" title="Verwijderen">✕</button>
    </div>
    <div class="sb-options__add">
      <input
        v-model="newOption"
        class="sb-options__input"
        placeholder="Nieuwe optie..."
        @keydown.enter="addOption"
      />
      <button class="sb-btn" @click="addOption">+</button>
    </div>
  </div>
</template>

<style scoped>
.sb-options { display: flex; flex-direction: column; gap: var(--space-2xs, 4px); }
.sb-options__label { font-size: 0.8rem; color: var(--text-secondary, #9ea5c2); }

.sb-options__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.85rem;
}
.sb-options__item button {
  background: none; border: none; color: var(--text-secondary, #9ea5c2);
  cursor: pointer; font-size: 0.8rem;
}
.sb-options__item button:hover { color: var(--text-error, #ff6b6b); }

.sb-options__add { display: flex; gap: var(--space-2xs, 4px); }
.sb-options__input {
  flex: 1;
  padding: var(--space-2xs, 4px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.85rem;
}
.sb-options__input:focus { outline: none; border-color: var(--border-focus, #4a6cf7); }

.sb-btn {
  background: var(--surface-interactive, #232a4d);
  color: var(--text-default, #fff);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  cursor: pointer;
}
</style>
