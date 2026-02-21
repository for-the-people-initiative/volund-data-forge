<script setup lang="ts">
const props = defineProps<{
  sourceCollection: string
  targetCollection: string
  maxOne: boolean
}>()

const sourceLabel = computed(() => props.sourceCollection || '…')
const targetLabel = computed(() => props.targetCollection || '…')
const linkLabel = computed(() => (props.maxOne ? 'één' : 'meerdere'))
const reverseLinkLabel = computed(() => 'meerdere')
</script>

<template>
  <div v-if="targetCollection" class="sb-relation-diagram">
    <FtpTag :value="sourceLabel" severity="info" />
    <div class="sb-relation-diagram__edge">
      <span class="sb-relation-diagram__cardinality">{{ reverseLinkLabel }}</span>
      <div class="sb-relation-diagram__line" />
      <span class="sb-relation-diagram__cardinality">{{ linkLabel }}</span>
    </div>
    <FtpTag :value="targetLabel" severity="info" />
  </div>
</template>

<style scoped>
.sb-relation-diagram {
  display: flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
  background: var(--surface-muted, #060813);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
}

.sb-relation-diagram__edge {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  flex: 1;
  min-width: 0;
}

.sb-relation-diagram__line {
  flex: 1;
  height: 2px;
  background: var(--border-focus, #4a6cf7);
  min-width: 20px;
}

.sb-relation-diagram__cardinality {
  font-size: 0.7rem;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
