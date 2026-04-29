# Color Palette System

**Project:** Breeze Theme Editor

---

## Overview

The Color Palette System introduces a two-level color management approach:

1. **Color Palettes** — Centralized color definitions organized by purpose (Brand, Neutral, State)
2. **Enhanced Color Picker** — Fields can reference palette colors or use custom values

### Key Benefits

- **Consistency** — Single source of truth for theme colors
- **Efficiency** — Change a palette color and all dependent fields update automatically
- **Flexibility** — Use palette colors or custom values per field
- **Professional** — Industry-standard approach (similar to Shopify, Tailwind, Material Design)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Breeze Theme Editor                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐      ┌──────────────────────┐     │
│  │ Color Palettes  │      │  Enhanced Color      │     │
│  │ Section         │◄────►│  Picker Fields       │     │
│  │                 │      │                      │     │
│  │ • Brand (3)     │      │ • Palette Swatches   │     │
│  │ • Neutral (11)  │      │ • Custom Input       │     │
│  │ • State (4)     │      │ • Link Indicator     │     │
│  └─────────────────┘      └──────────────────────┘     │
│           │                         │                   │
│           ▼                         ▼                   │
│  ┌──────────────────────────────────────────┐          │
│  │      Palette Manager (State)              │          │
│  │  • Track color values                     │          │
│  │  • Resolve CSS variables                  │          │
│  │  • Usage tracking                         │          │
│  └──────────────────────────────────────────┘          │
│           │                                             │
│           ▼                                             │
│  ┌──────────────────────────────────────────┐          │
│  │    Live Preview Manager                   │          │
│  │  • Cascade updates                        │          │
│  │  • CSS variable injection                 │          │
│  │  • Real-time preview                      │          │
│  └──────────────────────────────────────────┘          │
│           │                                             │
│           ▼                                             │
│  ┌──────────────────────────────────────────┐          │
│  │    Storage Layer                          │          │
│  │  • GraphQL API (server sync)              │          │
│  │  • Per-store isolation                    │          │
│  └──────────────────────────────────────────┘          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Data Structure

### Palette Definition in `theme.json`

```json
{
  "version": "1.0",
  "sections": [],
  "presets": [],
  "palettes": {
    "default": {
      "label": "Default Palette",
      "description": "Main color system for the theme",
      "groups": {
        "brand": {
          "label": "Brand Colors",
          "description": "Main brand identity colors",
          "colors": [
            {
              "id": "primary",
              "label": "Primary",
              "description": "Main brand color for buttons, headers",
              "css_var": "--color-brand-primary",
              "default": "#000d3a"
            },
            {
              "id": "secondary",
              "label": "Secondary",
              "description": "Secondary brand color for accents",
              "css_var": "--color-brand-secondary",
              "default": "#111827"
            },
            {
              "id": "accent",
              "label": "Accent",
              "description": "Accent color for highlights and CTAs",
              "css_var": "--color-brand-accent",
              "default": "#1979c3"
            }
          ]
        },
        "neutral": {
          "label": "Neutral Colors",
          "description": "Grayscale colors for backgrounds, text, borders",
          "colors": [
            { "id": "0",   "label": "White",    "css_var": "--color-neutral-0",   "default": "#ffffff" },
            { "id": "50",  "label": "Gray 50",  "css_var": "--color-neutral-50",  "default": "#f9fafb" },
            { "id": "100", "label": "Gray 100", "css_var": "--color-neutral-100", "default": "#f3f4f6" },
            { "id": "200", "label": "Gray 200", "css_var": "--color-neutral-200", "default": "#e5e7eb" },
            { "id": "300", "label": "Gray 300", "css_var": "--color-neutral-300", "default": "#d1d5db" },
            { "id": "400", "label": "Gray 400", "css_var": "--color-neutral-400", "default": "#9ca3af" },
            { "id": "500", "label": "Gray 500", "css_var": "--color-neutral-500", "default": "#6b7280" },
            { "id": "600", "label": "Gray 600", "css_var": "--color-neutral-600", "default": "#4b5563" },
            { "id": "700", "label": "Gray 700", "css_var": "--color-neutral-700", "default": "#374151" },
            { "id": "800", "label": "Gray 800", "css_var": "--color-neutral-800", "default": "#1f2937" },
            { "id": "900", "label": "Black",    "css_var": "--color-neutral-900", "default": "#111827" }
          ]
        },
        "state": {
          "label": "State Colors",
          "description": "Colors for messages, alerts, validation",
          "colors": [
            { "id": "success", "label": "Success", "css_var": "--color-state-success", "default": "#10b981" },
            { "id": "warning", "label": "Warning", "css_var": "--color-state-warning", "default": "#f59e0b" },
            { "id": "error",   "label": "Error",   "css_var": "--color-state-error",   "default": "#ef4444" },
            { "id": "info",    "label": "Info",    "css_var": "--color-state-info",    "default": "#3b82f6" }
          ]
        }
      }
    }
  }
}
```

### Linking a Field to a Palette

```json
{
  "id": "primary_button_color",
  "label": "Primary Button Color",
  "type": "color",
  "default": "#1979c3",
  "css_var": "--button-primary-bg",
  "palette": "default",
  "allow_custom": true
}
```

### Stored Values

**Palette-linked** (saves a CSS variable reference):
```json
{ "field_code": "primary_button_color", "value": "var(--color-brand-primary)" }
```

**Custom value** (saves a raw hex):
```json
{ "field_code": "primary_button_color", "value": "#ff0000" }
```

---

## Generated CSS

```css
/* Palette variables */
:root {
    --color-brand-primary: #000d3a;
    --color-brand-secondary: #111827;
    --color-brand-accent: #1979c3;

    --color-neutral-0: #ffffff;
    /* ... */
    --color-neutral-900: #111827;

    --color-state-success: #10b981;
    --color-state-warning: #f59e0b;
    --color-state-error: #ef4444;
    --color-state-info: #3b82f6;
}

/* Field values referencing palette */
:root {
    --button-primary-bg: var(--color-brand-primary);
}
```

---

## GraphQL Schema

```graphql
type BreezeThemeEditorPalette {
    id: String!
    label: String!
    description: String
    groups: [BreezeThemeEditorPaletteGroup!]!
}

type BreezeThemeEditorPaletteGroup {
    id: String!
    label: String!
    description: String
    colors: [BreezeThemeEditorPaletteColor!]!
}

type BreezeThemeEditorPaletteColor {
    id: String!
    label: String!
    description: String
    cssVar: String!
    value: String!
    default: String!
    usageCount: Int!
}

type Mutation {
    saveBreezeThemeEditorPaletteValue(
        input: SaveBreezeThemeEditorPaletteValueInput!
    ): SaveBreezeThemeEditorPaletteValueOutput
}

input SaveBreezeThemeEditorPaletteValueInput {
    scopeId: Int!
    scope: BreezeThemeEditorScopeCode!
    cssVar: String!
    value: String!
}

type SaveBreezeThemeEditorPaletteValueOutput {
    success: Boolean!
    message: String
    affectedFields: Int!
}
```

---

## Security

- Hex color values are validated against `^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`
- CSS variable names are validated against `^--color-[a-z-]+$`
- All inputs are sanitized before DB storage
- Access is restricted to admin users only; store-specific ACL applies

---

## Future Enhancements

- Multiple palettes (dark mode, high contrast, seasonal)
- Palette import/export (JSON / CSS)
- Color harmony tools (complementary, analogous, accessibility contrast checker)
- Typography palette (font families, weights, sizes)
- Gradient support
