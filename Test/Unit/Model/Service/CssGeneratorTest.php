<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;

/**
 * Unit tests for CssGenerator service
 * 
 * Tests dual format palette generation and smart mapping functionality
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Service\CssGenerator
 */
class CssGeneratorTest extends TestCase
{
    private CssGenerator $cssGenerator;
    private ValueService $valueServiceMock;
    private StatusProvider $statusProviderMock;
    private ConfigProvider $configProviderMock;
    private ColorFormatResolver $colorFormatResolverMock;
    
    protected function setUp(): void
    {
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->colorFormatResolverMock = $this->createMock(ColorFormatResolver::class);
        
        $this->cssGenerator = new CssGenerator(
            $this->valueServiceMock,
            $this->statusProviderMock,
            $this->configProviderMock,
            $this->colorFormatResolverMock
        );
    }
    
    /**
     * Test 1: Should generate both HEX and RGB formats for palette colors
     */
    public function testGeneratesBothHexAndRgbFormatsForPaletteColors(): void
    {
        // Setup: Mock palette color values
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-amber-dark',
                'value' => '#c87604'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        [
                            'id' => '--color-brand-amber-dark',
                            'css_var' => '--color-brand-amber-dark',
                            'default' => '#000000'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Both HEX and RGB variants are generated
        $this->assertStringContainsString(
            '--color-brand-amber-dark: #c87604;',
            $css,
            'Should generate HEX format for palette color'
        );
        
        $this->assertStringContainsString(
            '--color-brand-amber-dark-rgb: 200, 118, 4;',
            $css,
            'Should generate RGB format for palette color'
        );
    }
    
    /**
     * Test 2: Should include descriptive comments for palette colors
     */
    public function testIncludesDescriptiveCommentsForPaletteColors(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        [
                            'id' => '--color-brand-primary',
                            'css_var' => '--color-brand-primary',
                            'default' => '#000000'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Comments are included
        $this->assertStringContainsString(
            '/* Palette:',
            $css,
            'Should include palette comment'
        );
    }
    
    /**
     * Test 3: Should generate multiple palette colors with both formats
     */
    public function testGeneratesMultiplePaletteColorsWithBothFormats(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-secondary',
                'value' => '#ff5733'
            ],
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-tertiary',
                'value' => '#33ff57'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000'],
                        ['id' => '--color-brand-secondary', 'css_var' => '--color-brand-secondary', 'default' => '#000000'],
                        ['id' => '--color-brand-tertiary', 'css_var' => '--color-brand-tertiary', 'default' => '#000000']
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: All colors generated in both formats
        $this->assertStringContainsString('--color-brand-primary: #1979c3', $css);
        $this->assertStringContainsString('--color-brand-primary-rgb: 25, 121, 195', $css);
        $this->assertStringContainsString('--color-brand-secondary: #ff5733', $css);
        $this->assertStringContainsString('--color-brand-secondary-rgb: 255, 87, 51', $css);
        $this->assertStringContainsString('--color-brand-tertiary: #33ff57', $css);
        $this->assertStringContainsString('--color-brand-tertiary-rgb: 51, 255, 87', $css);
    }
    
    /**
     * Test 4: Should handle field with format: "hex" referencing palette (smart mapping)
     */
    public function testSmartMappingForHexFormatFields(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => 'buttons',
                'setting_code' => 'button_primary_bg',
                'value' => '--color-brand-primary'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        [
                            'id' => 'button_primary_bg',
                            'css_var' => '--button-primary-bg',
                            'type' => 'color',
                            'format' => 'hex',  // HEX format
                            'default' => '#cccccc'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Field maps to base palette variable (no -rgb suffix)
        $this->assertStringContainsString(
            '--button-primary-bg: var(--color-brand-primary);',
            $css,
            'Field with format:hex should map to base palette variable'
        );
    }
    
    /**
     * Test 5: Should handle field with format: "rgb" referencing palette (smart mapping)
     */
    public function testSmartMappingForRgbFormatFields(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'base_color',
                'value' => '--color-brand-primary'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'base_color',
                            'css_var' => '--base-color',
                            'type' => 'color',
                            'format' => 'rgb',  // RGB format
                            'default' => '#ffffff'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        // Mock ColorFormatResolver to return 'rgb' (explicit format)
        $this->colorFormatResolverMock
            ->expects($this->once())
            ->method('resolve')
            ->with('rgb', '#ffffff')
            ->willReturn('rgb');
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Field maps to -rgb palette variant
        $this->assertStringContainsString(
            '--base-color: var(--color-brand-primary-rgb);',
            $css,
            'Field with format:rgb should map to -rgb palette variant'
        );
    }
    
    /**
     * Test 6: Should handle field without format property (default to hex)
     */
    public function testDefaultFormatIsHex(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => 'buttons',
                'setting_code' => 'button_bg',
                'value' => '--color-brand-primary'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        [
                            'id' => 'button_bg',
                            'css_var' => '--button-bg',
                            'type' => 'color',
                            // No format property
                            'default' => '#ffffff'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Field maps to base palette variable (default HEX)
        $this->assertStringContainsString(
            '--button-bg: var(--color-brand-primary);',
            $css,
            'Field without format should default to HEX (base variable)'
        );
    }
    
    /**
     * Test 7: Should handle non-palette color values (direct colors)
     */
    public function testHandlesDirectColorValues(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'buttons',
                'setting_code' => 'button_custom_bg',
                'value' => '#ff0000'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'buttons',
                    'settings' => [
                        [
                            'id' => 'button_custom_bg',
                            'css_var' => '--button-custom-bg',
                            'type' => 'color',
                            'format' => 'hex',
                            'default' => '#cccccc'
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Direct color value is used as-is
        $this->assertStringContainsString(
            '--button-custom-bg: #ff0000;',
            $css,
            'Direct color values should be output as-is'
        );
    }
    
    /**
     * Test 8: Should handle mixed format requirements in one palette color
     */
    public function testHandlesMixedFormatRequirements(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => 'buttons',
                'setting_code' => 'button_bg',
                'value' => '--color-brand-primary'
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'text_color',
                'value' => '--color-brand-primary'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        ['id' => 'button_bg', 'css_var' => '--button-bg', 'type' => 'color', 'format' => 'hex', 'default' => '#ffffff']
                    ]
                ],
                [
                    'id' => 'typography',
                    'settings' => [
                        ['id' => 'text_color', 'css_var' => '--text-color', 'type' => 'color', 'format' => 'rgb', 'default' => '#ffffff']
                    ]
                ]
            ]
        ]);
        
        // Mock ColorFormatResolver for both fields
        $this->colorFormatResolverMock
            ->expects($this->exactly(2))
            ->method('resolve')
            ->willReturnCallback(function ($format, $default) {
                // Return the explicit format (hex or rgb)
                return $format;
            });
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Same palette color referenced in different formats
        $this->assertStringContainsString('--color-brand-primary: #1979c3', $css);
        $this->assertStringContainsString('--color-brand-primary-rgb: 25, 121, 195', $css);
        $this->assertStringContainsString('--button-bg: var(--color-brand-primary);', $css);
        $this->assertStringContainsString('--text-color: var(--color-brand-primary-rgb);', $css);
    }
    
    /**
     * Test 9: Should output palette colors before field values
     */
    public function testPaletteColorsOutputBeforeFieldValues(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-primary',
                'value' => '#1979c3'
            ],
            [
                'section_code' => 'buttons',
                'setting_code' => 'button_bg',
                'value' => '--color-brand-primary'
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => '_palette',
                    'settings' => [
                        ['id' => '--color-brand-primary', 'css_var' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        ['id' => 'button_bg', 'css_var' => '--button-bg', 'type' => 'color', 'format' => 'hex', 'default' => '#ffffff']
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        // Assert: Palette colors appear before field references
        $palettePos = strpos($css, '--color-brand-primary: #1979c3');
        $fieldPos = strpos($css, '--button-bg: var(--color-brand-primary)');
        
        $this->assertNotFalse($palettePos, 'Palette color should be in output');
        $this->assertNotFalse($fieldPos, 'Field value should be in output');
        $this->assertLessThan($fieldPos, $palettePos, 'Palette colors should appear before field values');
    }
    
    /**
     * Test 10: Should return empty CSS block when no values provided
     */
    public function testReturnsEmptyCssBlockWhenNoValues(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(['sections' => []]);
        
        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');
        
        $this->assertEquals(":root {\n}\n", $css, 'Should return empty :root block when no values');
    }
    
    /**
     * Test 11: RGB format auto-detection for palette references
     * 
     * When a color field has:
     * - default value in RGB format (e.g., "rgb(17, 24, 39)")
     * - NO explicit "format" field in JSON config
     * - value is a palette reference (e.g., "--color-brand-amber-dark")
     * 
     * Then ColorFormatResolver should auto-detect "rgb" format from the default value,
     * and CssGenerator should append "-rgb" suffix to the palette reference.
     * 
     * Expected output: var(--color-brand-amber-dark-rgb)
     * NOT: var(--color-brand-amber-dark)
     */
    public function testRgbFormatAutoDetectionForPaletteReference(): void
    {
        // Arrange: Mock status provider
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        // Mock saved value: palette reference
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'test_section',
                'setting_code' => 'text_color',
                'value' => '--color-brand-amber-dark'  // Palette reference (HEX version)
            ]
        ]);
        
        // Mock config: field with RGB default but NO explicit format field
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test_section',
                    'name' => 'Test Section',
                    'settings' => [
                        [
                            'id' => 'text_color',
                            'type' => 'color',
                            'default' => 'rgb(17, 24, 39)',  // RGB default → should trigger RGB format
                            'css_var' => '--base-color',
                            'palette' => 'default'
                            // NO 'format' field → should auto-detect from default
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Mock ColorFormatResolver to return 'rgb' (auto-detected from default)
        $this->colorFormatResolverMock
            ->expects($this->once())
            ->method('resolve')
            ->with(null, 'rgb(17, 24, 39)')
            ->willReturn('rgb');
        
        // Act: Generate CSS
        $css = $this->cssGenerator->generate(1, 1, 'DRAFT');
        
        // Assert: Should append -rgb suffix for RGB format
        $this->assertStringContainsString(
            '--base-color: var(--color-brand-amber-dark-rgb);',
            $css,
            'RGB format should add -rgb suffix to palette reference'
        );
        
        $this->assertStringNotContainsString(
            '--base-color: var(--color-brand-amber-dark);',
            $css,
            'Should NOT use HEX version without -rgb suffix when format is rgb'
        );
    }
    
    /**
     * Test 12: HEX format for palette references (no -rgb suffix)
     * 
     * When a color field has:
     * - default value in HEX format (e.g., "#1979c3")
     * - value is a palette reference
     * 
     * Then should use HEX version WITHOUT -rgb suffix.
     */
    public function testHexFormatForPaletteReference(): void
    {
        // Arrange
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'test_section',
                'setting_code' => 'button_color',
                'value' => '--color-brand-primary'  // Palette reference
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test_section',
                    'settings' => [
                        [
                            'id' => 'button_color',
                            'type' => 'color',
                            'default' => '#1979c3',  // HEX default → should trigger HEX format
                            'css_var' => '--button-bg'
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Mock ColorFormatResolver to return 'hex'
        $this->colorFormatResolverMock
            ->expects($this->once())
            ->method('resolve')
            ->with(null, '#1979c3')
            ->willReturn('hex');
        
        // Act
        $css = $this->cssGenerator->generate(1, 1, 'DRAFT');
        
        // Assert: Should use HEX version (without -rgb suffix)
        $this->assertStringContainsString(
            '--button-bg: var(--color-brand-primary);',
            $css,
            'HEX format should use palette reference without -rgb suffix'
        );
        
        $this->assertStringNotContainsString(
            '--button-bg: var(--color-brand-primary-rgb);',
            $css,
            'Should NOT add -rgb suffix for HEX format'
        );
    }
    
    /**
     * Test 13: RGB format converts HEX colors to RGB values
     * 
     * When a field has RGB format and value is a HEX color (not palette reference),
     * should convert HEX to RGB format.
     */
    public function testRgbFormatConvertsHexToRgb(): void
    {
        // Arrange
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'test_section',
                'setting_code' => 'text_color',
                'value' => '#c87604'  // HEX color value
            ]
        ]);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test_section',
                    'settings' => [
                        [
                            'id' => 'text_color',
                            'type' => 'color',
                            'default' => 'rgb(17, 24, 39)',  // RGB default
                            'css_var' => '--base-color'
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Mock ColorFormatResolver to return 'rgb'
        $this->colorFormatResolverMock
            ->expects($this->once())
            ->method('resolve')
            ->with(null, 'rgb(17, 24, 39)')
            ->willReturn('rgb');
        
        // Act
        $css = $this->cssGenerator->generate(1, 1, 'DRAFT');
        
        // Assert: Should convert HEX to RGB
        $this->assertStringContainsString(
            '--base-color: 200, 118, 4;',
            $css,
            'RGB format should convert HEX color to RGB values'
        );
        
        $this->assertStringNotContainsString(
            '--base-color: #c87604;',
            $css,
            'Should NOT output HEX when format is RGB'
        );
    }

    /**
     * Test 14: Palette color at default value still emits both HEX and RGB variants
     *
     * Bug: When a palette color stored in the DB equals the palette default,
     * processPaletteColor() used to return '' (skipping it), assuming Breeze base
     * CSS defines the variable. But Breeze base CSS does NOT define the -rgb variant,
     * so any field referencing var(--color-brand-amber-dark-rgb) would get an
     * undefined value → resolved as empty → broken colors.
     *
     * Fix: Always emit both variants, regardless of default match.
     */
    public function testPaletteAtDefaultValueStillEmitsBothHexAndRgbVariants(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        // Palette value equals the default (#a16207)
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-amber-dark',
                'value' => '#a16207'  // Same as default
            ]
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [],
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                [
                                    'css_var' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'DRAFT');

        // Both variants must be present even though the value equals the default
        $this->assertStringContainsString(
            '--color-brand-amber-dark: #a16207;',
            $css,
            'HEX palette variable must be emitted even when value equals default'
        );
        $this->assertStringContainsString(
            '--color-brand-amber-dark-rgb: 161, 98, 7;',
            $css,
            'RGB palette variable must be emitted even when value equals default'
        );
    }

    /**
     * Test 15: generateFromValuesMap emits palette RGB even when value equals default
     *
     * Same as Test 14 but exercises the generateFromValuesMap() code path (used
     * during publication saves).
     */
    public function testGenerateFromValuesMapEmitsPaletteRgbAtDefault(): void
    {
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [],
            'palettes' => []
        ]);

        $css = $this->cssGenerator->generateFromValuesMap(1, [
            '_palette.--color-brand-amber-dark' => '#a16207'
        ]);

        $this->assertStringContainsString(
            '--color-brand-amber-dark: #a16207;',
            $css,
            'generateFromValuesMap: HEX palette variable must always be emitted'
        );
        $this->assertStringContainsString(
            '--color-brand-amber-dark-rgb: 161, 98, 7;',
            $css,
            'generateFromValuesMap: RGB palette variable must always be emitted'
        );
    }

    /**
     * Test 16: Field references a palette variable that is NOT stored in DB.
     *
     * This is the primary real-world bug scenario:
     * - User sets --base-color to reference --color-brand-amber-dark
     * - User never changed --color-brand-amber-dark in the palette panel
     * - Therefore _palette.--color-brand-amber-dark has no DB entry
     * - The Breeze base CSS defines --color-brand-amber-dark (HEX) but NOT
     *   --color-brand-amber-dark-rgb
     * - Without this fix: draft CSS contains var(--color-brand-amber-dark-rgb)
     *   but the variable is never defined → resolves to empty → broken colors
     *
     * Fix: scan field values for palette references, look up config default,
     * emit the palette CSS even without a DB entry.
     */
    public function testPaletteVarNotInDbIsEmittedUsingConfigDefault(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        // Only the field value is in DB — NO _palette entry for --color-brand-amber-dark
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_color',
                'value' => '--color-brand-amber-dark'  // palette reference, not a hex
            ]
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'base_color',
                            'css_var' => '--base-color',
                            'type' => 'color',
                            'default' => 'rgb(17, 24, 39)',  // different from value → not skipped
                        ]
                    ]
                ]
            ],
            // Config supplies the default for the palette color
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                [
                                    'css_var' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $this->colorFormatResolverMock
            ->method('resolve')
            ->willReturn('rgb');

        $css = $this->cssGenerator->generate(1, 1, 'DRAFT');

        // Palette variable must be emitted even though it is not in DB
        $this->assertStringContainsString(
            '--color-brand-amber-dark: #a16207;',
            $css,
            'Palette HEX must be emitted using config default when not in DB'
        );
        $this->assertStringContainsString(
            '--color-brand-amber-dark-rgb: 161, 98, 7;',
            $css,
            'Palette RGB must be emitted using config default when not in DB'
        );
        // The field itself must reference the -rgb variant
        $this->assertStringContainsString(
            '--base-color: var(--color-brand-amber-dark-rgb);',
            $css,
            'Field with rgb format must reference -rgb variant'
        );
    }

    /**
     * Test 17: generateFromValuesMap — same scenario as Test 16.
     *
     * Field references a palette var that is absent from the values map.
     * Config default must be used to emit the palette CSS.
     */
    public function testGenerateFromValuesMapEmitsPaletteDefaultForUnreferencedVar(): void
    {
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'base_color',
                            'css_var' => '--base-color',
                            'type' => 'color',
                            'default' => 'rgb(17, 24, 39)',
                        ]
                    ]
                ]
            ],
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                [
                                    'css_var' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $this->colorFormatResolverMock
            ->method('resolve')
            ->willReturn('rgb');

        // No _palette entry — only the field value referencing the palette color
        $css = $this->cssGenerator->generateFromValuesMap(1, [
            'typography.base_color' => '--color-brand-amber-dark'
        ]);

        $this->assertStringContainsString(
            '--color-brand-amber-dark: #a16207;',
            $css,
            'generateFromValuesMap: palette HEX must be emitted from config default'
        );
        $this->assertStringContainsString(
            '--color-brand-amber-dark-rgb: 161, 98, 7;',
            $css,
            'generateFromValuesMap: palette RGB must be emitted from config default'
        );
    }

    /**
     * Test 18: Section-level selector groups settings into a non-root block.
     *
     * When a section has 'selector' set, all its settings should be emitted
     * under that selector block, not under :root.
     */
    public function testSectionSelectorGroupsSettingsIntoCustomBlock(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'layout',
                'setting_code' => 'max_width',
                'value' => '1440px'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'gap',
                'value' => '32px'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'layout',
                    'selector' => '.columns-container',
                    'settings' => [
                        ['id' => 'max_width', 'property' => '--max-width', 'default' => '1260px'],
                        ['id' => 'gap',       'property' => '--gap',       'default' => '24px'],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        // Custom selector block must be present
        $this->assertStringContainsString('.columns-container {', $css);
        $this->assertStringContainsString('--max-width: 1440px;', $css);
        $this->assertStringContainsString('--gap: 32px;', $css);

        // Settings must NOT appear in :root
        $rootStart = strpos($css, ':root {');
        $rootEnd   = strpos($css, '}', $rootStart);
        $rootBlock = substr($css, $rootStart, $rootEnd - $rootStart + 1);
        $this->assertStringNotContainsString('--max-width', $rootBlock);
        $this->assertStringNotContainsString('--gap', $rootBlock);
    }

    /**
     * Test 19: Setting-level selector overrides section-level selector.
     *
     * When a setting has its own 'selector', it should override the section
     * selector and be placed in a separate block.
     */
    public function testSettingSelectorOverridesSectionSelector(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'layout',
                'setting_code' => 'max_width',
                'value' => '1440px'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'bg_color',
                'value' => '#ffffff'
            ],
        ]);

        $this->colorFormatResolverMock->method('resolve')->willReturn('hex');

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'layout',
                    'selector' => '.columns-container',
                    'settings' => [
                        ['id' => 'max_width', 'property' => '--max-width', 'default' => '1260px'],
                        [
                            'id'       => 'bg_color',
                            'property' => '--bg',
                            'selector' => ':root',   // override: goes to :root, not section
                            'type'     => 'color',
                            'default'  => '#000000'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        // bg_color must be in :root
        $rootStart = strpos($css, ':root {');
        $rootEnd   = strpos($css, '}', $rootStart);
        $rootBlock = substr($css, $rootStart, $rootEnd - $rootStart + 1);
        $this->assertStringContainsString('--bg: #ffffff;', $rootBlock);

        // max_width must be in .columns-container, NOT in :root
        $this->assertStringContainsString('.columns-container {', $css);
        $sectionStart = strpos($css, '.columns-container {');
        $sectionEnd   = strpos($css, '}', $sectionStart);
        $sectionBlock = substr($css, $sectionStart, $sectionEnd - $sectionStart + 1);
        $this->assertStringContainsString('--max-width: 1440px;', $sectionBlock);
        $this->assertStringNotContainsString('--max-width', $rootBlock);
    }

    /**
     * Test 20: Array selector on a section is joined into comma-separated string.
     */
    public function testArraySelectorIsJoinedWithComma(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'layout',
                'setting_code' => 'max_width',
                'value' => '1440px'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id'       => 'layout',
                    'selector' => ['.columns-container', '.page-wrapper'],
                    'settings' => [
                        ['id' => 'max_width', 'property' => '--max-width', 'default' => '1260px'],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        $this->assertStringContainsString('.columns-container, .page-wrapper {', $css);
        $this->assertStringContainsString('--max-width: 1440px;', $css);
    }

    /**
     * Test 21: 'property' field (new name) is used instead of 'css_var' when both present.
     *
     * 'property' has priority over 'css_var' (backward compat alias).
     */
    public function testPropertyFieldTakesPriorityOverCssVar(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'font_size',
                'value' => '18px'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'       => 'font_size',
                            'property' => '--font-size-base',  // new field
                            'css_var'  => '--old-var-name',    // legacy (should be ignored)
                            'default'  => '16px'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        $this->assertStringContainsString('--font-size-base: 18px;', $css);
        $this->assertStringNotContainsString('--old-var-name', $css);
    }

    /**
     * Test 22: Backward compat — 'css_var' still works when 'property' is absent.
     */
    public function testCssVarBackwardCompatWhenPropertyAbsent(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'font_size',
                'value' => '18px'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'font_size',
                            'css_var' => '--font-size-base',  // only legacy field
                            'default' => '16px'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        $this->assertStringContainsString('--font-size-base: 18px;', $css);
    }

    /**
     * Test 23: :root is always emitted first, even when there are other selector blocks.
     */
    public function testRootBlockIsAlwaysEmittedFirst(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')->willReturn([
            [
                'section_code' => 'layout',
                'setting_code' => 'max_width',
                'value' => '1440px'
            ],
            [
                'section_code' => 'globals',
                'setting_code' => 'text_color',
                'value' => '#111111'
            ],
        ]);

        $this->colorFormatResolverMock->method('resolve')->willReturn('hex');

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id'       => 'layout',
                    'selector' => '.columns-container',
                    'settings' => [
                        ['id' => 'max_width', 'property' => '--max-width', 'default' => '1260px'],
                    ],
                ],
                [
                    'id' => 'globals',
                    'settings' => [  // no section selector → :root
                        ['id' => 'text_color', 'property' => '--text-color', 'type' => 'color', 'default' => '#000000'],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        $rootPos    = strpos($css, ':root {');
        $sectionPos = strpos($css, '.columns-container {');

        $this->assertNotFalse($rootPos,    ':root block must be present');
        $this->assertNotFalse($sectionPos, '.columns-container block must be present');
        $this->assertLessThan($sectionPos, $rootPos, ':root block must come before .columns-container block');
    }
}

