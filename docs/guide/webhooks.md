# Webhooks

Webhooks sturen HTTP callbacks wanneer records worden aangemaakt, gewijzigd of verwijderd.

## Overzicht

Bereikbaar via `/webhooks`.

[Screenshot: Webhooks pagina met registratieformulier en lijst]

## Webhook registreren

1. Vul het formulier in:
   - **Collectie** — Kies een specifieke collectie of `*` (alle collecties)
   - **Event** — Kies wanneer de webhook moet afgaan:
     - `Alle events` — Bij elke actie
     - `Create` — Alleen bij aanmaken
     - `Update` — Alleen bij wijzigen
     - `Delete` — Alleen bij verwijderen
   - **URL** — Het endpoint dat aangeroepen wordt (bijv. `https://example.com/webhook`)
   - **Secret** — Een geheim voor HMAC-SHA256 signature verificatie
2. Klik **"+ Webhook toevoegen"**

## Webhook payload

Bij een match stuurt VDF een `POST` request naar de geconfigureerde URL:

### Headers

```
Content-Type: application/json
X-Volund-Signature: <HMAC-SHA256 hex digest>
```

### Body

```json
{
  "event": "create",
  "collection": "contacts",
  "record": {
    "id": 1,
    "name": "Jan Janssen",
    "email": "jan@example.com",
    "created_at": "2026-02-21T08:00:00.000Z",
    "updated_at": "2026-02-21T08:00:00.000Z"
  },
  "timestamp": "2026-02-21T08:00:00.123Z"
}
```

## Signature verificatie

Verifieer de authenticiteit van webhook payloads met HMAC-SHA256:

```javascript
import { createHmac } from 'crypto'

function verifySignature(body, secret, signature) {
  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('hex')
  return expected === signature
}

// In je webhook handler:
const signature = req.headers['x-volund-signature']
const isValid = verifySignature(req.rawBody, 'jouw-secret', signature)
```

## Webhook beheren

### Activeren / Deactiveren

Klik **⏸️** om een webhook te pauzeren of **▶️** om te heractiveren. Gedeactiveerde webhooks worden niet meer aangeroepen.

### Verwijderen

Klik **🗑️** om een webhook permanent te verwijderen.

### Status badges

Elke webhook toont badges voor:
- **Collectie** — Welke collectie
- **Event** — Welk event type
- **Status** — Actief (groen) of Inactief (rood)

## Technische details

- Webhooks zijn **fire-and-forget** — ze blokkeren de hoofdoperatie niet
- Mislukte HTTP calls worden gelogd in de server console
- Interne tabellen (prefix `_`) triggeren geen webhooks
- Webhook registraties worden opgeslagen in de interne tabel `_webhooks`
- Matching: een webhook matcht als collectie overeenkomt (of `*`) én event overeenkomt (of `all`)

## API

Zie de [REST API documentatie](../api/rest-api.md#webhooks) voor de webhook management endpoints.
