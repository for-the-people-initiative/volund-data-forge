# Data Management

Beheer je data via de ingebouwde admin UI met tabellen, filters, sortering, bulk acties en inline editing.

## Datatabel

Elke collectie heeft een datatabel op `/collections/:naam`. De tabel toont alle records met kolommen gebaseerd op het schema.

[Screenshot: Datatabel met records, kolommen en paginering]

### Kolommen

- Systeemvelden (`id`, `created_at`, `updated_at`) zijn verborgen in de tabel
- Elke kolom toont het veldlabel of de veldnaam
- **Selectie** velden worden weergegeven als badges
- **Boolean** velden tonen ✓ (waar) of ✗ (onwaar)
- **Relatie** velden worden in een accentkleur weergegeven
- **Getallen** worden rechts uitgelijnd met tabular-nums
- **Datums** worden geformateerd in Nederlands formaat (dag maand jaar)

### Klikken op een record

Klik op een rij om naar de detailpagina te gaan (`/collections/:naam/:id`).

## Filters

De **FilterBar** biedt server-side filtering per kolom.

[Screenshot: FilterBar met actieve filters]

### Filter types per veldtype

| Veldtype | Filter UI | Operator |
|----------|-----------|----------|
| Tekst, Email | Tekstveld (debounced) | `like` (bevat) |
| Selectie | Dropdown met opties | `eq` (exact match) |
| Boolean | Dropdown (Waar/Onwaar/Alle) | `eq` |
| Datum | Twee datumvelden (van–tot) | `between` |
| Getal | Getalveld (debounced) | `eq` |

### Actieve filters

- De **teller** naast "Filters" toont het aantal actieve filters
- Klik **"Wis filters"** om alle filters te resetten
- Filters zijn **in-/uitklapbaar** via de chevron knop
- Tekst en getal filters hebben 300ms **debounce**

## Sortering

Klik op een kolomkop om te sorteren:

1. **Eerste klik** → Oplopend (↑)
2. **Tweede klik** → Aflopend (↓)
3. **Derde klik** → Sortering opheffen (↕)

Sortering is server-side via de `sort` query parameter.

## Paginering

Onderaan de tabel staat paginering:

- **Vorige / Volgende** knoppen
- Huidige pagina en totaal aantal pagina's
- Totaal aantal records
- Standaard **20 records per pagina** (configureerbaar via `pageSize` prop)

## Opgeslagen weergaven (Saved Views)

Sla combinaties van filters en sortering op als **weergaven**:

1. Stel je gewenste filters en sortering in
2. Klik **"Opslaan als weergave"**
3. Geef de weergave een naam
4. Schakel tussen weergaven via de dropdown

[Screenshot: Weergave dropdown met opgeslagen weergaven]

- Weergaven worden opgeslagen in **localStorage** per collectie
- De **"Standaard"** weergave reset alle filters en sortering
- Verwijder een weergave met de **✕** knop

## Inline editing

Bewerk waarden direct in de tabel zonder de detailpagina te openen:

1. **Hover** over een bewerkbare cel — een ✎ icoon verschijnt
2. **Klik** op de cel — het wordt een invoerveld
3. **Typ** de nieuwe waarde
4. **Enter** om op te slaan, **Escape** om te annuleren
5. Bij **blur** (klik buiten het veld) wordt ook opgeslagen

[Screenshot: Inline editing van een tekstveld in de datatabel]

### Bewerkbare veldtypes

Niet alle velden zijn inline bewerkbaar:

| Type | Inline bewerkbaar |
|------|:-:|
| Tekst | ✓ |
| Getal (integer, float) | ✓ |
| Email | ✓ |
| URL | ✓ |
| Selectie | ✓ (dropdown) |
| Boolean | ✗ |
| Datum | ✗ |
| Relatie | ✗ |
| Lookup | ✗ |

### Validatie

Inline editing voert dezelfde validaties uit als het formulier:

- Verplichte velden mogen niet leeg zijn
- Email velden moeten een geldig e-mailadres bevatten
- URL velden moeten beginnen met `http://` of `https://`
- Numerieke velden moeten een geldig getal zijn
- Schema validatieregels (minLength, maxLength, min, max, pattern) worden gecontroleerd
- Bij een fout verschijnt een rode foutmelding onder het veld

## Bulk acties

Selecteer meerdere records voor bulk operaties:

### Selecteren

- **Checkbox per rij** — Selecteer individuele records
- **Checkbox in header** — Selecteer/deselecteer alle records op de huidige pagina
- Geselecteerde rijen krijgen een gemarkeerde achtergrond

### Beschikbare acties

Wanneer records geselecteerd zijn verschijnt de **bulk action bar**:

- **🗑️ Verwijderen** — Verwijder alle geselecteerde records (met bevestigingsdialoog)
- **📥 Exporteren (JSON)** — Download geselecteerde records als JSON bestand

[Screenshot: Bulk action bar met 3 geselecteerde records]

### Bulk verwijderen

1. Selecteer records
2. Klik **"🗑️ Verwijderen"**
3. Bevestig in de dialoog
4. Records worden parallel verwijderd
5. Toast melding toont het aantal verwijderde records

### Exporteren

1. Selecteer records
2. Klik **"📥 Exporteren (JSON)"**
3. Een JSON bestand wordt gedownload met de bestandsnaam `{collectie}-export.json`

## Record aanmaken

Via `/collections/:naam/new`:

1. Vul het formulier in — velden worden automatisch gegenereerd op basis van het schema
2. Klik **"Opslaan"**
3. Je wordt teruggeleid naar de collectie-overzichtspagina

## Record detail & bewerken

Via `/collections/:naam/:id`:

- **Detail weergave** — Toont alle velden als definitielijst
- **Bewerken** — Klik "Bewerken" om het formulier te openen
- **Verwijderen** — Klik "Verwijderen" met bevestigingsdialoog

[Screenshot: Record detailpagina met bewerk en verwijder knoppen]

## Record verwijderen

Verwijderen kan op drie manieren:

1. **Vanuit de datatabel** — Klik het 🗑️ icoon op een rij
2. **Vanuit de detailpagina** — Klik "Verwijderen"
3. **Bulk verwijderen** — Selecteer meerdere records

Alle methoden tonen een bevestigingsdialoog. Na verwijdering verschijnt een toast melding.
