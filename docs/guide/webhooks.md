# 🔔 Webhooks

Met webhooks ontvang je automatisch HTTP callbacks wanneer er CRUD-events plaatsvinden in je collecties. Ideaal voor integraties met externe systemen.

## Webhook aanmaken

Navigeer naar **Webhooks** in het menu en vul het formulier in:

1. **Collectie** — kies een specifieke collectie of `Alle collecties` (`*`)
2. **Event** — kies uit:
   - `Alle events` — triggert bij create, update én delete
   - `Create` — alleen bij het aanmaken van records
   - `Update` — alleen bij het bijwerken van records
   - `Delete` — alleen bij het verwijderen van records
3. **URL** — het endpoint dat de callback ontvangt (bijv. `https://example.com/webhook`)
4. **Secret** — een geheim voor de HMAC-signature ter verificatie

Klik op **+ Webhook toevoegen** om de webhook te registreren.

## Beheer

Elke webhook toont:

- **Collectie** en **event** als badges
- **Status** — Actief (groen) of Inactief (rood)
- **URL** — het geconfigureerde endpoint

### Acties

- **⏸️ / ▶️** — Activeer of deactiveer een webhook zonder deze te verwijderen
- **🗑️** — Verwijder de webhook permanent

## API Endpoints

### Webhooks ophalen

```
GET /api/webhooks
```

### Webhook aanmaken

```
POST /api/webhooks
Content-Type: application/json

{
  "collection": "producten",
  "event": "create",
  "url": "https://example.com/webhook",
  "secret": "mijn-geheim"
}
```

### Webhook aan/uitzetten

```
PATCH /api/webhooks/:id
Content-Type: application/json

{
  "active": false
}
```

### Webhook verwijderen

```
DELETE /api/webhooks/:id
```

## Beveiliging

Elke webhook vereist een **secret**. Dit secret wordt gebruikt om een HMAC-signature te genereren bij het versturen van de callback, zodat de ontvanger kan verifiëren dat het bericht authentiek is.
