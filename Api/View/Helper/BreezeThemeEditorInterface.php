<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\View\Helper;

/**
 * Public contract for the Breeze Theme Editor view helper.
 *
 * Injected as $breezeThemeEditor into every frontend .phtml template
 * via Plugin\TemplateEngine\PhpPlugin (beforeRender).
 *
 * Usage in .phtml:
 *   $breezeThemeEditor?->get('section/setting')
 *   $breezeThemeEditor?->is('section/setting', 'value')
 */
interface BreezeThemeEditorInterface
{
    /**
     * Get the current published value of a theme editor setting.
     *
     * Returns the published value from DB (with scope + theme inheritance),
     * falling back to the default defined in settings.json.
     * Returns null if the setting does not exist at all.
     *
     * @param string $path  'section_code/setting_code'
     */
    public function get(string $path): ?string;

    /**
     * Check whether a theme editor setting equals the given value.
     *
     * @param string $path   'section_code/setting_code'
     * @param string $value  Value to compare against
     */
    public function is(string $path, string $value): bool;
}
