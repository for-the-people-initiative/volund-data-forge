<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{
  schema: CollectionSchema
}>()

const emit = defineEmits<{
  'update:displayName': [displayName: string]
  'update:singularName': [singularName: string]
}>()

const localDisplayName = ref(props.schema.displayName || '')
const localSingularName = ref(props.schema.singularName || '')

const technicalName = computed(() => deriveTechnicalName(localDisplayName.value))

function deriveTechnicalName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '')
    .replace(/[\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

watch(
  () => props.schema.displayName,
  (n) => { localDisplayName.value = n || '' },
)

watch(
  () => props.schema.singularName,
  (s) => { localSingularName.value = s || '' },
)

function onDisplayNameBlur() {
  if (localDisplayName.value !== (props.schema.displayName || '')) {
    emit('update:displayName', localDisplayName.value)
  }
}

function onSingularNameBlur() {
  if (localSingularName.value !== props.schema.singularName) {
    emit('update:singularName', localSingularName.value)
  }
}
</script>

<template>
  <div class="sb-editor">
    <FtpFormField label="Naam collectie" :hint="technicalName ? `Tabelnaam: ${technicalName}` : 'Hieruit wordt automatisch een tabelnaam afgeleid'" label-for="sb-display-name">
      <FtpInputText
        id="sb-display-name"
        v-model="localDisplayName"
        placeholder="Bijv. Blog Artikelen"
        @blur="onDisplayNameBlur"
        @keydown.enter="onDisplayNameBlur"
      />
    </FtpFormField>

    <FtpFormField label="Naam item" hint="Enkelvoudsnaam voor één item uit deze collectie" label-for="sb-singular-name" :required="true">
      <FtpInputText
        id="sb-singular-name"
        v-model="localSingularName"
        placeholder="Bijv. Artikel"
        required
        @blur="onSingularNameBlur"
        @keydown.enter="onSingularNameBlur"
      />
    </FtpFormField>
  </div>
</template>

<style scoped>
.sb-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.sb-editor :deep(.input-text) {
  width: 100%;
}

.sb-editor :deep(.input-text:disabled),
.sb-editor :deep(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
