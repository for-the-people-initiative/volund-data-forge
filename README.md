[![CI](https://github.com/for-the-people-initiative/volund-data-forge/actions/workflows/ci.yml/badge.svg)](https://github.com/for-the-people-initiative/volund-data-forge/actions/workflows/ci.yml)

# Volund Data Forge

> Smeed je eigen data tools

A schema-driven data platform that lets you define your data models declaratively and generates everything you need — from database migrations to API endpoints to admin UI.

## Features

- **Schema-first** — Define tables, columns, and relations in a typed schema DSL
- **Auto-migration** — Generate and run SQLite migrations from schema changes
- **REST API** — H3-based CRUD endpoints generated from your schema
- **Admin UI** — Nuxt-powered interface for browsing and managing data
- **Adapter pattern** — Pluggable database layer (Knex/SQLite out of the box)
- **Monorepo** — Clean package separation with shared types

## Tech Stack

- **Frontend:** Vue 3, Nuxt 3, FTP Design System
- **Backend:** H3, TypeScript
- **Database:** SQLite (via better-sqlite3 + Knex)
- **Build:** pnpm workspaces, tsup

## Packages

| Package | Description |
|---|---|
| `@data-engine/schema` | Schema definition types and utilities |
| `@data-engine/adapter` | Abstract database adapter interface |
| `@data-engine/adapter-knex` | Knex/SQLite adapter implementation |
| `@data-engine/engine` | Core engine that ties schema → adapter → operations |
| `@data-engine/migration` | Schema-diff based migration generator and runner |
| `@data-engine/api` | H3 API route handlers generated from schema |
| `@data-engine/ui` | Nuxt admin UI for data management |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start the dev server (UI)
cd packages/ui
pnpm dev  # → http://localhost:9002
```

## Project Status

🔨 **Alpha** — Under active development. APIs and schema format may change.

## License

TBD
