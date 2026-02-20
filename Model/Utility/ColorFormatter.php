<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Color value formatter utility
 * 
 * Formats color values based on desired output format (HEX or RGB).
 * Used by GraphQL resolvers and CSS generator to ensure consistent color format output.
 * 
 * Features:
 * - Converts HEX to RGB and vice versa
 * - Preserves palette references (--color-*)
 * - Preserves CSS var() wrappers
 * - Normalizes short HEX format (#FFF → #FFFFFF)
 * - Handles null/empty values gracefully
 * - Falls back to original value on error
 * 
 * @see ColorConverter for low-level conversion methods
 * @see ColorFormatResolver for format detection
 */
class ColorFormatter
{
    /**
     * @var ColorConverter
     */
    private ColorConverter $colorConverter;

    /**
     * Constructor
     *
     * @param ColorConverter $colorConverter
     */
    public function __construct(ColorConverter $colorConverter)
    {
        $this->colorConverter = $colorConverter;
    }

    /**
     * Format color value based on desired format
     * 
     * Converts color values between HEX and RGB formats while preserving
     * special values like palette references and CSS variables.
     * 
     * Examples:
     * - formatColorValue("#000000", "rgb") → "0, 0, 0"
     * - formatColorValue("107, 33, 168", "hex") → "#6b21a8"
     * - formatColorValue("--color-brand-primary", "rgb") → "--color-brand-primary" (preserved)
     * - formatColorValue("#FFF", "rgb") → "255, 255, 255" (normalized and converted)
     * - formatColorValue("#6b21a8", "hex") → "#6b21a8" (no conversion needed)
     * 
     * Edge cases handled:
     * - null/empty → returns null
     * - Palette references (--color-*) → preserved unchanged
     * - CSS var() wrappers → preserved unchanged
     * - Short HEX (#FFF) → normalized before conversion
     * - Invalid colors → returns original value (fallback)
     * - Same format → returns unchanged (optimization)
     *
     * @param string|null $value Color value (HEX, RGB, palette ref, or var())
     * @param string $format Desired format ('hex' or 'rgb')
     * @return string|null Formatted color value or null
     */
    public function formatColorValue(?string $value, string $format): ?string
    {
        // Handle null or empty values
        if (empty($value)) {
            return null;
        }

        $value = trim($value);
        
        if (empty($value)) {
            return null;
        }

        // Preserve palette references (e.g., --color-brand-primary)
        // These are used as-is and should not be converted
        if (str_starts_with($value, '--color-')) {
            return $value;
        }

        // Preserve CSS var() wrappers (e.g., var(--color-test))
        // These reference other variables and should not be converted
        if (str_starts_with($value, 'var(')) {
            return $value;
        }

        // Normalize format parameter to lowercase
        $format = strtolower($format);

        // Detect current format of the value
        $isHex = $this->colorConverter::isHex($value);
        $isRgb = $this->colorConverter::isRgb($value);

        // If neither HEX nor RGB, return original value (fallback for invalid colors)
        if (!$isHex && !$isRgb) {
            return $value;
        }

        // Normalize short HEX format before conversion (#FFF → #FFFFFF)
        if ($isHex && strlen($value) === 4 && str_starts_with($value, '#')) {
            $value = $this->colorConverter::normalizeHex($value);
        }

        // If value is already in the desired format, return unchanged (optimization)
        if (($isHex && $format === 'hex') || ($isRgb && $format === 'rgb')) {
            return $value;
        }

        // Convert based on desired format
        try {
            if ($format === 'rgb' && $isHex) {
                // HEX → RGB conversion
                return $this->colorConverter::hexToRgb($value);
            } elseif ($format === 'hex' && $isRgb) {
                // RGB → HEX conversion
                return $this->colorConverter::rgbToHex($value);
            }
        } catch (\Exception $e) {
            // On conversion failure, return original value as fallback
            return $value;
        }

        // Fallback: return original value if no conversion applied
        return $value;
    }
}
