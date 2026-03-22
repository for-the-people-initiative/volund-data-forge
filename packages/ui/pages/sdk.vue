<template>
  <div class="sdk">
    <!-- Hero -->
    <section class="sdk__hero">
      <h1 class="sdk__title">🔧 SDK's</h1>
      <p class="sdk__subtitle">Download een SDK voor je favoriete programmeertaal, gegenereerd uit je huidige schema.</p>

      <!-- Editable App Name -->
      <div class="sdk__app-name-wrapper">
        <span class="sdk__app-name-label">Applicatie</span>
        <div
          v-if="!editingAppName"
          class="sdk__app-name"
          title="Klik om te bewerken"
          @click="startEditAppName"
        >
          <span class="sdk__app-name-text">{{ appName }}</span>
          <span class="sdk__app-name-edit-icon">✏️</span>
        </div>
        <FtpInputText
          v-else
          ref="appNameInput"
          v-model="appNameDraft"
          class="sdk__app-name-input"
          @blur="saveAppName"
          @keydown.enter="($event.target as HTMLInputElement).blur()"
          @keydown.escape="cancelEditAppName"
        />
      </div>
    </section>

    <!-- Language Cards -->
    <section class="sdk__section">
      <h2 class="sdk__heading">Beschikbare talen</h2>
      <div v-if="pending" class="sdk__loading">Laden...</div>
      <div v-else-if="!languages?.length" class="sdk__empty">Geen SDK's beschikbaar.</div>
      <div v-else class="sdk__grid">
        <FtpCard v-for="lang in languages" :key="lang.language" class="sdk__card">
          <template #title>
            <span>{{ getEmoji(lang.language) }} {{ capitalize(lang.language) }}</span>
            <FtpBadge :value="lang.status || 'beschikbaar'" :severity="lang.status?.includes('coming') ? 'warning' : 'success'" />
          </template>
          <template #content>
            <div v-if="!lang.status?.includes('coming')" class="sdk__card-actions">
              <FtpButton
                size="sm"
                @click="downloadSdk(lang.language)"
              >
                ⬇️ Download
              </FtpButton>
              <FtpButton
                variant="secondary"
                size="sm"
                @click="togglePreview(lang.language)"
              >
                {{ expandedLang === lang.language ? '🔽 Verberg' : '▶️ Voorbeeld' }}
              </FtpButton>
            </div>

            <!-- Code Preview -->
            <div v-if="expandedLang === lang.language" class="sdk__preview">
              <div v-if="previewLoading" class="sdk__loading">Voorbeeld laden...</div>
              <template v-else-if="previewData">
                <h3 class="sdk__preview-heading">Hello World</h3>
                <pre class="sdk__code"><code>{{ previewData.helloWorld }}</code></pre>

                <h3 class="sdk__preview-heading">Quick Start</h3>
                <ol class="sdk__steps">
                  <li v-for="(step, i) in quickStartSteps" :key="i">
                    <span class="sdk__step-label">{{ step.label }}</span>
                    <pre class="sdk__code sdk__code--sm"><code>{{ step.command }}</code></pre>
                  </li>
                </ol>
              </template>
            </div>
          </template>
        </FtpCard>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { $fetch as fetch } from 'ofetch'

const { activeSchema, schemaParams } = useDbSchema()

// --- Editable App Name ---
const editingAppName = ref(false)
const appNameDraft = ref('')
const appNameInput = ref<HTMLInputElement | null>(null)

const appNameStorageKey = computed(() =>
  activeSchema.value ? `vdf-app-name:${activeSchema.value}` : null
)

const appName = computed(() => {
  if (!appNameStorageKey.value) return 'Mijn Applicatie'
  if (import.meta.client) {
    const stored = localStorage.getItem(appNameStorageKey.value)
    if (stored) return stored
  }
  return activeSchema.value || 'Mijn Applicatie'
})

function startEditAppName() {
  appNameDraft.value = appName.value
  editingAppName.value = true
  nextTick(() => {
    appNameInput.value?.focus()
    appNameInput.value?.select()
  })
}

function saveAppName() {
  const trimmed = appNameDraft.value.trim()
  if (trimmed && appNameStorageKey.value) {
    if (trimmed === activeSchema.value) {
      localStorage.removeItem(appNameStorageKey.value)
    } else {
      localStorage.setItem(appNameStorageKey.value, trimmed)
    }
  }
  editingAppName.value = false
}

function cancelEditAppName() {
  editingAppName.value = false
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface SdkLanguage {
  language: string
  generator: string
  status?: string
}

interface PreviewResponse {
  helloWorld: string
  quickStart: string[]
  testCommand: string
  collections: string[]
}

const { data: languages, pending } = useFetch<SdkLanguage[]>('/api/sdk', {
  key: 'sdk-languages',
})

const expandedLang = ref<string | null>(null)
const previewData = ref<PreviewResponse | null>(null)
const previewLoading = ref(false)

const emojiMap: Record<string, string> = {
  typescript: '🔷',
  python: '🐍',
  java: '☕',
  csharp: '🟣',
  go: '🐹',
  rust: '🦀',
  ruby: '💎',
  php: '🐘',
  kotlin: '🟠',
  swift: '🍎',
}

function getEmoji(id: string) {
  return emojiMap[id] || '📦'
}

async function togglePreview(langId: string) {
  if (expandedLang.value === langId) {
    expandedLang.value = null
    previewData.value = null
    return
  }

  expandedLang.value = langId
  previewLoading.value = true
  previewData.value = null

  try {
    const schema = activeSchema.value
    const url = `/api/sdk/${langId}/preview${schema ? `?schema=${schema}` : ''}`
    const data = await fetch<PreviewResponse>(url)
    previewData.value = data
  } catch {
    previewData.value = { helloWorld: '// Fout bij laden voorbeeld', quickStart: [], testCommand: '', collections: [] }
  } finally {
    previewLoading.value = false
  }
}

const quickStartSteps = computed(() => {
  if (!previewData.value?.quickStart?.length) return []
  const labels = ['Installeer dependencies', 'Configureer', 'Start']
  return previewData.value.quickStart.map((cmd, i) => ({
    label: labels[i] || `Stap ${i + 1}`,
    command: cmd,
  }))
})

function downloadSdk(langId: string) {
  const schema = activeSchema.value
  const url = `/api/sdk/${langId}${schema ? `?schema=${schema}` : ''}`
  window.open(url, '_blank')
}
</script>

<style lang="scss" scoped>
@use "@for-the-people-initiative/design-system/scss/mixins/breakpoint" as *;
.sdk {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl, 36px);
}

.sdk__hero {
  text-align: center;
  padding: var(--space-xl, 36px) 0;
  border-bottom: 1px solid var(--border-subtle, #1a2244);
}

.sdk__title {
  font-size: 2rem;
  color: var(--text-heading);
  margin: 0 0 var(--space-xs, 6px);
}

.sdk__subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.sdk__app-name-wrapper {
  margin-top: var(--space-l, 24px);
  padding: var(--space-m, 16px) var(--space-l, 24px);
  background: var(--surface-panel);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  display: inline-block;
}

.sdk__app-name-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary, #8b95a5);
  margin-bottom: var(--space-2xs, 4px);
}

.sdk__app-name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs, 6px);
  cursor: pointer;
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  transition: background 0.15s;
}

.sdk__app-name:hover {
  background: var(--surface-muted);
}

.sdk__app-name-text {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--intent-action-default);
}

.sdk__app-name-edit-icon {
  font-size: 0.85rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.sdk__app-name:hover .sdk__app-name-edit-icon {
  opacity: 0.6;
}

.sdk__app-name-input {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-heading);
  background: transparent;
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-2xs, 4px) var(--space-xs, 6px);
  text-align: center;
  outline: none;
  width: 100%;
  max-width: 500px;
}

.sdk__app-name-input:focus {
  border-color: var(--intent-action-default);
}

.sdk__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-m, 16px);
}

.sdk__heading {
  font-size: 1.25rem;
  color: var(--text-heading);
  margin: 0;
}

.sdk__loading,
.sdk__empty {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.sdk__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-m, 16px);
}

.sdk__card :deep(.card__title) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-s, 10px);
}

.sdk__card-actions {
  display: flex;
  gap: var(--space-xs, 6px);
  margin-bottom: var(--space-s, 10px);
}

.sdk__preview {
  margin-top: var(--space-m, 16px);
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
}

.sdk__preview-heading {
  font-size: 0.9rem;
  color: var(--text-heading);
  margin: 0;
}

.sdk__code {
  background: var(--surface-muted);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle, #1a2244);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-m, 16px);
  overflow-x: auto;
  font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  margin: 0;
  white-space: pre;
}

.sdk__code--sm {
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  font-size: 0.8rem;
}

.sdk__steps {
  display: flex;
  flex-direction: column;
  gap: var(--space-s, 10px);
  padding-left: var(--space-m, 16px);
  margin: 0;
}

.sdk__step-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: block;
  margin-bottom: var(--space-2xs, 4px);
}

@include breakpoint-to(tablet) {
  .sdk {
    max-width: 100%;
  }

  .sdk__title {
    font-size: 1.5rem;
  }

  .sdk__grid {
    grid-template-columns: 1fr;
  }
}
</style>
