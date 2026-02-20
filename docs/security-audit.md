# Security Audit — Volund Data Forge

**Datum:** 2026-02-20
**Scope:** Input validation, SQL injection, path traversal, data leakage, rate limiting, CORS, dependencies, meta-tabel bescherming
**Status:** Initiële audit (pre-auth)

---

## Samenvatting

| Severity | Aantal |
|----------|--------|
| Critical | 1 |
| High | 3 |
| Medium | 3 |
| Low | 2 |

---

## Bevindingen

### 🔴 CRITICAL-01: SQL Injection via SQLite PRAGMA's in introspection

**Locatie:** `packages/adapter-knex/src/introspection.ts:54,68,80,84`

**Risico:** Table names worden via string interpolatie in `knex.raw()` calls geplaatst zonder parameterisatie:
```ts
await knex.raw(`PRAGMA table_info(\`${table}\`)`);
await knex.raw(`PRAGMA foreign_key_list("${table}")`);
await knex.raw(`PRAGMA index_list("${table}")`);
await knex.raw(`PRAGMA index_info("${idx.name}")`);
```

Hoewel table names in dit geval uit `sqlite_master` komen (niet direct van user input), is dit patroon gevaarlijk. Als `introspect()` ooit wordt aangeroepen met user-supplied table names, of als index names kwaadaardige SQL bevatten, is SQL injection mogelijk.

**Aanbevolen fix:** Gebruik identifier escaping of whitelist validatie. PRAGMA's ondersteunen geen parameterized queries, dus valideer table/index names tegen `^[a-zA-Z0-9_]+$`.

---

### 🟠 HIGH-01: Geen authenticatie of autorisatie

**Locatie:** Alle API endpoints (`packages/api/src/router.ts`, `packages/ui/server/api/`)

**Risico:** Alle CRUD operaties, schema wijzigingen, en schema deletions zijn volledig onbeschermd. Iedereen met netwerktoegang kan:
- Alle data lezen, wijzigen, verwijderen
- Schema's aanpassen (PUT `/api/schema/:collection`)
- Schema's verwijderen (DELETE `/api/schema/:collection`)

**Opmerking:** Auth is bewust out-of-scope voor nu, maar dit is de #1 prioriteit voor productie.

**Aanbevolen fix:** Implementeer auth middleware vóór publieke deployment.

---

### 🟠 HIGH-02: Meta-tabel toegang via API niet geblokkeerd

**Locatie:** `packages/api/src/router.ts:resolveSchema()`, `packages/migration/src/version-tracker.ts`

**Risico:** De API router resolved collection names via `registry.get(name)`. De `_schema_versions` tabel wordt aangemaakt door de VersionTracker maar **niet** geregistreerd in het schema registry, waardoor directe API-toegang wordt voorkomen. **Echter:** als iemand een schema registreert met de naam `_schema_versions` (of andere `_de_` prefixed namen), wordt dit niet geblokkeerd.

De introspection module filtert `_de_` prefix tabellen uit, maar het schema registry en de API router hebben geen dergelijke blokkade.

**Aanbevolen fix:** Blokkeer collection names die beginnen met `_` in `validateSchema()` en in de API router's `resolveSchema()`.

---

### 🟠 HIGH-03: Geen input sanitization op collection names in API routes

**Locatie:** `packages/ui/server/api/collections/[...path].ts:15-22`

**Risico:** Collection names worden direct uit de URL path geëxtraheerd en doorgegeven aan de engine/adapter. Hoewel het schema registry een lookup doet (en niet-geregistreerde namen resulteren in 404), wordt de collection name niet gevalideerd vóór registry lookup. Bij toekomstige wijzigingen kan dit leiden tot onverwacht gedrag.

De `validateSchema()` functie valideert collection names met `^[a-z][a-z0-9_]*$`, maar dit wordt alleen toegepast bij schema **registratie**, niet bij **query-tijd**.

**Aanbevolen fix:** Valideer collection names in de API router tegen hetzelfde patroon (`^[a-z][a-z0-9_]*$`) vóór registry lookup.

---

### 🟡 MEDIUM-01: Geen rate limiting

**Locatie:** Gehele API stack

**Risico:** Geen enkele vorm van rate limiting, throttling of request size limiting aanwezig. Dit maakt de API kwetsbaar voor:
- DoS via grote hoeveelheden requests
- Data exfiltratie door onbeperkt pagineren
- Resource exhaustion via complexe queries

**Aanbevolen fix:** Implementeer rate limiting middleware (bijv. H3 rate limiter of custom middleware). Overweeg ook een maximum `limit` parameter (de default is 100, maar een gebruiker kan `limit=999999` meegeven).

---

### 🟡 MEDIUM-02: Error messages lekken interne details

**Locatie:** `packages/api/src/router.ts:mapError()`

**Risico:** Bij onverwachte errors wordt `err.message` direct doorgestuurd naar de client:
```ts
return serverError(err instanceof Error ? err.message : 'Unknown error');
```
Dit kan database-specifieke foutmeldingen, tabel/kolomnamen, en query details blootstellen. `DataEngineError` wordt ook direct doorgestuurd inclusief details.

In `packages/ui/server/api/schema/[collection].ts` worden niet-DataEngineError fouten ge-rethrowd (`throw err`), wat kan resulteren in ongecontroleerde stack traces via H3's default error handler.

**Aanbevolen fix:** Generieke foutmelding naar client, detail logging server-side. Wrap alle `throw err` in schema endpoints in een generieke error response.

---

### 🟡 MEDIUM-03: Onbeperkte query complexiteit

**Locatie:** `packages/api/src/query-parser.ts`, `packages/adapter-knex/src/query-builder.ts`

**Risico:**
- Geen limiet op het aantal filter condities
- Geen limiet op geneste filter groups (AND/OR diepte)
- `limit` parameter accepteert elk positief getal (geen maximum)
- `like`/`ilike` operators accepteren willekeurige patronen (potentiële ReDoS in database)

**Aanbevolen fix:** Stel maximale limieten in: max 50 filter condities, max 3 nesting levels, max limit van 1000.

---

### 🟢 LOW-01: CORS configuratie is optioneel en reflecteert origin bij `true`

**Locatie:** `packages/api/src/h3-adapter.ts:applyCorsHeaders()`

**Risico:** Wanneer `corsOrigin: true` is geconfigureerd, wordt de `Origin` header van het request gereflecteerd als `Access-Control-Allow-Origin`. Dit staat effectief alle origins toe, wat problematisch is als de API credentials/cookies gaat ondersteunen.

**Aanbevolen fix:** Documenteer dat `corsOrigin: true` alleen voor development is. Gebruik in productie een expliciete origin lijst.

---

### 🟢 LOW-02: Regex in validatie regels (ReDoS risico)

**Locatie:** `packages/schema/src/data-validator.ts:runValidation()` — `pattern` rule

**Risico:** De `pattern` validatie regel compileert user-defined regex patronen via `new RegExp(ruleValue)`. Kwaadaardige regex patronen kunnen leiden tot ReDoS (catastrophic backtracking). Dit risico is beperkt omdat patronen in schema definities staan (beheerder-gedefinieerd), niet in user data.

**Aanbevolen fix:** Overweeg regex timeout of safe-regex validatie voor schema-gedefinieerde patronen.

---

## Positieve bevindingen

1. **SQL injection bescherming (CRUD):** Alle CRUD operaties via Knex gebruiken parameterized queries via de query builder. `applyQueryAST()` en `applyCondition()` gebruiken Knex's fluent API, wat automatisch parameterisatie toepast. ✅
2. **Schema validatie:** Input data wordt gevalideerd tegen het schema bij create/update (via `compileValidator`). Onbekende velden worden gestript of geflagged. ✅
3. **Systeemveld bescherming:** Updates naar `id` en `created_at` worden expliciet geweigerd. ✅
4. **Delete safety:** Delete zonder filters vereist expliciet `{ deleteAll: true }`. ✅
5. **Content-Type validatie:** POST/PUT requests vereisen `application/json`. ✅
6. **Query field validatie:** De query compiler valideert dat filter/sort/select velden bestaan in het schema. ✅

---

## Dependency Audit

```
pnpm audit output (2026-02-20):

┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ minimatch has a ReDoS via repeated wildcards           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ minimatch                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <10.2.1                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ packages__ui > nuxt > nitropack > archiver >           │
│                     │ archiver-utils > glob > minimatch                      │
│                     │ packages__ui > nuxt > nitropack > archiver >           │
│                     │ readdir-glob > minimatch                               │
└─────────────────────┴────────────────────────────────────────────────────────┘
2 vulnerabilities found — Severity: 2 high
```

**Impact:** Transitieve dependency via Nuxt's build tooling (archiver). Niet direct exploiteerbaar via de runtime API, maar update is aanbevolen.

---

## Prioriteiten voor productie

1. **Auth implementeren** (HIGH-01)
2. **Meta-tabel namen blokkeren** (HIGH-02)
3. **Collection name validatie op query-tijd** (HIGH-03)
4. **SQLite PRAGMA sanitization** (CRITICAL-01)
5. **Rate limiting** (MEDIUM-01)
6. **Error message sanitization** (MEDIUM-02)
7. **Query complexiteit limieten** (MEDIUM-03)
