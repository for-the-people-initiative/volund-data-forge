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
/* Dark theme overrides for Swagger UI */
.swagger-container .swagger-ui {
  color: #e0e0e0;
}

.swagger-container .swagger-ui .info .title,
.swagger-container .swagger-ui .opblock-tag {
  color: #f0f0f0;
}

.swagger-container .swagger-ui .scheme-container,
.swagger-container .swagger-ui .opblock .opblock-section-header {
  background: #1e1e2e;
}

.swagger-container .swagger-ui .opblock {
  border-color: #444;
  background: #1a1a2a;
}

.swagger-container .swagger-ui .opblock .opblock-summary {
  border-color: #444;
}

.swagger-container .swagger-ui .btn {
  color: #e0e0e0;
  border-color: #666;
}

.swagger-container .swagger-ui select,
.swagger-container .swagger-ui input[type="text"],
.swagger-container .swagger-ui textarea {
  background: #2a2a3a;
  color: #e0e0e0;
  border-color: #555;
}

.swagger-container .swagger-ui .model-box,
.swagger-container .swagger-ui .model {
  color: #e0e0e0;
}

.swagger-container .swagger-ui table thead tr td,
.swagger-container .swagger-ui table thead tr th,
.swagger-container .swagger-ui .response-col_description__inner p,
.swagger-container .swagger-ui .parameters-col_description p,
.swagger-container .swagger-ui .parameter__name,
.swagger-container .swagger-ui .parameter__type,
.swagger-container .swagger-ui .response-col_status {
  color: #ccc;
}

.swagger-container .swagger-ui .topbar {
  display: none;
}

.swagger-container .swagger-ui .info {
  margin: 20px 0;
}

.swagger-container .swagger-ui .wrapper {
  padding: 0 20px;
}
</style>
