<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssFontImportBuilder;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Orchestrates CSS generation from saved theme values.
 *
 * Delegates formatting and data-building to specialised helpers:
 * - CssVariableBuilder  — field map, selector blocks, palette vars
 * - CssFontImportBuilder — @import URLs for web fonts
 *
 * This class owns the final assembly: renderCss() and processPaletteColor().
 */
class CssGenerator
{
    public const EMPTY_CSS_OUTPUT = ":root {\n}\n";

    public function __construct(
        private ValueInheritanceResolver $valueInheritanceResolver,
        private StatusProvider $statusProvider,
        private ConfigProvider $configProvider,
        private CssVariableBuilder $variableBuilder,
        private CssFontImportBuilder $fontImportBuilder
    ) {}

    /**
     * Generate CSS variables from saved values.
     *
     * @param int $themeId
     * @param ScopeInterface $scope
     * @param string $status 'PUBLISHED' or 'DRAFT'
     * @return string CSS code with :root { ... }
     */
    public function generate(int $themeId, ScopeInterface $scope, string $status = StatusCode::PUBLISHED): string
    {
        $statusId = $this->statusProvider->getStatusId($status);

        // For DRAFT: merge published values (base) + draft overrides so that fields
        // without a draft row are still rendered using the published value.
        if ($status === StatusCode::DRAFT) {
            $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);
            $values = $this->valueInheritanceResolver->resolveAllValuesWithFallback(
                $themeId,
                $scope,
                $statusId,
                $publishedStatusId,
                null
            );
        } else {
            $values = $this->valueInheritanceResolver->resolveAllValues($themeId, $scope, $statusId, null);
        }

        $config   = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fieldMap = $this->variableBuilder->buildFieldMap($config['sections'] ?? []);

        $paletteVarsToEmit = $this->variableBuilder->buildPaletteVarsToEmit($values, $config, $fieldMap);
        $selectorBlocks    = empty($values) ? [] : $this->variableBuilder->buildSelectorBlocks($values, $fieldMap);
        $fontImports       = $this->fontImportBuilder->buildFontImports($values, $fieldMap, $config);

        return $this->renderCss($paletteVarsToEmit, $selectorBlocks, $fontImports);
    }

    /**
     * Generate CSS from a values map (used by publication/changelog flows).
     *
     * @param int $themeId
     * @param array $valuesMap  Map of 'section.setting' => 'value'
     * @return string
     */
    public function generateFromValuesMap(int $themeId, array $valuesMap): string
    {
        $config   = $this->configProvider->getConfigurationWithInheritance($themeId);
        $fieldMap = $this->variableBuilder->buildFieldMap($config['sections'] ?? []);

        // Convert valuesMap to the same row format used by generate()
        $values = [];
        foreach ($valuesMap as $key => $value) {
            $parts = explode('.', $key, 2);
            if (count($parts) === 2) {
                $values[] = [
                    'section_code' => $parts[0],
                    'setting_code' => $parts[1],
                    'value'        => $value
                ];
            }
        }

        $paletteVarsToEmit = $this->variableBuilder->buildPaletteVarsToEmit($values, $config, $fieldMap);
        $selectorBlocks    = empty($values) ? [] : $this->variableBuilder->buildSelectorBlocks($values, $fieldMap);
        $fontImports       = $this->fontImportBuilder->buildFontImports($values, $fieldMap, $config);

        return $this->renderCss($paletteVarsToEmit, $selectorBlocks, $fontImports);
    }

    /**
     * Render the final CSS string from pre-built data structures.
     *
     * Output order:
     *   1. @import rules for web fonts (if any), followed by a blank line
     *   2. :root block — palette vars, then root-scoped field vars
     *   3. Additional selector blocks in insertion order
     *
     * @param array $paletteVarsToEmit  cssVar => rawHexValue
     * @param array $selectorBlocks     selector => [lines]
     * @param array $fontImports        External stylesheet URLs
     * @return string
     */
    private function renderCss(array $paletteVarsToEmit, array $selectorBlocks, array $fontImports = []): string
    {
        $rootLines = [];

        if (!empty($paletteVarsToEmit)) {
            foreach ($paletteVarsToEmit as $cssVar => $rawValue) {
                $rootLines[] = $this->processPaletteColor($cssVar, $rawValue);
            }
            $rootLines[] = "\n";
        }

        foreach ($selectorBlocks[':root'] ?? [] as $line) {
            $rootLines[] = $line;
        }

        $css = '';

        foreach ($fontImports as $url) {
            $css .= "@import url('" . addslashes($url) . "');\n";
        }
        if (!empty($fontImports)) {
            $css .= "\n";
        }

        $css .= ":root {\n" . implode('', $rootLines) . "}\n";

        foreach ($selectorBlocks as $selector => $lines) {
            if ($selector === ':root') {
                continue;
            }
            $css .= "$selector {\n" . implode('', $lines) . "}\n";
        }

        return $css;
    }

    /**
     * Generate CSS lines for a single palette color variable.
     *
     * Always emits both the HEX variant and the -rgb variant. The Breeze base
     * CSS defines the HEX variable but NOT the -rgb variant, so omitting it
     * would leave any field referencing var(--color-brand-*-rgb) undefined.
     *
     * @param string $cssVar   CSS variable name (e.g. --color-brand-primary)
     * @param string $rawValue Raw color value from the database
     * @return string Two CSS lines (HEX + RGB)
     */
    private function processPaletteColor(string $cssVar, string $rawValue): string
    {
        // Convert legacy RGB strings to HEX
        if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $rawValue)) {
            $rawValue = ColorConverter::rgbToHex($rawValue);
        }

        $hexValue = $rawValue;
        $rgbValue = ColorConverter::hexToRgb($hexValue);

        $label = str_replace('--color-brand-', '', $cssVar);
        $label = ucwords(str_replace('-', ' ', $label));

        $css  = "    $cssVar: $hexValue;  /* Palette: $label */\n";
        $css .= "    $cssVar-rgb: $rgbValue;  /* Palette: $label (RGB) */\n";

        return $css;
    }

    /**
     * Check if CSS string contains real content (custom CSS variables).
     *
     * Returns false for empty strings and for the empty :root block produced
     * when no theme values are saved.
     */
    public static function hasRealCssContent(string $css): bool
    {
        return !empty($css)
            && $css !== self::EMPTY_CSS_OUTPUT
            && str_contains($css, '--');
    }
}
