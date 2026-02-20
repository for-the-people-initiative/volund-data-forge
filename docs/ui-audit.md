# UI Audit — Volund Data Forge (`@data-engine/ui`)

**Datum:** 2026-02-20  
**Scope:** Alle bestanden in `packages/ui/` (excl. `.nuxt/`, `node_modules/`)  
**Beoordelaar:** Claude (geautomatiseerd)

---

## Samenvatting

De UI-codebase is **compact en goed gestructureerd** voor een alpha-product. Design tokens worden consistent gebruikt, componenten zijn logisch opgesplitst, en de schema-driven aanpak is sterk. Er zijn echter concrete verbeterpunten op het gebied van composable-gebruik, SSR-correctheid, accessibility, error handling en code-duplicatie.

---

## Geanalyseerde bestanden

| Categorie | Bestanden |
|---|---|
| **Composables** | `useDataEngine.ts`, `useSchema.ts` |
| **Server routes** | `collections/[...path].ts`, `collections-list.ts`, `schema/index.ts`, `schema/[collection].ts` |
| **Server utils/plugins** | `engine.ts`, `data-engine.ts` |
| **Pages** | `index.vue`, `about.vue`, `builder/index.vue`, `collections/index.vue`, `collections/live.vue`, `collections/[collection]/index.vue`, `collections/[collection]/[id].vue`, `collections/[collection]/new.vue` |
| **Components** | `DataForm.vue`, `DataTable.vue`, `FilterBar.vue`, `RecordPicker.vue` |
| **Schema Builder** | `Container.vue`, `CollectionEditor.vue`, `CollectionList.vue`, `FieldEditor.vue`, `FieldList.vue`, `FieldTypePicker.vue`, `LookupConfigurator.vue`, `RelationConfigurator.vue`, `RelationDiagram.vue`, `SchemaPreview.vue`, `SelectOptionsEditor.vue` |
| **Config** | `nuxt.config.ts`, `app.config.ts`, `package.json` |

---

## Verbeterpunten

### 🔴 P1 — `useDataEngine` wraps `useFetch` verkeerd (SSR-probleem)

**Bestanden:** `composables/useDataEngine.ts`, `components/DataForm.vue`, `pages/collections/[collection]/[id].vue`

**Probleem:** Alle methoden in `useDataEngine` zijn `async` functies die `useFetch` retourneren. Maar `useFetch` is een composable die **synchroon** moet worden aangeroepen in de setup-context om SSR-deduplicatie en key-tracking te laten werken. Door het te wrappen in een async functie:

1. Gaat de automatische SSR-payload transfer verloren — data wordt client-side opnieuw gefetcht.
2. De `key` parameter ontbreekt overal, waardoor Nuxt geen deduplicatie kan doen.
3. In `DataForm.vue` en `[id].vue` wordt `useFetch` binnen `watch` callbacks aangeroepen — dit is een anti-pattern dat leidt tot memory leaks (elke watch-trigger maakt een nieuwe watcher aan die nooit wordt opgeruimd).

**Impact:** Dubbele API-calls bij SSR→client hydration, potentiële memory leaks bij navigatie.

**Aanbevolen fix:**
- Gebruik `$fetch` (de unwrapped variant) in methoden die vanuit event handlers of watchers worden aangeroepen (create, update, delete, en het laden van record data in edit-modus).
- Gebruik `useFetch`/`useAsyncData` alleen top-level in setup voor initiële data (zoals `listRecords` in DataTable).
- Voeg expliciete `key` parameters toe aan alle `useFetch` calls.

---

### 🔴 P2 — `collections-list` endpoint haalt ALLE records op om te tellen

**Bestand:** `server/api/collections-list.ts`

**Probleem:**
```ts
const records = await adapter.findMany(schema.name, { filters: [] });
count = records.length;
```
Dit laadt **alle records** in geheugen om een count te doen. Bij grote collecties is dit een performance- en geheugenprobleem.

**Impact:** O(n) geheugengebruik en latency per collectie, schaalt niet.

**Aanbevolen fix:** Gebruik een `COUNT(*)` query via de adapter, of voeg een `count()` methode toe aan de adapter interface. Tijdelijke workaround: `findMany` met `limit: 0` + een meta.total als de adapter dat ondersteunt.

---

### 🟡 P3 — Geen globale error handling / error boundary

**Bestanden:** Alle pages en components

**Probleem:** 
- `DataForm.vue` heeft serverError handling, maar bij netwerk-errors (offline, timeout) wordt alleen de raw error message getoond.
- `DataTable.vue` heeft **geen** error state — als de fetch faalt, toont het een lege tabel ("Geen records gevonden") in plaats van een error.
- `RecordPicker.vue` slikt errors volledig (`catch {}`) zonder feedback aan de gebruiker.
- Pages zoals `collections/index.vue` en `index.vue` tonen alleen "Laden..." maar geen error state.
- Er is geen `error.vue` pagina of `<NuxtErrorBoundary>` wrapper.

**Impact:** Gebruikers krijgen geen feedback bij API-fouten, wat debugging en UX ondermijnt.

**Aanbevolen fix:**
- Voeg een `error.vue` page toe voor unhandled errors.
- Voeg error states toe aan DataTable (check `error` ref van useFetch).
- Vervang lege `catch {}` blocks door minimale user feedback (toast/inline error).
- Overweeg een `useToast` composable voor consistente error-meldingen.

---

### 🟡 P4 — Accessibility gaps

**Bestanden:** Meerdere componenten

**Specifieke problemen:**

| Component | Issue |
|---|---|
| `DataTable.vue` | Tabel-rijen zijn clickable via `@click` maar niet toetsenbord-bereikbaar (geen `tabindex`, geen `role="link"`, geen `@keydown.enter`). Sorteer-headers missen `aria-sort`. |
| `FilterBar.vue` | Filter-inputs missen `id` + `for` koppeling met labels. |
| `RecordPicker.vue` | Modal heeft `role="dialog"` ✓, maar mist `aria-modal="true"` en focus-trapping. Na openen springt focus niet naar de modal; na sluiten keert focus niet terug. |
| `FieldTypePicker.vue` | Modal mist `role="dialog"`, focus-trapping, en Escape-key handling. |
| `DataTable.vue` (delete dialog) | Delete-bevestiging mist focus-trapping en `role="alertdialog"`. |
| `layouts/data-engine.vue` | Sidebar navigatie mist `aria-current="page"` op actieve link. Hamburger-menu mist `aria-expanded`. |
| Alle modals | Geen van de Teleport-modals implementeert scroll-lock op `<body>`. |

**Impact:** Niet bruikbaar met screen readers of toetsenbord-only navigatie.

**Aanbevolen fix:**
- Maak een herbruikbare `BaseModal.vue` component met focus-trap, Escape-key, aria-modal, scroll-lock.
- Voeg `tabindex="0"` + `@keydown.enter` toe aan clickable table rows.
- Voeg `aria-sort` toe aan sorteerbare kolom-headers.
- Koppel labels aan inputs via `id`/`for` in FilterBar.

---

### 🟡 P5 — Container.vue is te groot en mixt concerns

**Bestand:** `components/schema-builder/Container.vue` (~280 regels script)

**Probleem:** Dit component bevat:
- API-integratie (loadSchema, saveSchema, deleteSchema)
- State management (collections, activeCollection, isDirty, feedback)
- CRUD-logica voor collecties en velden
- Auto-reverse relation logica
- Unsaved changes guard
- View state (showPreview, showTypePicker, editingField)

Dit is effectief een **god component** dat zowel state management, business logic als orchestratie doet.

**Impact:** Moeilijk te testen, moeilijk te refactoren, hoge cognitieve load.

**Aanbevolen fix:**
- Extraheer een `useSchemaBuilder` composable met:
  - State: `collections`, `activeCollection`, `isDirty`, `feedback`
  - API: `loadSchema`, `saveSchema`, `deleteSchema`
  - Field CRUD: `addField`, `editField`, `removeField`, `reorderFields`
- Extraheer `useUnsavedChangesGuard(isDirty)` als apart composable.
- Laat Container.vue puur de orchestratie/template doen.

---

### 🟢 P6 — Duplicatie van labels/emoji mappings

**Bestanden:** `pages/index.vue`, `pages/collections/index.vue`, `pages/collections/[collection]/index.vue`, `layouts/data-engine.vue`

**Probleem:** Collection labels ("Contacten", "Bedrijven"), icons ("👤", "🏢"), en capitalize-helpers worden op 4+ plekken herhaald.

**Impact:** Inconsistentie bij toevoegen van nieuwe collecties, DRY-schending.

**Aanbevolen fix:** Maak een `useCollectionMeta` composable of een `collections.config.ts` met labels, icons, en helpers. Of beter: sla display-metadata op in het schema zelf (label, icon velden in CollectionSchema).

---

### 🟢 P7 — `live.vue` page is hardcoded en inconsistent

**Bestand:** `pages/collections/live.vue`

**Probleem:**
- Hardcoded op "contacts" collectie.
- Gebruikt andere styling dan de rest (geen design tokens, hardcoded hex colors, `#f7fafc` etc.).
- Geen layout (`data-engine` layout ontbreekt via definePageMeta — oh wait, het staat er wel).
- Lijkt een debug/test page die is blijven hangen.

**Impact:** Inconsistente UX, verwarrend voor gebruikers.

**Aanbevolen fix:** Verwijder of refactor naar een generieke live-data view. Als het een dev-tool is, verplaats naar een `/dev/` route.

---

### 🟢 P8 — CSS duplicatie van `.sb-btn` class

**Bestanden:** `CollectionList.vue`, `FieldList.vue`, `FieldEditor.vue`, `SelectOptionsEditor.vue`

**Probleem:** De `.sb-btn` class wordt in 4 componenten identiek gedefinieerd (scoped CSS). Dit is ~20 regels × 4 = ~80 regels duplicatie.

**Impact:** Inconsistentie bij wijzigingen, onderhoudslast.

**Aanbevolen fix:** Maak een `schema-builder.css` met gedeelde classes, of gebruik een unscoped utility class. Alternatief: maak een `SbButton.vue` micro-component.

---

### 🟢 P9 — FilterBar timer cleanup ontbreekt

**Bestand:** `components/FilterBar.vue`

**Probleem:**
```ts
let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}
```
De debounce-timers worden nooit opgeruimd bij component unmount. Als de component wordt destroyed terwijl een timer loopt, kan deze nog een emit triggeren op een unmounted component.

**Impact:** Potentiële "component already unmounted" warnings, edge case memory leak.

**Aanbevolen fix:**
```ts
onBeforeUnmount(() => {
  Object.values(debounceTimers).forEach(clearTimeout)
})
```

---

### 🟢 P10 — Server routes: inconsistent error response format

**Bestanden:** `server/api/collections/[...path].ts` vs `server/api/schema/[collection].ts`

**Probleem:** 
- Schema routes retourneren errors als `{ error: { code, message, details? } }`.
- De catch-all collections route delegeert naar ApiRouter die mogelijk een ander format gebruikt.
- `collections-list.ts` vangt errors op met lege `catch {}` — geen logging, geen response.

**Impact:** Frontend moet meerdere error-formats afhandelen.

**Aanbevolen fix:** Standaardiseer op één error-format. Gebruik een shared `createErrorResponse(event, status, code, message)` helper. Log errors altijd minimaal naar console.

---

## Positieve observaties

- ✅ **Design tokens** worden zeer consistent gebruikt (CSS custom properties met fallbacks overal).
- ✅ **BEM-achtige naamgeving** is consequent doorgevoerd in alle componenten.
- ✅ **Mobile responsive** — alle componenten hebben `@media (max-width: 767px)` breakpoints.
- ✅ **TypeScript** is strikt geconfigureerd en props/emits zijn overal getypt.
- ✅ **Schema-driven architectuur** is elegant — componenten zijn generiek en herbruikbaar.
- ✅ **SSR-ready** — `waitForEngine()` in server routes voorkomt race conditions.
- ✅ **Unsaved changes guard** in schema builder is een goede UX-keuze.
- ✅ **Scoped CSS** overal — geen globale style leakage.
- ✅ **Nuxt layer opzet** (`extends`) maakt de UI herbruikbaar als package.

---

## Prioriteitsoverzicht

| # | Prio | Onderwerp | Type |
|---|---|---|---|
| P1 | 🔴 Hoog | useFetch misbruik in composable/watchers | Bug/SSR |
| P2 | 🔴 Hoog | COUNT via findMany | Performance |
| P3 | 🟡 Medium | Geen error handling/boundary | UX |
| P4 | 🟡 Medium | Accessibility gaps | A11y |
| P5 | 🟡 Medium | Container.vue god component | Maintainability |
| P6 | 🟢 Laag | Label/emoji duplicatie | DRY |
| P7 | 🟢 Laag | live.vue hardcoded test page | Cleanup |
| P8 | 🟢 Laag | CSS duplicatie .sb-btn | DRY |
| P9 | 🟢 Laag | FilterBar timer cleanup | Memory leak |
| P10 | 🟢 Laag | Inconsistent error formats server | Consistency |
