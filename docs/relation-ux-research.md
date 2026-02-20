# UX Research: Data-relaties voor niet-technische gebruikers

> **Datum:** 20 februari 2026
> **Doel:** Onderzoek hoe bestaande producten en academische literatuur omgaan met het gebruikersvriendelijk maken van data-relaties voor niet-technische gebruikers.
> **Context:** Volund Data Forge — een no-code/low-code data platform

---

## 1. Product-by-product analyse

### 1.1 Airtable

**Terminologie:** "Link to another record", "Linked record field"

**UX Flow:**
1. Klik `+` om een nieuw veld toe te voegen
2. Kies "Link to another record" uit het fieldtype-menu
3. Selecteer de doeltabel (of maak een nieuwe)
4. Optioneel: "Allow linking to multiple records" toggle (standaard aan = M:N gedrag)
5. Optioneel: Beperk selectie tot een specifieke view
6. Airtable maakt automatisch een reciproque veld in de doeltabel

**Relatietype-presentatie:**
- Airtable vermijdt expliciete 1:1/1:N/M:N terminologie bijna volledig
- In plaats daarvan: "Allow linking to multiple records" toggle. Uit = max één link per record (effectief 1:1 of N:1). Aan = meerdere links (M:N)
- Geen junction table zichtbaar; M:N wordt volledig geabstraheerd

**Wat werkt goed:**
- Zeer laagdrempelig — één veldtype voor alle relaties
- Automatische reciproque velden ("symmetrische link")
- Lookup en Rollup velden als companion: haal data op via de link
- "Expand record" om snel context te zien van gelinkte records
- View-limiting: beperk welke records je kunt linken

**Wat is verwarrend:**
- Verschil tussen 1:N en M:N niet expliciet; gebruikers moeten snappen wat "allow multiple" betekent
- Junction tables voor echte M:N met attributen op de relatie bestaan niet native — workaround nodig
- Cross-base linking is beperkt (alleen via Sync)

**Bron:** [Airtable Support — Linking Records](https://support.airtable.com/docs/linking-records-in-airtable)

---

### 1.2 Notion

**Terminologie:** "Relation" (property type), "Rollup"

**UX Flow:**
1. Open database → Add property
2. Kies type "Relation"
3. Selecteer de doeldatabase
4. Optie: "Show on [doeldatabase]" — maakt bidirectionele relatie
5. Klik in de cel → zoek en selecteer pagina's uit de gelinkte database

**Relatietype-presentatie:**
- Geen expliciete 1:1/1:N/M:N keuze
- Standaard is altijd M:N (meerdere items koppelen aan meerdere items)
- 1:1 of 1:N afdwingen is niet native mogelijk — puur conventie
- "Two-way relation" = bidirectioneel (show on target)

**Wat werkt goed:**
- Simpel mentaal model: "deze database linkt naar die database"
- Bidirectionele toggle is intuïtief
- Rollup properties halen aggregaties op via relaties
- Inline relation editing: klik → zoek → selecteer

**Wat is verwarrend:**
- Kan geen kardinaliteit afdwingen (altijd M:N)
- Relation properties nemen veel ruimte in (chips met paginanamen)
- Geen visuele indicatie van "richting" van de relatie
- Zelf-refererende relaties zijn niet intuïtief in te stellen

**Bron:** [Notion Help — Relations & Rollups](https://www.notion.com/help/relations-and-rollups)

---

### 1.3 Baserow

**Terminologie:** "Link to table" (field type), "Lookup field"

**UX Flow:**
1. Klik `+` voor nieuw veld
2. Kies "Link to table" uit de dropdown
3. Selecteer de doeltabel
4. Baserow maakt automatisch een corresponderend veld in de doeltabel
5. In de cel: klik om rijen te selecteren/zoeken uit de gelinkte tabel

**Relatietype-presentatie:**
- Geen expliciete 1:1/1:N/M:N keuze in de UI
- Standaard gedrag is M:N (meerdere links mogelijk)
- Lookup fields als companion om data op te halen via de link

**Wat werkt goed:**
- Open-source Airtable-alternatief met vrijwel identieke UX
- Automatische reciproque velden
- Meerdere link-velden naar dezelfde tabel mogelijk (bijv. "Project Manager" en "Team Members" beide naar People)
- View-limiting voor selectie

**Wat is verwarrend:**
- Zelfde beperkingen als Airtable: geen kardinaliteitsafdwinging
- Terminologie "Link to table" is iets abstracter dan "Link to another record"

**Bron:** [Baserow Docs — Link to table field](https://baserow.io/user-docs/link-to-table-field)

---

### 1.4 NocoDB

**Terminologie:** "Links" (field type), "Has-Many", "Belongs-to", "Many-to-Many", "One-to-one"

**UX Flow:**
1. Klik `+` voor nieuw veld
2. Kies "Links" als fieldtype
3. **Kies expliciet het relatietype:** One-to-one, Has-Many, of Many-to-Many
4. Selecteer de doeltabel
5. Optioneel: configureer display label
6. NocoDB maakt automatisch een "Belongs-to" veld bij Has-Many

**Relatietype-presentatie:**
- **Meest expliciete van alle no-code tools** — gebruiker kiest het type
- Gebruikt database-terminologie ("Has-Many", "Belongs-to") maar vermijdt "foreign key"
- Cel toont het *aantal* links als getal, niet de records zelf
- Klikken opent een modal met linked record cards

**Wat werkt goed:**
- Expliciete keuze geeft meer controle
- Goede visuele feedback: icoon toont relatietype, count in cel
- Linked records modal met zoekfunctie
- Inline record aanmaken vanuit de link-modal

**Wat is verwarrend:**
- "Has-Many" vs "Belongs-to" vs "Many-to-Many" kan niet-technische gebruikers afschrikken
- Meer stappen dan Airtable/Notion
- Count-display in cel is minder informatief dan namen

**Bron:** [NocoDB Docs — Links](https://nocodb.com/docs/product-docs/fields/field-types/links-based/links)

---

### 1.5 Coda

**Terminologie:** "Relation column" (voorheen "Lookup column"), "Linked relation" (voorheen "Reverse lookup")

**UX Flow:**
1. Klik `+` om kolom toe te voegen
2. Typ "relation" of selecteer uit opties
3. Selecteer de doeltabel
4. De kolom wordt een multi-select die rijen uit de doeltabel toont
5. Optioneel: maak een "Linked relation" voor bidirectionele connectie

**Relatietype-presentatie:**
- Geen expliciete kardinaliteitskeuze
- Standaard M:N
- "Linked relation" = de reverse/bidirectionele kant
- Terminologie recent hernoemd van "Lookup" naar "Relation" — bewuste vereenvoudiging

**Wat werkt goed:**
- Hernoemen naar "Relation" maakt het intuïtiever
- Bidirectionele links via "Linked relation"
- Past in Coda's document-first paradigma

**Wat is verwarrend:**
- Multi-select gedrag kan verwarrend zijn (kolom wordt automatisch multi-select)
- Historische naamswijziging zorgt voor verwarring in oudere documentatie

**Bron:** [Coda Help — Connect tables with relation columns](https://help.coda.io/en/articles/1385997-connect-tables-with-relation-columns)

---

### 1.6 monday.com

**Terminologie:** "Connect Boards" (kolom), "Mirror Column"

**UX Flow:**
1. Voeg een kolom toe → kies "Connect Boards"
2. Selecteer het bord waarmee je wilt verbinden
3. Per item: klik in de cel → zoek en selecteer items uit het geconnecteerde bord
4. Voeg een "Mirror Column" toe → kies welke data je wilt spiegelen van het gelinkte bord

**Relatietype-presentatie:**
- Geen relatietype-keuze — altijd M:N
- Terminologie is volledig niet-technisch: "Connect Boards", "Mirror"
- Connect = de link leggen; Mirror = data ophalen via de link

**Wat werkt goed:**
- Zeer herkenbare terminologie voor niet-technische gebruikers
- Twee-staps concept is helder: eerst verbinden, dan data spiegelen
- Multi-board mirroring: één mirror kan data van meerdere boards tonen

**Wat is verwarrend:**
- Connect Boards kolom toont niet de data zelf — je hebt altijd een Mirror nodig
- Overhead: twee kolommen (Connect + Mirror) voor wat in Airtable één linked record + lookup is
- Geen kardinaliteitscontrole

**Bron:** [monday.com Support — Connect Boards Column](https://support.monday.com/hc/en-us/articles/360000635139-The-Connect-Boards-Column)

---

### 1.7 Fibery

**Terminologie:** "Relation" (tussen Types/Entities), "One-to-Many", "Many-to-Many"

**UX Flow:**
1. In het schema/type configuratie: voeg een relatie toe tussen twee Types
2. Kies relatietype (One-to-Many of Many-to-Many)
3. Fibery toont de relatie als een veld in beide Types
4. In entity view: klik om gerelateerde entities te linken/ontkoppelen

**Relatietype-presentatie:**
- Expliciete keuze tussen One-to-Many en Many-to-Many
- Visueel schema-diagram toont relaties tussen Types
- Gebruikt "Relation" consequent, vermijdt database-jargon

**Wat werkt goed:**
- Visueel schema (entity-relationship diagram) — uniek onder no-code tools
- Relaties zijn first-class citizens, niet een "field type"
- Goede integratie met views, filters, en reports

**Wat is verwarrend:**
- Steile leercurve door het schema-concept
- Junction tables voor M:N met attributen moeten handmatig worden aangemaakt
- Community vraagt al jaren om "relationship properties" (attributen op de relatie zelf)

**Bron:** [Fibery Community — Relations](https://community.fibery.io/t/relationship-properties/887/28)

---

### 1.8 Microsoft Lists / SharePoint

**Terminologie:** "Lookup column"

**UX Flow:**
1. Klik "Add column" → kies "Lookup"
2. Selecteer de bronlijst
3. Kies welk veld je wilt ophalen
4. Optioneel: "Enforce relationship behavior" (cascade/restrict delete)

**Relatietype-presentatie:**
- Puur 1:N model (lookup haalt één waarde op uit een andere lijst)
- "Enforce relationship behavior" is een geavanceerde optie
- Geen native M:N — vereist handmatige tussenlijst

**Wat werkt goed:**
- Simpel concept: "haal een waarde op uit een andere lijst"
- Referentie-integriteit optioneel afdwingbaar (cascade/restrict)
- Vertrouwd voor Excel/SharePoint-gebruikers

**Wat is verwarrend:**
- Lookup is eenrichtingsverkeer — geen automatische reverse
- M:N vereist Power Apps of handmatige workaround
- "Enforce relationship behavior" is jargon dat meeste gebruikers overslaan

**Bron:** [Microsoft Support — Lookup columns](https://support.microsoft.com/en-us/office/create-list-relationships-by-using-lookup-columns-80a3e0a6-8016-41fb-ad09-8bf16d490632)

---

### 1.9 Directus (developer-referentie)

**Terminologie:** "M2O" (Many-to-One), "O2M" (One-to-Many), "M2M" (Many-to-Many), "Junction Collection"

**UX Flow:**
1. In de Data Model settings: voeg een veld toe aan een collection
2. Kies relatietype: M2O, O2M, of M2M
3. Configureer de gerelateerde collection en foreign key
4. Bij M2M: Directus maakt automatisch een junction collection
5. Kies een "Interface" (display widget) voor het veld

**Relatietype-presentatie:**
- Volledig expliciete database-terminologie
- Junction collections zijn zichtbaar en configureerbaar
- Bedoeld voor developers — niet voor eindgebruikers

**Wat werkt goed:**
- Volledige controle over het datamodel
- Automatische junction collection bij M2M
- Verschillende display interfaces per relatietype

**Wat is verwarrend (voor niet-technische gebruikers):**
- Terminologie is pure database-jargon (M2O, O2M, junction)
- Vereist begrip van foreign keys
- Niet bedoeld voor no-code gebruikers

**Bron:** [Directus Docs — Relationships](https://directus.io/docs/guides/data-model/relationships)

---

### 1.10 Strapi (developer-referentie)

**Terminologie:** "Relation" (field type), "One-to-One", "One-to-Many", "Many-to-Many", "One Way", "Many Way"

**UX Flow:**
1. In Content-Type Builder: voeg een "Relation" veld toe
2. Visuele picker met 6 relatietypes weergegeven als iconen/diagrammen
3. Selecteer de gerelateerde content type
4. Strapi genereert de benodigde database structuur

**Relatietype-presentatie:**
- Visuele diagrammen voor elk relatietype (twee entiteiten met pijlen ertussen)
- 6 types: One Way, One-to-One, One-to-Many, Many-to-One, Many-to-Many, Many Way
- "One Way" en "Many Way" = unidirectioneel (geen reverse field)

**Wat werkt goed:**
- Visuele representatie maakt relatietypes begrijpelijk
- Content Manager toont relaties als multi-select of single-select afhankelijk van type
- Duidelijk onderscheid tussen uni- en bidirectioneel

**Wat is verwarrend:**
- 6 types is veel om uit te kiezen
- "One Way" vs "Many Way" is niet intuïtief
- Developer-gericht, niet voor eindgebruikers

**Bron:** [Strapi Docs — Content-Type Builder](https://docs.strapi.io/cms/features/content-type-builder)

---

## 2. Terminologie vergelijking

| Product | Veldtype naam | 1:1 | 1:N | M:N | Reverse/Bidirectioneel | Junction table |
|---------|--------------|-----|-----|-----|----------------------|----------------|
| **Airtable** | Link to another record | "Allow single" | Impliciet | Standaard | Automatisch | Verborgen |
| **Notion** | Relation | Niet afdwingbaar | Niet afdwingbaar | Standaard | "Show on [db]" toggle | N.v.t. |
| **Baserow** | Link to table | Niet afdwingbaar | Niet afdwingbaar | Standaard | Automatisch | Verborgen |
| **NocoDB** | Links | "One-to-one" | "Has-Many" | "Many-to-Many" | Auto "Belongs-to" | Verborgen |
| **Coda** | Relation | Niet afdwingbaar | Niet afdwingbaar | Standaard | "Linked relation" | N.v.t. |
| **monday.com** | Connect Boards | Niet beschikbaar | Niet beschikbaar | Standaard | Handmatig | N.v.t. |
| **Fibery** | Relation | Via restrictie | Expliciet | Expliciet | Automatisch | Handmatig |
| **MS Lists** | Lookup | Niet beschikbaar | Standaard | Niet native | Niet automatisch | Handmatig |
| **Directus** | M2O / O2M / M2M | Expliciet | Expliciet | Expliciet | Handmatig | Zichtbaar |
| **Strapi** | Relation | Expliciet | Expliciet | Expliciet | Configureerbaar | Gegenereerd |

### Terminologie-spectrum: eenvoudig ↔ technisch

```
eenvoudig                                                    technisch
    |                                                            |
    monday.com    Notion    Airtable    Coda    Baserow    NocoDB    Fibery    Directus    Strapi
    "Connect      "Relation" "Link to   "Relation" "Link to "Links/   "Relation" "M2O/O2M"  "One-to-
     Boards"                 another              table"   Has-Many"              "M2M"      Many"
                             record"                                  "Junction"
```

**Opvallende woorden die VERMEDEN worden door no-code tools:**
- ❌ Foreign key
- ❌ Junction table (behalve Fibery community / Directus)
- ❌ Cardinality
- ❌ Primary key / Foreign key constraint
- ❌ Referential integrity (behalve MS Lists als optie)
- ❌ Normalize / Normalization

**Woorden die WEL worden gebruikt:**
- ✅ Link / Linked
- ✅ Relation / Related
- ✅ Connect / Connected
- ✅ Lookup / Rollup
- ✅ Mirror (monday.com)

---

## 3. Terugkerende UX Patterns

### Pattern 1: "Link als veldtype" (Field-level linking)
**Wie:** Airtable, Baserow, NocoDB, Notion, Coda, monday.com
**Hoe:** Relaties worden aangemaakt door een nieuw veld/kolom toe te voegen met een speciaal type. De gebruiker kiest een doeltabel en de link is gelegd.
**Waarom het werkt:** Past in het bestaande mentale model van "kolommen toevoegen aan een tabel". Geen apart scherm of concept nodig.

### Pattern 2: "Automatische reciproque" (Auto-reverse field)
**Wie:** Airtable, Baserow, NocoDB, Notion (optioneel), Coda (optioneel)
**Hoe:** Wanneer je in Tabel A een link naar Tabel B maakt, verschijnt automatisch een corresponderend veld in Tabel B.
**Waarom het werkt:** Maakt bidirectionaliteit zichtbaar zonder dat de gebruiker het concept hoeft te begrijpen. "Als ik Project X link aan Klant Y, zie ik bij Klant Y ook Project X."

### Pattern 3: "Record picker modal" (Search-and-select)
**Wie:** Alle producten
**Hoe:** Klikken in een link-cel opent een modal/dropdown waar je records kunt zoeken en selecteren uit de doeltabel.
**Waarom het werkt:** Vertrouwd patroon (vergelijkbaar met tags/multi-select). Voorkomt fouten door typeahead/zoek.

### Pattern 4: "Companion fields" (Lookup/Rollup/Mirror)
**Wie:** Airtable (Lookup, Rollup), Notion (Rollup), Baserow (Lookup), monday.com (Mirror), NocoDB (Lookup)
**Hoe:** Na het aanmaken van een link kun je extra velden toevoegen die data *ophalen* via die link (bijv. "toon het e-mailadres van de gelinkte klant").
**Waarom het werkt:** Scheidt de link (relatie) van de data die je wilt zien. Gebruiker hoeft geen JOINs te begrijpen.

### Pattern 5: "M:N als default, restrictie als optie"
**Wie:** Airtable, Notion, Baserow, Coda, monday.com
**Hoe:** Standaard kun je meerdere records linken. Sommige tools bieden een toggle om te beperken tot één.
**Waarom het werkt:** Minder vragen vooraf. De meeste use cases zijn M:N of 1:N, en het verschil doet er voor beginners niet toe.

### Pattern 6: "Visueel schema" (Entity-relationship diagram)
**Wie:** Fibery, Strapi (relatie-iconen)
**Hoe:** Relaties worden visueel weergegeven als lijnen/pijlen tussen entiteiten.
**Waarom het werkt:** Geeft overzicht bij complexe datamodellen. Maar: hogere leercurve.

---

## 4. Academische inzichten

### 4.1 End-users denken in lijsten, niet in relaties

Hobbs & Pigott (2000) en McKinnon (ResearchGate) tonen aan dat **eindgebruikers hun data van nature als platte lijsten organiseren**, niet als genormaliseerde tabellen. Ze slaan vaak alles in één tabel op met veel herhaalde data, of gebruiken vrije tekstvelden als catch-all.

**Implicatie:** Een tool die relaties wil aanbieden moet vertrekken vanuit de lijst-metafoor en geleidelijk naar linking toewerken, niet andersom.

> Bron: [ResearchGate — Facilitating End User Database Development](https://www.researchgate.net/publication/314477626)

### 4.2 "Simple-talking" database design

Desolda et al. (2015, ScienceDirect) onderzochten een "simple-talking" benadering waarbij eindgebruikers een relationeel schema ontwerpen door simpele zinnen te formuleren. Bijvoorbeeld: "Een project heeft meerdere taken" wordt automatisch vertaald naar een 1:N relatie.

**Implicatie:** Natuurlijke taal of zinsconstructies ("X heeft meerdere Y") kunnen een krachtig hulpmiddel zijn om relaties te definiëren zonder technische terminologie.

> Bron: [ScienceDirect — Simple-talking database development](https://www.sciencedirect.com/science/article/abs/pii/S0747563215000813)

### 4.3 Mental models en mismatch

Nielsen Norman Group benadrukt dat **de kloof tussen het mentale model van de gebruiker en het systeemmodel** de grootste bron van verwarring is. Gebruikers denken in concrete voorbeelden ("dit project hoort bij die klant"), niet in abstracte concepten ("dit is een many-to-one relatie met referentiële integriteit").

**Implicatie:** Laat de gebruiker in concrete voorbeelden werken en leid het relatietype daaruit af, in plaats van het vooraf te vragen.

> Bron: [NN/g — Mental Models](https://www.nngroup.com/articles/mental-models/)

### 4.4 Progressive disclosure

Een consistent patroon in succesvolle tools is **progressive disclosure**: toon eerst de simpele optie (link aanmaken), en onthul geavanceerde opties (kardinaliteit, constraints) pas wanneer de gebruiker erom vraagt of het nodig heeft.

---

## 5. Anti-patterns

### Anti-pattern 1: Vooraf kardinaliteit laten kiezen
**Probleem:** De gebruiker vragen "Is dit One-to-One, One-to-Many, of Many-to-Many?" voordat ze de link gebruiken.
**Waarom het faalt:** Niet-technische gebruikers begrijpen dit onderscheid niet en worden afgeschrikt. Ze weten vaak pas na gebruik welk type het is.
**Wie doet dit:** NocoDB, Directus, Strapi (alle meer developer-gericht)
**Beter:** M:N als default, met optionele restrictie achteraf (Airtable-model).

### Anti-pattern 2: Database-jargon als UI-labels
**Probleem:** Termen als "Has-Many", "Belongs-to", "M2O", "Junction table", "Foreign key" gebruiken in de UI.
**Waarom het faalt:** Creëert een kennisbarrière. Gebruikers die het niet herkennen, vermijden de feature.
**Wie doet dit:** NocoDB ("Has-Many", "Belongs-to"), Directus ("M2O", "O2M", "M2M")
**Beter:** "Link to [tabel]" of "Relation" met menselijke taal.

### Anti-pattern 3: Eenrichtingsverkeer zonder automatische reverse
**Probleem:** Een link maken in Tabel A die niet zichtbaar is in Tabel B tenzij je daar handmatig ook een veld aanmaakt.
**Waarom het faalt:** Gebruikers verwachten dat als A linkt naar B, B ook naar A verwijst. Asymmetrie is verwarrend.
**Wie doet dit:** Microsoft Lists (Lookup is eenrichtingsverkeer), Directus (reverse moet handmatig)
**Beter:** Automatische reciproque velden (Airtable, Baserow).

### Anti-pattern 4: Te veel relatietypes aanbieden
**Probleem:** Strapi biedt 6 relatietypes (One Way, One-to-One, One-to-Many, Many-to-One, Many-to-Many, Many Way). Dat is te veel keuze.
**Waarom het faalt:** Keuzeparalyse (Hick's Law). Subtiele verschillen (One Way vs One-to-One) zijn voor de meeste gebruikers irrelevant.
**Beter:** Maximaal 2-3 opties, of beter nog: leid het type af uit gedrag.

### Anti-pattern 5: Link en data-ophalen als aparte concepten
**Probleem:** monday.com scheidt "Connect Boards" (link) van "Mirror Column" (data tonen). Je hebt altijd twee kolommen nodig.
**Waarom het faalt:** Extra overhead en conceptuele stap. Gebruikers willen data zien, niet eerst een lege link.
**Beter:** Link-veld dat direct de primary field van gelinkte records toont (Airtable, Notion).

---

## 6. Concrete aanbevelingen voor Volund Data Forge

### Aanbeveling 1: Eén veldtype, simpele naam
Gebruik **"Relation"** of **"Koppeling"** als veldtype-naam. Geen "Link to another record" (te lang), geen "M2O" (te technisch). Eén woord dat duidelijk maakt wat het doet.

### Aanbeveling 2: M:N als default, restricties optioneel
Maak standaard meerdere koppelingen mogelijk (M:N). Bied een **geavanceerde optie** "Maximaal één koppeling per record" voor 1:1/1:N use cases. Toon dit als toggle, niet als dropdown met types.

### Aanbeveling 3: Automatische reciproque velden
Wanneer de gebruiker in Tabel A een Relation naar Tabel B maakt, maak automatisch een corresponderend veld in Tabel B. Geef de gebruiker de optie om dit uit te zetten (unidirectioneel), maar maak bidirectioneel de default.

### Aanbeveling 4: Record picker met zoek en inline-creatie
De cel-interactie moet een **search-and-select modal** zijn:
- Zoekbalk bovenaan
- Lijst van beschikbare records (met primary field + optioneel extra context)
- "Nieuw record aanmaken" knop onderaan
- Meerdere records tegelijk selecteerbaar

### Aanbeveling 5: Companion fields (Lookup)
Bied een **"Lookup"** of **"Ophalen"** veldtype dat data ophaalt via een bestaande relatie. Bijv.: "Toon het e-mailadres van de gekoppelde klant." Dit is het no-code equivalent van een JOIN.

### Aanbeveling 6: Progressive disclosure
- **Stap 1 (basis):** Maak een koppeling, selecteer doeltabel → klaar
- **Stap 2 (optioneel):** Beperk tot één koppeling, beperk selectie tot een view
- **Stap 3 (geavanceerd):** Relatie-attributen, referentiële integriteit (cascade/restrict delete)

Toon stap 2 en 3 pas als de gebruiker erom vraagt (bijv. via een "Geavanceerd" expandable section).

### Aanbeveling 7: Vermijd database-jargon in de UI
Gebruik nooit in de primaire UI:
- ❌ Foreign key → ✅ "Koppeling"
- ❌ Junction table → ✅ (verberg het, of noem het "Tussentabel" als het echt zichtbaar moet)
- ❌ Cardinality → ✅ "Mag er meer dan één zijn?"
- ❌ Has-Many / Belongs-to → ✅ "Eén ↔ Meerdere" met visueel icoon
- ❌ Referential integrity → ✅ "Wat gebeurt er als ik dit verwijder?"

### Aanbeveling 8: Visuele hints voor relatietype
Overweeg een **mini-diagram** (à la Strapi) dat visueel toont hoe de twee tabellen verbonden zijn. Niet als vereiste stap, maar als bevestiging/uitleg nadat de relatie is aangemaakt. Bijv.:

```
Projecten ──── meerdere ──── Taken
   (1)                        (N)
```

### Aanbeveling 9: "Smart defaults" — afleiden in plaats van vragen
Als de gebruiker een relatie maakt en er al een relatie de andere kant op bestaat, stel dan voor om ze te koppelen in plaats van een nieuwe te maken. Als een tabel kennelijk een tussentabel is (twee relation-velden, weinig eigen data), suggereer dan dat het een M:N koppeltabel is.

### Aanbeveling 10: Denk aan de "lijstdenker"
Veel gebruikers beginnen met één grote tabel. Bied tooling om:
- Herhaalde waarden te detecteren ("Je hebt 'Klant A' 47 keer getypt — wil je er een aparte tabel van maken?")
- Een kolom te "upgraden" naar een relatie (extract naar nieuwe tabel + automatisch linken)

Dit is de brug van spreadsheet-denken naar relationeel denken.

---

## Bronnen

- [Airtable Support — Linking Records](https://support.airtable.com/docs/linking-records-in-airtable)
- [Notion Help — Relations & Rollups](https://www.notion.com/help/relations-and-rollups)
- [Baserow Docs — Link to table field](https://baserow.io/user-docs/link-to-table-field)
- [NocoDB Docs — Links](https://nocodb.com/docs/product-docs/fields/field-types/links-based/links)
- [Coda Help — Connect tables with relation columns](https://help.coda.io/en/articles/1385997-connect-tables-with-relation-columns)
- [monday.com Support — Connect Boards Column](https://support.monday.com/hc/en-us/articles/360000635139-The-Connect-Boards-Column)
- [monday.com Support — Mirror Column](https://support.monday.com/hc/en-us/articles/360001733859-The-Mirror-Column)
- [Fibery Community — Relationship Properties](https://community.fibery.io/t/relationship-properties/887/28)
- [Microsoft Support — Lookup Columns](https://support.microsoft.com/en-us/office/create-list-relationships-by-using-lookup-columns-80a3e0a6-8016-41fb-ad09-8bf16d490632)
- [Directus Docs — Relationships](https://directus.io/docs/guides/data-model/relationships)
- [Strapi Docs — Content-Type Builder](https://docs.strapi.io/cms/features/content-type-builder)
- [ResearchGate — Facilitating End User Database Development](https://www.researchgate.net/publication/314477626)
- [ScienceDirect — Simple-talking database development (Desolda et al., 2015)](https://www.sciencedirect.com/science/article/abs/pii/S0747563215000813)
- [NN/g — Mental Models](https://www.nngroup.com/articles/mental-models/)
