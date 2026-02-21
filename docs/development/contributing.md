# 🤝 Contributing

Handleiding voor het opzetten van de ontwikkelomgeving en bijdragen aan Volund Data Forge.

## Vereisten

- **Node.js** ≥ 18
- **npm** (meegeleverd met Node.js)

## Project opzetten

```bash
# Repository clonen
git clone <repo-url>
cd data-engine

# Dependencies installeren
npm install
```

## Monorepo structuur

Het project is een monorepo met npm workspaces. Alle packages bevinden zich in `packages/`:

```
packages/adapter/         # Database adapter interface
packages/adapter-knex/    # Knex.js implementatie
packages/api/             # API-laag
packages/engine/          # Core engine
packages/migration/       # Migraties
packages/schema/          # Schema & formules
packages/ui/              # Nuxt 3 frontend
```

## Ontwikkelen

### UI development server starten

```bash
cd packages/ui
npm run dev
```

De applicatie is standaard beschikbaar op `http://localhost:9001`.

### Packages bouwen

```bash
# Vanuit de root
npm run build
```

## Code stijl

- **TypeScript** — alle packages gebruiken TypeScript
- **Vue 3 Composition API** — `<script setup lang="ts">` syntax
- **BEM-achtige CSS** — class names met `__` (element) en `--` (modifier), bijv. `webhooks-list__badge--active`
- **Nuxt 3 conventies** — file-based routing, auto-imports, composables in `/composables`

## Mappenstructuur UI

```
packages/ui/
├── pages/              # File-based routes
├── composables/        # Herbruikbare composables
├── layouts/            # Nuxt layouts
├── server/
│   └── api/            # Nitro API routes
├── components/         # Vue componenten
└── public/             # Statische bestanden
```

## API routes toevoegen

Server API routes volgen de Nitro file-based conventie:

```
server/api/
├── schema/
│   ├── index.ts        → GET/POST /api/schema
│   └── [collection].ts → GET/PUT/DELETE /api/schema/:collection
├── collections/
│   └── [...path].ts    → /api/collections/:collection/:id
├── webhooks/
│   ├── index.get.ts    → GET /api/webhooks
│   ├── index.post.ts   → POST /api/webhooks
│   ├── [id].patch.ts   → PATCH /api/webhooks/:id
│   └── [id].delete.ts  → DELETE /api/webhooks/:id
└── uploads/
    ├── index.post.ts   → POST /api/uploads
    └── [filename].get.ts → GET /api/uploads/:filename
```

## Tips

- Gebruik `useFetch` in de UI voor type-safe API calls
- Schema-wijzigingen triggeren automatisch migraties
- De `.uploads/` map wordt automatisch aangemaakt bij de eerste upload
- CSS-variabelen (bijv. `var(--surface-panel)`) passen zich automatisch aan het thema aan
