<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

/**
 * Generate CSS from saved theme values
 */
class CssGenerator
{
    public function __construct(
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private ConfigProvider $configProvider
    ) {}

    /**
     * Generate CSS variables from saved values
     *
     * @param int $themeId
     * @param int $storeId
     * @param string $status 'PUBLISHED' or 'DRAFT'
     * @return string CSS code with :root { ... }
     */
    public function generate(int $themeId, int $storeId, string $status = 'PUBLISHED'): string
    {
        $statusId = $this->statusProvider->getStatusId($status);
        $values = $this->valueService->getValuesByTheme($themeId, $storeId, $statusId, null);

        if (empty($values)) {
            return '';
        }

        // Get config WITH inheritance
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $sections = $config['sections'] ?? [];

        // Build field lookup map:  section.setting → field config
        $fieldMap = [];
        foreach ($sections as $section) {
            foreach ($section['settings'] ??  [] as $setting) {
                $key = $section['id'] . '.' . $setting['id'];
                $fieldMap[$key] = $setting;
            }
        }

        $css = ":root {\n";

        foreach ($values as $value) {
            $sectionCode = $value['section_code'];
            $settingCode = $value['setting_code'];
            $rawValue = $value['value'] ?? null;

            if ($rawValue === null || $rawValue === '') {
                continue;
            }

            // Lookup field in map
            $key = $sectionCode . '.' . $settingCode;
            $field = $fieldMap[$key] ?? null;

            if (!$field) {
                continue;
            }

            $cssVar = $field['css_var'] ?? null;

            if (!$cssVar) {
                continue;
            }

            $fieldType = $field['type'] ?? null;
            $formattedValue = $this->formatValue($rawValue, $fieldType);
            $comment = $this->getComment($rawValue, $fieldType);

            $css .= "    $cssVar: $formattedValue;";
            if ($comment) {
                $css .= "  /* $comment */";
            }
            $css .= "\n";
        }

        $css .= "}\n";

        return $css;
    }

    /**
     * Format value based on field type
     */
    private function formatValue($value, ?string $fieldType): string
    {
        if (! $fieldType) {
            return (string)$value;
        }

        $fieldType = strtolower($fieldType);

        return match ($fieldType) {
            'color' => $this->hexToRgb($value),
            'font_picker' => $this->formatFont($value),
            'toggle', 'checkbox' => ($value === true || $value === '1' || $value === 1) ? '1' : '0',
            default => (string)$value
        };
    }

    /**
     * Get comment for CSS variable
     */
    private function getComment($value, ?string $fieldType): ?string
    {
        if (!$fieldType) {
            return null;
        }

        $fieldType = strtolower($fieldType);

        return match ($fieldType) {
            'color' => str_starts_with((string)$value, '#') ? (string)$value : null,
            default => null
        };
    }

    /**
     * Convert HEX to RGB (Breeze format: "255, 0, 0")
     */
    private function hexToRgb(string $hex): string
    {
        if (! str_starts_with($hex, '#')) {
            return $hex;
        }

        $hex = ltrim($hex, '#');

        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] .  $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }

    /**
     * Format font family with fallback
     */
    private function formatFont(string $font): string
    {
        if (str_starts_with($font, '"') || str_starts_with($font, "'")) {
            return $font;
        }

        return '"' . $font . '", sans-serif';
    }
}
