# Thema instellingen

Volund Data Forge ondersteunt een licht en donker thema.

## Thema wisselen

Gebruik de thema-schakelaar in de navigatie om te wisselen tussen licht en donker.

[Screenshot: Thema toggle knop in de navigatiebalk]

## Standaard thema

Het standaard thema is **donker**. Bij de eerste keer laden wordt het thema bepaald door:

1. **Opgeslagen voorkeur** — Als je eerder een thema hebt gekozen (opgeslagen in `localStorage` onder `vdf-theme`)
2. **Systeemvoorkeur** — Anders wordt de voorkeur van je besturingssysteem gebruikt (`prefers-color-scheme`)
3. **Fallback** — Als geen voorkeur gevonden wordt: donker thema

## Technische werking

- Het thema wordt ingesteld als `data-theme` attribuut op het `<html>` element
- Waarden: `light` of `dark`
- De keuze wordt opgeslagen in `localStorage` (key: `vdf-theme`)
- De UI gebruikt CSS custom properties (design tokens) die reageren op het data-theme attribuut

## Design tokens

De interface gebruikt het **FTP Design System** met tokens voor:

- `--surface-*` — Achtergrondkleuren
- `--text-*` — Tekstkleuren
- `--border-*` — Randkleuren
- `--intent-*` — Intentiekleuren (actie, succes, fout)
- `--space-*` — Spacing
- `--radius-*` — Border radius

Door het `data-theme` attribuut schakelen alle tokens automatisch mee.
