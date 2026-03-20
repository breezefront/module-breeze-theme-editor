<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service\Css;

/**
 * Collects @import stylesheet URLs required by font_picker field values.
 *
 * Only external URLs (http/https) are included — local theme font paths
 * are served via the theme's own @font-face rules and do not need @import.
 * Duplicate URLs are deduplicated in order of first appearance.
 */
class CssFontImportBuilder
{
    public function __construct(
        private CssVariableBuilder $variableBuilder
    ) {}

    /**
     * Collect unique external stylesheet URLs for all font_picker values
     * that differ from their field default.
     *
     * @param array $values   DB rows (section_code / setting_code / value)
     * @param array $fieldMap Built by CssVariableBuilder::buildFieldMap()
     * @param array $config   Full theme configuration (with 'font_palettes' key)
     * @return string[]  Unique stylesheet URLs, in order of first appearance
     */
    public function buildFontImports(array $values, array $fieldMap, array $config = []): array
    {
        $urls = [];

        foreach ($values as $value) {
            $sectionCode = $value['section_code'] ?? '';
            $settingCode = $value['setting_code'] ?? '';
            $rawValue    = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '' || $sectionCode === '_palette') {
                continue;
            }

            $key   = $sectionCode . '.' . $settingCode;
            $field = $fieldMap[$key] ?? null;
            if (!$field || strtolower($field['type'] ?? '') !== 'font_picker') {
                continue;
            }

            // Skip if value equals the field default
            $default = $field['default'] ?? null;
            if ($default !== null && $this->variableBuilder->valuesAreEqual($rawValue, $default)) {
                continue;
            }

            // Palette-role fields carry no inline options — their options live
            // in config['font_palettes'][$paletteId]['options'].
            $paletteId = $field['font_palette'] ?? null;
            $options = $paletteId
                ? ($config['font_palettes'][$paletteId]['options'] ?? [])
                : ($field['options'] ?? []);

            foreach ($options as $option) {
                if (($option['value'] ?? '') !== $rawValue) {
                    continue;
                }
                // Only external URLs get an @import; local paths use @font-face.
                if (!empty($option['url']) && str_starts_with($option['url'], 'http')) {
                    $urls[] = $option['url'];
                }
                break;
            }
        }

        return array_values(array_unique($urls));
    }
}
