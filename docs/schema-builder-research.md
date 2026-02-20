# Visual Schema Builder — Research & Technische Aanpak

> Task ID: SCHEMA-BUILDER-RESEARCH | Datum: 2026-02-20

---

## 1. Competitive Analysis

### 1.1 Directus
- **Aanpak:** Collection-first. Je maakt een collectie aan, voegt velden toe via een sidebar panel met type-picker.
- **Sterke punten:** Drag-and-drop veldvolgorde, inline field configuratie, visuele relatie-editor met dropdown voor target collection, real-time schema wijzigingen (runtime).
- **Zwakke punten:** Overweldigende hoeveelheid field types (60+), relatie-setup is complex (M2M vereist junction table configuratie).
- **Relevant voor ons:** Runtime schema registration model — exact wat wij nodig hebben. Directus' "Data Model" sectie is de beste referentie.

### 1.2 Strapi (Content-Type Builder)
- **Aanpak:** Wizard-achtige flow. Kies type → naam → configureer. Aparte tabs voor velden, relaties, en advanced settings.
- **Sterke punten:** Zeer clean UI, duidelijke scheiding tussen field types in categorieën, visuele relatie picker met diagrammen (1:1, 1:N, M:N).
- **Zwakke punten:** Vereist server restart na schema wijziging (build-time, niet runtime). Geen drag-and-drop voor veldvolgorde.
- **Relevant voor ons:** UX flow is excellent referentie. De categorisatie van field types (text, number, date, relation, etc.) is precies wat wij ook doen.

### 1.3 Sanity Studio (Schema)
- **Aanpak:** Code-first schema definitie, maar Sanity Studio rendert een visuele preview. Geen visuele builder — alles in code.
- **Sterke punten:** Type-safe schema's, composable field types, conditionele velden.
- **Zwakke punten:** Geen visuele editor voor schema's. Niet bruikbaar als UX referentie voor een builder.
- **Relevant voor ons:** Het schema-formaat (declaratief object) lijkt op ons `CollectionSchema`. Goede validatie van onze data structuur.

### 1.4 Airtable
- **Aanpak:** Spreadsheet-first. Velden toevoegen via column header "+" knop. Type kiezen uit dropdown. Relaties via "Link to another record" field type.
- **Sterke punten:** Extreem laagdrempelig, inline editing, onmiddellijke feedback. Drag columns om volgorde te wijzigen.
- **Zwakke punten:** Geen expliciete "schema view" — het schema IS de spreadsheet. Relaties zijn simplistisch (alleen link, geen foreign key controle).
- **Relevant voor ons:** De laagdrempeligheid is een inspiratie. De "+" knop met type picker is een pattern dat werkt.

### 1.5 Notion Databases
- **Aanpak:** Property-based. "Add a property" knop → type kiezen → configureren. Properties verschijnen als kolommen.
- **Sterke punten:** Minimale UI, snelle property toevoeging, inline configuratie. Relation property met bi-directionele linking.
- **Zwakke punten:** Beperkte types, geen validatie configuratie, geen echte schema export.
- **Relevant voor ons:** De simplicity van "add property → pick type → done" is de juiste UX voor onze doelgroep.

### 1.6 Prisma Studio / PlanetScale
- **Aanpak:** Visual database schema editor. ERD-achtige weergave met tabellen en relatielijnen.
- **Sterke punten:** Visueel overzicht van alle relaties, zoom/pan op canvas, duidelijke foreign key visualisatie.
- **Zwakke punten:** Meer gericht op developers, niet op eindgebruikers.
- **Relevant voor ons:** Het ERD-diagram concept is nuttig voor een "Schema Overview" component.

### Samenvatting

| Tool | Runtime? | DnD velden | Visuele relaties | Laagdrempelig |
|------|----------|------------|-------------------|---------------|
| Directus | ✅ | ✅ | ✅ | ⚠️ Complex |
| Strapi | ❌ Build-time | ❌ | ✅ Diagrammen | ✅ |
| Sanity | N/A (code) | ❌ | ❌ | ❌ |
| Airtable | ✅ | ✅ (columns) | ⚠️ Simpel | ✅✅ |
| Notion | ✅ | ⚠️ | ⚠️ Simpel | ✅✅ |
| Prisma | ❌ | ❌ | ✅✅ ERD | ❌ |

**Conclusie:** Combineer Strapi's wizard flow + Airtable's laagdrempeligheid + Directus' runtime model.

---

## 2. Drag-and-Drop Library Aanbeveling

### Kandidaten

#### A. vue-draggable-plus
- **Basis:** SortableJS
- **Vue 3:** Native support, Composition API (`useDraggable` composable)
- **Bundel:** ~15KB gzipped (incl. SortableJS)
- **Stars:** ~3K, actief onderhouden (2024-2025)
- **Pros:** Composition API first, component + directive + function API, TypeScript support, actief onderhouden
- **Cons:** Kleiner ecosysteem dan vuedraggable

#### B. vuedraggable (vue.draggable.next)
- **Basis:** SortableJS
- **Vue 3:** Via `vuedraggable@next`
- **Bundel:** ~12KB gzipped
- **Stars:** ~20K (maar grotendeels Vue 2 users)
- **Pros:** Groot ecosysteem, veel voorbeelden, proven
- **Cons:** Onderhoud stagneert (laatste release 2023), Options API-georiënteerd, Vue 3 support als afterthought

#### C. @formkit/drag-and-drop
- **Basis:** Eigen implementatie (geen SortableJS)
- **Vue 3:** Native
- **Bundel:** ~5KB gzipped
- **Stars:** ~1.5K
- **Pros:** Zeer lichtgewicht, framework-agnostisch core, goede Vue 3 integration
- **Cons:** Minder features dan SortableJS-based opties, jonger project

#### D. Native HTML5 Drag and Drop
- **Pros:** Geen dependency, volledige controle
- **Cons:** Veel boilerplate, geen touch support, cross-browser inconsistenties, accessibility handmatig

### ✅ Aanbeveling: **vue-draggable-plus**

**Reden:**
1. Composition API native — past bij onze Vue 3 + Composition API constraint
2. `useDraggable()` composable geeft maximale flexibiliteit
3. Actief onderhouden (vs stagnerend vuedraggable)
4. SortableJS basis = proven, touch support, accessibility
5. TypeScript support out of the box

**Gebruik:** Alleen voor veld-volgorde sorteren binnen een collectie. Relaties worden NIET via drag-and-drop gelegd (te complex, betere UX via dropdowns — zie Directus/Strapi pattern).

---

## 3. UX Flow

```
┌─────────────────────────────────────────────────────┐
│                  SCHEMA BUILDER                      │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │ Collecties   │    │  Collectie Editor         │  │
│  │              │    │                            │  │
│  │ [+ Nieuw]    │    │  Naam: [________________] │  │
│  │              │    │                            │  │
│  │ ○ Patiënten  │───▶│  Velden:                  │  │
│  │ ○ Metingen   │    │  ┌──────────────────────┐ │  │
│  │ ○ Medicatie  │    │  │ ≡ naam    [text]  ✎ ✕│ │  │
│  │              │    │  │ ≡ email   [email] ✎ ✕│ │  │
│  │              │    │  │ ≡ actief  [bool]  ✎ ✕│ │  │
│  │              │    │  └──────────────────────┘ │  │
│  │              │    │  [+ Veld toevoegen]        │  │
│  │              │    │                            │  │
│  │              │    │  [Opslaan]  [Annuleren]    │  │
│  └──────────────┘    └───────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Flow stappen:

```
1. COLLECTIE AANMAKEN
   └─▶ Klik [+ Nieuw]
   └─▶ Voer naam in (slug wordt automatisch gegenereerd)
   └─▶ Lege collectie verschijnt in editor

2. VELDEN TOEVOEGEN
   └─▶ Klik [+ Veld toevoegen]
   └─▶ Type picker opent (modal/drawer):
       ┌────────────────────────────┐
       │  Kies veldtype             │
       │                            │
       │  📝 Tekst      🔢 Geheel  │
       │  📧 Email      🔘 Boolean │
       │  📅 Datum       📊 Komma  │
       │  📋 Selectie   🔗 Relatie │
       └────────────────────────────┘
   └─▶ Klik op type → Field configuratie panel opent

3. VELD CONFIGUREREN
   └─▶ Naam invoeren
   └─▶ Type-specifieke opties:
       • text: geen extra opties
       • select: opties lijst beheren
       • relation: target collectie + relatietype kiezen
   └─▶ Validatie toggles: verplicht, uniek
   └─▶ Default waarde (optioneel)
   └─▶ [Toevoegen] → veld verschijnt in lijst

4. VOLGORDE AANPASSEN
   └─▶ Drag handle (≡) om velden te herordenen
   └─▶ vue-draggable-plus handelt sorting af

5. VELD BEWERKEN
   └─▶ Klik ✎ → zelfde configuratie panel
   └─▶ Type kan NIET gewijzigd worden (data integriteit)

6. RELATIES LEGGEN
   └─▶ Voeg veld toe met type "Relatie"
   └─▶ Configuratie:
       • Target collectie (dropdown van bestaande collecties)
       • Relatietype: 1:1 / N:1 / 1:N / M:N
       • Foreign key (auto-generated, aanpasbaar)
       • Junction table (alleen bij M:N, auto-generated)

7. OPSLAAN
   └─▶ Validatie: naam uniek? Minstens 1 veld? Relatie targets bestaan?
   └─▶ Genereert CollectionSchema object
   └─▶ Runtime registratie via data-engine API
```

---

## 4. Component Breakdown

### 4.1 `SchemaBuilder` (container)
**Verantwoordelijkheid:** Top-level layout, state management, orchestratie.

| Props | Type | Beschrijving |
|-------|------|-------------|
| `existingCollections` | `CollectionSchema[]` | Reeds geregistreerde collecties (voor relatie targets) |
| `initialSchema` | `CollectionSchema?` | Voor edit mode |

| Events | Payload | Beschrijving |
|--------|---------|-------------|
| `save` | `CollectionSchema` | Voltooid schema object |
| `cancel` | — | Gebruiker annuleert |

| State | Type |
|-------|------|
| `collections` | `Ref<CollectionSchema[]>` |
| `activeCollection` | `Ref<string \| null>` |
| `isDirty` | `Ref<boolean>` |

---

### 4.2 `CollectionList` (sidebar)
**Verantwoordelijkheid:** Lijst van collecties, selectie, nieuw aanmaken.

| Props | Type |
|-------|------|
| `collections` | `CollectionSchema[]` |
| `activeId` | `string \| null` |

| Events | Payload |
|--------|---------|
| `select` | `string` (collection name) |
| `create` | — |
| `delete` | `string` |

---

### 4.3 `CollectionEditor` (main panel)
**Verantwoordelijkheid:** Naam bewerken, veldenlijst tonen, acties.

| Props | Type |
|-------|------|
| `schema` | `CollectionSchema` |
| `availableTargets` | `string[]` (voor relaties) |

| Events | Payload |
|--------|---------|
| `update:schema` | `CollectionSchema` |
| `save` | — |

---

### 4.4 `FieldList`
**Verantwoordelijkheid:** Gesorteerde lijst van velden met drag-and-drop.

| Props | Type |
|-------|------|
| `fields` | `FieldDefinition[]` |

| Events | Payload |
|--------|---------|
| `reorder` | `FieldDefinition[]` |
| `edit` | `string` (field name) |
| `remove` | `string` |
| `add` | — |

**Intern:** Gebruikt `useDraggable()` van vue-draggable-plus.

---

### 4.5 `FieldTypePicker` (modal)
**Verantwoordelijkheid:** Grid van beschikbare field types met iconen en labels.

| Props | Type |
|-------|------|
| `open` | `boolean` |

| Events | Payload |
|--------|---------|
| `select` | `string` (field type) |
| `close` | — |

---

### 4.6 `FieldEditor` (drawer/panel)
**Verantwoordelijkheid:** Configuratie van een enkel veld. Toont type-specifieke opties.

| Props | Type |
|-------|------|
| `field` | `FieldDefinition` |
| `fieldType` | `string` |
| `availableTargets` | `string[]` |
| `isNew` | `boolean` |

| Events | Payload |
|--------|---------|
| `save` | `FieldDefinition` |
| `cancel` | — |

**Bevat conditioneel:**
- `SelectOptionsEditor` (wanneer type = select)
- `RelationConfigurator` (wanneer type = relation)
- `ValidationToggles` (altijd)

---

### 4.7 `RelationConfigurator` (sub-component van FieldEditor)
**Verantwoordelijkheid:** Target collectie, relatietype, foreign key configuratie.

| Props | Type |
|-------|------|
| `relation` | `RelationDefinition?` |
| `availableTargets` | `string[]` |

| Events | Payload |
|--------|---------|
| `update:relation` | `RelationDefinition` |

**Toont:**
- Dropdown: target collectie
- Radio group: relatietype (1:1 / N:1 / 1:N / M:N)
- Auto-generated foreign key (aanpasbaar tekstveld)
- Junction table naam (alleen bij M:N, auto-generated)

---

### 4.8 `SelectOptionsEditor` (sub-component van FieldEditor)
**Verantwoordelijkheid:** Lijst van opties voor select-velden beheren.

| Props | Type |
|-------|------|
| `options` | `string[]` |

| Events | Payload |
|--------|---------|
| `update:options` | `string[]` |

---

### 4.9 `SchemaPreview` (optioneel, fase 2)
**Verantwoordelijkheid:** JSON preview van het gegenereerde CollectionSchema object. Nuttig voor developers.

| Props | Type |
|-------|------|
| `schema` | `CollectionSchema` |

---

### Component Hiërarchie

```
SchemaBuilder
├── CollectionList
└── CollectionEditor
    ├── FieldList
    │   └── FieldListItem (per veld)
    ├── FieldTypePicker (modal)
    └── FieldEditor (drawer)
        ├── ValidationToggles
        ├── SelectOptionsEditor (conditioneel)
        └── RelationConfigurator (conditioneel)
```

---

## 5. Implementatieplan

### Fase 1 — Foundation (MVP)
**Doel:** Een collectie met simpele velden kunnen aanmaken en opslaan.

| Story | Beschrijving | Effort |
|-------|-------------|--------|
| 1.1 | `SchemaBuilder` container + state management (composable `useSchemaBuilder`) | M |
| 1.2 | `CollectionList` sidebar met create/select/delete | S |
| 1.3 | `CollectionEditor` met naam-invoer | S |
| 1.4 | `FieldTypePicker` modal met type grid | S |
| 1.5 | `FieldEditor` basis (naam, required, unique, default) | M |
| 1.6 | `FieldList` met statische lijst (zonder DnD) | S |
| 1.7 | Schema output: genereer `CollectionSchema` object bij opslaan | S |
| 1.8 | Validatie: naam uniek, veld namen uniek, verplichte velden ingevuld | M |

**Totaal Fase 1:** ~3-4 dagen

---

### Fase 2 — Field Types & DnD
**Doel:** Alle field types ondersteunen + drag-and-drop veldvolgorde.

| Story | Beschrijving | Effort |
|-------|-------------|--------|
| 2.1 | `SelectOptionsEditor` voor select-velden | S |
| 2.2 | Type-specifieke configuratie per field type in FieldEditor | M |
| 2.3 | Drag-and-drop integratie (vue-draggable-plus) in FieldList | S |
| 2.4 | `SchemaPreview` JSON viewer | S |

**Totaal Fase 2:** ~2 dagen

---

### Fase 3 — Relaties
**Doel:** Relaties tussen collecties kunnen leggen.

| Story | Beschrijving | Effort |
|-------|-------------|--------|
| 3.1 | `RelationConfigurator` component | M |
| 3.2 | Auto-generate foreign key namen | S |
| 3.3 | Junction table configuratie voor M:M | M |
| 3.4 | Validatie: target collectie bestaat, circulaire relatie detectie | M |
| 3.5 | Visuele indicatie van relaties in FieldList (icoon + target label) | S |

**Totaal Fase 3:** ~3 dagen

---

### Fase 4 — Polish & Integratie
**Doel:** Runtime registratie, UX polish, edge cases.

| Story | Beschrijving | Effort |
|-------|-------------|--------|
| 4.1 | Runtime schema registratie via data-engine API call | M |
| 4.2 | Edit mode: bestaand schema laden en wijzigen | M |
| 4.3 | Unsaved changes waarschuwing (dirty state) | S |
| 4.4 | Error handling en gebruikersfeedback (toasts) | S |
| 4.5 | Keyboard accessibility (tab navigation, enter to confirm) | M |
| 4.6 | Nederlandse labels en i18n-ready structuur | S |

**Totaal Fase 4:** ~3 dagen

---

## 6. Complexiteitsoverzicht

| Fase | Beschrijving | Effort | Complexiteit |
|------|-------------|--------|-------------|
| 1 | Foundation (MVP) | 3-4 dagen | 🟡 Medium |
| 2 | Field Types & DnD | 2 dagen | 🟢 Laag |
| 3 | Relaties | 3 dagen | 🔴 Hoog |
| 4 | Polish & Integratie | 3 dagen | 🟡 Medium |
| **Totaal** | | **~11-12 dagen** | |

### Effort legenda
- **S** = Small (< 2 uur)
- **M** = Medium (2-4 uur)
- **L** = Large (4-8 uur)

### Risico's
1. **Relatie-configuratie UX** — M:M met junction tables is inherent complex. Risico: te technisch voor eindgebruikers. Mitigatie: auto-generate alles, toon alleen geavanceerde opties achter een "Geavanceerd" toggle.
2. **Runtime schema wijzigingen** — Bestaande data kan conflicteren met schema changes. Mitigatie: fase 4 bevat validatie tegen bestaande data.
3. **Scope creep op field types** — Neiging om meer types toe te voegen (JSON, file, array, etc.). Mitigatie: strict houden aan de 8 gedefinieerde types.
