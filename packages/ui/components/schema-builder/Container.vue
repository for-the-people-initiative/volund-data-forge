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

const activeTab = ref<'general' | 'fields' | 'api'>('general')

// No collection list: create a new collection once schemas have been loaded
if (!props.initialCollection) {
  // loadAllSchemas() in init() replaces collections.value after the API call.
  // Watch the ref identity change to know when loading is done.
  let hasFired = false
  watch(sb.collections, () => {
    if (!hasFired && !sb.activeCollection.value) {
      hasFired = true
      sb.createCollection()
    }
  })
}

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

    <div class="sb-main">
      <!-- Loading overlay -->
      <div v-if="sb.isLoading.value" class="sb-loading">
        <FtpProgressSpinner />
        <span>Laden...</span>
      </div>

      <template v-if="sb.activeCollection.value">
        <div class="sb-tabs">
          <button
            class="sb-tabs__tab"
            :class="{ 'sb-tabs__tab--active': activeTab === 'general' }"
            @click="activeTab = 'general'"
          >
            Algemeen
          </button>
          <button
            class="sb-tabs__tab"
            :class="{ 'sb-tabs__tab--active': activeTab === 'fields' }"
            @click="activeTab = 'fields'"
          >
            Velden
          </button>
          <button
            v-if="sb.isEditMode.value"
            class="sb-tabs__tab"
            :class="{ 'sb-tabs__tab--active': activeTab === 'api' }"
            @click="activeTab = 'api'"
          >
            API
          </button>
        </div>

        <SchemaBuilderCollectionEditor
          v-if="activeTab === 'general'"
          :schema="sb.activeCollection.value"
          @update:display-name="sb.updateDisplayName"
          @update:singular-name="sb.updateSingularName"
        />

        <SchemaBuilderFieldList
          v-if="activeTab === 'fields'"
          :fields="sb.activeCollection.value.fields"
          @add="sb.onAddField"
          @edit="sb.onEditField"
          @remove="sb.onRemoveField"
          @reorder="sb.onReorder"
        />

        <!-- API Surface Configuration -->
        <ApiSurfaceEditor
          v-if="activeTab === 'api' && sb.isEditMode.value"
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

        <!-- Schema preview (TODO: terugplaatsen in later stadium) -->
      </template>

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

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;

.sb-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-l);
  min-height: 70vh;
  position: relative;
}

.sb-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
  position: relative;
}

.sb-tabs {
  display: flex;
  gap: var(--space-m);
  border-bottom: 1px solid var(--border-default);
}

.sb-tabs__tab {
  padding: var(--space-s) var(--space-m);
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}

.sb-tabs__tab:hover {
  color: var(--text-default);
}

.sb-tabs__tab--active {
  color: var(--intent-action-default);
  border-bottom-color: var(--intent-action-default);
  font-weight: 600;
}

.sb-actions {
  display: flex;
  align-items: center;
  gap: var(--space-s);
}

.sb-actions__delete :deep(.button) {
  border-color: var(--feedback-error);
  color: var(--feedback-errorEmphasis);
}
.sb-actions__delete :deep(.button:hover) {
  background: var(--feedback-errorSubtle);
}

.sb-actions__dirty {
  color: var(--intent-action-default);
  font-size: 0.8rem;
}

.sb-loading {
  position: absolute;
  inset: 0;
  background: var(--surface-overlay);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-s);
  z-index: 10;
  border-radius: var(--radius-default);
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

@include breakpoint-to(tablet) {
  .sb-container {
    flex-direction: column;
  }

  .sb-actions {
    flex-wrap: wrap;
  }
}
</style>
