# Activiteitenlog

De activiteitenlog houdt automatisch alle CRUD-operaties bij als audit trail.

## Overzicht

Bereikbaar via `/activity`.

[Screenshot: Activiteitenlog met timeline van events]

## Wat wordt gelogd

Elke create, update of delete operatie op een collectie wordt vastgelegd met:

| Veld | Beschrijving |
|------|-------------|
| `collection` | Naam van de collectie |
| `record_id` | ID van het betreffende record |
| `action` | Type actie: `create`, `update` of `delete` |
| `changes` | JSON met de meegegeven data (bij create/update) |
| `timestamp` | Tijdstip van de actie (ISO 8601) |

## Weergave

Events worden getoond als een **timeline** met:

- 🟢 **Aangemaakt** — Nieuw record
- 🟡 **Bijgewerkt** — Record gewijzigd
- 🔴 **Verwijderd** — Record verwijderd

Elke entry toont:
- De actie en collectienaam
- Het record ID
- Het tijdstip (Nederlands formaat)
- Een uitklapbare **"Wijzigingen"** sectie met de JSON data

## Filteren

Filter op collectie via de dropdown bovenaan:

1. Selecteer een collectie uit de dropdown
2. Alleen activiteiten voor die collectie worden getoond
3. Klik **"✕ Reset"** om het filter te wissen

## Paginering

- Standaard **30 entries per pagina**
- Navigeer met Vorige/Volgende knoppen
- Nieuwste entries worden eerst getoond (gesorteerd op ID aflopend)

## Verversing

Klik de **🔄** knop om de log te verversen.

## Technische details

- De activiteitenlog wordt opgeslagen in de interne tabel `_activity_log`
- Deze tabel is niet toegankelijk via de collectie-API (prefix `_` wordt geblokkeerd)
- Logging-fouten worden opgevangen en breken de hoofdoperatie niet
- De log bevat geen authenticatie-informatie (nog geen auth systeem)

## API

```
GET /api/activity?collection=contacts&limit=50&offset=0
```

Zie de [REST API documentatie](../api/rest-api.md#activiteitenlog) voor details.
