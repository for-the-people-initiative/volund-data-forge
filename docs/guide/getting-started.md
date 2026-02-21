# Aan de slag met Volund Data Forge

> Smeed je eigen data tools — van schema tot werkende applicatie in minuten.

## Wat is Volund Data Forge?

Volund Data Forge (VDF) is een schema-gedreven dataplatform. Je definieert je datamodellen en VDF genereert automatisch:

- **Database tabellen** met migraties
- **REST API endpoints** voor CRUD-operaties
- **Admin UI** om data te beheren

## Vereisten

- **Node.js** v18 of hoger
- **pnpm** package manager

## Installatie

```bash
# Clone de repository
git clone https://github.com/for-the-people-initiative/volund-data-forge.git
cd volund-data-forge

# Installeer dependencies
pnpm install

# Bouw alle packages
pnpm run build

# Start de development server
cd packages/ui
pnpm dev
```

De applicatie draait standaard op `http://localhost:9002`.

[Screenshot: Dashboard met collectie-overzicht kaarten]

## Je eerste collectie aanmaken

### Via de Onboarding Wizard

Bij de eerste keer openen verschijnt de **Onboarding Wizard** die je door het aanmaken van je eerste collectie leidt.

1. **Welkom** — Introductie van het platform
2. **Naam kiezen** — Geef je collectie een naam (bijv. `producten`). De naam wordt automatisch genormaliseerd: kleine letters, spaties worden underscores
3. **Velden toevoegen** — Voeg minimaal één veld toe met naam en type (bijv. `naam` als Tekst, `prijs` als Decimaal getal)
4. **Aanmaken** — Klik op "Aanmaken" en je collectie met tabel en API is klaar

[Screenshot: Onboarding Wizard stap 3 — velden toevoegen]

### Via de Schema Builder

Voor meer controle ga je naar de **Schema Builder** (`/builder`):

1. Klik op **"+ Nieuw"** in de collectielijst links
2. Geef de collectie een naam
3. Voeg velden toe via de **Veldtype Picker** — kies uit:
   - 📝 Tekst
   - 🔢 Geheel getal
   - 📊 Kommagetal
   - 🔘 Boolean (ja/nee)
   - 📅 Datum/tijd
   - 📋 Selectie (dropdown)
   - 📧 Email
   - 🔗 Koppeling (relatie)
   - 🔍 Ophalen (lookup)
4. Configureer veld-opties (verplicht, uniek, standaardwaarde, validaties)
5. Klik op **"Opslaan"**

VDF maakt automatisch de databasetabel aan en registreert de API endpoints.

[Screenshot: Schema Builder met velden en type picker]

## Je eerste record aanmaken

1. Ga naar het **Dashboard** (`/`)
2. Klik op de kaart van je collectie, of gebruik de snelknop **"+ Nieuw"**
3. Vul het formulier in — velden worden automatisch gegenereerd op basis van je schema
4. Klik op **"Opslaan"**

[Screenshot: Nieuw record formulier]

Je record verschijnt nu in de datatabel van de collectie.

## Volgende stappen

- [Schema Builder](./schema-builder.md) — Leer over alle veldtypes, relaties en lookups
- [Data Management](./data-management.md) — Filters, views, bulk acties en inline editing
- [Zoeken](./search.md) — Zoek door alle collecties tegelijk
- [Activiteitenlog](./activity-log.md) — Bekijk alle wijzigingen
- [Webhooks](./webhooks.md) — Configureer HTTP callbacks
- [Dark Mode](./dark-mode.md) — Thema instellingen

## Standaard collecties

VDF komt met twee voorbeeldcollecties:

| Collectie | Beschrijving |
|-----------|-------------|
| `contacts` | Contacten (👤) |
| `companies` | Bedrijven (🏢) |

Je kunt deze gebruiken als startpunt of eigen collecties aanmaken.
