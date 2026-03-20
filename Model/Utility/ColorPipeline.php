<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

/**
 * Color Pipeline — facade over ColorFormatResolver + ColorFormatter
 *
 * Combines format resolution and value formatting into a single service
 * to reduce constructor dependencies in resolvers that need both operations.
 *
 * Usage (typical resolver case):
 *   $value = $this->colorPipeline->process($currentValue, $setting['format'] ?? null, $setting['default'] ?? null);
 *
 * Individual operations are also accessible when only one step is needed:
 *   $format  = $this->colorPipeline->resolveFormat($configFormat, $defaultValue);
 *   $value   = $this->colorPipeline->format($value, $format);
 *   $detected = $this->colorPipeline->detect($value);
 */
class ColorPipeline
{
    public function __construct(
        private readonly ColorFormatResolver $formatResolver,
        private readonly ColorFormatter $formatter
    ) {}

    /**
     * Resolve color format from config and default value.
     *
     * Delegates to ColorFormatResolver::resolve().
     * Always returns 'rgb' or 'hex', never null or 'auto'.
     *
     * @param string|null $configFormat Explicit format from field config ('rgb', 'hex', 'auto', or null)
     * @param string|null $defaultValue Default value for auto-detection
     * @return string Resolved format: 'rgb' or 'hex'
     */
    public function resolveFormat(?string $configFormat, ?string $defaultValue): string
    {
        return $this->formatResolver->resolve($configFormat, $defaultValue);
    }

    /**
     * Format a color value to the given format.
     *
     * Delegates to ColorFormatter::formatColorValue().
     *
     * @param string|null $value Color value to format
     * @param string $format Target format: 'rgb' or 'hex'
     * @return string|null Formatted value or null for null/empty input
     */
    public function format(?string $value, string $format): ?string
    {
        return $this->formatter->formatColorValue($value, $format);
    }

    /**
     * Resolve format and format value in one call.
     *
     * This is the main entry point for color processing in resolvers.
     * Equivalent to:
     *   $format = $this->resolveFormat($configFormat, $defaultValue);
     *   return $this->format($value, $format);
     *
     * @param string|null $value Current color value
     * @param string|null $configFormat Explicit format from field config or null
     * @param string|null $defaultValue Default value for auto-detection
     * @return string|null Formatted color value or null
     */
    public function process(?string $value, ?string $configFormat, ?string $defaultValue): ?string
    {
        $format = $this->formatResolver->resolve($configFormat, $defaultValue);
        return $this->formatter->formatColorValue($value, $format);
    }

    /**
     * Detect format of an actual color value.
     *
     * Delegates to ColorFormatResolver::getFormatFromValue().
     * Returns 'rgb', 'hex', 'palette', or 'unknown'.
     *
     * @param string $value Color value to analyze
     * @return string Detected format
     */
    public function detect(string $value): string
    {
        return $this->formatResolver->getFormatFromValue($value);
    }
}
