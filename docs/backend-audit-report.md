# VDF Backend Audit Report

**Datum:** 2025-07-12  
**Skill:** nuxt-backend-development  
**Scope:** `/home/claude/clawd/data-engine/packages/ui/server/`

---

## Samenvatting

| Metric | Aantal |
|--------|--------|
| Totaal bestanden | 27 |
| ✅ Compliant | 0 |
| ⚠️ Minor issues | 15 |
| ❌ Violations | 12 |

### Score per Criterium

| Criterium | Status |
|-----------|--------|
| defineEventHandler | ✅ 100% correct |
| Zod validatie | ❌ 0% - nergens gebruikt |
| createError | ❌ 0% - nergens gebruikt |
| No `any` types | ⚠️ ~60% - veel `any` casts |
| useRuntimeConfig(event) | ✅ N.v.t. (niet nodig in deze codebase) |
| setResponseStatus | ✅ 90% correct |
| defineCachedEventHandler | ❌ 0% - niet gebruikt waar nodig |
| Rate limiting | ❌ 0% - niet geïmplementeerd |

---

## Per Bestand

### Plugins

#### server/plugins/data-engine.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - `any` type: `schema.tables?.some((t: any) => t.name === TABLE)`
- **Suggesties:**
  - Definieer proper interface voor introspect result

---

### Utils

#### server/utils/activity-log.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - `any` types: `(t: any)` en return `data: any[]`
- **Suggesties:**
  - Type de table introspection result
  - Gebruik `Record<string, unknown>[]` ipv `any[]`

#### server/utils/engine.ts
- **Status:** ✅ Compliant
- **Issues:** Geen
- **Suggesties:** Goed getypt, clean state management

#### server/utils/webhooks.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - `record: unknown` overal - zou baat hebben bij generics
- **Suggesties:**
  - Voeg generics toe: `fireWebhooks<T>(event, collection, record: T)`

---

### API Routes

#### server/api/health.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen error handling wrapper
- **Suggesties:**
  - Wrap in try/catch met createError voor unexpected failures

#### server/api/openapi.json.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie voor `query.schema`
  - Geen error handling
  - OpenAPI generatie is expensive maar niet gecached
- **Suggesties:**
  - Gebruik `getValidatedQuery` met Zod schema
  - Overweeg `defineCachedEventHandler` met korte TTL

#### server/api/schema/[collection].ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ `any` type: `withSchema<T>(event: any, ...)`
  - ❌ Geen Zod validatie voor `readBody<CollectionSchema>`
  - ❌ Geen `createError` - handmatige error objects
  - Error re-throw zonder proper createError wrapping
- **Suggesties:**
  - Vervang `readBody<CollectionSchema>` door `readValidatedBody(event, CollectionSchemaZod.parse)`
  - Gebruik `createError({ status: 400, message: '...' })` overal
  - Type event als `H3Event`

#### server/api/schema/index.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ `any` type in withSchema helper
  - ❌ Geen Zod validatie voor POST body
  - ❌ Geen `createError`
- **Suggesties:**
  - Zelfde fixes als [collection].ts
  - Extract shared withSchema helper naar utils

#### server/api/schemas/[name].patch.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen Zod validatie voor body `{ description?: string; icon?: string }`
  - ❌ Geen `createError`
- **Suggesties:**
  ```typescript
  const BodySchema = z.object({
    description: z.string().optional(),
    icon: z.string().optional(),
  }).refine(d => d.description !== undefined || d.icon !== undefined)
  const body = await readValidatedBody(event, BodySchema.parse)
  ```

#### server/api/schemas/[name].delete.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie voor query `cascade`
  - Geen `createError`
- **Suggesties:**
  - Gebruik `getValidatedQuery` voor cascade param

#### server/api/schemas/index.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen Zod validatie voor POST body `{ name: string }`
  - ❌ Geen `createError`
- **Suggesties:**
  - `readValidatedBody(event, z.object({ name: z.string().min(1) }).parse)`

#### server/api/activity.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie voor query params
  - parseInt zonder bounds checking
- **Suggesties:**
  ```typescript
  const QuerySchema = z.object({
    collection: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().min(0).default(0),
  })
  ```

#### server/api/collections/[...path].ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ `any` casts: `response.body as any`
  - ❌ Geen Zod validatie
  - ❌ Geen `createError` - handmatige error objects
  - Complex route zonder caching voor GET
- **Suggesties:**
  - Definieer response body types
  - Gebruik createError helper
  - Overweeg caching voor findMany operations

#### server/api/v1/[schema]/_schema.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie voor schema param
  - Geen error handling
  - Geen caching
- **Suggesties:**
  - `defineCachedEventHandler` met 60s TTL

#### server/api/v1/[schema]/_docs.get.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ OpenAPI generatie is expensive maar niet gecached
  - Geen error handling
- **Suggesties:**
  - **P1:** `defineCachedEventHandler` met 5-10 min TTL
  - Wrap in try/catch

#### server/api/v1/[schema]/[...path].ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ `any` casts
  - ❌ Geen Zod validatie
  - ❌ Geen `createError`
  - ❌ Veel duplicate code met `/api/collections/[...path].ts`
- **Suggesties:**
  - Extract shared handler logic naar util
  - Zie fixes voor collections/[...path].ts

#### server/api/sdk/index.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen caching (getAvailableLanguages is goedkoop maar static)
- **Suggesties:**
  - `defineCachedEventHandler` met lange TTL (1 uur)

#### server/api/sdk/[language].get.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen Zod validatie voor language param
  - ❌ SDK generatie is zeer expensive - geen caching
  - Error handling via `event.node.res.statusCode = 500` ipv createError
- **Suggesties:**
  - **P1:** Rate limiting (SDK gen is CPU intensief)
  - Valideer language tegen whitelist
  - Gebruik createError

#### server/api/sdk/[language]/preview.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie
  - Fetch failure niet proper afgehandeld
- **Suggesties:**
  - `defineCachedEventHandler` - preview content is static per schema

#### server/api/collections-list.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen Zod validatie voor schema query param
  - Database count queries niet gecached
- **Suggesties:**
  - `defineCachedEventHandler` met korte TTL (30s)

#### server/api/uploads/[filename].get.ts
- **Status:** ⚠️ Minor issues (bijna compliant!)
- **Issues:**
  - Geen createError (handmatige objects)
- **Positief:**
  - ✅ Path traversal protection aanwezig!
  - ✅ Caching headers correct gezet
- **Suggesties:**
  - Vervang error objects door createError

#### server/api/uploads/index.post.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen rate limiting (file uploads zijn expensive)
  - Geen Zod schema (maar multipart is lastig)
  - Geen createError
- **Positief:**
  - ✅ File size validatie aanwezig
- **Suggesties:**
  - **P1:** Voeg rate limiting toe (bijv. 10 uploads/min)
  - Gebruik createError

#### server/api/search.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Database zoeken is expensive - geen caching
  - Geen Zod validatie voor query params
  - Geen error handling
- **Suggesties:**
  - **P1:** `defineCachedEventHandler` met 10-30s TTL
  - Rate limiting voor zoekqueries

#### server/api/webhooks/index.get.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen error handling
- **Suggesties:**
  - Wrap in try/catch

#### server/api/webhooks/[id].patch.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen Zod validatie voor body
  - ❌ Geen createError - hardcoded Nederlandse error strings
- **Suggesties:**
  ```typescript
  const BodySchema = z.object({ active: z.boolean() })
  const body = await readValidatedBody(event, BodySchema.parse)
  ```

#### server/api/webhooks/[id].delete.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - Geen createError
- **Suggesties:**
  - `throw createError({ status: 400, message: 'ID is required' })`

#### server/api/webhooks/index.post.ts
- **Status:** ❌ Violations
- **Issues:**
  - ❌ Geen Zod validatie - handmatige field checking
  - ❌ Geen createError
- **Suggesties:**
  ```typescript
  const WebhookSchema = z.object({
    collection: z.string().min(1),
    event: z.enum(['create', 'update', 'delete', 'all']),
    url: z.string().url(),
    secret: z.string().min(8),
  })
  ```

---

## Prioriteiten

### P1 — Security & Performance (Kritiek)

1. **Rate limiting toevoegen** aan:
   - `/api/uploads/index.post.ts` (file uploads)
   - `/api/sdk/[language].get.ts` (SDK generatie)
   - `/api/search.ts` (database queries)
   
2. **Caching toevoegen** voor expensive operations:
   - `/api/v1/[schema]/_docs.get.ts` (OpenAPI spec generatie)
   - `/api/search.ts` (database zoeken)
   - `/api/sdk/[language].get.ts` of rate limit hard

### P2 — Compliance (Belangrijk)

3. **Zod validatie implementeren** — Creëer shared schemas in `server/utils/schemas.ts`:
   ```typescript
   // server/utils/schemas.ts
   export const PaginationSchema = z.object({
     limit: z.coerce.number().int().min(1).max(100).default(20),
     offset: z.coerce.number().int().min(0).default(0),
   })
   
   export const IdParamSchema = z.object({
     id: z.coerce.number().int().positive(),
   })
   ```

4. **createError vervangen** — Alle handmatige `{ error: {...} }` objects vervangen door:
   ```typescript
   throw createError({ status: 400, message: 'Missing field' })
   ```

### P3 — Code Quality (Nice to have)

5. **Elimineer `any` types** — Vervang door proper interfaces of `unknown` met type guards

6. **DRY: Extract shared logic** — De catch-all routes (`collections/[...path].ts` en `v1/[schema]/[...path].ts`) hebben veel duplicate code

7. **Internationalisatie** — Sommige error messages zijn Nederlands, anderen Engels. Kies één taal (Engels aanbevolen).

---

## Aanbevolen Refactor Volgorde

1. Maak `server/utils/schemas.ts` met gedeelde Zod schemas
2. Maak `server/utils/api-error.ts` met createError helpers
3. Fix P1 items (rate limiting + caching)
4. Migreer routes één voor één naar Zod validatie
5. Vervang error handling
6. Elimineer any types

---

## Positieve Punten

- ✅ `defineEventHandler` overal correct gebruikt
- ✅ `setResponseStatus` consequent toegepast
- ✅ Path traversal protection in uploads
- ✅ Content-Type validatie voor POST/PUT
- ✅ File size validatie bij uploads
- ✅ Clean separation: plugin → utils → routes
- ✅ Engine readiness gate (`waitForEngine`) consequent gebruikt
