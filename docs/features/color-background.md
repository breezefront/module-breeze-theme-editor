# COLOR_BACKGROUND field (solid color or CSS gradient)

`color_background` is a color field that accepts **either a solid color or a
CSS gradient** — analogous to Shopify's `color_background` setting. Use it for
any CSS variable that can hold a `background` value (e.g. footer `--footer-bg`).

## Declaring the field

In a theme's `etc/theme_editor/settings.json`:

```json
{
  "id": "bg",
  "label": "Footer Background",
  "type": "color_background",
  "default": "linear-gradient(135deg, #3485ec 0%, #1fd980 100%)",
  "property": "--footer-bg"
}
```

`default` may be a solid hex (`#1a1a1a`), a palette reference
(`--color-brand-primary`), or a gradient string. The value is stored **verbatim**
and emitted straight into the CSS variable.

## Using the editor

Click the field's swatch to open the popup. It has two tabs:

### Solid

The regular color picker — Pickr plus the theme palette grid. Pick a swatch or
type a hex. Identical to a normal `color` field.

### Gradient

```
┌─────────────────────────────────────┐
│  [ Solid ]  [ Gradient ]        ✕   │
│  PRESETS                             │
│   ● ● ● ● ● ● ● ● ● ●                │  ← click a preset to start
│  COLOR STOPS                         │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← gradient bar │
│  ◉──────────────────◉  ← stop grips  │
│  Click the bar to add a stop ·       │
│  drag a handle to move it            │
│  [+] [−]          Position [ 40 ] %  │
│  SELECTED STOP COLOR                 │
│  [ Pickr color picker ]              │
│  TYPE & DIRECTION                    │
│   ◉ Linear   ○ Radial                │
│   Angle  [────●────]  135°           │
└─────────────────────────────────────┘
```

Workflow:

1. **Start from a preset** (optional) — click one of the preset dots to load a
   ready-made gradient, then tweak it.
2. **Add a stop** — click anywhere on the gradient bar, or press **+**.
3. **Move a stop** — drag its round grip along the bar, or select it and type an
   exact **Position** percentage.
4. **Select a stop** — click its grip; the active grip is enlarged/ringed. The
   **Selected stop color** picker and the Position field act on it.
5. **Recolor a stop** — use the Pickr under *Selected stop color*.
6. **Remove a stop** — select it and press **−** (minimum two stops enforced).
7. **Type & direction** — switch **Linear**/**Radial**; for linear, set the
   **Angle** (0–360°).

Every change is applied live to the preview and saved to the draft — no separate
"apply" step.

## Stored value format

The field stores the raw CSS string exactly as built:

```
#1a1a1a
linear-gradient(135deg, #3485ec 0%, #1fd980 100%)
radial-gradient(circle, #982ce5 0%, #1d6799 100%)
```

Palette references inside stops are kept as `var(--color-…)` and survive
untouched. Solid values behave exactly like a `color` field (hex / rgb / palette
reference, format-aware).
