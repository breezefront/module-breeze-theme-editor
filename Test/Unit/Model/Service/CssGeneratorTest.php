<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

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
    
    protected function setUp(): void
    {
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        
        $this->cssGenerator = new CssGenerator(
            $this->valueServiceMock,
            $this->statusProviderMock,
            $this->configProviderMock
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
}
