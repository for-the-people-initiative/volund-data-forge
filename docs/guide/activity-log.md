# 📋 Activiteitenlog

De activiteitenlog houdt een audit trail bij van alle CRUD-operaties op je collecties. Elke aanmaak, wijziging en verwijdering wordt automatisch vastgelegd.

## Overzicht

De activiteitenlog is beschikbaar via het menu-item **Activiteitenlog** en toont een tijdlijn van alle wijzigingen in je data.

Elke entry bevat:

- **Actie** — 🟢 Aangemaakt, 🟡 Bijgewerkt, of 🔴 Verwijderd
- **Collectie** — de collectie waarin de wijziging plaatsvond
- **Record ID** — het ID van het betreffende record
- **Tijdstip** — datum en tijd van de wijziging (NL-formaat)
- **Wijzigingen** — de gewijzigde velden (uitklapbaar)

## Filteren

Je kunt de log filteren op collectie via het dropdown-menu bovenaan de pagina. Klik op **✕ Reset** om het filter te wissen.

## Paginering

De log toont 30 entries per pagina. Gebruik de navigatieknoppen onderaan om door de resultaten te bladeren.

## API

De activiteitenlog is ook beschikbaar via de REST API:

```
GET /api/activity?collection=producten&limit=30&offset=0
```

**Parameters:**

| Parameter    | Beschrijving                          |
|-------------|---------------------------------------|
| `collection` | Filter op collectienaam (optioneel)   |
| `limit`      | Aantal resultaten per pagina          |
| `offset`     | Aantal resultaten om over te slaan    |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "action": "create",
      "collection": "producten",
      "record_id": "42",
      "changes": "{\"naam\": \"Nieuw product\"}",
      "timestamp": "2026-02-20T14:30:00.000Z"
    }
  ],
  "total": 150
}
```

## Details van wijzigingen

Bij update-acties worden de gewijzigde velden opgeslagen als JSON. Klik op **Wijzigingen** om de details te bekijken. Dit toont precies welke velden zijn aangepast en naar welke waarden.
