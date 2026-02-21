# 🌗 Dark Mode

Volund Data Forge ondersteunt een licht en donker thema. Standaard wordt het donkere thema gebruikt.

## Thema wisselen

Gebruik de thema-toggle in de interface om te schakelen tussen licht en donker. De keuze wordt automatisch opgeslagen in `localStorage` onder de sleutel `vdf-theme`.

## Automatische detectie

Bij het eerste bezoek detecteert VDF automatisch je systeemvoorkeur via `prefers-color-scheme`. Als je systeem op licht staat, wordt het lichte thema geladen. Daarna geldt je handmatige keuze.

## Technisch

Het thema werkt via een `data-theme` attribuut op het `<html>` element:

- `data-theme="dark"` — donker thema (standaard)
- `data-theme="light"` — licht thema

### Gebruik in eigen CSS

Je kunt je eigen componenten afstemmen op het actieve thema met CSS-variabelen die per thema worden gedefinieerd, bijvoorbeeld:

```css
.mijn-component {
  background: var(--surface-panel);
  color: var(--text-default);
}
```

### Gebruik in composables

```ts
import { useTheme } from '~/composables/useTheme'

const { theme, toggle } = useTheme()

// theme.value → 'dark' | 'light'
// toggle() → wisselt tussen dark en light
```

De `theme` ref is readonly — gebruik `toggle()` om te wisselen.
