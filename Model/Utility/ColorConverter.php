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
     * 
     * @param string $hex HEX color code with or without # prefix
     * @return string RGB format "r, g, b"
     */
    public static function hexToRgb(string $hex): string
    {
        // If already RGB format, return as-is
        if (str_contains($hex, ',')) {
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

        // Extract numbers from RGB string
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
        return (bool) preg_match('/^#?[0-9A-Fa-f]{3,6}$/', $value);
    }

    /**
     * Check if string is a valid RGB color
     * 
     * Examples:
     * - "25, 121, 195" → true
     * - "25,121,195" → true
     * - "#1979c3" → false
     * 
     * @param string $value Value to check
     * @return bool True if valid RGB format
     */
    public static function isRgb(string $value): bool
    {
        return (bool) preg_match('/^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$/', $value);
    }
}
