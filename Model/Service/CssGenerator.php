<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;

/**
 * Generate CSS from saved theme values
 */
class CssGenerator
{
    public function __construct(
        private ValueService $valueService,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Generate CSS variables from saved values
     *
     * @param int $themeId
     * @param int $storeId
     * @param string $status 'PUBLISHED' or 'DRAFT'
     * @return string CSS code with :root { ...  }
     */
    public function generate(int $themeId, int $storeId, string $status = 'PUBLISHED'): string
    {
        // Get status ID from StatusProvider
        $statusId = $this->statusProvider->getStatusId($status);

        // Get values using ValueService
        $values = $this->valueService->getValuesByTheme(
            $themeId,
            $storeId,
            $statusId,
            null  // userId - null for published values
        );

        if (empty($values)) {
            return '';
        }

        $css = ":root {\n";

        foreach ($values as $value) {
            // Get CSS variable name from section_code + setting_code
            $cssVar = $this->getCssVarName($value['section_code'], $value['setting_code']);
            $rawValue = $value['value'] ?? null;

            if ($cssVar && $rawValue !== null) {
                // Determine field type from setting_code
                $fieldType = $this->detectFieldType($value['section_code'], $value['setting_code']);

                $formattedValue = $this->formatValue($rawValue, $fieldType);
                $comment = $this->getComment($rawValue, $fieldType);

                $css .= "    $cssVar: $formattedValue;";

                if ($comment) {
                    $css .= "  /* $comment */";
                }

                $css .= "\n";
            }
        }

        $css .= "}\n";

        return $css;
    }

    /**
     * Get CSS variable name from section and setting codes
     *
     * Format: --section-code-setting-code
     * Example: colors + primary → --colors-primary
     *
     * @param string $sectionCode
     * @param string $settingCode
     * @return string
     */
    private function getCssVarName(string $sectionCode, string $settingCode): string
    {
        // Convert to kebab-case
        $section = strtolower(str_replace('_', '-', $sectionCode));
        $setting = strtolower(str_replace('_', '-', $settingCode));

        return "--{$section}-{$setting}";
    }

    /**
     * Detect field type from naming conventions
     *
     * TODO: Replace with actual field type from config. xml metadata
     *
     * @param string $sectionCode
     * @param string $settingCode
     * @return string|null
     */
    private function detectFieldType(string $sectionCode, string $settingCode): ?string
    {
        $setting = strtolower($settingCode);

        // Detect COLOR fields
        if (str_contains($setting, 'color') ||
            str_contains($setting, 'bg') ||
            str_contains($setting, 'background')) {
            return 'COLOR';
        }

        // Detect FONT fields
        if (str_contains($setting, 'font')) {
            return 'FONT_PICKER';
        }

        return null;
    }

    /**
     * Format value based on field type
     *
     * @param mixed $value
     * @param string|null $fieldType
     * @return string
     */
    private function formatValue($value, ?string $fieldType): string
    {
        if (! $fieldType) {
            return $this->escapeValue((string)$value);
        }

        return match ($fieldType) {
            'COLOR' => $this->hexToRgb($value),
            'FONT_PICKER' => $this->formatFont($value),
            'TOGGLE', 'CHECKBOX' => ($value === true || $value === '1' || $value === 1) ? '1' : '0',
            'TEXTAREA' => $this->escapeValue((string)$value),
            default => $this->escapeValue((string)$value)
        };
    }

    /**
     * Escapes potentially unsafe characters in a given string to prevent CSS injection.
     *
     * @param string $value The string value to be escaped.
     * @return string The escaped string with CSS comment markers sanitized.
     */
    private function escapeValue(string $value): string
    {
        // Remove CSS comment markers to prevent injection
        return str_replace(['/*', '*/'], ['/ *', '* /'], $value);
    }

    /**
     * Get comment for CSS variable (e.g.  original HEX for COLOR)
     *
     * @param mixed $value
     * @param string|null $fieldType
     * @return string|null
     */
    private function getComment($value, ?string $fieldType): ?string
    {
        if (!$fieldType) {
            return null;
        }

        return match ($fieldType) {
            'COLOR' => str_starts_with((string)$value, '#') ? (string)$value : null,
            default => null
        };
    }

    /**
     * Convert HEX to RGB (Breeze format:  "255, 0, 0")
     *
     * Breeze uses:  rgb(var(--color-name))
     * So variables MUST be in "R, G, B" format (not #RRGGBB)
     *
     * @param string $hex
     * @return string
     */
    private function hexToRgb(string $hex): string
    {
        if (! str_starts_with($hex, '#')) {
            return $hex;
        }

        $hex = ltrim($hex, '#');

        // Support 3-char hex (#F00 → #FF0000)
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }

    /**
     * Format font family with fallback
     *
     * @param string $font
     * @return string
     */
    private function formatFont(string $font): string
    {
        // Already quoted
        if (str_starts_with($font, '"') || str_starts_with($font, "'")) {
            return $font;
        }

        // Add quotes + fallback
        return '"' . $font . '", sans-serif';
    }
}
