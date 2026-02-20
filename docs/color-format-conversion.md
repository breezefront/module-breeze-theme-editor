# Color Format Conversion

**Status:** ✅ Implemented (commit 1f03dde)  
**Date:** February 20, 2026

## Overview

The Breeze Theme Editor automatically converts color values between HEX and RGB formats based on field configuration in GraphQL responses.

## How It Works

### Storage
All colors are stored in the database as **HEX format** (`#000000`) in the `breeze_theme_editor_value` table.

### Configuration
Each color field specifies its output format in `etc/theme_editor/settings.json`:

```json
{
  "type": "color",
  "format": "rgb"  // or "hex" or "auto"
}
```

### GraphQL Output
The GraphQL API automatically converts colors to the requested format:

**Example 1: RGB Format**
- Database: `#000000` (HEX)
- Config: `format: "rgb"`
- GraphQL returns: `"0, 0, 0"` ✅

**Example 2: HEX Format**
- Database: `#FF5733` (HEX)
- Config: `format: "hex"`
- GraphQL returns: `"#ff5733"` ✅ (normalized lowercase)

**Example 3: Same Format**
- Database: `#FFFFFF` (HEX)
- Config: `format: "hex"`
- GraphQL returns: `"#ffffff"` (no conversion needed)

## Special Cases

### Palette References
Palette references (CSS custom properties) are **never converted**:

```
Input:  "--color-primary"
Output: "--color-primary"  (unchanged, regardless of format)
```

This preserves theme palette system integrity.

### CSS var() Wrappers
CSS variables wrapped in `var()` are **never converted**:

```
Input:  "var(--custom-color)"
Output: "var(--custom-color)"  (unchanged, regardless of format)
```

This maintains backward compatibility with existing themes.

### Null Values
Null or empty values remain null:

```
Input:  null
Output: null
```

### Invalid Colors
Invalid color values are returned unchanged (fallback behavior):

```
Input:  "invalid-color"
Output: "invalid-color"
```

## Architecture

### Components

**1. ColorConverter** (`Model/Utility/ColorConverter.php`)
- Low-level HEX ↔ RGB conversion
- Validation (isHex, isRgb)
- Normalization (lowercase, short format)

**2. ColorFormatResolver** (`Model/Utility/ColorFormatResolver.php`)
- Resolves format from config or defaults
- Handles 'auto' format detection from default values
- Returns 'rgb' or 'hex' (never 'auto')

**3. ColorFormatter** (`Model/Utility/ColorFormatter.php`) ⭐ NEW
- High-level formatting for GraphQL responses
- Handles edge cases (palette refs, var(), null)
- Uses ColorConverter for actual conversion
- Public API: `formatColorValue(?string $value, string $format): ?string`

**4. AbstractConfigResolver** (`Model/Resolver/Query/AbstractConfigResolver.php`)
- Applies formatting to GraphQL field values
- Integrates ColorFormatter into resolver pipeline
- Resolves format early, then applies conversion

### Flow Diagram

```
GraphQL Request
    ↓
AbstractConfigResolver::mergeSectionsWithValues()
    ↓
ColorFormatResolver::resolve()  → Determines 'rgb' or 'hex'
    ↓
ColorFormatter::formatColorValue()
    ↓
    ├─ Palette reference? → Pass through unchanged
    ├─ CSS var()? → Pass through unchanged
    ├─ Null/empty? → Return null
    ├─ Same format? → Return normalized
    └─ Different format? → ColorConverter::hexToRgb() or rgbToHex()
    ↓
GraphQL Response with converted value
```

### CSS Generation (Separate Path)

CSS output uses a **different** formatting method (`CssGenerator::formatColor()`) because:

**GraphQL Output (ColorFormatter):**
```
Input:  "--color-primary"
Output: "--color-primary"  (raw reference)
```

**CSS Output (CssGenerator::formatColor):**
```
Input:  "--color-primary"
Output: "var(--color-primary-rgb)"  (wrapped with -rgb suffix)
```

Different output requirements = different formatters. This is **not code duplication**, it's **separation of concerns**.

## Backwards Compatibility

### Breeze 2.0 Themes
Breeze 2.0 uses `rgb(var(--color))` syntax and requires RGB format:

```css
/* Breeze 2.0 */
color: rgb(var(--text-color));
/* Expects: --text-color = "0, 0, 0" */
```

**Solution:** Fields are configured with `format: "rgb"` to ensure compatibility.

### Breeze 3.0 Themes
Breeze 3.0 uses native CSS color syntax with HEX:

```css
/* Breeze 3.0 */
color: var(--text-color);
/* Expects: --text-color = "#000000" */
```

**Solution:** Fields are configured with `format: "hex"` for cleaner syntax.

## Testing

### Unit Tests
**File:** `Test/Unit/Model/Utility/ColorFormatterTest.php`

**Coverage:** 16 tests, 56 assertions
- ✅ HEX to RGB conversion (4 tests)
- ✅ RGB to HEX conversion (2 tests)
- ✅ Same format preservation (2 tests)
- ✅ Palette reference preservation (1 test)
- ✅ CSS var() wrapper preservation (1 test)
- ✅ Error handling/fallback (1 test)
- ✅ Null/empty handling (2 tests)
- ✅ Short HEX normalization (1 test)
- ✅ Round-trip conversion (1 test)
- ✅ Mixed case format parameter (1 test)

**Run tests:**
```bash
vendor/bin/phpunit --filter ColorFormatterTest
```

### Manual GraphQL Testing

**Query:**
```graphql
query TestColorConversion {
  breezeThemeEditorConfig(
    storeId: 1
    themeId: 1
    status: DRAFT
  ) {
    sections {
      code
      label
      fields {
        code
        label
        type
        format
        value
        default
        isModified
      }
    }
  }
}
```

**Test Cases:**
1. Find a color field with `format: "rgb"` and value `#000000`
   - Expected: `value: "0, 0, 0"`
2. Find a color field with `format: "hex"` and value `#FF5733`
   - Expected: `value: "#ff5733"`
3. Find a color field with palette reference `--color-primary`
   - Expected: `value: "--color-primary"` (unchanged)

## Troubleshooting

### Issue: GraphQL returns null for color field

**Check:**
1. Is the value stored in database? (Check `breeze_theme_editor_value` table)
2. Is the format configured correctly? (Check `etc/theme_editor/settings.json`)
3. Is the ColorFormatter being called? (Add debug logging)

**Debug:**
```php
// In AbstractConfigResolver.php, line 61:
$convertedValue = $this->colorFormatter->formatColorValue($currentValue, $colorFormat);
error_log("Color conversion: $currentValue → $convertedValue (format: $colorFormat)");
```

### Issue: Color is not converted (still in HEX when RGB expected)

**Possible causes:**
1. Field type is not 'color' (check `$setting['type']`)
2. Format resolution failed (check ColorFormatResolver)
3. Value is a palette reference (correct behavior - no conversion)
4. Value is wrapped in var() (correct behavior - no conversion)

## Related Files

**Implementation:**
- `Model/Utility/ColorFormatter.php` - Main utility
- `Model/Utility/ColorConverter.php` - Low-level conversion
- `Model/Utility/ColorFormatResolver.php` - Format resolution
- `Model/Resolver/Query/AbstractConfigResolver.php` - Integration point

**Tests:**
- `Test/Unit/Model/Utility/ColorFormatterTest.php` - Unit tests
- `Test/Unit/Model/Resolver/Query/ConfigTest.php` - Integration tests

**Documentation:**
- `docs/plans/color-formatter-implementation.md` - Implementation plan
- `docs/color-format-conversion.md` - This file

## Commit

```
commit 1f03dde
Author: [Your Name]
Date: Thu Feb 20 2026

fix(graphql): convert HEX colors to RGB format when field specifies format: "rgb"
```

---

**Last Updated:** February 20, 2026  
**Status:** ✅ Production Ready
