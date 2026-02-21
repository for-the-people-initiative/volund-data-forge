# 📁 Bestandsuploads

Volund Data Forge ondersteunt het uploaden van bestanden en afbeeldingen via een dedicated upload API.

## Ondersteunde bestandstypen

- **Afbeeldingen:** JPG, JPEG, PNG, GIF, WebP, SVG
- **Documenten:** PDF, DOC, DOCX, XLS, XLSX, CSV, TXT
- **Overig:** JSON, ZIP

## Limieten

- **Maximale bestandsgrootte:** 10 MB (standaard)
- Configureerbaar via de omgevingsvariabele `MAX_UPLOAD_SIZE` (in bytes)

## Bestanden uploaden

Stuur een multipart form-data request naar het upload endpoint:

```bash
curl -X POST http://localhost:9001/api/uploads \
  -F "file=@mijn-afbeelding.png"
```

**Response:**

```json
{
  "path": "/api/uploads/550e8400-e29b-41d4-a716-446655440000.png",
  "filename": "mijn-afbeelding.png",
  "mimetype": "image/png",
  "size": 245760
}
```

Het `path` veld kun je opslaan in een record als verwijzing naar het bestand.

## Bestanden ophalen

Geüploade bestanden zijn beschikbaar via:

```
GET /api/uploads/:filename
```

Bestanden worden gecached met een `Cache-Control: public, max-age=31536000, immutable` header voor optimale prestaties.

## Opslag

Bestanden worden opgeslagen in de `.uploads/` map in de projectroot. Elke bestandsnaam krijgt een uniek UUID om conflicten te voorkomen.

## Beveiliging

- **Directory traversal** wordt geblokkeerd — bestandsnamen mogen geen `..`, `/` of `\` bevatten
- Bestanden worden opgeslagen met een willekeurige UUID-naam, onafhankelijk van de originele bestandsnaam

## Gebruik met velden

Sla het geretourneerde `path` op in een `text`-veld van je collectie. De UI kan dit pad gebruiken om afbeeldingen te tonen of downloadlinks aan te bieden.
