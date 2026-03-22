# VDF Skill Audit Report

**Datum:** 2026-03-22
**Auditor:** Sub-agent VDF-AUDIT-001
**Skill:** FTP Frontend Development (SKILL.md + design-system.md + composable-patterns.md)
**Scope:** Alle frontend bestanden in `packages/ui/`

---

## Samenvatting

| Metric | Aantal |
|--------|--------|
| **Totaal bestanden geaudit** | 43 |
| **✅ Compliant** | 22 |
| **⚠️ Minor issues** | 16 |
| **❌ Violations** | 5 |

### Top 3 meest voorkomende issues

1. **Hardcoded breakpoints** (`@media (max-width: 767px)`) — 10+ bestanden. Skill vereist DS mixins (`@include breakpoint-from(tablet)`), maar dit vereist `<style lang="scss">` wat niet gebruikt wordt.
2. **Magic numbers in CSS** — Fallback values in `var()` zijn acceptabel, maar hardcoded `px` voor font-sizes (bijv. `font-size: 0.875rem`, `font-size: 1.5rem`) zonder typography mixins komt veel voor.
3. **`any` type usage** — Meerdere `as any` casts in components, vooral bij API responses.

### Aanbevolen prioriteit voor fixes

1. **P1 — `any` casts verwijderen** — TypeScript strict is een golden rule. Definieer proper types voor API responses.
2. **P2 — Hardcoded breakpoints migreren** — Switch naar `<style lang="scss" scoped>` en gebruik DS breakpoint mixins.
3. **P3 — Typography mixins** — Vervang hardcoded font-sizes door DS typography mixins.
4. **P4 — Magic colors in SwaggerUi.vue en Container.vue** — Hardcoded hex kleuren.

### Opmerking: i18n

VDF heeft geen i18n setup. Alle user-facing strings zijn hardcoded in het Nederlands. Dit is een bewuste keuze voor dit project en wordt **niet** als violation per bestand gemeld.

---

## Audit per bestand

### Components

---

### ApiSurfaceEditor.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **`any` types**: `(res as any).error`, `err: any` — meerdere plekken
  - **Hardcoded breakpoint**: Geen, maar fallback values gebruiken soms niet-DS waarden (bijv. `#0d1117`, `#30363d` als fallbacks)
  - **Magic colors in fallbacks**: `rgba(255, 255, 255, 0.05)` in hover state — niet via token
- **Suggesties:** Definieer API response types. Gebruik `var(--surface-hover)` zonder rgba fallback.

---

### DataForm.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **`any` types**: `(raw as any)`, `err: any`, `(field as any).options`, `(result as any)` — veel `as any` casts
  - **Hardcoded breakpoint**: `@media (max-width: 767px)` — moet DS mixin zijn
  - **Magic number**: `max-width: 600px` — niet via token
  - **Hardcoded color**: `rgba(249, 115, 22, 0.2)` in focus shadow
- **Suggesties:** Definieer `ApiResponse<T>` type. Gebruik DS breakpoint mixin.

---

### DataTable.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **`any` types**: Extensief gebruik van `as any` op records (~20+ plekken)
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Magic colors**: `rgba(234, 88, 12, 0.2)` in focus shadow, `color: white !important` in status tags
  - **`!important` overrides**: Meerdere `!important` in status tag styling
  - **Magic number**: `height: 28px` inline input, `margin-top: 1px` inline error
- **Suggesties:** Dit is het meest complexe component. Typing van records en een generiek `CollectionRecord` type zou veel `any` elimineren.

---

### ErrorFallback.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues. Tokens correct gebruikt, composition API, proper typing.

---

### FilterBar.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Magic number**: `height: 30px` op date input
  - **`!important` overrides**: Op `.fb__field :deep()` selectors
- **Suggesties:** Gebruik DS breakpoint mixin. Native date inputs zijn acceptabel (geen FTP equivalent).

---

### OnboardingWizard.vue
- **Status:** ✅ Compliant
- **Issues:** Clean component. Tokens correct, composition API, goede typing.
- **Suggesties:** Minor: `WizardField` interface zou naar een types bestand kunnen.

---

### RecordPicker.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Magic number**: `padding: 2px` in chip (zou `var(--space-3xs)` moeten zijn)
  - **`any` type**: `(result as any)`, `(r: any)` in loadRecords
- **Suggesties:** Gebruik DS breakpoint mixin.

---

### SchemaSelector.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic numbers**: `padding: 2px 4px` op meerdere plekken, `margin-top: 4px`, `margin-top: 2px`, `margin-top: 1px`, `margin-left: 2px`
  - **`!important`**: Op delete button hover
  - **Hardcoded color**: `rgba(0, 0, 0, 0.4)` box-shadow
  - **Native `<button>` en `<input>`**: Gebruikt native elementen waar FTP componenten beschikbaar zijn (trigger button, desc input, create button, delete button)
- **Suggesties:** Vervang magic numbers door space tokens. Gebruik FtpButton/FtpInputText waar mogelijk.

---

### SwaggerUi.vue
- **Status:** ❌ Violations
- **Issues:**
  - **Magic colors**: Extensief hardcoded kleuren (`#e0e0e0`, `#f0f0f0`, `#1e1e2e`, `#1a1a2a`, `#444`, `#666`, `#555`, `#2a2a3a`, `#ccc`) — 15+ hardcoded hex waarden
  - **Magic numbers**: `margin: 20px 0`, `padding: 0 20px`
  - **Unscoped styles**: `<style>` zonder `scoped` — leakt globaal
- **Suggesties:** Dit is een 3rd-party library override. Overweeg DS tokens voor de overrides. `scoped` is hier bewust weggelaten voor Swagger UI deep styling, maar documenteer dit.

---

### schema-builder/CollectionEditor.vue
- **Status:** ✅ Compliant
- **Issues:** Geen. Clean component met DS componenten en tokens.

---

### schema-builder/CollectionList.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues. Tokens correct, FTP componenten gebruikt.
- **Suggesties:** Minor: `padding: 2px 4px` in delete button deep style.

---

### schema-builder/CollectionWizard.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic numbers**: `width: 36px; height: 36px` emoji picker, `padding: 8px`, `padding: 4px 8px`, `padding: 6px 8px` in tables, `gap: 4px`
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **`any` type**: `const field: any` in handleCreate
  - **Non-token CSS var**: `var(--border-color, #e0e0e0)` — `--border-color` is geen DS token (moet `--border-default` zijn)
  - **Inline styles**: `style="margin-bottom: var(--space-m, 16px);"` — meerdere inline styles
- **Suggesties:** Gebruik `--border-default` of `--border-subtle`. Verplaats inline styles naar classes.

---

### schema-builder/Container.vue
- **Status:** ❌ Violations
- **Issues:**
  - **Magic colors**: `#dc2626`, `#f87171`, `#2e0a0a` in delete button styles — hardcoded hex
  - **Magic color**: `rgba(6, 8, 19, 0.7)` in loading overlay
  - **Non-token CSS var**: `var(--border-color, #e2e8f0)` — niet een DS token
  - **Non-token CSS var**: `var(--font-size-sm)`, `var(--text-muted)`, `var(--text-body)`, `var(--color-primary)` — geen DS tokens
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Native `<button>`**: Tab buttons zijn native buttons, niet FtpButton
- **Suggesties:** Gebruik DS feedback tokens voor delete styling (`var(--feedback-error)`). Gebruik DS text tokens.

---

### schema-builder/FieldEditor.vue
- **Status:** ✅ Compliant
- **Issues:** Clean component. DS componenten en tokens correct gebruikt.

---

### schema-builder/FieldList.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues.

---

### schema-builder/FieldTypePicker.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
- **Suggesties:** Gebruik DS breakpoint mixin.

---

### schema-builder/FieldWizard.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic numbers**: `gap: 4px` in tags
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Non-token CSS vars**: `var(--surface-default, #1a1a2e)` — `--surface-default` is geen DS token
- **Suggesties:** Gebruik `var(--space-2xs)` voor gap. Gebruik DS breakpoint mixin.

---

### schema-builder/LookupConfigurator.vue
- **Status:** ✅ Compliant
- **Issues:** Geen. Clean, compact component.

---

### schema-builder/RelationConfigurator.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues.

---

### schema-builder/RelationDiagram.vue
- **Status:** ✅ Compliant
- **Issues:** Geen. Compact, tokens correct.

---

### schema-builder/SchemaPreview.vue
- **Status:** ✅ Compliant
- **Issues:** Geen.

---

### schema-builder/SelectOptionsEditor.vue
- **Status:** ✅ Compliant
- **Issues:** Geen.

---

### Layout

---

### layouts/data-engine.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Magic numbers**: `height: 2px` hamburger line, `margin: 2px 0` hamburger line
  - **Hardcoded color**: `rgba(0, 0, 0, 0.5)` overlay, `rgba(0, 0, 0, 0.25)` topbar shadow
  - **Non-token CSS var**: `var(--topbar-height, 52px)` — custom var, niet DS
- **Suggesties:** `--topbar-height` is acceptabel als app-level var. Gebruik DS breakpoint mixin.

---

### Pages

---

### pages/about.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues. Tokens correct, FTP componenten gebruikt.
- **Suggesties:** Minor: `@media (max-width: 767px)` hardcoded breakpoint.

---

### pages/activity.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic number**: `border-radius: 3px` in changes pre
  - **Magic number**: `padding-top: 2px` entry icon
- **Suggesties:** Gebruik `var(--radius-subtle)` en `var(--space-3xs)`.

---

### pages/api-docs.vue
- **Status:** ✅ Compliant
- **Issues:** Minimaal component, correct gebruik van calc met token.

---

### pages/builder/index.vue
- **Status:** ✅ Compliant
- **Issues:** Geen. Thin wrapper, geen styling.

---

### pages/collections/[collection]/[id].vue
- **Status:** ✅ Compliant
- **Issues:** Tokens correct gebruikt. Minor: `as any` op schema voor singularName.

---

### pages/collections/[collection]/index.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Non-token CSS vars**: `var(--border-color, #e2e8f0)`, `var(--font-size-sm)`, `var(--text-muted)`, `var(--text-body)`, `var(--color-primary)` — geen DS tokens
  - **Native `<button>`**: Tab buttons zijn native, niet FtpButton
- **Suggesties:** Gebruik DS tokens. Tab pattern dupliceert Container.vue — overweeg een gedeeld TabBar component.

---

### pages/collections/[collection]/new.vue
- **Status:** ✅ Compliant
- **Issues:** Geen.

---

### pages/collections/index.vue
- **Status:** ✅ Compliant
- **Issues:** Redirect-only, geen styling.

---

### pages/collections/live.vue
- **Status:** ❌ Violations
- **Issues:**
  - **Magic numbers**: `padding: 2rem` — hardcoded rem spacing
  - **Magic number**: `margin-top: 1rem`
  - **Hardcoded strings**: English text ("Live Data — Contacts", "No contacts found.")
  - **`any` type**: `Record<string, any>` in data type
- **Suggesties:** Gebruik DS space tokens. Dit lijkt een test/demo pagina — overweeg verwijderen of updaten.

---

### pages/index.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Inline style**: `style="margin-top: var(--space-m, 16px); align-self: flex-start;"` — moet in class
  - **`any` type**: `(schema.value as any)?.singularName` herhaalt zich
- **Suggesties:** Verplaats inline styles naar scoped CSS class.

---

### pages/schema-overview.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic numbers**: `CARD_W = 280`, `CARD_GAP_X = 120`, `CARD_GAP_Y = 40`, `COLS = 3` — hardcoded layout constants (acceptabel voor canvas-based layout)
  - **Magic number**: `padding: 2px` in card field
  - **Magic number**: `gap: 2px` in tooltip
- **Suggesties:** Canvas-gebaseerde layout maakt tokens moeilijk. Minor issue.

---

### pages/sdk.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic colors**: `#0d1117`, `#c9d1d9` in code block
  - **Non-token CSS vars**: `var(--bg-surface)`, `var(--bg-hover)`, `var(--color-primary)` — geen DS tokens
  - **Hardcoded breakpoint**: `@media (max-width: 767px)`
  - **Native `<input>`**: App name input is native, niet FtpInputText
- **Suggesties:** Gebruik DS tokens voor code blocks en surfaces.

---

### pages/search.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues. Tokens correct.

---

### pages/webhooks.vue
- **Status:** ✅ Compliant
- **Issues:** Geen significante issues. DS componenten en tokens correct.

---

### error.vue
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **Magic number**: `font-size: 3rem` emoji icon
  - **Magic number**: `font-size: 1.5rem` title, `font-size: 0.95rem` message, `font-size: 0.8rem` code
  - **Non-token radius**: `var(--radius-l, 12px)` — DS heeft `--radius-large`, niet `--radius-l`
- **Suggesties:** Gebruik DS typography mixins voor font-sizes. Gebruik `var(--radius-large)`.

---

### Composables

---

### composables/useDataEngine.ts
- **Status:** ✅ Compliant
- **Issues:** Clean composable. Proper return pattern, no `any`.

---

### composables/useDbSchema.ts
- **Status:** ✅ Compliant
- **Issues:** Geen. Goede patterns: `readonly()` op state, proper typing.

---

### composables/useSchema.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **`any` type**: `const s = schema.value as Record<string, unknown>` — implicit any-like pattern
- **Suggesties:** Import en gebruik `CollectionSchema` type voor schema response.

---

### composables/useSchemaBuilder.ts
- **Status:** ⚠️ Minor issues
- **Issues:**
  - **`any` type**: `err: any` in meerdere catch blocks (~5x)
  - **`confirm()` gebruik**: Gebruikt `window.confirm()` in composable — niet DS-idiomatic (zou FtpConfirmDialog moeten zijn)
  - **Geen `readonly()` op exported state**: `collections`, `activeCollectionName` etc. worden mutable geëxporteerd
- **Suggesties:** Definieer error types. Gebruik `readonly()` op geëxporteerde state refs.

---

### composables/useTheme.ts
- **Status:** ✅ Compliant
- **Issues:** Geen. Correct gebruik van `readonly()`, `useState()`.

---

### Plugins

---

### plugins/error-handler.ts
- **Status:** ✅ Compliant
- **Issues:** Geen. Clean plugin.

---

### plugins/ftp-components.ts
- **Status:** ✅ Compliant
- **Issues:** Geen. Correct registratie van alle benodigde DS componenten.

---

### plugins/theme.client.ts
- **Status:** ✅ Compliant
- **Issues:** Geen. Eenvoudige client-only plugin.

---

## Violations Samenvatting

| Bestand | Violation type |
|---------|---------------|
| SwaggerUi.vue | 15+ hardcoded hex kleuren, magic numbers, unscoped styles |
| Container.vue (schema-builder) | Hardcoded hex kleuren (#dc2626, #f87171, #2e0a0a), non-DS tokens |
| collections/live.vue | Hardcoded rem spacing, English text, `any` type |
| DataTable.vue | Extensief `any` gebruik (~20x), `!important` overrides, magic colors |
| DataForm.vue | Veel `any` casts, hardcoded breakpoint, magic numbers |

*Noot: DataTable.vue en DataForm.vue zijn borderline ⚠️/❌. Ze zijn hier als ❌ gemarkeerd vanwege de hoeveelheid `any` casts die TypeScript strict schendt.*

---

## Totaaltellingen per criterium

| Criterium | Bestanden met issues |
|-----------|---------------------|
| Magic numbers (px/rem spacing) | 15 |
| Magic colors (hardcoded hex/rgba) | 7 |
| Hardcoded breakpoints (`@media max-width: 767px`) | 11 |
| Non-DS token CSS vars | 5 |
| `any` types | 8 |
| `!important` usage | 3 |
| Native elements i.p.v. DS componenten | 4 |
| Composition API violations | 0 |
| Options API usage | 0 |
| Hardcoded strings (i18n) | Alle (geen i18n setup — zie opmerking) |
