# 🏗️ Architectuur

Volund Data Forge is opgebouwd als een monorepo met meerdere packages, elk met een specifieke verantwoordelijkheid.

## Packages overzicht

```
packages/
├── adapter/          # Abstracte database-adapter interface
├── adapter-knex/     # Knex.js implementatie van de adapter
├── api/              # API-laag (routing, request handling)
├── engine/           # Core engine (orchestratie van alle packages)
├── migration/        # Schema-migraties
├── schema/           # Schema-definitie, validatie en formules
└── ui/               # Nuxt 3 frontend applicatie
```

### `@data-engine/adapter`

Definieert de abstracte interface voor database-interactie. Hierdoor kan de engine werken met verschillende databases zonder directe afhankelijkheden.

### `@data-engine/adapter-knex`

Concrete implementatie van de adapter-interface met [Knex.js](https://knexjs.org/). Ondersteunt SQLite, PostgreSQL en andere door Knex ondersteunde databases.

### `@data-engine/api`

De API-laag die HTTP endpoints beschikbaar stelt. Bevat routing-logica en request/response handling voor schema-beheer, CRUD-operaties en meer.

### `@data-engine/engine`

De kern van het systeem. Orchestreert de samenwerking tussen adapter, schema, migratie en API. Beheert de lifecycle van collecties en records.

### `@data-engine/migration`

Verantwoordelijk voor het automatisch genereren en uitvoeren van database-migraties wanneer schemas worden aangemaakt of gewijzigd.

### `@data-engine/schema`

Schema-definitie en validatie. Bevat ook de **formula evaluator** voor berekende velden. Valideert veldtypen, relaties en constraints.

### `@data-engine/ui`

De frontend applicatie, gebouwd met **Nuxt 3** (Vue 3). Bevat:

- **Pages** — Schema builder, data management, activiteitenlog, webhooks, zoeken
- **Server API routes** — Nitro server endpoints die de engine aanroepen
- **Composables** — Herbruikbare logica (o.a. `useTheme`)
- **Uploads** — Bestandsupload en -serving via `.uploads/` directory

## Dataflow

```
Browser (UI)
    ↓ HTTP
Nuxt Server (Nitro)
    ↓
API / Engine
    ↓
Adapter (Knex)
    ↓
Database (SQLite / PostgreSQL)
```

1. De **UI** stuurt HTTP requests naar de Nuxt server
2. **Nitro server routes** roepen de engine/API-laag aan
3. De **engine** valideert via het schema-package en voert operaties uit via de adapter
4. De **adapter** vertaalt operaties naar SQL via Knex
5. **Migraties** worden automatisch uitgevoerd bij schema-wijzigingen

## Belangrijke patronen

- **Adapter pattern** — database-onafhankelijkheid via abstracte interface
- **Schema-driven** — alles wordt aangestuurd door het schema (UI, validatie, migraties)
- **File-based routing** — Nuxt 3 conventie voor zowel pages als API routes
- **Composables** — gedeelde Vue 3 logica via de Composition API
