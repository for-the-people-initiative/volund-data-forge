# Architecture Audit — Volund Data Forge

**Datum:** 2026-02-20  
**Scope:** 7 packages in `packages/`  
**Focus:** Architectuur, code-organisatie, verbeterpunten

---

## 1. Package Structuur & Dependency Graph

### Packages (7)

| Package | Verantwoordelijkheid | Bestanden (src/) |
|---------|---------------------|------------------|
| `schema` | Types, validatie, diffing, type-system, errors, logger | 9 |
| `adapter` | DatabaseAdapter interface + types (geen implementatie) | 1 |
| `adapter-knex` | Knex-gebaseerde adapter implementatie | 4 |
| `api` | REST API router, H3 adapter, hooks, response helpers | 6 |
| `engine` | Core CRUD engine, bootstrap, query compiler | 4 |
| `migration` | Schema versioning, migration generation/execution | 5 |
| `ui` | Nuxt/Nitro frontend + server routes | 6 (server) |

### Dependency Graph

```
schema (leaf — geen interne deps)
  ↑
adapter (depends on: schema)
  ↑
adapter-knex (depends on: adapter, schema)
  ↑
api (depends on: adapter, schema)
  ↑
migration (depends on: adapter, schema)
  ↑
engine (depends on: schema, adapter, adapter-knex, api, migration)
  ↑
ui (depends on: engine, schema, adapter, api, migration)
```

### Beoordeling

**Positief:**
- Geen circulaire dependencies
- `schema` als leaf package is een goede keuze — alle types en errors zitten hier
- `adapter` als pure interface package is clean

**Aandachtspunten:**
- `engine` is een "god package" — het importeert **alle** andere packages inclusief `adapter-knex` (concrete implementatie). Dit breekt het adapter pattern.
- `api` en `engine` hebben **overlappende hook systemen** (zie punt 5)

---

## 2. API Design Review

### REST Endpoints (via ApiRouter)

| Method | Path | Status Codes | Correct? |
|--------|------|-------------|----------|
| GET | `/api/:collection` | 200, 404, 500 | ✅ |
| GET | `/api/:collection/:id` | 200, 404, 500 | ✅ |
| POST | `/api/:collection` | 201, 400, 404, 415, 500 | ✅ |
| PUT | `/api/:collection/:id` | 200, 400, 404, 415, 500 | ✅ |
| DELETE | `/api/:collection/:id` | 204, 404, 500 | ✅ |

### Schema Endpoints (UI server routes)

| Method | Path | Correct? |
|--------|------|----------|
| GET | `/api/schema` | ✅ |
| POST | `/api/schema` | ✅ (201) |
| GET | `/api/schema/:collection` | ✅ |
| PUT | `/api/schema/:collection` | ✅ |
| DELETE | `/api/schema/:collection` | ✅ (204) |

### Error Response Format

**Consistent format gebruikt:**
```json
{ "error": { "code": "ERROR_CODE", "message": "...", "details?": [...] } }
```

**Probleem:** De schema API routes in `ui/server/api/schema/` gebruiken een **ander error format** dan de `api` package:
- `api` package: `errorResponse()` helper → `{ error: { code, message, details? } }`
- Schema routes: handmatig `{ error: { code, message } }` — soms met `details` als object i.p.v. array

### Missende HTTP features
- Geen PATCH support (alleen PUT voor updates)
- `findMany` retourneert `total: data.length` — dit is het aantal **geretourneerde** records, niet het **totaal** in de database. Paginatie metadata is misleidend.
- Geen `count` endpoint

---

## 3. Separation of Concerns

### ✅ Goed gescheiden
- Schema validatie zit in `schema` package
- Query building zit in `adapter-knex`
- Query parameter parsing zit in `api`
- Migration generation/execution zijn gescheiden

### ❌ Problemen

**3a. Business logica in UI layer**

`ui/server/api/collections/[...path].ts` bevat:
- Bracket notation query parsing (dupliceert deels `query-parser.ts`)
- Lookup field resolution logica (~40 regels `resolveLookups`)
- Content-Type validatie (dupliceert H3 adapter)
- Route matching logica

Dit zou in de `api` of `engine` package moeten zitten.

**3b. Seed data in Nitro plugin**

`ui/server/plugins/data-engine.ts` bevat hardcoded CRM seed schemas en data. Dit hoort in een apart seed/fixture bestand.

**3c. Bootstrap kent concrete adapter**

`engine/bootstrap.ts` importeert `KnexAdapter` direct — de engine package zou adapter-agnostisch moeten zijn.

---

## 4. Code Duplicatie

### 4a. Dubbel Hook Systeem ⚠️ **HOOG**

Er bestaan **twee** volledig gescheiden hook systemen:

1. **`engine/engine.ts`**: `DataEngine.registerHook()` + `fireHooks()` — Map-based, met `HookFunction` type
2. **`api/hooks.ts`**: `DefaultHookRegistry` + `executeHooks()` — Registry-based, met `HookFn` type

De `ApiRouter` (in `api`) gebruikt het API hook systeem.  
De `DataEngine` (in `engine`) gebruikt zijn eigen hook systeem.  
Beide worden aangeroepen bij dezelfde CRUD operaties → hooks worden potentieel **dubbel uitgevoerd**.

### 4b. Relation Population Duplicatie ⚠️ **HOOG**

Relation population is **drie keer** geïmplementeerd:

1. `adapter-knex/adapter.ts` → `findWithRelations()` (~80 regels)
2. `engine/engine.ts` → `populateResults()` (~90 regels)
3. `ui/server/api/collections/[...path].ts` → `resolveLookups()` (~40 regels)

### 4c. Timestamp injection

`created_at`/`updated_at` worden op **twee plekken** gezet:
- `adapter-knex/adapter.ts` → `create()` en `update()`
- `engine/engine.ts` → `create()` en `update()`

Dit leidt tot dubbele timestamps of conflicten.

### 4d. Content-Type validatie

Geïmplementeerd in zowel `api/h3-adapter.ts` als `ui/server/api/collections/[...path].ts`.

### 4e. Query builder pattern

`applyQueryAST` wordt steeds handmatig aangeroepen in adapter methods. Zou een decorator of middleware pattern kunnen zijn.

---

## 5. Error Handling

### ✅ Goed
- Centrale error hiërarchie in `schema/errors.ts` met `DataEngineError` als base class
- Alle errors hebben `code`, `statusCode`, `toJSON()`
- `ApiRouter.mapError()` vertaalt engine errors naar HTTP responses
- Adapter wraps alle DB errors in typed errors (`ConnectionError`, `QueryError`, `SchemaError`)

### ❌ Problemen

**5a. Inconsistente error propagatie in UI routes**

Schema routes (`ui/server/api/schema/`) catchen `DataEngineError` maar laten andere errors doorvallen naar Nitro's default handler. Het `collections` catch-all route doet dit ook niet consistent.

**5b. `console.warn` in hooks**

`api/hooks.ts` regel 38: `console.warn()` i.p.v. de logger interface. Dit omzeilt het pluggable logger systeem.

**5c. Silently swallowed errors**

- `version-tracker.ts` `init()`: `catch {}` — swallows alle errors, niet alleen "table exists"
- `collections-list.ts`: `catch {}` — count failures worden stilletjes genegeerd
- `collections/[...path].ts`: lookup resolution failures worden gecatcht en genegeerd

---

## 6. Naming Conventions

### Taal mix

| Context | Taal | Voorbeeld |
|---------|------|-----------|
| Code (variabelen, functies, classes) | Engels | ✅ Consistent |
| Error messages | Engels | Overwegend ✅ |
| Error messages | **Nederlands** | `engine.ts`: `"Kan niet verwijderen: er zijn nog..."` ❌ |
| Seed data | Nederlands | `'Technologie'`, `'Gezondheidszorg'` — OK (domeindata) |
| Comments | Engels | ✅ Consistent |

**Probleem:** Error messages die naar de API consumer gaan moeten één taal zijn. De `RESTRICT_VIOLATION` error in `engine.ts` is Nederlands terwijl alle andere errors Engels zijn.

### Type naming

- `HookEvent` + `HookFunction` + `HookContext` (engine)
- `HookEvent` + `HookFn` + `HookContext` (api)

Inconsistent: `HookFunction` vs `HookFn` voor hetzelfde concept.

### File naming
- `snake-case.ts` — ✅ consistent overal

---

## 7. Config & Hardcoding

| Hardcoded waarde | Locatie | Zou configureerbaar moeten zijn? |
|-----------------|---------|----------------------------------|
| `defaultLimit: 100` | `engine.ts` | ✅ Al configureerbaar |
| `varchar(255)` | `type-mapping.ts` | ⚠️ Ja — tekstveld lengte |
| Pool `min: 2, max: 10` | `adapter.ts` | ⚠️ Al deels configureerbaar |
| `VERSIONS_TABLE = '_schema_versions'` | `version-tracker.ts` | ⚠️ Zou configureerbaar moeten zijn |
| `ENGINE_PREFIX = '_de_'` | `introspection.ts` | ⚠️ Moet synchroon zijn met version tracker |
| `depth >= 2` (max populate depth) | `engine.ts` | ⚠️ Ja |
| `86400` (CORS max-age) | `h3-adapter.ts` | ⚠️ Ja |
| Seed schemas + data | `data-engine.ts` plugin | ❌ Moet extern/configureerbaar |
| `headerNames` whitelist | `h3-adapter.ts` | ⚠️ Te restrictief — custom headers geblokkeerd |

---

## 8. Concrete Verbeterpunten (geprioriteerd)

### 🔴 P1 — Dubbel Hook Systeem Unificeren

**Probleem:** Twee onafhankelijke hook systemen (`engine` en `api`) die bij dezelfde operaties worden aangeroepen. Hooks kunnen dubbel vuren, zijn verwarrend voor consumers.

**Impact:** Bugs door dubbele hook executie, verwarrende DX, onderhoudslast.

**Fix:** Verwijder het hook systeem uit `api/hooks.ts`. Laat `ApiRouter` de hooks van `DataEngine` gebruiken. De engine is de single source of truth voor lifecycle events.

---

### 🔴 P2 — Engine Package Moet Adapter-Agnostisch Zijn

**Probleem:** `engine/bootstrap.ts` importeert `KnexAdapter` direct. De `engine` package.json heeft een dependency op `@data-engine/adapter-knex`. Dit breekt het adapter pattern en maakt het onmogelijk om een andere adapter te gebruiken zonder engine te wijzigen.

**Impact:** Vendor lock-in op Knex, niet testbaar met mock adapter, architectureel incorrect.

**Fix:** 
- Verplaats `bootstrap.ts` naar een nieuw `@data-engine/core` package of naar `ui`
- OF: laat `createDataEngine()` een `DatabaseAdapter` instance accepteren i.p.v. zelf te creëren
- Verwijder `@data-engine/adapter-knex` dependency uit engine

---

### 🟡 P3 — Lookup Resolution Naar Engine Verplaatsen

**Probleem:** Lookup field resolution zit in de UI catch-all route handler (~40 regels). Dit is business logica die in de engine thuishoort, zodat het ook werkt via directe engine calls.

**Impact:** Lookups werken alleen via de HTTP API, niet bij directe engine gebruik. Code duplicatie met populate logica.

**Fix:** Integreer lookup resolution in `DataEngine.findMany()`/`findOne()` als automatische post-processing stap.

---

### 🟡 P4 — Timestamp Injection Dedupliceren

**Probleem:** Zowel de engine als de adapter zetten `created_at`/`updated_at`. De engine doet het in `create()`/`update()`, de adapter doet het ook.

**Impact:** Dubbele timestamps, potentieel inconsistent (ms verschil).

**Fix:** Kies één plek. Aanbevolen: alleen in de engine (die de business logica beheert). Verwijder timestamp injection uit de adapter.

---

### 🟡 P5 — Error Messages Consistent Engels

**Probleem:** `RESTRICT_VIOLATION` errors zijn in het Nederlands terwijl alle andere errors Engels zijn.

**Impact:** Inconsistente API responses, lastig voor i18n.

**Fix:** Maak alle error messages Engels. Voeg eventueel een i18n layer toe als Nederlandse errors gewenst zijn voor de UI.

---

### 🟢 P6 — Pagination Meta Fix

**Probleem:** `successList()` retourneert `total: data.length` — dit is het aantal records in de response, niet het totaal in de database. De API suggest paginatie maar de metadata is misleidend.

**Impact:** Frontend kan geen correcte paginatie tonen.

**Fix:** Voeg een `COUNT(*)` query toe aan findMany of maak `total` optioneel. Overweeg een apart `meta.filteredCount` vs `meta.totalCount`.

---

### 🟢 P7 — Collections-List Count Inefficiëntie

**Probleem:** `collections-list.ts` haalt **alle records** op om ze te tellen: `adapter.findMany(name, { filters: [] })` → `records.length`. Bij grote tabellen is dit destructief voor performance.

**Impact:** O(n) memory per collection bij elke lijst-request.

**Fix:** Voeg een `count(collection, query)` method toe aan de DatabaseAdapter interface.

---

### 🟢 P8 — Seed Data Externaliseren

**Probleem:** CRM seed schemas en data zijn hardcoded in het Nitro plugin bestand.

**Impact:** Niet herbruikbaar, moeilijk te wijzigen, vervuilt bootstrap logica.

**Fix:** Verplaats naar `data/seeds/` JSON bestanden of een seed module.

---

### 🟢 P9 — Silent Error Swallowing

**Probleem:** Meerdere `catch {}` blokken die errors stilletjes negeren (version-tracker init, collections-list count, lookup resolution).

**Impact:** Bugs worden gemaskeerd, debugging wordt moeilijk.

**Fix:** Log errors via de logger interface, zelfs als ze niet-fataal zijn.

---

## 9. Samenvatting

| Categorie | Score | Toelichting |
|-----------|-------|-------------|
| Package structuur | 7/10 | Goed opgedeeld, maar engine is te breed |
| API design | 8/10 | Consistent REST, goede error format |
| Separation of concerns | 6/10 | Lookup/hook/timestamp duplicatie |
| Code duplicatie | 5/10 | Significant — hooks, population, timestamps |
| Error handling | 7/10 | Goede basis, maar silent swallowing |
| Naming conventions | 8/10 | Consistent behalve NL/EN mix in errors |
| Config/hardcoding | 6/10 | Seed data en diverse magic numbers |

**Totaal: Solide basis met 3-4 architecturele issues die aandacht verdienen vóór verdere feature development.**
