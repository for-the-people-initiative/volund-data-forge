<script setup lang="ts">
import type { CollectionSchema } from '@data-engine/schema'

const props = defineProps<{
  schema: CollectionSchema
}>()

const emit = defineEmits<{
  'update:name': [name: string]
  'update:singularName': [singularName: string]
}>()

const localName = ref(props.schema.name)
const localSingularName = ref(props.schema.singularName || '')

watch(
  () => props.schema.name,
  (n) => {
    localName.value = n
  },
)

watch(
  () => props.schema.singularName,
  (s) => {
    localSingularName.value = s || ''
  },
)

function onNameBlur() {
  if (localName.value !== props.schema.name) {
    emit('update:name', localName.value)
  }
}

function onSingularNameBlur() {
  if (localSingularName.value !== props.schema.singularName) {
    emit('update:singularName', localSingularName.value)
  }
}
</script>

<template>
  <FtpPanel header="Collectienaam">
    <div class="sb-editor">
      <label for="sb-collection-name" class="sb-editor__label">Collectienaam</label>
      <FtpInputText
        id="sb-collection-name"
        v-model="localName"
        @blur="onNameBlur"
        @keydown.enter="onNameBlur"
      />
      <p class="sb-editor__hint">Gebruik lowercase, underscores voor spaties</p>
      
      <label for="sb-singular-name" class="sb-editor__label">Item naam (enkelvoud)</label>
      <FtpInputText
        id="sb-singular-name"
        v-model="localSingularName"
        required
        @blur="onSingularNameBlur"
        @keydown.enter="onSingularNameBlur"
      />
      <p class="sb-editor__hint">Naam voor één item uit deze collectie</p>
    </div>
  </FtpPanel>
</template>

<style scoped>
.sb-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs, 4px);
}

.sb-editor__label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: capitalize;
}

.sb-editor :deep(.input-text) {
  width: 100%;
}

.sb-editor__hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}
</style>
