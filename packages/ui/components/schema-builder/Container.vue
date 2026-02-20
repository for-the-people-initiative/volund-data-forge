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

// Forward events from composable
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
      <div v-if="sb.feedback.value" :class="['sb-feedback', `sb-feedback--${sb.feedback.value.type}`]" @click="sb.clearFeedback">
        <span>{{ sb.feedback.value.type === 'success' ? '✓' : '✕' }}</span>
        <span>{{ sb.feedback.value.message }}</span>
        <button class="sb-feedback__close" @click.stop="sb.clearFeedback">✕</button>
      </div>
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

        <!-- Action buttons -->
        <div class="sb-actions">
          <button
            class="sb-actions__save"
            :disabled="sb.isLoading.value"
            @click="handleSave"
          >
            {{ sb.isEditMode.value ? '💾 Opslaan' : '💾 Collectie aanmaken' }}
          </button>

          <button
            v-if="sb.isEditMode.value"
            class="sb-actions__delete"
            :disabled="sb.isLoading.value"
            @click="handleDelete"
          >
            🗑️ Verwijderen
          </button>

          <span v-if="sb.isDirty.value" class="sb-actions__dirty">● Onopgeslagen wijzigingen</span>
        </div>

        <button class="sb-preview-toggle" @click="sb.showPreview.value = !sb.showPreview.value">
          {{ sb.showPreview.value ? '🔽 Verberg preview' : '🔼 Toon schema preview' }}
        </button>

        <SchemaBuilderSchemaPreview v-if="sb.showPreview.value" :schema="sb.activeCollection.value" />
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
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.95rem;
}

.sb-preview-toggle {
  background: none;
  border: 1px solid var(--border-subtle, #1a2244);
  color: var(--text-secondary, #9ea5c2);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  border-radius: var(--radius-default, 5px);
  cursor: pointer;
  font-size: 0.85rem;
  align-self: flex-start;
}
.sb-preview-toggle:hover {
  background: var(--surface-panel, #11162d);
  color: var(--text-default, #fff);
}

.sb-feedback {
  position: fixed;
  top: var(--space-m, 16px);
  right: var(--space-m, 16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
  padding: var(--space-s, 10px) var(--space-m, 16px);
  border-radius: var(--radius-default, 5px);
  font-size: 0.875rem;
  cursor: pointer;
  max-width: 400px;
}

.sb-feedback--success {
  background: #0a2e1a;
  border: 1px solid #16a34a;
  color: #4ade80;
}

.sb-feedback--error {
  background: #2e0a0a;
  border: 1px solid #dc2626;
  color: #f87171;
}

.sb-feedback__close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  margin-left: auto;
  font-size: 0.8rem;
}

.sb-feedback-enter-active,
.sb-feedback-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.sb-feedback-enter-from,
.sb-feedback-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.sb-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s, 10px);
}

.sb-actions__save {
  background: var(--intent-action-default, #f97316);
  color: var(--text-inverse, #000);
  border: none;
  border-radius: var(--radius-default, 5px);
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.15s;
}
.sb-actions__save:hover { background: var(--intent-action-hover, #ea580c); }
.sb-actions__save:disabled { opacity: 0.5; cursor: not-allowed; }

.sb-actions__delete {
  background: none;
  border: 1px solid #dc2626;
  color: #f87171;
  border-radius: var(--radius-default, 5px);
  padding: var(--space-xs, 6px) var(--space-m, 16px);
  cursor: pointer;
  font-size: 0.875rem;
  transition: background 0.15s;
}
.sb-actions__delete:hover { background: #2e0a0a; }
.sb-actions__delete:disabled { opacity: 0.5; cursor: not-allowed; }

.sb-actions__dirty {
  color: var(--intent-action-default, #f97316);
  font-size: 0.8rem;
}

.sb-loading {
  position: absolute;
  inset: 0;
  background: rgba(6, 8, 19, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: var(--radius-default, 5px);
  color: var(--text-secondary, #9ea5c2);
  font-size: 0.9rem;
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
