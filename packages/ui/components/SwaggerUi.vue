<script setup lang="ts">
const props = defineProps<{
  specUrl: string
}>()

const container = ref<HTMLElement>()

onMounted(async () => {
  // Load Swagger UI from CDN
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css'
  document.head.appendChild(link)

  const script = document.createElement('script')
  script.src = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js'
  script.onload = () => {
    initSwagger()
  }
  document.head.appendChild(script)
})

function initSwagger() {
  if (!container.value) return
  // @ts-expect-error SwaggerUIBundle loaded via CDN
  window.SwaggerUIBundle({
    url: props.specUrl,
    dom_id: undefined,
    domNode: container.value,
    deepLinking: true,
    presets: [
      // @ts-expect-error SwaggerUIBundle loaded via CDN
      window.SwaggerUIBundle.presets.apis,
    ],
    layout: 'BaseLayout',
  })
}

watch(() => props.specUrl, () => {
  initSwagger()
})
</script>

<template>
  <div ref="container" class="swagger-container" />
</template>

<style>
/*
 * Unscoped styles — intentional.
 * Swagger UI injects its own DOM and CSS via CDN. Scoped styles cannot
 * reach its internals, so we use global selectors scoped to
 * .swagger-container to override 3rd-party styles without leaking.
 */

/* Dark theme overrides for Swagger UI — using DS tokens */
.swagger-container .swagger-ui {
  color: var(--text-default);
}

.swagger-container .swagger-ui .info .title,
.swagger-container .swagger-ui .opblock-tag {
  color: var(--text-heading);
}

.swagger-container .swagger-ui .scheme-container,
.swagger-container .swagger-ui .opblock .opblock-section-header {
  background: var(--surface-panel);
}

.swagger-container .swagger-ui .opblock {
  border-color: var(--border-default);
  background: var(--surface-muted);
}

.swagger-container .swagger-ui .opblock .opblock-summary {
  border-color: var(--border-default);
}

.swagger-container .swagger-ui .btn {
  color: var(--text-default);
  border-color: var(--border-strong);
}

.swagger-container .swagger-ui select,
.swagger-container .swagger-ui input[type="text"],
.swagger-container .swagger-ui textarea {
  background: var(--surface-elevated);
  color: var(--text-default);
  border-color: var(--border-default);
}

.swagger-container .swagger-ui .model-box,
.swagger-container .swagger-ui .model {
  color: var(--text-default);
}

.swagger-container .swagger-ui table thead tr td,
.swagger-container .swagger-ui table thead tr th,
.swagger-container .swagger-ui .response-col_description__inner p,
.swagger-container .swagger-ui .parameters-col_description p,
.swagger-container .swagger-ui .parameter__name,
.swagger-container .swagger-ui .parameter__type,
.swagger-container .swagger-ui .response-col_status {
  color: var(--text-secondary);
}

.swagger-container .swagger-ui .topbar {
  display: none;
}

.swagger-container .swagger-ui .info {
  margin: var(--space-l) 0;
}

.swagger-container .swagger-ui .wrapper {
  padding: 0 var(--space-l);
}
</style>
