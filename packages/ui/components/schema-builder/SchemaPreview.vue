<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{ schema: CollectionSchema }>()

const json = computed(() => JSON.stringify(props.schema, null, 2))
</script>

<template>
  <FtpPanel header="Schema Preview">
    <pre class="sb-preview__code">{{ json }}</pre>
  </FtpPanel>
</template>

<style scoped>
.sb-preview__code {
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
  color: var(--text-default);
  font-size: 0.8rem;
  overflow-x: auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
