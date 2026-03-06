<script setup lang="ts">
const props = defineProps<{
  initialCollection?: string
}>()

const emit = defineEmits<{
  saved: [name: string]
  deleted: [name: string]
}>()

const sb = useSchemaBuilder({ initialCollection: props.initialCollection })
sb.init()

async function handleSave() {
  const name = await sb.saveSchema()
  if (name) emit('saved', name)
}

async function handleDelete() {
  const name = await sb.deleteSchema()
  if (name) emit('deleted', name)
}
</script>

<template>
  <div class="sb-container">
    <!-- Feedback banner -->
    <Transition name="sb-feedback">
      <FtpMessage
        v-if="sb.feedback.value"
        :severity="sb.feedback.value.type === 'success' ? 'success' : 'error'"
        :closable="true"
        @close="sb.clearFeedback"
      >
        {{ sb.feedback.value.message }}
      </FtpMessage>
    </Transition>

    <SchemaBuilderCollectionList
      :collections="sb.collections.value"
      :active-name="sb.activeCollectionName.value"
      @select="sb.selectCollection"
      @create="sb.createCollection"
      @delete="sb.deleteCollection"
    />

    <div class="sb-main">
      <!-- Loading overlay -->
      <div v-if="sb.isLoading.value" class="sb-loading">
        <FtpProgressSpinner />
        <span>Laden...</span>
      </div>

      <template v-if="sb.activeCollection.value">
        <SchemaBuilderCollectionEditor
          :schema="sb.activeCollection.value"
          @update:name="sb.updateCollectionName"
        />

        <SchemaBuilderFieldList
          :fields="sb.activeCollection.value.fields"
          @add="sb.onAddField"
          @edit="sb.onEditField"
          @remove="sb.onRemoveField"
          @reorder="sb.onReorder"
        />

        <!-- API Surface Configuration -->
        <ApiSurfaceEditor
          v-if="sb.isEditMode.value"
          :schema="sb.activeCollection.value"
          @saved="handleSave"
        />

        <!-- Action buttons -->
        <div class="sb-actions">
          <FtpButton
            :label="sb.isEditMode.value ? '💾 Opslaan' : '💾 Collectie aanmaken'"
            variant="primary"
            :is-disabled="sb.isLoading.value"
            @click="handleSave"
          />

          <FtpButton
            v-if="sb.isEditMode.value"
            label="🗑️ Verwijderen"
            variant="secondary"
            class="sb-actions__delete"
            :is-disabled="sb.isLoading.value"
            @click="handleDelete"
          />

          <span v-if="sb.isDirty.value" class="sb-actions__dirty">● Onopgeslagen wijzigingen</span>
        </div>

        <FtpButton
          :label="sb.showPreview.value ? '🔽 Verberg preview' : '🔼 Toon schema preview'"
          variant="secondary"
          size="sm"
          @click="sb.showPreview.value = !sb.showPreview.value"
        />

        <SchemaBuilderSchemaPreview
          v-if="sb.showPreview.value"
          :schema="sb.activeCollection.value"
        />
      </template>

      <div v-else class="sb-empty">
        <p>Selecteer of maak een collectie aan om te beginnen.</p>
      </div>
    </div>

    <SchemaBuilderFieldTypePicker
      :open="sb.showTypePicker.value"
      @select="sb.onTypeSelected"
      @close="sb.showTypePicker.value = false"
    />

    <SchemaBuilderFieldEditor
      v-if="sb.editingField.value"
      :field="sb.editingField.value.field"
      :is-new="sb.editingField.value.isNew"
      :available-targets="sb.availableTargets.value"
      :errors="sb.validationErrors.value"
      :active-collection-name="sb.activeCollectionName.value ?? ''"
      :collection-fields="sb.activeCollection.value?.fields ?? []"
      :all-schemas="sb.collections.value"
      @save="sb.onSaveField"
      @cancel="sb.onCancelEdit"
    />
  </div>
</template>

<style scoped>
.sb-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-l, 28px);
  min-height: 70vh;
  position: relative;
}

.sb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
  position: relative;
}

.sb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.sb-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
}

.sb-actions__delete :deep(.button) {
  border-color: #dc2626;
  color: #f87171;
}
.sb-actions__delete :deep(.button:hover) {
  background: #2e0a0a;
}

.sb-actions__dirty {
  color: var(--intent-action-default);
  font-size: 0.8rem;
}

.sb-loading {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 19, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-s, 10px);
  z-index: 10;
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.sb-feedback-enter-active,
.sb-feedback-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s;
}
.sb-feedback-enter-from,
.sb-feedback-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 767px) {
  .sb-container {
    flex-direction: column;
  }

  .sb-actions {
    flex-wrap: wrap;
  }
}
</style>
