# Schema Builder

De Schema Builder is het hart van Volund Data Forge. Hier definieer je je datamodellen visueel en VDF genereert automatisch de database, API en UI.

## Overzicht

Bereikbaar via `/builder` of via de **"✎ Bewerken"** knop op een collectiepagina.

[Screenshot: Schema Builder overzicht met collectielijst links en veld-editor rechts]

De builder bestaat uit drie delen:

1. **Collectielijst** (links) — Overzicht van alle collecties met aantal velden
2. **Collectie Editor** (midden) — Naam en instellingen van de actieve collectie
3. **Veldlijst** (rechts) — Alle velden met type, opties en configuratie

## Veldtypes

| Type | Icoon | Beschrijving | Database type |
|------|-------|-------------|---------------|
| `text` | 📝 | Vrij tekstveld | TEXT |
| `integer` | 🔢 | Geheel getal | INTEGER |
| `float` | 📊 | Kommagetal | REAL |
| `boolean` | 🔘 | Waar/onwaar schakelaar | BOOLEAN |
| `datetime` | 📅 | Datum en tijd | TEXT (ISO 8601) |
| `select` | 📋 | Dropdown met vaste opties | TEXT |
| `email` | 📧 | E-mailadres (met validatie) | TEXT |
| `relation` | 🔗 | Koppeling naar andere collectie | INTEGER (foreign key) |
| `lookup` | 🔍 | Waarde ophalen via een relatie | Virtueel (geen kolom) |

## Veld configuratie

Elk veld heeft de volgende opties:

### Basis

- **Naam** — Veldnaam (lowercase, underscores). Gereserveerde namen: `id`, `created_at`, `updated_at`
- **Type** — Kies uit bovenstaande types
- **Verplicht** (`required`) — Veld moet ingevuld zijn bij aanmaken/bewerken
- **Uniek** (`unique`) — Waarde moet uniek zijn in de collectie

### Standaardwaarde

Stel een `default` waarde in die gebruikt wordt wanneer het veld niet wordt meegegeven.

### Validaties

Velden ondersteunen validatieregels:

| Regel | Van toepassing op | Beschrijving |
|-------|-------------------|-------------|
| `minLength` | text, email | Minimaal aantal tekens |
| `maxLength` | text, email | Maximaal aantal tekens |
| `min` | integer, float | Minimale numerieke waarde |
| `max` | integer, float | Maximale numerieke waarde |
| `pattern` | text | Reguliere expressie |

Elke validatie kan een eigen foutmelding (`message`) hebben.

## Selectie-opties

Bij een `select` veld definieer je de beschikbare opties via de **SelectOptionsEditor**:

1. Klik op het selectie-veld
2. Voeg opties toe (één per regel)
3. Opties verschijnen als dropdown in formulieren en als badges in de datatabel

[Screenshot: Select Options Editor met opties]

## Relaties (Koppelingen)

Met het type `relation` koppel je collecties aan elkaar.

### Relatie types

| Type | Beschrijving | Voorbeeld |
|------|-------------|---------|
| `manyToOne` | Veel → één | Veel contacten bij één bedrijf |
| `oneToOne` | Één → één | Eén profiel per gebruiker |
| `oneToMany` | Één → veel | Eén bedrijf heeft veel contacten |
| `manyToMany` | Veel ↔ veel | Producten ↔ categorieën (via tussentabel) |

### Configuratie

Via de **RelationConfigurator**:

- **Doel collectie** (`target`) — Naar welke collectie de koppeling wijst
- **Type** — Het relatietype
- **Foreign key** — Naam van de foreign key kolom (optioneel, wordt automatisch gegenereerd)
- **Junction table** — Naam van de tussentabel (alleen bij manyToMany)
- **On delete** — Wat gebeurt er als het gekoppelde record wordt verwijderd:
  - `setNull` — Zet de foreign key op NULL
  - `cascade` — Verwijder ook het gekoppelde record
  - `restrict` — Blokkeer verwijdering als er koppelingen bestaan

[Screenshot: Relatie Configurator met type en doel selectie]

### Relatiediagram

De **RelationDiagram** component toont een visueel overzicht van alle relaties tussen collecties.

[Screenshot: Relatiediagram met lijnen tussen collecties]

## Lookup velden

Een `lookup` veld haalt een waarde op uit een gekoppelde collectie via een bestaande relatie:

- **Relatie** (`relation`) — De relatie waarover opgehaald wordt
- **Veld** (`field`) — Welk veld uit de doelcollectie getoond moet worden

**Voorbeeld:** Je hebt een `contacts` collectie met een relatie `company` naar `companies`. Een lookup veld `bedrijfsnaam` haalt het veld `naam` op uit `companies` via de `company` relatie.

[Screenshot: Lookup Configurator]

## Schema Preview

De **SchemaPreview** toont de JSON-representatie van je schema. Handig voor:

- Controleren van je schema configuratie
- Kopiëren voor API-gebruik
- Debugging

[Screenshot: Schema Preview JSON]

## Systeem velden

VDF voegt automatisch drie systeemvelden toe aan elke collectie:

| Veld | Type | Beschrijving |
|------|------|-------------|
| `id` | INTEGER | Auto-increment primaire sleutel |
| `created_at` | TEXT | Aanmaakdatum (ISO 8601) |
| `updated_at` | TEXT | Laatste wijzigingsdatum (ISO 8601) |

Deze velden zijn niet bewerkbaar en worden niet getoond in de Schema Builder.

## Schema opslaan

Klik op **"Opslaan"** om je schema te persisteren. VDF voert automatisch:

1. **Schema validatie** — Controleert namen, types en relaties
2. **Migratie** — Vergelijkt het nieuwe schema met het bestaande en genereert SQL migraties
3. **Registratie** — Registreert het schema in de registry

Bij fouten wordt een foutmelding getoond met details over wat er mis is.

## Collectie verwijderen

Via de Schema Builder kun je een collectie verwijderen. Dit verwijdert het schema uit de registry. Let op: de database tabel wordt momenteel niet automatisch verwijderd.
