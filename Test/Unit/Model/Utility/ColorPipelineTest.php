<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;

/**
 * Unit tests for ColorPipeline facade
 *
 * Verifies that ColorPipeline correctly delegates to ColorFormatResolver
 * and ColorFormatter, and that process() combines both steps.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline
 */
class ColorPipelineTest extends TestCase
{
    private ColorPipeline $pipeline;

    protected function setUp(): void
    {
        $converter = new ColorConverter();
        $formatResolver = new ColorFormatResolver($converter);
        $formatter = new ColorFormatter($converter);
        $this->pipeline = new ColorPipeline($formatResolver, $formatter);
    }

    // -------------------------------------------------------------------------
    // resolveFormat()
    // -------------------------------------------------------------------------

    public function testResolveFormatReturnsHexForHexDefault(): void
    {
        $this->assertSame('hex', $this->pipeline->resolveFormat(null, '#1979c3'));
    }

    public function testResolveFormatReturnsRgbForRgbDefault(): void
    {
        $this->assertSame('rgb', $this->pipeline->resolveFormat(null, '25, 121, 195'));
    }

    public function testResolveFormatRespectsExplicitFormat(): void
    {
        $this->assertSame('rgb', $this->pipeline->resolveFormat('rgb', '#1979c3'));
        $this->assertSame('hex', $this->pipeline->resolveFormat('hex', '25, 121, 195'));
    }

    public function testResolveFormatFallsBackToHexWhenNoDefault(): void
    {
        $this->assertSame('hex', $this->pipeline->resolveFormat(null, null));
    }

    // -------------------------------------------------------------------------
    // format()
    // -------------------------------------------------------------------------

    public function testFormatConvertsHexToRgb(): void
    {
        $this->assertSame('25, 121, 195', $this->pipeline->format('#1979c3', 'rgb'));
    }

    public function testFormatConvertsRgbToHex(): void
    {
        $this->assertSame('#1979c3', $this->pipeline->format('25, 121, 195', 'hex'));
    }

    public function testFormatPreservesPaletteReference(): void
    {
        $this->assertSame('--color-brand-primary', $this->pipeline->format('--color-brand-primary', 'rgb'));
        $this->assertSame('--color-brand-primary', $this->pipeline->format('--color-brand-primary', 'hex'));
    }

    public function testFormatReturnsNullForNull(): void
    {
        $this->assertNull($this->pipeline->format(null, 'rgb'));
        $this->assertNull($this->pipeline->format(null, 'hex'));
    }

    // -------------------------------------------------------------------------
    // process() — combined format detection + conversion
    // -------------------------------------------------------------------------

    public function testProcessAutoDetectsHexDefaultAndFormatsHexValue(): void
    {
        // Default is hex → format resolves to 'hex' → value stays as hex
        $result = $this->pipeline->process('#1979c3', null, '#000000');
        $this->assertSame('#1979c3', $result);
    }

    public function testProcessAutoDetectsRgbDefaultAndConvertsHexValue(): void
    {
        // Default is rgb → format resolves to 'rgb' → hex value converted to rgb
        $result = $this->pipeline->process('#1979c3', null, '25, 121, 195');
        $this->assertSame('25, 121, 195', $result);
    }

    public function testProcessWithExplicitRgbFormatConvertsHex(): void
    {
        $result = $this->pipeline->process('#000000', 'rgb', null);
        $this->assertSame('0, 0, 0', $result);
    }

    public function testProcessWithExplicitHexFormatConvertsRgb(): void
    {
        $result = $this->pipeline->process('0, 0, 0', 'hex', null);
        $this->assertSame('#000000', $result);
    }

    public function testProcessReturnsNullForNullValue(): void
    {
        $this->assertNull($this->pipeline->process(null, null, '#ffffff'));
    }

    public function testProcessPreservesPaletteReference(): void
    {
        $result = $this->pipeline->process('--color-brand-primary', 'rgb', null);
        $this->assertSame('--color-brand-primary', $result);
    }

    // -------------------------------------------------------------------------
    // detect()
    // -------------------------------------------------------------------------

    public function testDetectIdentifiesHex(): void
    {
        $this->assertSame('hex', $this->pipeline->detect('#1979c3'));
        $this->assertSame('hex', $this->pipeline->detect('#fff'));
    }

    public function testDetectIdentifiesRgb(): void
    {
        $this->assertSame('rgb', $this->pipeline->detect('25, 121, 195'));
        $this->assertSame('rgb', $this->pipeline->detect('rgb(25, 121, 195)'));
    }

    public function testDetectIdentifiesPaletteReference(): void
    {
        $this->assertSame('palette', $this->pipeline->detect('--color-brand-primary'));
        $this->assertSame('palette', $this->pipeline->detect('var(--color-brand-primary)'));
    }

    public function testDetectReturnsUnknownForInvalidValue(): void
    {
        $this->assertSame('unknown', $this->pipeline->detect('not-a-color'));
    }
}
