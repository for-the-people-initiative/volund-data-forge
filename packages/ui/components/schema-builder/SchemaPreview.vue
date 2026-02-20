<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{ schema: CollectionSchema }>()

const json = computed(() => JSON.stringify(props.schema, null, 2))
</script>

<template>
  <div class="sb-preview">
    <h4>Schema Preview</h4>
    <pre class="sb-preview__code">{{ json }}</pre>
  </div>
</template>

<style scoped>
.sb-preview {
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
}

.sb-preview h4 {
  margin: 0 0 var(--space-s, 10px);
  color: var(--text-heading, #fff);
  font-size: 0.9rem;
}

.sb-preview__code {
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
  color: var(--text-default, #c8d0e8);
  font-size: 0.8rem;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
