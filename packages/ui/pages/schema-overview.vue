<script setup lang="ts">
interface FieldDef {
  name: string
  type: string
  required?: boolean
  relation?: {
    target: string
    type: string
    foreignKey?: string
    onDelete?: string
  }
}

interface Schema {
  name: string
  fields: FieldDef[]
}

interface RelationLine {
  from: string
  fromField: string
  to: string
  type: string
  foreignKey?: string
  onDelete?: string
}

const { data: schemas } = await useFetch<Schema[]>('/api/schema', { default: () => [] })

const typeIcons: Record<string, string> = {
  string: '🔤',
  number: '🔢',
  boolean: '✅',
  date: '📅',
  relation: '🔗',
  select: '📋',
  text: '📝',
  email: '✉️',
  url: '🌐',
  json: '{}',
  lookup: '🔍',
}

function getTypeIcon(type: string) {
  return typeIcons[type] || '•'
}

// Extract relation lines
const relations = computed<RelationLine[]>(() => {
  const lines: RelationLine[] = []
  const seen = new Set<string>()
  for (const schema of schemas.value || []) {
    for (const field of schema.fields) {
      if (field.type === 'relation' && field.relation) {
        const key = [schema.name, field.relation.target].sort().join('::') + '::' + field.name
        if (!seen.has(key)) {
          seen.add(key)
          lines.push({
            from: schema.name,
            fromField: field.name,
            to: field.relation.target,
            type: field.relation.type || 'manyToOne',
            foreignKey: field.relation.foreignKey,
            onDelete: field.relation.onDelete,
          })
        }
      }
    }
  }
  return lines
})

// Auto-layout: grid positions
const CARD_W = 280
const CARD_GAP_X = 120
const CARD_GAP_Y = 40
const COLS = 3

const positions = computed(() => {
  const map: Record<string, { x: number; y: number; h: number }> = {}
  const colHeights = Array(COLS).fill(0)
  for (const schema of schemas.value || []) {
    // Pick shortest column
    let minCol = 0
    for (let c = 1; c < COLS; c++) {
      if (colHeights[c] < colHeights[minCol]) minCol = c
    }
    const fieldCount = schema.fields.length
    const cardH = 52 + fieldCount * 28 + 16
    const x = minCol * (CARD_W + CARD_GAP_X) + 40
    const y = colHeights[minCol] + 40
    map[schema.name] = { x, y, h: cardH }
    colHeights[minCol] = y + cardH + CARD_GAP_Y
  }
  return map
})

const svgSize = computed(() => {
  let maxX = 800
  let maxY = 600
  for (const p of Object.values(positions.value)) {
    maxX = Math.max(maxX, p.x + CARD_W + 100)
    maxY = Math.max(maxY, p.y + p.h + 100)
  }
  return { w: maxX, h: maxY }
})

// Cardinality labels
function cardLabels(type: string): [string, string] {
  switch (type) {
    case 'oneToOne': return ['1', '1']
    case 'oneToMany': return ['1', 'N']
    case 'manyToOne': return ['N', '1']
    case 'manyToMany': return ['N', 'N']
    default: return ['?', '?']
  }
}

// Hovering relation
const hoveredRelation = ref<RelationLine | null>(null)

function navigateToBuilder(name: string) {
  navigateTo(`/builder?collection=${name}`)
}
</script>

<template>
  <div class="erd">
    <h1 class="erd__title">Schema Overzicht</h1>
    <p class="erd__subtitle">Entity-Relationship Diagram van alle collecties</p>

    <FtpMessage v-if="!schemas?.length" severity="info">
      Geen collecties gevonden. Maak een collectie aan via de
      <NuxtLink to="/builder">Schema Builder</NuxtLink>.
    </FtpMessage>

    <div v-else class="erd__canvas" :style="{ minWidth: svgSize.w + 'px', minHeight: svgSize.h + 'px' }">
      <!-- SVG relation lines -->
      <svg class="erd__svg" :width="svgSize.w" :height="svgSize.h">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="var(--text-secondary)" />
          </marker>
        </defs>
        <g v-for="(rel, i) in relations" :key="i">
          <template v-if="positions[rel.from] && positions[rel.to]">
            <line
              :x1="positions[rel.from].x + CARD_W"
              :y1="positions[rel.from].y + positions[rel.from].h / 2"
              :x2="positions[rel.to].x"
              :y2="positions[rel.to].y + positions[rel.to].h / 2"
              class="erd__line"
              :class="{ 'erd__line--hover': hoveredRelation === rel }"
              @mouseenter="hoveredRelation = rel"
              @mouseleave="hoveredRelation = null"
            />
            <!-- From label -->
            <text
              :x="positions[rel.from].x + CARD_W + 8"
              :y="positions[rel.from].y + positions[rel.from].h / 2 - 6"
              class="erd__card-label"
            >{{ cardLabels(rel.type)[0] }}</text>
            <!-- To label -->
            <text
              :x="positions[rel.to].x - 16"
              :y="positions[rel.to].y + positions[rel.to].h / 2 - 6"
              class="erd__card-label"
            >{{ cardLabels(rel.type)[1] }}</text>
          </template>
        </g>
      </svg>

      <!-- Collection cards -->
      <div
        v-for="schema in schemas"
        :key="schema.name"
        class="erd__card"
        :style="{
          left: (positions[schema.name]?.x || 0) + 'px',
          top: (positions[schema.name]?.y || 0) + 'px',
          width: CARD_W + 'px',
        }"
        @click="navigateToBuilder(schema.name)"
        role="button"
        tabindex="0"
        @keydown.enter="navigateToBuilder(schema.name)"
      >
        <div class="erd__card-header">{{ schema.name }}</div>
        <ul class="erd__card-fields">
          <li v-for="field in schema.fields" :key="field.name" class="erd__card-field">
            <span class="erd__field-icon">{{ getTypeIcon(field.type) }}</span>
            <span class="erd__field-name">{{ field.name }}</span>
            <span v-if="field.required" class="erd__field-req">*</span>
            <FtpTag :value="field.type" size="sm" />
          </li>
        </ul>
      </div>

      <!-- Relation tooltip -->
      <div v-if="hoveredRelation" class="erd__tooltip">
        <strong>{{ hoveredRelation.fromField }}</strong>
        <span>{{ hoveredRelation.from }} → {{ hoveredRelation.to }}</span>
        <span>Type: {{ hoveredRelation.type }}</span>
        <span v-if="hoveredRelation.foreignKey">FK: {{ hoveredRelation.foreignKey }}</span>
        <span v-if="hoveredRelation.onDelete">onDelete: {{ hoveredRelation.onDelete }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.erd__title {
  font-size: 1.5rem;
  color: var(--text-heading);
  margin: 0 0 var(--space-2xs, 4px);
}

.erd__subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 var(--space-l, 28px);
}

.erd__canvas {
  position: relative;
  overflow: auto;
}

.erd__svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.erd__svg g {
  pointer-events: auto;
}

.erd__line {
  stroke: var(--border-default, #242e5c);
  stroke-width: 2;
  transition: stroke 0.15s;
  cursor: pointer;
}

.erd__line--hover {
  stroke: var(--intent-action-default);
  stroke-width: 3;
}

.erd__card-label {
  fill: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
}

.erd__card {
  position: absolute;
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--border-default, #242e5c);
  border-radius: var(--radius-default, 5px);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;
}

.erd__card:hover,
.erd__card:focus-visible {
  border-color: var(--intent-action-default);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);
  outline: none;
}

.erd__card-header {
  background: var(--surface-muted, #060813);
  padding: var(--space-xs, 6px) var(--space-s, 10px);
  font-weight: 700;
  font-size: 0.875rem;
  color: var(--text-heading);
  border-bottom: 1px solid var(--border-subtle, #1a2244);
  text-transform: capitalize;
}

.erd__card-fields {
  list-style: none;
  margin: 0;
  padding: var(--space-2xs, 4px) 0;
}

.erd__card-field {
  display: flex;
  align-items: center;
  gap: var(--space-2xs, 4px);
  padding: 2px var(--space-s, 10px);
  font-size: 0.8rem;
  color: var(--text-default);
}

.erd__field-icon {
  flex-shrink: 0;
  width: 1.2em;
  text-align: center;
}

.erd__field-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erd__field-req {
  color: var(--feedback-error);
  font-weight: 700;
}

.erd__tooltip {
  position: fixed;
  bottom: var(--space-m, 16px);
  right: var(--space-m, 16px);
  background: var(--surface-panel, #11162d);
  border: 1px solid var(--intent-action-default);
  border-radius: var(--radius-default, 5px);
  padding: var(--space-s, 10px);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.8rem;
  color: var(--text-default);
  z-index: 100;
  pointer-events: none;
}

.erd__tooltip strong {
  color: var(--text-heading);
}
</style>
