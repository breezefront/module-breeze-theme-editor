<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Color Format Resolver
 * 
 * Centralizes logic for resolving color format ('rgb' or 'hex') from configuration
 * and default values. Used by CSS generator and GraphQL resolvers to ensure
 * consistent format detection across the module.
 * 
 * Logic Flow:
 * 1. If format explicitly specified in config → use it (respect developer choice)
 * 2. If no format but has default value → auto-detect from default
 * 3. If palette reference (--color-*) → default to 'hex' (most common)
 * 4. If RGB format detected → return 'rgb'
 * 5. Otherwise → return 'hex' (fallback)
 * 
 * Examples:
 * - resolve(null, 'rgb(17, 24, 39)') → 'rgb'
 * - resolve(null, '#111827') → 'hex'
 * - resolve(null, '--color-brand-primary') → 'hex'
 * - resolve('rgb', '#111827') → 'rgb' (explicit wins)
 * - resolve(null, null) → 'hex' (fallback)
 */
class ColorFormatResolver
{
    /**
     * @param ColorConverter $colorConverter Color conversion utility
     */
    public function __construct(
        private readonly ColorConverter $colorConverter
    ) {}

    /**
     * Resolve color format from configuration and default value
     * 
     * Auto-detects format from default value if not explicitly specified.
     * Always returns concrete format ('rgb' or 'hex'), never 'auto' or null.
     * 
     * @param string|null $format Explicit format from config ('rgb', 'hex', 'auto', or null)
     * @param string|null $defaultValue Default value for auto-detection
     * @return string Resolved format: 'rgb' or 'hex'
     */
    public function resolve(?string $format, ?string $defaultValue): string
    {
        // Step 1: Determine initial format
        if ($format === null) {
            // No explicit format - decide between 'auto' or 'hex' fallback
            $format = ($defaultValue !== null) ? 'auto' : 'hex';
        }
        
        $format = strtolower($format);
        
        // Step 2: Resolve 'auto' to concrete format
        if ($format === 'auto') {
            if ($defaultValue !== null) {
                // Check if it's a palette reference (starts with --)
                if (str_starts_with($defaultValue, '--')) {
                    // Palette references adapt to context - default to hex (Breeze 3.0)
                    return 'hex';
                }
                
                // Check if it's RGB format using ColorConverter
                if ($this->colorConverter->isRgb($defaultValue)) {
                    return 'rgb';
                }
            }
            
            // Fallback to hex for auto-detection
            return 'hex';
        }
        
        // Step 3: Return explicit format (already normalized to lowercase)
        return $format;
    }

    /**
     * Check if format can be auto-detected from default value
     * 
     * Returns true if default value is a recognizable color format
     * (RGB, HEX, or palette reference) that can be used for format detection.
     * 
     * Examples:
     * - isAutoDetectable('rgb(17, 24, 39)') → true
     * - isAutoDetectable('#111827') → true
     * - isAutoDetectable('--color-brand-primary') → true
     * - isAutoDetectable(null) → false
     * - isAutoDetectable('invalid') → false
     * 
     * @param string|null $defaultValue Default value to check
     * @return bool True if format is detectable
     */
    public function isAutoDetectable(?string $defaultValue): bool
    {
        if ($defaultValue === null || trim($defaultValue) === '') {
            return false;
        }
        
        // Palette reference - detectable
        if (str_starts_with($defaultValue, '--')) {
            return true;
        }
        
        // Check if it's valid RGB or HEX format
        return $this->colorConverter->isRgb($defaultValue) 
            || $this->colorConverter->isHex($defaultValue);
    }

    /**
     * Determine format from actual color value
     * 
     * Analyzes color value and returns detected format.
     * Unlike resolve(), this works with actual values (not defaults)
     * and can return 'unknown' for unrecognized formats.
     * 
     * Examples:
     * - getFormatFromValue('rgb(17, 24, 39)') → 'rgb'
     * - getFormatFromValue('17, 24, 39') → 'rgb'
     * - getFormatFromValue('#111827') → 'hex'
     * - getFormatFromValue('--color-brand-primary') → 'palette'
     * - getFormatFromValue('var(--color-brand-primary)') → 'palette'
     * - getFormatFromValue('invalid') → 'unknown'
     * 
     * @param string $value Color value to analyze
     * @return string Detected format: 'rgb', 'hex', 'palette', or 'unknown'
     */
    public function getFormatFromValue(string $value): string
    {
        $value = trim($value);
        
        // Check for palette reference
        if (str_starts_with($value, '--') || str_starts_with($value, 'var(--')) {
            return 'palette';
        }
        
        // Check for RGB format
        if ($this->colorConverter->isRgb($value)) {
            return 'rgb';
        }
        
        // Check for HEX format
        if ($this->colorConverter->isHex($value)) {
            return 'hex';
        }
        
        // Unknown/invalid format
        return 'unknown';
    }
}
