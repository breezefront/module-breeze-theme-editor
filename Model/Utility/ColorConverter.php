<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Color format converter utility
 * 
 * Provides conversion methods between HEX and RGB color formats.
 * Used throughout the theme editor for color value transformations.
 */
class ColorConverter
{
    /**
     * Convert HEX to RGB string (Breeze 2.0 format)
     * 
     * Examples:
     * - "#1979c3" → "25, 121, 195"
     * - "#fff" → "255, 255, 255"
     * - "1979c3" → "25, 121, 195"
     * - "rgb(25, 121, 195)" → "25, 121, 195"
     * - "rgba(25, 121, 195, 0.5)" → "25, 121, 195" (alpha stripped)
     * 
     * @param string $hex HEX color code with or without # prefix
     * @return string RGB format "r, g, b"
     */
    public static function hexToRgb(string $hex): string
    {
        // If already RGB format, normalize and return
        if (str_contains($hex, ',')) {
            // Strip rgb() or rgba() wrapper if present
            if (preg_match('/^rgba?\((.+)\)$/i', $hex, $matches)) {
                // Extract RGB values (ignore alpha if rgba)
                $rgb = $matches[1];
                $parts = preg_split('/\s*,\s*/', trim($rgb));
                // Return first 3 components: "17, 24, 39, 0.5" → "17, 24, 39"
                return implode(', ', array_slice($parts, 0, 3));
            }
            // Already clean format "17, 24, 39"
            return $hex;
        }

        // If doesn't start with #, try to add it
        if (!str_starts_with($hex, '#')) {
            // Check if it's a valid hex string without #
            if (!preg_match('/^[0-9A-Fa-f]{3,6}$/', $hex)) {
                return $hex; // Invalid format, return as-is
            }
            $hex = '#' . $hex;
        }

        $hex = ltrim($hex, '#');

        // Handle 3-character hex colors (#fff → #ffffff)
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }

        // Handle 8-character hex (strip alpha channel, e.g. #rrggbbaa → #rrggbb)
        if (strlen($hex) === 8) {
            $hex = substr($hex, 0, 6);
        }

        // Validate length
        if (strlen($hex) !== 6) {
            return '0, 0, 0'; // Invalid HEX
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        return "$r, $g, $b";
    }

    /**
     * Convert RGB string to HEX format (Breeze 3.0 format)
     * 
     * Examples:
     * - "25, 121, 195" → "#1979c3"
     * - "25,121,195" → "#1979c3"
     * - "rgb(25, 121, 195)" → "#1979c3"
     * - "rgba(25, 121, 195, 0.5)" → "#1979c3" (alpha ignored)
     * - "255, 255, 255" → "#ffffff"
     * 
     * @param string $rgb RGB format "r, g, b" with or without spaces
     * @return string HEX format "#rrggbb" (lowercase)
     */
    public static function rgbToHex(string $rgb): string
    {
        // If already HEX, normalize and return
        if (str_starts_with($rgb, '#')) {
            return self::normalizeHex($rgb);
        }

        // Strip rgb() or rgba() wrapper if present
        if (preg_match('/^rgba?\((.+)\)$/i', $rgb, $matches)) {
            $rgb = $matches[1];
        }

        // Extract numbers from RGB string (ignore alpha channel if present)
        $parts = array_map('intval', preg_split('/\s*,\s*/', trim($rgb)));
        
        if (count($parts) < 3) {
            return '#000000';
        }
        
        return self::rgbArrayToHex($parts[0], $parts[1], $parts[2]);
    }

    /**
     * Convert RGB integer values to HEX
     * 
     * Examples:
     * - (25, 121, 195) → "#1979c3"
     * - (255, 0, 0) → "#ff0000"
     * 
     * @param int $r Red component (0-255)
     * @param int $g Green component (0-255)
     * @param int $b Blue component (0-255)
     * @return string HEX format "#rrggbb" (lowercase)
     */
    public static function rgbArrayToHex(int $r, int $g, int $b): string
    {
        // Clamp values to 0-255 range
        $r = max(0, min(255, $r));
        $g = max(0, min(255, $g));
        $b = max(0, min(255, $b));
        
        return sprintf('#%02x%02x%02x', $r, $g, $b);
    }

    /**
     * Normalize HEX color format
     * 
     * - Adds # prefix if missing
     * - Expands 3-char shorthand to 6-char (#fff → #ffffff)
     * - Converts to lowercase
     * 
     * Examples:
     * - "fff" → "#ffffff"
     * - "#FFF" → "#ffffff"
     * - "1979c3" → "#1979c3"
     * - "#1979C3" → "#1979c3"
     * 
     * @param string $hex HEX color with or without #
     * @return string Normalized HEX "#rrggbb" (lowercase)
     */
    public static function normalizeHex(string $hex): string
    {
        $hex = ltrim($hex, '#');
        
        // Expand 3-char to 6-char
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        return '#' . strtolower($hex);
    }

    /**
     * Convert 8-digit HEX color (#rrggbbaa) to rgba() CSS string.
     *
     * Examples:
     * - "#1979c380" → "rgba(25, 121, 195, 0.502)"
     * - "#ff000000" → "rgba(255, 0, 0, 0)"
     * - "#ffffffff" → "rgba(255, 255, 255, 1)"
     *
     * Returns null if the value is not a valid 8-digit HEX.
     *
     * @param string $hex Color string — with or without # prefix, must be 8 hex digits
     * @return string|null rgba() string or null if not HEX8
     */
    public static function hex8ToRgba(string $hex): ?string
    {
        $body = ltrim($hex, '#');
        if (strlen($body) !== 8 || !ctype_xdigit($body)) {
            return null;
        }

        $r = hexdec(substr($body, 0, 2));
        $g = hexdec(substr($body, 2, 2));
        $b = hexdec(substr($body, 4, 2));
        $a = round(hexdec(substr($body, 6, 2)) / 255, 3);

        return "rgba($r, $g, $b, $a)";
    }

    /**
     * Check if string is a valid HEX color
     * 
     * Examples:
     * - "#1979c3" → true
     * - "#fff" → true
     * - "1979c3" → true
     * - "25, 121, 195" → false
     * 
     * @param string $value Value to check
     * @return bool True if valid HEX format
     */
    public static function isHex(string $value): bool
    {
        return (bool) preg_match('/^#?(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/', $value);
    }

    /**
     * Check if string is a valid RGB color
     * 
     * Examples:
     * - "25, 121, 195" → true
     * - "25,121,195" → true
     * - "rgb(25, 121, 195)" → true
     * - "rgba(25, 121, 195, 0.5)" → true
     * - "#1979c3" → false
     * 
     * @param string $value Value to check
     * @return bool True if valid RGB format
     */
    public static function isRgb(string $value): bool
    {
        // Strip rgb() or rgba() wrapper if present
        $normalized = preg_replace('/^rgba?\((.+)\)$/i', '$1', trim($value));
        
        // Check if it's valid RGB format (with optional alpha)
        return (bool) preg_match('/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*[\d.]+)?$/', $normalized);
    }
}
