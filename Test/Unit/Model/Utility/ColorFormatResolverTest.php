<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver
 */
class ColorFormatResolverTest extends TestCase
{
    private ColorFormatResolver $resolver;
    private ColorConverter $colorConverter;

    protected function setUp(): void
    {
        $this->colorConverter = new ColorConverter();
        $this->resolver = new ColorFormatResolver($this->colorConverter);
    }

    /**
     * Test Cases for resolve()
     */
    
    /** @test */
    public function it_respects_explicit_rgb_format()
    {
        $result = $this->resolver->resolve('rgb', '#111827');
        $this->assertEquals('rgb', $result);
    }

    /** @test */
    public function it_respects_explicit_hex_format()
    {
        $result = $this->resolver->resolve('hex', 'rgb(17, 24, 39)');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_normalizes_uppercase_format()
    {
        $result = $this->resolver->resolve('RGB', '#111827');
        $this->assertEquals('rgb', $result);
        
        $result = $this->resolver->resolve('HEX', 'rgb(17, 24, 39)');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_auto_detects_rgb_from_default()
    {
        $result = $this->resolver->resolve(null, 'rgb(17, 24, 39)');
        $this->assertEquals('rgb', $result);
        
        $result = $this->resolver->resolve(null, '17, 24, 39');
        $this->assertEquals('rgb', $result);
        
        $result = $this->resolver->resolve(null, 'rgba(17, 24, 39, 0.5)');
        $this->assertEquals('rgb', $result);
    }

    /** @test */
    public function it_auto_detects_hex_from_default()
    {
        $result = $this->resolver->resolve(null, '#111827');
        $this->assertEquals('hex', $result);
        
        $result = $this->resolver->resolve(null, '#fff');
        $this->assertEquals('hex', $result);
        
        $result = $this->resolver->resolve(null, '1979c3');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_defaults_to_hex_for_palette_references()
    {
        $result = $this->resolver->resolve(null, '--color-brand-primary');
        $this->assertEquals('hex', $result);
        
        $result = $this->resolver->resolve(null, '--color-brand-amber-dark');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_defaults_to_hex_when_no_default_provided()
    {
        $result = $this->resolver->resolve(null, null);
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_resolves_auto_format_with_rgb_default()
    {
        $result = $this->resolver->resolve('auto', 'rgb(17, 24, 39)');
        $this->assertEquals('rgb', $result);
    }

    /** @test */
    public function it_resolves_auto_format_with_hex_default()
    {
        $result = $this->resolver->resolve('auto', '#111827');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_resolves_auto_format_with_palette_reference()
    {
        $result = $this->resolver->resolve('auto', '--color-brand-primary');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_resolves_auto_format_without_default_to_hex()
    {
        $result = $this->resolver->resolve('auto', null);
        $this->assertEquals('hex', $result);
    }

    /**
     * Test Cases for isAutoDetectable()
     */
    
    /** @test */
    public function it_detects_rgb_as_auto_detectable()
    {
        $this->assertTrue($this->resolver->isAutoDetectable('rgb(17, 24, 39)'));
        $this->assertTrue($this->resolver->isAutoDetectable('17, 24, 39'));
        $this->assertTrue($this->resolver->isAutoDetectable('rgba(17, 24, 39, 0.5)'));
    }

    /** @test */
    public function it_detects_hex_as_auto_detectable()
    {
        $this->assertTrue($this->resolver->isAutoDetectable('#111827'));
        $this->assertTrue($this->resolver->isAutoDetectable('#fff'));
        $this->assertTrue($this->resolver->isAutoDetectable('1979c3'));
    }

    /** @test */
    public function it_detects_palette_reference_as_auto_detectable()
    {
        $this->assertTrue($this->resolver->isAutoDetectable('--color-brand-primary'));
        $this->assertTrue($this->resolver->isAutoDetectable('--color-brand-amber-dark'));
    }

    /** @test */
    public function it_returns_false_for_null_or_empty()
    {
        $this->assertFalse($this->resolver->isAutoDetectable(null));
        $this->assertFalse($this->resolver->isAutoDetectable(''));
        $this->assertFalse($this->resolver->isAutoDetectable('   '));
    }

    /** @test */
    public function it_returns_false_for_invalid_values()
    {
        $this->assertFalse($this->resolver->isAutoDetectable('invalid'));
        $this->assertFalse($this->resolver->isAutoDetectable('blue'));
        $this->assertFalse($this->resolver->isAutoDetectable('xyz'));  // Invalid hex chars
    }

    /**
     * Test Cases for getFormatFromValue()
     */
    
    /** @test */
    public function it_detects_rgb_format_from_value()
    {
        $this->assertEquals('rgb', $this->resolver->getFormatFromValue('rgb(17, 24, 39)'));
        $this->assertEquals('rgb', $this->resolver->getFormatFromValue('17, 24, 39'));
        $this->assertEquals('rgb', $this->resolver->getFormatFromValue('rgba(17, 24, 39, 0.5)'));
    }

    /** @test */
    public function it_detects_hex_format_from_value()
    {
        $this->assertEquals('hex', $this->resolver->getFormatFromValue('#111827'));
        $this->assertEquals('hex', $this->resolver->getFormatFromValue('#fff'));
        $this->assertEquals('hex', $this->resolver->getFormatFromValue('1979c3'));
    }

    /** @test */
    public function it_detects_palette_format_from_value()
    {
        $this->assertEquals('palette', $this->resolver->getFormatFromValue('--color-brand-primary'));
        $this->assertEquals('palette', $this->resolver->getFormatFromValue('var(--color-brand-primary)'));
        $this->assertEquals('palette', $this->resolver->getFormatFromValue('var(--color-brand-primary-rgb)'));
    }

    /** @test */
    public function it_returns_unknown_for_invalid_values()
    {
        $this->assertEquals('unknown', $this->resolver->getFormatFromValue('invalid'));
        $this->assertEquals('unknown', $this->resolver->getFormatFromValue('blue'));
        $this->assertEquals('unknown', $this->resolver->getFormatFromValue(''));
    }

    /**
     * Integration Tests
     */
    
    /** @test */
    public function it_handles_complex_workflow_rgb_field()
    {
        // Scenario: Field with RGB default, no explicit format
        $default = 'rgb(17, 24, 39)';
        
        // Check if auto-detectable
        $this->assertTrue($this->resolver->isAutoDetectable($default));
        
        // Resolve format
        $resolved = $this->resolver->resolve(null, $default);
        $this->assertEquals('rgb', $resolved);
        
        // Check actual value format
        $valueFormat = $this->resolver->getFormatFromValue('#c87604');
        $this->assertEquals('hex', $valueFormat);
    }

    /** @test */
    public function it_handles_complex_workflow_palette_field()
    {
        // Scenario: Field with palette reference, explicit RGB format
        $format = 'rgb';
        $default = '--color-brand-primary';
        
        // Check if auto-detectable
        $this->assertTrue($this->resolver->isAutoDetectable($default));
        
        // Resolve format (explicit wins)
        $resolved = $this->resolver->resolve($format, $default);
        $this->assertEquals('rgb', $resolved);
        
        // Check actual value format
        $valueFormat = $this->resolver->getFormatFromValue($default);
        $this->assertEquals('palette', $valueFormat);
    }

    /** @test */
    public function it_handles_edge_case_empty_string_default()
    {
        $result = $this->resolver->resolve(null, '');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_handles_edge_case_whitespace_default()
    {
        $result = $this->resolver->resolve(null, '   ');
        $this->assertEquals('hex', $result);
    }

    /** @test */
    public function it_handles_mixed_case_format()
    {
        $this->assertEquals('rgb', $this->resolver->resolve('RgB', null));
        $this->assertEquals('hex', $this->resolver->resolve('HeX', null));
        $this->assertEquals('rgb', $this->resolver->resolve('AUTO', 'rgb(17, 24, 39)'));
    }
}
