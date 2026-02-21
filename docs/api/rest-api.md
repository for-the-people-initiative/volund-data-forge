# 📡 REST API Referentie

Volund Data Forge biedt een volledige REST API voor schema-beheer, CRUD-operaties, activiteitenlog, webhooks, uploads en zoeken.

**Base URL:** `http://localhost:9001`

---

## Schema Endpoints

### Alle schemas ophalen

```
GET /api/schema
```

**Response:** `200` — Array van `CollectionSchema` objecten.

### Collectie aanmaken

```
POST /api/schema
Content-Type: application/json

{
  "name": "producten",
  "fields": [
    { "name": "naam", "type": "text", "required": true },
    { "name": "prijs", "type": "number" },
    { "name": "actief", "type": "boolean", "default": true }
  ]
}
```

**Response:** `201` — Het aangemaakte schema.

### Schema ophalen

```
GET /api/schema/:collection
```

**Response:** `200` — Het schema, of `404` als het niet bestaat.

### Schema bijwerken

```
PUT /api/schema/:collection
Content-Type: application/json

{
  "name": "producten",
  "fields": [
    { "name": "naam", "type": "text", "required": true },
    { "name": "prijs", "type": "number" },
    { "name": "categorie", "type": "select", "options": ["A", "B", "C"] }
  ]
}
```

**Response:** `200` — Het bijgewerkte schema. Migraties worden automatisch uitgevoerd.

### Collectie verwijderen

```
DELETE /api/schema/:collection
```

**Response:** `204` — Schema verwijderd (tabel wordt niet gedropt).

---

## Record Endpoints

### Records ophalen (met filtering en paginering)

```
GET /api/collections/:collection
```

**Query parameters:**

| Parameter | Beschrijving | Voorbeeld |
|-----------|-------------|-----------|
| `filter[veld][operator]` | Filterconditie | `filter[status][eq]=active` |
| `sort` | Sortering (prefix `-` voor aflopend) | `sort=-created_at,name` |
| `page` | Paginanummer (1-gebaseerd) | `page=2` |
| `limit` | Resultaten per pagina | `limit=25` |
| `offset` | Records overslaan | `offset=50` |
| `fields` | Veld-selectie | `fields=name,email` |
| `populate` | Relaties meeladen | `populate=company,tags` |

**Ondersteunde filter-operators:**

`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `nin`, `like`, `ilike`, `null`, `notNull`, `between`

**Response:**

```json
{
  "data": [
    { "id": 1, "naam": "Product A", "prijs": 29.99 }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 25
  }
}
```

### Record aanmaken

```
POST /api/collections/:collection
Content-Type: application/json

{
  "naam": "Nieuw product",
  "prijs": 19.99
}
```

**Response:** `201`

```json
{
  "data": { "id": 1, "naam": "Nieuw product", "prijs": 19.99 }
}
```

### Enkel record ophalen

```
GET /api/collections/:collection/:id
```

**Query parameters:** `populate` (optioneel)

**Response:** `200`

```json
{
  "data": { "id": 1, "naam": "Product A", "prijs": 29.99 }
}
```

### Record bijwerken

```
PUT /api/collections/:collection/:id
Content-Type: application/json

{
  "prijs": 24.99
}
```

**Response:** `200`

### Record verwijderen

```
DELETE /api/collections/:collection/:id
```

**Response:** `204`

---

## Collecties Overzicht

### Collecties met aantallen

```
GET /api/collections-list
```

**Response:**

```json
[
  { "name": "producten", "count": 42, "fieldCount": 5 },
  { "name": "klanten", "count": 128, "fieldCount": 8 }
]
```

---

## Activiteitenlog

```
GET /api/activity?collection=producten&limit=30&offset=0
```

Zie [Activiteitenlog](../guide/activity-log.md) voor details.

---

## Webhooks

| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `GET` | `/api/webhooks` | Alle webhooks ophalen |
| `POST` | `/api/webhooks` | Webhook aanmaken |
| `PATCH` | `/api/webhooks/:id` | Webhook bijwerken (active toggle) |
| `DELETE` | `/api/webhooks/:id` | Webhook verwijderen |

Zie [Webhooks](../guide/webhooks.md) voor details.

---

## Uploads

| Methode | Endpoint | Beschrijving |
|---------|----------|-------------|
| `POST` | `/api/uploads` | Bestand uploaden (multipart) |
| `GET` | `/api/uploads/:filename` | Bestand ophalen |

Zie [Bestandsuploads](../guide/file-uploads.md) voor details.

---

## Zoeken

```
GET /api/search?q=zoekterm&collection=producten
```

Zie [Zoeken](../guide/search.md) voor details.

---

## Veldtypen

| Type | Beschrijving |
|------|-------------|
| `text` | Tekstveld |
| `number` | Numeriek veld |
| `boolean` | Waar/onwaar |
| `date` | Datumveld |
| `select` | Keuzelijst (met `options` array) |
| `relation` | Verwijzing naar andere collectie |
| `lookup` | Veld ophalen via relatie |

## Relatie-types

| Type | Beschrijving |
|------|-------------|
| `oneToOne` | Eén-op-één relatie |
| `manyToOne` | Veel-op-één relatie |
| `oneToMany` | Eén-op-veel relatie |
| `manyToMany` | Veel-op-veel relatie (via junction table) |

## Foutformaat

Alle fouten volgen hetzelfde formaat:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Record niet gevonden",
    "details": [
      { "field": "id", "message": "Ongeldig ID" }
    ]
  }
}
```

**HTTP statuscodes:** `400` (validatie), `404` (niet gevonden), `413` (te groot), `415` (verkeerd content-type), `500` (serverfout)
