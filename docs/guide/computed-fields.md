# 🔢 Berekende velden

Berekende velden (computed fields) zijn velden waarvan de waarde automatisch wordt berekend op basis van een formule die verwijst naar andere velden in hetzelfde record.

## Formule-syntax

Formules gebruiken `{veldnaam}` om te verwijzen naar andere velden:

```
{prijs} * {aantal}
```

### Ondersteunde operaties

- **Wiskunde:** `+`, `-`, `*`, `/`
- **Haakjes:** `(`, `)` voor volgorde van berekening
- **Stringconcatenatie:** `{voornaam} + " " + {achternaam}`

### Voorbeelden

| Formule                              | Resultaat                    |
|--------------------------------------|------------------------------|
| `{prijs} * {aantal}`                | Totaalbedrag                 |
| `{prijs} * 1.21`                    | Prijs inclusief BTW          |
| `{voornaam} + " " + {achternaam}`   | Volledige naam               |
| `({subtotaal} + {verzendkosten}) * 1.21` | Totaal incl. BTW       |

## Schema-configuratie

Voeg een berekend veld toe aan je schema met een `computed` blok:

```json
{
  "name": "totaal",
  "type": "number",
  "computed": {
    "formula": "{prijs} * {aantal}",
    "returnType": "number"
  }
}
```

**Eigenschappen:**

- `formula` — de formule-expressie
- `returnType` — het verwachte retourtype (`number`, `string`, etc.)

## Hoe het werkt

1. Bij het ophalen van records worden veldverwijzingen (`{veld}`) vervangen door de werkelijke waarden
2. De expressie wordt veilig geëvalueerd (alleen basis wiskunde en strings)
3. Het resultaat wordt toegevoegd aan het record

Berekende velden worden **niet opgeslagen** in de database — ze worden bij elke query opnieuw berekend.

## Foutafhandeling

- Als een verwezen veld `null` of `undefined` is, wordt `null` als waarde gebruikt
- Bij ongeldige formules of evaluatiefouten retourneert het veld `null`
- Gevaarlijke patronen (code-injectie) worden automatisch geblokkeerd
