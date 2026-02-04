# Swissup Breeze Theme Editor

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/breezefront/module-breeze-theme-editor/releases)
[![License](https://img.shields.io/badge/license-OSL--3.0-green.svg)](LICENSE)
[![PHP](https://img.shields.io/badge/php-7.4%20%7C%208.0%20%7C%208.1%20%7C%208.2-blue.svg)]()

Visual theme customization tool for Magento 2 Breeze themes with live preview, draft/publish workflow, and 16+ field types.

## 📚 Documentation

**Full documentation:** https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/

- [Installation Guide](https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/installation/)
- [Theme Developer Guide](https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/theme-developer-guide/) - **How to add Theme Editor support to your theme**
- [Configuration](https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/configuration/)
- [User Guide](https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/user-guide/)
- [GraphQL API](https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/graphql-api/)

## ✨ Features

- **Live Preview** - See changes instantly without page reload
- **Draft/Publish Workflow** - Test before going live
- **16+ Field Types** - Colors, fonts, toggles, images, spacing, repeaters, and more
- **Dual Color Format Support** - RGB (Breeze 2.0) and HEX (Breeze 3.0) with auto-detection
- **Theme Inheritance** - Extend parent theme configurations
- **Multi-Store Support** - Different settings per store view
- **Version Control** - Publication history with rollback
- **Secure Access** - Token-based authentication (3-hour sessions)

## 🚀 Quick Start for Theme Developers

### 1. Create Configuration File

Add `etc/theme_editor/settings.json` to your theme:

```json
{
  "version": "1.0",
  "sections": [
    {
      "id": "colors",
      "name": "Colors",
      "icon": "palette",
      "settings": [
        {
          "id": "primary_color",
          "label": "Primary Color",
          "type": "color",
          "default": "#1979c3",
          "css_var": "--primary-color",
          "description": "Main brand color"
        },
        {
          "id": "text_color",
          "label": "Text Color",
          "type": "color",
          "default": "#333333",
          "css_var": "--text-color",
          "description": "Body text color"
        }
      ]
    },
    {
      "id": "typography",
      "name": "Typography",
      "icon": "text_fields",
      "settings": [
        {
          "id": "body_font",
          "label": "Body Font",
          "type": "font_picker",
          "default": "Open Sans",
          "css_var": "--font-family-base",
          "options": [
            {"value": "Open Sans", "label": "Open Sans"},
            {"value": "Roboto", "label": "Roboto"},
            {"value": "Georgia", "label": "Georgia"}
          ]
        },
        {
          "id": "font_size",
          "label": "Base Font Size",
          "type": "number",
          "default": "16",
          "min": "12",
          "max": "24",
          "step": "1",
          "css_var": "--font-size-base",
          "description": "Base text size in pixels"
        }
      ]
    },
    {
      "id": "layout",
      "name": "Layout",
      "icon": "view_quilt",
      "settings": [
        {
          "id": "container_width",
          "label": "Container Width",
          "type": "text",
          "default": "1280px",
          "css_var": "--container-width",
          "placeholder": "e.g. 1280px"
        },
        {
          "id": "sticky_header",
          "label": "Sticky Header",
          "type": "toggle",
          "default": true,
          "css_var": "--header-sticky",
          "description": "Fix header on scroll"
        }
      ]
    }
  ]
}
```

### 2. Use CSS Variables in Your Theme

The Theme Editor generates CSS variables that you can use in your stylesheets:

```css
/* web/css/source/_theme.less or styles.css */

:root {
  /* These will be overridden by Theme Editor */
  --primary-color: 25, 121, 195;  /* RGB format for Breeze */
  --text-color: 51, 51, 51;
  --font-family-base: "Open Sans", sans-serif;
  --font-size-base: 16;
  --container-width: 1280px;
  --header-sticky: 1;
}

/* Use variables in your styles */
.btn-primary {
  background: rgb(var(--primary-color));
}

body {
  color: rgb(var(--text-color));
  font-family: var(--font-family-base);
  font-size: calc(var(--font-size-base) * 1px);
}

.page-wrapper {
  max-width: var(--container-width);
  margin: 0 auto;
}

.page-header {
  position: var(--header-sticky) == 1 ? sticky : relative;
}
```

### 3. Field Types Quick Reference

| Type | Description | CSS Output Example |
|------|-------------|-------------------|
| **color** | Color picker with RGB/HEX support | `--color: 255, 0, 0` (RGB) or `--color: #ff0000` (HEX) |
| **text** | Single line input | `--width: 1280px` |
| **textarea** | Multi-line text input | `--content: "text..."` |
| **number** | Numeric input | `--columns: 4` |
| **range** | Slider control | `--opacity: 0.8` |
| **select** | Dropdown selector | `--variant: primary` |
| **checkbox** | Multiple selection | JSON data |
| **toggle** | On/Off switch | `--enabled: 1` or `0` |
| **font_picker** | Font selector | `--font: "Georgia", serif` |
| **color_scheme** | Predefined color schemes | Multiple CSS vars |
| **icon_set_picker** | Icon set selector | `--icon-set: fontawesome` |
| **spacing** | 4-sided control | `--padding: 20px` or `10px 20px` |
| **image_upload** | Image upload | `--logo: url(...)` |
| **code** | Code editor | CSS/JS code |
| **social_links** | Social media links | JSON data |
| **repeater** | Dynamic lists | JSON data for JS |

**Color Format Support:**
- **Breeze 2.0 themes** use RGB format: `--color: 255, 0, 0`
- **Breeze 3.0 themes** use HEX format: `--color: #ff0000`
- Format is auto-detected from default value or set explicitly via `format` field

**See full documentation:** https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/theme-developer-guide/

## 🔌 GraphQL API Example

The module provides a comprehensive GraphQL API for programmatic access:

```graphql
query {
  breezeThemeEditorConfig(storeId: 1, status: DRAFT) {
    version
    sections {
      code
      label
      fields {
        code
        label
        type
        value
        default
        format
        cssVar
      }
    }
    palettes {
      id
      label
      groups {
        colors {
          id
          label
          value
          cssVar
          format
        }
      }
    }
  }
}
```

**API Features:**
- 10 Query operations (config, values, publications, presets, etc.)
- 9 Mutation operations (save, publish, rollback, import/export, etc.)
- Full support for draft/publish workflow
- Publication history with changelog tracking

**See full API documentation:** https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/graphql-api/

## 🎨 Color Format Support (Breeze 2.0 vs 3.0)

The Theme Editor supports both RGB and HEX color formats to ensure compatibility with different Breeze versions:

### RGB Format (Breeze 2.0)

```json
{
  "id": "primary_color",
  "type": "color",
  "default": "25, 121, 195",
  "format": "rgb",
  "css_var": "--primary-color"
}
```

**CSS output:** `--primary-color: 25, 121, 195`

**Usage:** `background: rgb(var(--primary-color))`

### HEX Format (Breeze 3.0)

```json
{
  "id": "primary_color",
  "type": "color",
  "default": "#1979c3",
  "format": "hex",
  "css_var": "--primary-color"
}
```

**CSS output:** `--primary-color: #1979c3`

**Usage:** `background: var(--primary-color)`

### Auto-Detection

If `format` is not specified, the Theme Editor automatically detects the format from the default value:
- Contains comma → RGB format
- Starts with `#` → HEX format
- Contains `rgb()` wrapper → RGB format (wrapper is removed)

**Note:** The GraphQL API includes the `format` field for all color values.

### 4. Enable and Access

1. **Enable in Admin:**
   - Go to: **Stores > Configuration > Swissup > Breeze Theme Editor**
   - Select **Yes** and save

2. **Access Theme Editor:**
   - Click **"Open Frontend in Theme Editor Mode"** button in admin config
   - Or use URL: `https://your-store.com/?breeze_theme_editor_access_token=YOUR_TOKEN`
   - Access token is valid for 3 hours

3. **Make Changes:**
   - Panel appears on the right side
   - Edit values with live preview
   - Click **Save Draft** or **Publish**

## 📦 Installation

### Via Composer (Recommended)

```bash
composer require swissup/module-breeze-theme-editor
php bin/magento module:enable Swissup_BreezeThemeEditor
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy
php bin/magento cache:flush
```

### Manual Installation

1. Download the module
2. Extract files to `app/code/Swissup/BreezeThemeEditor`
3. Run the following commands:

```bash
php bin/magento module:enable Swissup_BreezeThemeEditor
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy
php bin/magento cache:flush
```

## 🧪 Running Tests

This module includes comprehensive test coverage:
- **Backend Tests:** 25+ PHPUnit tests for PHP code
- **Frontend Tests:** 24 JavaScript tests for UI components

### Backend PHP Tests

**Using Docker (Recommended):**

```bash
cd /path/to/magento/root/src
bin/clinotty bash -c "cd vendor/swissup/module-breeze-theme-editor && ../../bin/phpunit"
```

**Using PHPUnit directly:**

```bash
cd vendor/swissup/module-breeze-theme-editor
../../bin/phpunit
```

**Run specific test file:**

```bash
../../bin/phpunit Test/Unit/Model/Service/CssGeneratorTest.php
```

### Frontend JavaScript Tests

Access the browser-based test runner:

```
http://your-store.com/?jstest=1&autorun=1
```

**URL Parameters:**
- `jstest=1` - Enable test mode
- `autorun=1` - Automatically run all tests on page load
- `suite=<name>` - Run specific test suite only

**For complete testing documentation, see [README-TESTS.md](README-TESTS.md)**

## 📋 Requirements

- Magento 2.4.x or higher
- PHP 7.4, 8.0, 8.1, or 8.2
- Breeze Frontend (v2.0+ for RGB format, v3.0+ for HEX format)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## 📄 License

OSL-3.0

## 💬 Support

- **Documentation:** https://docs.swissuplabs.com/m2/extensions/breeze-theme-editor/
- **Issues:** [GitHub Issues](https://github.com/breezefront/module-breeze-theme-editor/issues)
- **Source Code:** [GitHub Repository](https://github.com/breezefront/module-breeze-theme-editor)

## 🔗 Links

- [Breeze Frontend](https://breezefront.com/) - Lightning-fast Magento 2 theme
- [Swissup Extensions](https://swissuplabs.com/) - Premium Magento extensions
