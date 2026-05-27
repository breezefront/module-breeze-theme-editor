<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Resolves media query aliases to full CSS media query strings.
 *
 * Supported aliases:
 *   mobile  → (max-width: 767px)
 *   tablet  → (max-width: 1023px)
 *   desktop → (min-width: 1024px)
 *
 * Raw query strings (anything not matching an alias) are passed through as-is.
 * Null or empty string returns null.
 */
class MediaQueryResolver
{
    /**
     * Built-in alias map.
     */
    private const ALIASES = [
        'mobile'  => '(max-width: 767px)',
        'tablet'  => '(max-width: 1023px)',
        'desktop' => '(min-width: 1024px)',
    ];

    /**
     * Resolve a media value from settings.json to a full CSS media query string.
     *
     * @param string|null $media Alias (e.g. 'mobile') or raw query (e.g. '(max-width: 768px)')
     * @return string|null       Full media query string, or null if absent
     */
    public function resolve(?string $media): ?string
    {
        if ($media === null || $media === '') {
            return null;
        }

        return self::ALIASES[$media] ?? $media;
    }

    /**
     * Return the full alias map (for documentation / introspection).
     *
     * @return array<string, string>
     */
    public function getAliases(): array
    {
        return self::ALIASES;
    }

    /**
     * Required by Magento compiled DI.
     *
     * @param array $array
     * @return static
     */
    public static function __set_state(array $array): static
    {
        return new static();
    }
}
