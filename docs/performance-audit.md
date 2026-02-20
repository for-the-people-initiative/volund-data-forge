# Performance Audit — Volund Data Forge

**Datum:** 2026-02-20
**Scope:** Statische code-analyse (geen runtime profiling)

---

## 1. Bundle Size

```
du -sh packages/*/dist/
16K   packages/adapter/dist/
36K   packages/adapter-knex/dist/
28K   packages/api/dist/
28K   packages/engine/dist/
32K   packages/migration/dist/
28K   packages/schema/dist/
```

**UI package:** 1.6 MB totaal (incl. `.nuxt/`, components, etc.), geen eigen `dist/`.

**Oordeel:** Core packages zijn klein (16–36 KB). Geen probleem. De UI package is een Nuxt app; bundle size wordt bepaald door Nuxt's build.

### Dependencies van belang
- **`better-sqlite3`** — native addon, ~5 MB compiled. Noodzakelijk voor SQLite.
- **`knex`** — ~200 KB bundled. Draait server-side, geen client impact.
- **`vue-draggable-plus`** — client-side, relatief klein (~15 KB gzip). OK.
- **`for-the-people-design-system`** — onbekende grootte; als dit een groot systeem is kan het client bundle beïnvloeden.

**Geen onnodige dependencies gedetecteerd.** Lockfile is 7768 regels — redelijk voor een monorepo met Nuxt.

---

## 2. Database Query Patterns

### 2.1 N+1 Query Risico's

| Locatie | Risico | Severity |
|---------|--------|----------|
| `engine.ts` → `enforceOnDeletePolicies()` | **Hoog** — Itereert over ALLE schemas × ALLE relatie-velden. Per relatie-veld: `findMany` + `update`/`delete`. Bij N schemas met M relaties = N×M queries per delete. | 🔴 Hoog |
| `[...path].ts` → `resolveLookups()` | **Medium** — Per lookup field een `findMany` query. Bij 3 lookup fields = 3 extra queries per GET request. | 🟡 Medium |
| `adapter.ts` → `findWithRelations()` | **Goed** — Gebruikt batch `whereIn` i.p.v. per-record queries. Geen N+1. | ✅ OK |
| `engine.ts` → `populateResults()` | **Goed** — Zelfde batch-patroon als adapter. | ✅ OK |

#### Detail: `enforceOnDeletePolicies()` (engine.ts:178-245)
```
Voor elke delete:
  1. findMany(collection, query)           — records ophalen die verwijderd worden
  2. Voor ELKE schema in registry:
     3. Voor ELKE relatie-veld dat naar deze collection wijst:
        4. findMany(referencing_collection, {field IN ids})  — check gerelateerde records
        5. update/delete als nodig
```
Bij 10 collections met gemiddeld 2 relatie-velden = **20+ queries per delete operatie**, ongeacht of er daadwerkelijk gerelateerde records zijn.

### 2.2 Ontbrekende Indexes

Geen expliciete index-creatie gevonden buiten:
- Primary keys (automatisch)
- Unique constraints op junction tables
- Foreign key constraints (NOT automatisch geïndexed in SQLite!)

**Risico:** Foreign key kolommen (bijv. `company_id` op `contacts`) hebben geen expliciete index in SQLite. Dit maakt `whereIn(fk, ids)` een full table scan.

### 2.3 Redundante Queries

| Locatie | Issue |
|---------|-------|
| `version-tracker.ts` → `getLatestVersion()` + `getLatestSnapshot()` | Worden apart aangeroepen in `applySchema()`, maar doen bijna dezelfde query. Kan 1 query zijn. |
| `data-engine.ts` plugin → seeding | `findMany(collection, { limit: 1 })` voor elke seed-check is OK maar kan `SELECT COUNT(*)` zijn (goedkoper). |
| `enforceOnDeletePolicies()` | `findMany` gevolgd door `update` of `delete` op dezelfde set — de findMany is overbodig als je direct `update WHERE ... IN (ids)` doet. |

---

## 3. Startup Performance

### Bootstrap volgorde (`data-engine.ts` plugin):
1. `createDataEngine()` → connect + migration init
2. `getPersistedCollectionNames()` → query `_schema_versions`
3. **Per collection:** `getPersistedSnapshot()` → query + `applySchema()`
4. `applySchema(companiesSchema, { force: true })` — altijd, ook als al gerestored
5. `applySchema(contactsSchema, { force: true })` — idem
6. Seed checks (2 queries)

**Totaal bij 2 user collections:** ~10-15 queries bij startup.

**Risico bij schaal:** Bij 50 collections = ~100+ queries bij startup. `getPersistedCollectionNames()` haalt ALLE rijen op en dedupliceet in JS i.p.v. `SELECT DISTINCT collection_name`.

### `applySchema` met `force: true`
Altijd uitgevoerd voor default schemas, ook als ze net zijn gerestored. Dit betekent:
1. `getLatestSnapshot()` — query
2. `getLatestVersion()` — query
3. `diffSchemas()` — CPU
4. Meestal no-op, maar kost 2 queries per schema elke startup.

---

## 4. Rendering / Client Performance

### DataTable.vue
- **Geen virtualisatie** — alle records worden als DOM-elementen gerenderd. Bij 100+ records (default limit) kan dit traag worden, bij 1000+ problematisch.
- **`useFetch` met `watch: [apiUrl]`** — reactive; elke filter/sort/page change triggert een nieuwe fetch. Dit is correct maar er is geen debounce op filter input.
- **Computed properties** zijn lichtgewicht — geen performance issue.

### useSchema composable
- **Caching via `getCachedData`** — goed, voorkomt dubbele schema fetches.

### useDataEngine composable
- Elke method-call maakt een nieuwe `useFetch`. Geen request deduplicatie buiten Nuxt's ingebouwde key-matching.

---

## 5. Memory Patterns

### Potentiële issues:
1. **`MigrationManager.migrations` Map** — groeit onbegrensd. Elke `applySchema()` call pusht naar een array die nooit wordt opgeruimd. Bij veel schema-wijzigingen = memory leak.
   - Locatie: `migration-manager.ts` regel ~80
   - Impact: Laag bij normaal gebruik, problematisch bij automated schema changes.

2. **`SchemaRegistry.cache` Map** — groeit met elke collection maar wordt opgeruimd via `remove()`. OK.

3. **Knex connection pool** — default `min: 2, max: 10`. Voor SQLite is een pool van >1 onnodig (SQLite is single-writer). Verspilt file handles.

---

## 6. Build Performance

Packages gebruiken `tsup` — zeer snel (esbuild-based). Build van alle 6 core packages samen is typisch <5 seconden. De UI package gebruikt Nuxt build, wat 15-30 seconden kan duren afhankelijk van de host.

**Geen problemen gedetecteerd.**

---

## 7. Top Optimalisaties (Geprioriteerd)

### 🔴 P0: Indexes op Foreign Key kolommen

**Locatie:** `adapter-knex/src/adapter.ts` → `createCollection()`, `addField()`
**Impact:** Elke relation lookup en `enforceOnDeletePolicies()` doet full table scans op FK kolommen in SQLite.
**Fix:** Voeg `table.index(field.name)` toe bij `relation` type velden in `createCollection()` en `addField()`.
**Effort:** Klein (5 regels code)

### 🔴 P0: Optimaliseer `enforceOnDeletePolicies()`

**Locatie:** `engine/src/engine.ts` → `enforceOnDeletePolicies()`
**Impact:** O(schemas × relation_fields) queries per delete. Bij 10+ collections wordt dit een bottleneck.
**Fix:**
1. Skip schemas die geen relatie naar de target collection hebben (pre-compute een reverse-relation map bij registry changes)
2. Verwijder de overbodige `findMany` voor `setNull` en `cascade` — doe direct `update WHERE IN` / `delete WHERE IN`
3. Cache de reverse-relation map in de engine
**Effort:** Medium

### 🟡 P1: Startup query reductie

**Locatie:** `migration/src/version-tracker.ts`, `ui/server/plugins/data-engine.ts`
**Impact:** 2 queries per collection + 2 redundante `applySchema` calls bij elke startup.
**Fix:**
1. `getAllCollectionNames()` → `SELECT DISTINCT collection_name FROM _schema_versions`
2. Combineer `getLatestVersion()` + `getLatestSnapshot()` in één method
3. Skip `applySchema(force: true)` voor default schemas als ze al in de restored set zitten
**Effort:** Klein

### 🟡 P1: SQLite pool configuratie

**Locatie:** `adapter-knex/src/adapter.ts` → `connect()`
**Impact:** 2-10 idle connections voor een single-writer database.
**Fix:** `pool: { min: 1, max: 1 }` voor SQLite clients (of gebruik `min: 0`).
**Effort:** Triviaal (2 regels)

### 🟢 P2: DataTable virtualisatie

**Locatie:** `ui/components/DataTable.vue`
**Impact:** Bij 500+ records wordt DOM rendering merkbaar traag.
**Fix:** Gebruik een virtual scroll library (bijv. `@tanstack/vue-virtual`) of beperk de default `pageSize` tot 25-50.
**Effort:** Medium

### 🟢 P2: Debounce op filter input

**Locatie:** `ui/components/DataTable.vue` / `FilterBar.vue`
**Impact:** Elke toetsaanslag triggert een nieuwe API call.
**Fix:** Debounce van 300ms op filter changes.
**Effort:** Klein

---

## Samenvatting

| Categorie | Status |
|-----------|--------|
| Bundle size | ✅ Geen issues |
| Database queries | 🔴 FK indexes ontbreken, delete is O(n²) |
| Startup | 🟡 Redundante queries, niet schaalbaar |
| Rendering | 🟡 Geen virtualisatie, geen debounce |
| Memory | 🟢 Minor (migration history groeit) |
| Build | ✅ Geen issues |
