<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Guards for values that end up inside the inline <style> block on the storefront.
 */
class CssSafety
{
    /**
     * True when the value contains something an HTML parser reads as a tag,
     * comment or CDATA start (e.g. "</style>", "<script", "<!--").
     */
    public static function containsMarkup(string $value): bool
    {
        return (bool) preg_match('~<[/!?a-z]~i', $value);
    }

    /**
     * Property value that cannot close the declaration or the rule it sits in.
     */
    public static function isSafeDeclarationValue(string $value): bool
    {
        return !self::containsMarkup($value) && !preg_match('~[{};]~', $value);
    }

    /**
     * Custom property name emitted as a declaration key, e.g. "--color-brand-primary".
     */
    public static function isValidCssVariableName(string $name): bool
    {
        return (bool) preg_match('~^--[A-Za-z0-9_-]+$~', $name);
    }

    /**
     * Palette value as stored by the palette mutation: "#rrggbb" or "r, g, b".
     */
    public static function isValidPaletteValue(string $value): bool
    {
        return (bool) preg_match('~^(#[0-9a-fA-F]{3,8}|\d{1,3},\s*\d{1,3},\s*\d{1,3})$~', $value);
    }

    /**
     * Make the markup start sequences harmless inside a stylesheet ("<" becomes the CSS escape \3c).
     */
    public static function neutralizeMarkup(string $css): string
    {
        return (string) preg_replace('~<(?=[/!?a-z])~i', '\\3c ', $css);
    }
}
