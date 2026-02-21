# Zoeken

Volund Data Forge biedt een globale zoekfunctie die door alle collecties tegelijk zoekt.

## Gebruik

Navigeer naar `/search` of gebruik de zoekpagina vanuit de navigatie.

[Screenshot: Zoekpagina met resultaten gegroepeerd per collectie]

### Hoe zoeken werkt

1. Typ een zoekterm in het zoekveld
2. Na **300ms debounce** wordt de zoekopdracht uitgevoerd
3. Resultaten worden **gegroepeerd per collectie** getoond
4. Klik op een resultaat om naar het record te gaan

### Zoekbare velden

Niet alle velden worden doorzocht. Alleen velden van de volgende types worden meegenomen:

| Veldtype | Zoekbaar |
|----------|:-------:|
| `text` | ✓ |
| `email` | ✓ |
| `select` | ✓ |
| `integer` | ✗ |
| `float` | ✗ |
| `boolean` | ✗ |
| `datetime` | ✗ |
| `relation` | ✗ |

### Zoeklogica

- De zoekopdracht gebruikt **case-insensitive LIKE** matching (`ILIKE`)
- De zoekterm wordt omringd met wildcards: `%zoekterm%`
- Alle tekstvelden van een collectie worden gecombineerd met **OR** — een match in één veld is voldoende
- Collecties zonder tekstvelden worden overgeslagen
- Interne collecties (prefix `_`) worden niet doorzocht

### Resultaatweergave

- Resultaten tonen het **label** van het record (eerste gevonden veld: `name`, `title`, `label`, `email`, `subject`, of `#id`)
- Per collectie worden maximaal **5 resultaten** getoond (configureerbaar tot 20)
- Collectienamen worden gekapitaliseerd met een 📁 icoon

### URL parameters

De zoekpagina ondersteunt een `q` query parameter:

```
/search?q=amsterdam
```

Bij het openen met een `q` parameter wordt direct gezocht.

## API

De zoek-API is beschikbaar op:

```
GET /api/search?q=zoekterm&limit=5
```

Zie de [REST API documentatie](../api/rest-api.md#zoeken) voor details.
