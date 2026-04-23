<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use Magento\Store\Api\Data\StoreInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssValueFormatter;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssVariableBuilder;
use Swissup\BreezeThemeEditor\Model\Service\Css\CssFontImportBuilder;

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
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private ConfigProvider $configProviderMock;
    private ScopeInterface $scope;
    
    protected function setUp(): void
    {
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->scope = $this->createMock(ScopeInterface::class);

        $colorConverter      = new ColorConverter();
        $colorFormatResolver = new ColorFormatResolver($colorConverter);
        $colorFormatter      = new ColorFormatter($colorConverter);
        $colorPipeline       = new ColorPipeline($colorFormatResolver, $colorFormatter);
        $formatter           = new CssValueFormatter($colorFormatResolver);
        $variableBuilder     = new CssVariableBuilder($formatter);
        $fontImportBuilder   = new CssFontImportBuilder($variableBuilder);

        $this->cssGenerator = new CssGenerator(
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->configProviderMock,
            $variableBuilder,
            $fontImportBuilder,
            $colorPipeline
        );
    }
    
    /**
     * Test 1: Should generate both HEX and RGB formats for palette colors
     */
    public function testGeneratesBothHexAndRgbFormatsForPaletteColors(): void
    {
        // Setup: Mock palette color values
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                            'property' => '--color-brand-amber-dark',
                            'default' => '#000000'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                            'property' => '--color-brand-primary',
                            'default' => '#000000'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000'],
                        ['id' => '--color-brand-secondary', 'property' => '--color-brand-secondary', 'default' => '#000000'],
                        ['id' => '--color-brand-tertiary', 'property' => '--color-brand-tertiary', 'default' => '#000000']
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        [
                            'id' => 'button_primary_bg',
                            'property' => '--button-primary-bg',
                            'type' => 'color',
                            'format' => 'hex',  // HEX format
                            'default' => '#cccccc'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'base_color',
                            'property' => '--base-color',
                            'type' => 'color',
                            'format' => 'rgb',  // RGB format
                            'default' => '#ffffff'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        [
                            'id' => 'button_bg',
                            'property' => '--button-bg',
                            'type' => 'color',
                            // No format property
                            'default' => '#ffffff'  // Different from value
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                            'property' => '--button-custom-bg',
                            'type' => 'color',
                            'format' => 'hex',
                            'default' => '#cccccc'
                        ]
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        ['id' => 'button_bg', 'property' => '--button-bg', 'type' => 'color', 'format' => 'hex', 'default' => '#ffffff']
                    ]
                ],
                [
                    'id' => 'typography',
                    'settings' => [
                        ['id' => 'text_color', 'property' => '--text-color', 'type' => 'color', 'format' => 'rgb', 'default' => '#ffffff']
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                        ['id' => '--color-brand-primary', 'property' => '--color-brand-primary', 'default' => '#000000']
                    ]
                ],
                [
                    'id' => 'buttons',
                    'settings' => [
                        ['id' => 'button_bg', 'property' => '--button-bg', 'type' => 'color', 'format' => 'hex', 'default' => '#ffffff']
                    ]
                ]
            ]
        ]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(['sections' => []]);
        
        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');
        
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
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        
        // Mock saved value: palette reference
        $draftData = [
            [
                'section_code' => 'test_section',
                'setting_code' => 'text_color',
                'value' => '--color-brand-amber-dark'  // Palette reference (HEX version)
            ]
        ];
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($draftData);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn($draftData);
        
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
                            'property' => '--base-color',
                            'palette' => 'default'
                            // NO 'format' field → should auto-detect from default
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Act: Generate CSS
        $css = $this->cssGenerator->generate(1, $this->scope, 'DRAFT');
        
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
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        
        $draftData = [
            [
                'section_code' => 'test_section',
                'setting_code' => 'button_color',
                'value' => '--color-brand-primary'  // Palette reference
            ]
        ];
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($draftData);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn($draftData);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test_section',
                    'settings' => [
                        [
                            'id' => 'button_color',
                            'type' => 'color',
                            'default' => '#1979c3',  // HEX default → should trigger HEX format
                            'property' => '--button-bg'
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Act
        $css = $this->cssGenerator->generate(1, $this->scope, 'DRAFT');
        
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
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        
        $draftData = [
            [
                'section_code' => 'test_section',
                'setting_code' => 'text_color',
                'value' => '#c87604'  // HEX color value
            ]
        ];
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($draftData);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn($draftData);
        
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test_section',
                    'settings' => [
                        [
                            'id' => 'text_color',
                            'type' => 'color',
                            'default' => 'rgb(17, 24, 39)',  // RGB default
                            'property' => '--base-color'
                        ]
                    ]
                ]
            ],
            'palettes' => []
        ]);
        
        // Act
        $css = $this->cssGenerator->generate(1, $this->scope, 'DRAFT');
        
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
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        // Palette value equals the default (#a16207)
        $draftData = [
            [
                'section_code' => '_palette',
                'setting_code' => '--color-brand-amber-dark',
                'value' => '#a16207'  // Same as default
            ]
        ];
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($draftData);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn($draftData);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [],
            'palettes' => [
                [
                    'groups' => [
                        [
                            'colors' => [
                                [
                                    'property' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'DRAFT');

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
        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        // Only the field value is in DB — NO _palette entry for --color-brand-amber-dark
        $draftData = [
            [
                'section_code' => 'typography',
                'setting_code' => 'base_color',
                'value' => '--color-brand-amber-dark'  // palette reference, not a hex
            ]
        ];
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($draftData);
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')->willReturn($draftData);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'base_color',
                            'property' => '--base-color',
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
                                    'property' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'DRAFT');

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
                            'property' => '--base-color',
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
                                    'property' => '--color-brand-amber-dark',
                                    'default' => '#a16207'
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);

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

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

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

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

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

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString('.columns-container, .page-wrapper {', $css);
        $this->assertStringContainsString('--max-width: 1440px;', $css);
    }

    /**
     * Test 21: 'property' field is required; fields without it are skipped.
     */
    public function testPropertyFieldIsRequired(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                            'property' => '--font-size-base',
                            'default'  => '16px'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString('--font-size-base: 18px;', $css);
    }

    /**
     * Test 22: Fields without 'property' key are skipped entirely.
     */
    public function testFieldsWithoutPropertyAreSkipped(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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
                            // no 'property' key — field should be skipped
                            'default' => '16px'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString('18px', $css);
    }

    /**
     * Test 23: :root is always emitted first, even when there are other selector blocks.
     */
    public function testRootBlockIsAlwaysEmittedFirst(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
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

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $rootPos    = strpos($css, ':root {');
        $sectionPos = strpos($css, '.columns-container {');

        $this->assertNotFalse($rootPos,    ':root block must be present');
        $this->assertNotFalse($sectionPos, '.columns-container block must be present');
        $this->assertLessThan($sectionPos, $rootPos, ':root block must come before .columns-container block');
    }

    /**
     * Test 24: HEX8 with format='rgb' should emit rgba(r, g, b, a) in CSS
     */
    public function testHex8WithRgbFormatEmitsRgbaInCss(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'globals',
                'setting_code' => 'overlay_color',
                'value' => '#1979c380'  // semi-transparent blue
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'globals',
                    'settings' => [
                        [
                            'id'       => 'overlay_color',
                            'property' => '--overlay-color',
                            'type'     => 'color',
                            'format'   => 'rgb',
                            'default'  => 'rgb(25, 121, 195)'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--overlay-color: rgba(25, 121, 195, 0.502);',
            $css,
            'HEX8 with format=rgb should produce rgba() with correct alpha'
        );
    }

    /**
     * Test 25: HEX8 with format='hex' should emit normalized hex8 in CSS
     */
    public function testHex8WithHexFormatEmitsHex8InCss(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'globals',
                'setting_code' => 'overlay_color',
                'value' => '#1979c380'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'globals',
                    'settings' => [
                        [
                            'id'       => 'overlay_color',
                            'property' => '--overlay-color',
                            'type'     => 'color',
                            'default'  => '#1979c3'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--overlay-color: #1979c380;',
            $css,
            'HEX8 with format=hex should emit hex8 value as-is (normalized lowercase)'
        );
    }

    /**
     * Test 26: Fully opaque HEX8 (#rrggbbff) with format='rgb' emits rgba() with alpha=1
     */
    public function testFullyOpaqueHex8WithRgbFormatEmitsRgbaAlphaOne(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'globals',
                'setting_code' => 'brand_color',
                'value' => '#1979c3ff'
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'globals',
                    'settings' => [
                        [
                            'id'       => 'brand_color',
                            'property' => '--brand-color',
                            'type'     => 'color',
                            'format'   => 'rgb',
                            'default'  => 'rgb(25, 121, 195)'
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--brand-color: rgba(25, 121, 195, 1);',
            $css,
            'Fully opaque HEX8 with format=rgb should emit rgba() with alpha=1'
        );
    }

    // -------------------------------------------------------------------------
    // Tests 27–34: font_picker / buildFontImports / renderCss
    // -------------------------------------------------------------------------

    /**
     * Helper: build a minimal config array with one font_picker field
     * that has the given options list.
     */
    private function makeFontPickerConfig(array $options, string $default = 'Arial'): array
    {
        return [
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => $default,
                            'options' => $options,
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * Test 27: Google Font value → @import is prepended before :root
     */
    public function testGoogleFontValueProducesImportBeforeRoot(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Roboto',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(
            $this->makeFontPickerConfig([
                ['value' => 'Arial', 'label' => 'Arial'],
                ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ])
        );

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            "@import url('https://fonts.googleapis.com/css2?family=Roboto');",
            $css,
            'A Google Font value should generate an @import rule'
        );

        $importPos = strpos($css, '@import');
        $rootPos   = strpos($css, ':root');
        $this->assertNotFalse($importPos, '@import must be present');
        $this->assertNotFalse($rootPos,   ':root block must be present');
        $this->assertLessThan($rootPos, $importPos, '@import must come before :root');
    }

    /**
     * Test 28: Web-safe font (no url on option) → no @import produced
     */
    public function testWebSafeFontProducesNoImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Georgia',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(
            $this->makeFontPickerConfig([
                ['value' => 'Arial',   'label' => 'Arial'],
                ['value' => 'Georgia', 'label' => 'Georgia'],  // no url
            ])
        );

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString('@import', $css, 'Web-safe font should produce no @import');
    }

    /**
     * Test 29: Default font value → no @import (skipped like buildSelectorBlocks)
     */
    public function testDefaultFontValueProducesNoImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        // Value equals the field default
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Roboto',  // same as default below
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(
            $this->makeFontPickerConfig(
                [
                    ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                ],
                'Roboto'  // default = 'Roboto'
            )
        );

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString(
            '@import',
            $css,
            'Default font value should not produce an @import (same skip logic as buildSelectorBlocks)'
        );
    }

    /**
     * Test 30: Two different Google Fonts → two distinct @import lines
     */
    public function testTwoGoogleFontsProduceTwoImports(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Roboto',
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'heading_font',
                'value' => 'Open Sans',
            ],
        ]);

        $options = [
            ['value' => 'Arial',     'label' => 'Arial'],
            ['value' => 'Roboto',    'label' => 'Roboto',    'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ['value' => 'Open Sans', 'label' => 'Open Sans', 'url' => 'https://fonts.googleapis.com/css2?family=Open+Sans'],
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            'options' => $options,
                        ],
                        [
                            'id'      => 'heading_font',
                            'property' => '--heading-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            'options' => $options,
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            "@import url('https://fonts.googleapis.com/css2?family=Roboto');",
            $css
        );
        $this->assertStringContainsString(
            "@import url('https://fonts.googleapis.com/css2?family=Open+Sans');",
            $css
        );
    }

    /**
     * Test 31: Duplicate URLs (two fields sharing the same Google Font) → deduplicated to one @import
     */
    public function testDuplicateFontUrlsAreDeduplicatedToOneImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $sharedUrl = 'https://fonts.googleapis.com/css2?family=Roboto';

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Roboto',
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'heading_font',
                'value' => 'Roboto',
            ],
        ]);

        $options = [
            ['value' => 'Arial',  'label' => 'Arial'],
            ['value' => 'Roboto', 'label' => 'Roboto', 'url' => $sharedUrl],
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            'options' => $options,
                        ],
                        [
                            'id'      => 'heading_font',
                            'property' => '--heading-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            'options' => $options,
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $importCount = substr_count($css, "@import url('$sharedUrl')");
        $this->assertEquals(1, $importCount, 'Duplicate font URL should produce exactly one @import');
    }

    /**
     * Test 32: generateFromValuesMap code path — Google Font → @import
     */
    public function testGenerateFromValuesMapGoogleFontProducesImport(): void
    {
        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(
            $this->makeFontPickerConfig([
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ])
        );

        $css = $this->cssGenerator->generateFromValuesMap(1, [
            'typography.base_font' => 'Roboto',
        ]);

        $this->assertStringContainsString(
            "@import url('https://fonts.googleapis.com/css2?family=Roboto');",
            $css,
            'generateFromValuesMap: Google Font value must produce an @import rule'
        );
    }

    // -------------------------------------------------------------------------
    // Tests 33–36: formatFont() — font stack formatting
    // -------------------------------------------------------------------------

    /**
     * Test 33: Font stack that already contains a comma passes through unchanged
     */
    public function testFontStackWithCommaPassesThroughUnchanged(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Roboto, sans-serif',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--base-font-family: Roboto, sans-serif;',
            $css,
            'A font stack already containing a comma must not be double-wrapped'
        );
    }

    /**
     * Test 34: Single sans-serif font name gets wrapped with "FontName", sans-serif
     */
    public function testSingleSansSerifFontGetsWrappedWithFallback(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Lato',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--base-font-family: "Lato", sans-serif;',
            $css,
            'Single sans-serif font should be wrapped: "FontName", sans-serif'
        );
    }

    /**
     * Test 35: Serif font name gets wrapped with serif fallback
     */
    public function testSerifFontGetsSerifFallback(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Georgia',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--base-font-family: "Georgia", serif;',
            $css,
            'Serif font should be wrapped: "FontName", serif'
        );
    }

    /**
     * Test 36: Monospace font name gets wrapped with monospace fallback
     */
    public function testMonospaceFontGetsMonospaceFallback(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => 'Courier New',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--base-font-family: "Courier New", monospace;',
            $css,
            'Monospace font should be wrapped: "FontName", monospace'
        );
    }

    /**
     * Test 37: Font role reference (--primary-font) is wrapped in var(), not quoted as a string
     *
     * Regression test: previously produced "--primary-font", sans-serif instead of var(--primary-font)
     */
    public function testFontRoleReferenceIsWrappedInVar(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value' => '--primary-font',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--base-font-family: var(--primary-font);',
            $css,
            'Font role reference must be wrapped in var(), not quoted as a string literal'
        );
        $this->assertStringNotContainsString(
            '"--primary-font"',
            $css,
            'Font role reference must not be treated as a font name string'
        );
    }

    /**
     * Test 38: Font role reference (--secondary-font) for headings field is also wrapped in var()
     */
    public function testSecondaryFontRoleReferenceIsWrappedInVar(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'heading_font',
                'value' => '--secondary-font',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'heading_font',
                            'property' => '--headings-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--headings-font-family: var(--secondary-font);',
            $css,
            'Secondary font role reference must be wrapped in var()'
        );
        $this->assertStringNotContainsString(
            '"--secondary-font"',
            $css,
            'Secondary font role reference must not be treated as a font name string'
        );
    }

    /**
     * Test 39: Palette-role font_picker field (font_palette set, no inline options) → @import from font_palettes
     *
     * The field has `font_palette: 'default'` and no `options` array.
     * The palette options live in `config['font_palettes']['default']['options']`.
     * buildFontImports() must look there instead of the (empty) field options.
     */
    public function testPaletteFontRoleFieldProducesImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'primary_font_role',
                'value'        => 'Roboto',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => [
                    'options' => [
                        ['value' => 'Arial',  'label' => 'Arial'],
                        ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                    ],
                ],
            ],
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'           => 'primary_font_role',
                            'property'      => '--primary-font',
                            'type'         => 'font_picker',
                            'font_palette' => 'default',
                            'default'      => 'Arial',
                            // no 'options' key — palette fields never carry inline options
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            "@import url('https://fonts.googleapis.com/css2?family=Roboto');",
            $css,
            'Palette-role field must produce @import by looking up options in font_palettes config'
        );
    }

    /**
     * Test 40: Consumer field storing a CSS-var reference (--primary-font) → no @import
     *
     * Consumer fields save a palette role CSS var (e.g. '--primary-font') as their value.
     * There is no option with `value === '--primary-font'` in any options list, so
     * no @import should be emitted.
     */
    public function testPaletteFontConsumerStoringCssVarProducesNoImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value'        => '--primary-font',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => [
                    'options' => [
                        ['value' => 'Arial',  'label' => 'Arial'],
                        ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                    ],
                ],
            ],
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'property' => '--base-font-family',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            // consumer field: no font_palette, no inline options
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString(
            '@import',
            $css,
            'Consumer field with a CSS-var reference must not produce an @import'
        );
    }

    /**
     * Test 41: Palette-role field whose current value has no url in its palette option → no @import
     */
    public function testPaletteFontWebSafeValueProducesNoImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'primary_font_role',
                'value'        => 'Georgia',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => [
                    'options' => [
                        ['value' => 'Arial',   'label' => 'Arial'],
                        ['value' => 'Georgia', 'label' => 'Georgia'],  // no url — web-safe
                    ],
                ],
            ],
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'           => 'primary_font_role',
                            'property'      => '--primary-font',
                            'type'         => 'font_picker',
                            'font_palette' => 'default',
                            'default'      => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString(
            '@import',
            $css,
            'Palette-role field with a web-safe font value must not produce an @import'
        );
    }

    /**
     * Test 42: Two palette-role fields sharing the same font URL → deduplicated to one @import
     */
    public function testPaletteFontDuplicateUrlsAreDeduplicatedToOneImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $sharedUrl = 'https://fonts.googleapis.com/css2?family=Roboto';

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'primary_font_role',
                'value'        => 'Roboto',
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'secondary_font_role',
                'value'        => 'Roboto',
            ],
        ]);

        $paletteOptions = [
            ['value' => 'Arial',  'label' => 'Arial'],
            ['value' => 'Roboto', 'label' => 'Roboto', 'url' => $sharedUrl],
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'font_palettes' => [
                'default' => [
                    'options' => $paletteOptions,
                ],
            ],
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id'           => 'primary_font_role',
                            'property'      => '--primary-font',
                            'type'         => 'font_picker',
                            'font_palette' => 'default',
                            'default'      => 'Arial',
                        ],
                        [
                            'id'           => 'secondary_font_role',
                            'property'      => '--secondary-font',
                            'type'         => 'font_picker',
                            'font_palette' => 'default',
                            'default'      => 'Arial',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $importCount = substr_count($css, "@import url('$sharedUrl')");
        $this->assertSame(
            1,
            $importCount,
            'Duplicate palette font URLs must be deduplicated to a single @import'
        );
    }

    // -------------------------------------------------------------------------
    // Helpers for E2E scope-inheritance tests (Tests 46–47)
    // -------------------------------------------------------------------------

    /**
     * Build a real ValueInheritanceResolver wired with a StoreManager mock that
     * maps $storeId → $websiteId, and the shared value-service / config mocks.
     *
     * Using a real resolver (not a mock) is the whole point of these tests:
     * it lets us verify the full chain
     *   CssGenerator → ValueInheritanceResolver → buildScopeChain → ValueService
     * without stub short-circuits.
     */
    private function createRealResolverWithStoreManager(
        int $storeId,
        int $websiteId
    ): ValueInheritanceResolver {
        $storeMock = $this->createMock(StoreInterface::class);
        $storeMock->method('getWebsiteId')->willReturn($websiteId);

        $storeManagerMock = $this->createMock(StoreManagerInterface::class);
        $storeManagerMock->method('getStore')->with($storeId)->willReturn($storeMock);

        $themeResolverMock = $this->createMock(ThemeResolver::class);
        // Single-theme hierarchy — scope chain, not theme inheritance, is under test
        $themeResolverMock->method('getThemeHierarchy')
            ->willReturn([['theme_id' => 10, 'theme_code' => 'test-theme', 'level' => 0]]);

        // inheritParent=false so getThemeHierarchy is never called (keeps scope chain as focus)
        $this->configProviderMock->method('getConfiguration')
            ->willReturn(['inheritParent' => false]);

        return new ValueInheritanceResolver(
            $this->valueServiceMock,
            $themeResolverMock,
            $this->configProviderMock,
            new ScopeFactory(),
            $storeManagerMock
        );
    }

    /**
     * Build a CssGenerator that uses a *real* ValueInheritanceResolver.
     */
    private function createCssGeneratorWithRealResolver(
        ValueInheritanceResolver $resolver
    ): CssGenerator {
        $colorConverter      = new ColorConverter();
        $colorFormatResolver = new ColorFormatResolver($colorConverter);
        $colorFormatter      = new ColorFormatter($colorConverter);
        $colorPipeline       = new ColorPipeline($colorFormatResolver, $colorFormatter);
        $formatter           = new CssValueFormatter($colorFormatResolver);
        $variableBuilder     = new CssVariableBuilder($formatter);
        $fontImportBuilder   = new CssFontImportBuilder($variableBuilder);

        return new CssGenerator(
            $resolver,
            $this->statusProviderMock,
            $this->configProviderMock,
            $variableBuilder,
            $fontImportBuilder,
            $colorPipeline
        );
    }

    /**
     * Minimal one-field config used by E2E tests.
     * The field is a color stored under ':root' with CSS var '--header-color'.
     */
    private function makeHeaderColorConfig(): array
    {
        return [
            'sections' => [
                [
                    'id'       => 'header',
                    'settings' => [
                        [
                            'id'       => 'header_color',
                            'type'     => 'color',
                            'property' => '--header-color',
                            'default'  => '#000000',
                        ],
                    ],
                ],
            ],
        ];
    }

    // -------------------------------------------------------------------------
    // Tests 46–47: E2E scope-inheritance (real ValueInheritanceResolver)
    // -------------------------------------------------------------------------

    /**
     * Test 46: PUBLISHED — value saved at default/0 scope is inherited by stores/1.
     *
     * E2E regression test for Issue #015 + #016.
     *
     * Uses a *real* ValueInheritanceResolver (not a mock) to verify the full chain:
     *   CssGenerator::generate(stores/1, PUBLISHED)
     *     → resolver::resolveAllValues()
     *       → buildScopeChain(stores/1)  → [default/0, websites/2, stores/1]
     *       → valueService::getValuesByTheme(default/0)  → [header_color: #ff0000]
     *       → valueService::getValuesByTheme(websites/2) → []
     *       → valueService::getValuesByTheme(stores/1)   → []
     *     → CSS contains '--header-color: #ff0000;'
     */
    public function testPublishedCssInheritsColorFromDefaultScopeToStoreView(): void
    {
        // --- StatusProvider: PUBLISHED = 2 -----------------------------------
        $this->statusProviderMock
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);

        // --- ValueService: only default/0 has data ---------------------------
        $this->valueServiceMock
            ->method('getValuesByTheme')
            ->willReturnCallback(function (
                int $themeId,
                ScopeInterface $scope,
                int $statusId,
                ?int $userId
            ): array {
                if ($scope->getType() === 'default' && $statusId === 2) {
                    return [[
                        'section_code' => 'header',
                        'setting_code' => 'header_color',
                        'value'        => '#ff0000',
                    ]];
                }
                return [];
            });

        // --- ConfigProvider --------------------------------------------------
        $this->configProviderMock
            ->method('getConfigurationWithInheritance')
            ->willReturn($this->makeHeaderColorConfig());

        // --- Real resolver wired to store 1 → website 2 ----------------------
        $resolver = $this->createRealResolverWithStoreManager(storeId: 1, websiteId: 2);

        // --- CssGenerator using the real resolver ----------------------------
        $generator = $this->createCssGeneratorWithRealResolver($resolver);

        // --- Scope: stores/1 -------------------------------------------------
        $storesScope = (new ScopeFactory())->create('stores', 1);

        $css = $generator->generate(themeId: 10, scope: $storesScope, status: 'PUBLISHED');

        $this->assertStringContainsString(
            '--header-color: #ff0000;',
            $css,
            'PUBLISHED CSS for stores/1 must contain the color saved only at default/0 scope'
        );
    }

    /**
     * Test 47: DRAFT — value saved at default/0 scope (PUBLISHED status) is inherited by stores/1.
     *
     * E2E regression test for Issue #015 + #016, DRAFT branch.
     *
     * Uses a *real* ValueInheritanceResolver.  The DRAFT branch calls
     * resolveAllValuesWithFallback(draftId, publishedId) which internally calls
     * resolveAllValues() twice — once for PUBLISHED (base layer) and once for DRAFT
     * (override layer).  Both must walk the full scope chain so that the value
     * saved at default/0 with PUBLISHED status is visible in the draft preview.
     */
    public function testDraftCssInheritsColorFromDefaultScopeToStoreView(): void
    {
        // --- StatusProvider: DRAFT = 1, PUBLISHED = 2 ------------------------
        $this->statusProviderMock
            ->method('getStatusId')
            ->willReturnMap([
                ['DRAFT',      1],
                ['PUBLISHED',  2],
            ]);

        // --- ValueService: only default/0 has PUBLISHED data; DRAFT is empty -
        $this->valueServiceMock
            ->method('getValuesByTheme')
            ->willReturnCallback(function (
                int $themeId,
                ScopeInterface $scope,
                int $statusId,
                ?int $userId
            ): array {
                if ($scope->getType() === 'default' && $statusId === 2 /*PUBLISHED*/) {
                    return [[
                        'section_code' => 'header',
                        'setting_code' => 'header_color',
                        'value'        => '#ff0000',
                    ]];
                }
                return [];  // no DRAFT rows, no websites/stores rows
            });

        // --- ConfigProvider --------------------------------------------------
        $this->configProviderMock
            ->method('getConfigurationWithInheritance')
            ->willReturn($this->makeHeaderColorConfig());

        // --- Real resolver wired to store 1 → website 2 ----------------------
        $resolver = $this->createRealResolverWithStoreManager(storeId: 1, websiteId: 2);

        // --- CssGenerator using the real resolver ----------------------------
        $generator = $this->createCssGeneratorWithRealResolver($resolver);

        // --- Scope: stores/1 -------------------------------------------------
        $storesScope = (new ScopeFactory())->create('stores', 1);

        $css = $generator->generate(themeId: 10, scope: $storesScope, status: 'DRAFT');

        $this->assertStringContainsString(
            '--header-color: #ff0000;',
            $css,
            'DRAFT CSS for stores/1 must contain the color saved only at default/0 scope with PUBLISHED status'
        );
    }

    /**
     * Test 43: Local theme font (url is a relative path, not http) → no @import generated
     *
     * When an option carries a theme-relative url like 'web/fonts/MyFont.woff2',
     * the CSS generator must NOT emit an @import — the font is already loaded by
     * the theme's own @font-face rules.  Only external http(s) URLs get @import.
     *
     */
    public function testLocalFontUrlProducesNoImport(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([
            [
                'section_code' => 'typography',
                'setting_code' => 'base_font',
                'value'        => 'MyFont',
            ],
        ]);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn(
            $this->makeFontPickerConfig([
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'MyFont', 'label' => 'My Font', 'url' => 'web/fonts/MyFont.woff2'],
            ])
        );

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringNotContainsString(
            '@import',
            $css,
            'Local theme font (non-http url) must not produce an @import rule'
        );
        $this->assertStringContainsString(
            '--base-font-family: "MyFont", sans-serif;',
            $css,
            'CSS variable must still be emitted even when no @import is generated'
        );
    }

    /**
     * Test 44: PUBLISHED CSS must include values inherited from a broader scope.
     *
     * Regression test for Issue #015.
     *
     * When a value is saved at `default` scope but NOT at `stores/1`,
     * the PUBLISHED branch must walk the full scope chain (via resolveAllValues)
     * so the default-scope value appears in the generated CSS.
     *
     * With the bug the code calls valueService::getValuesByTheme() — a flat,
     * scope-exact query that never looks at parent scopes — so the value is
     * invisible.  After the fix it calls valueInheritanceResolver::resolveAllValues()
     * which walks default → websites → stores and returns the merged set.
     */
    public function testPublishedCssIncludesValuesFromBroaderScope(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        // resolveAllValues() returns the value that lives at the broader (default) scope.
        // This simulates the inheritance resolver doing its job.
        $this->valueInheritanceResolverMock
            ->expects($this->once())
            ->method('resolveAllValues')
            ->willReturn([
                [
                    'section_code' => 'typography',
                    'setting_code' => 'font_size',
                    'value'        => '18px',   // saved at default scope, inherited here
                ],
            ]);

        // The old flat-query path must be completely bypassed after the fix.
        $this->valueServiceMock
            ->expects($this->never())
            ->method('getValuesByTheme');

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id'       => 'typography',
                    'settings' => [
                        [
                            'id'       => 'font_size',
                            'type'     => 'text',
                            'property' => '--font-size-base',
                            'default'  => '16px',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--font-size-base: 18px;',
            $css,
            'PUBLISHED CSS must contain a value inherited from a broader (default) scope'
        );
    }

    /**
     * Test 45: PUBLISHED CSS must include values inherited from a parent theme.
     *
     * Regression test for Issue #015.
     *
     * When a child theme has no saved value for a field but the parent theme does,
     * the PUBLISHED branch must use resolveAllValues() — which walks the theme
     * hierarchy — so the parent-theme value appears in the generated CSS.
     *
     * With the bug the code calls valueService::getValuesByTheme() for the child
     * theme only, so the parent-theme value is silently dropped.
     */
    public function testPublishedCssIncludesValuesFromParentTheme(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        // resolveAllValues() returns the value that was inherited from the parent theme.
        $this->valueInheritanceResolverMock
            ->expects($this->once())
            ->method('resolveAllValues')
            ->willReturn([
                [
                    'section_code' => 'typography',
                    'setting_code' => 'font_size',
                    'value'        => '20px',   // defined in parent theme, not in child
                ],
            ]);

        // The old flat-query path must be completely bypassed after the fix.
        $this->valueServiceMock
            ->expects($this->never())
            ->method('getValuesByTheme');

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id'       => 'typography',
                    'settings' => [
                        [
                            'id'       => 'font_size',
                            'type'     => 'text',
                            'property' => '--font-size-base',
                            'default'  => '16px',
                        ],
                    ],
                ],
            ],
        ]);

        $css = $this->cssGenerator->generate(1, $this->scope, 'PUBLISHED');

        $this->assertStringContainsString(
            '--font-size-base: 20px;',
            $css,
            'PUBLISHED CSS must contain a value inherited from a parent theme'
        );
    }
}

