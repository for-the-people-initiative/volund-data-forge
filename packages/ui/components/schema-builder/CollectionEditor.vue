<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{
  schema: CollectionSchema
}>()

const emit = defineEmits<{
  'update:name': [name: string]
}>()

const localName = ref(props.schema.name)

watch(
  () => props.schema.name,
  (n) => {
    localName.value = n
  },
)

function onBlur() {
  if (localName.value !== props.schema.name) {
    emit('update:name', localName.value)
  }
}
</script>

<template>
  <div class="sb-editor">
    <label class="sb-editor__label">Collectienaam</label>
    <input
      v-model="localName"
      class="sb-editor__input"
      placeholder="bijv. patienten"
      @blur="onBlur"
      @keydown.enter="onBlur"
    />
    <p class="sb-editor__hint">Gebruik lowercase, underscores voor spaties</p>
  </div>
</template>

<style scoped>
.sb-editor {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
}

.sb-editor__label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary, #9ea5c2);
  margin-bottom: var(--space-2xs, 4px);
}

.sb-editor__input {
  width: 100%;
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  color: var(--text-default, #fff);
  font-size: 0.9rem;
  box-sizing: border-box;
}
.sb-editor__input:focus {
  outline: none;
  border-color: var(--border-focus, #4a6cf7);
}

.sb-editor__hint {
  font-size: 0.75rem;
  color: var(--text-secondary, #9ea5c2);
  margin: var(--space-2xs, 4px) 0 0;
}
</style>
