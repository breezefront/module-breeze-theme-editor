<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Config;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider
 */
class FontPaletteProviderTest extends TestCase
{
    private FontPaletteProvider $provider;
    private ConfigProvider $configProvider;

    protected function setUp(): void
    {
        $this->configProvider = $this->createMock(ConfigProvider::class);
        $this->provider = new FontPaletteProvider($this->configProvider);
    }

    // -------------------------------------------------------------------------
    // Empty / missing data
    // -------------------------------------------------------------------------

    public function testReturnsEmptyArrayWhenFontPalettesKeyAbsent(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([]);

        $this->assertSame([], $this->provider->getFontPalettes(1));
    }

    public function testReturnsEmptyArrayWhenFontPalettesIsEmpty(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn(['font_palettes' => []]);

        $this->assertSame([], $this->provider->getFontPalettes(1));
    }

    // -------------------------------------------------------------------------
    // Single palette — structure
    // -------------------------------------------------------------------------

    public function testPaletteKeyBecomesId(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'my_palette' => [
                        'label'   => 'My Palette',
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertCount(1, $result);
        $this->assertSame('my_palette', $result[0]['id']);
    }

    public function testPaletteLabelIsUsedWhenPresent(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Brand Fonts',
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame('Brand Fonts', $result[0]['label']);
    }

    public function testPaletteIdUsedAsFallbackLabelWhenLabelAbsent(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'my_palette' => [
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame('my_palette', $result[0]['label']);
    }

    // -------------------------------------------------------------------------
    // Options
    // -------------------------------------------------------------------------

    public function testOptionsAreMappedCorrectly(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [
                            [
                                'value' => 'system-ui, sans-serif',
                                'label' => 'System UI',
                                'url'   => 'https://example.com/system.css',
                            ],
                        ],
                        'fonts' => [],
                    ],
                ],
            ]);

        $result  = $this->provider->getFontPalettes(1);
        $options = $result[0]['options'];

        $this->assertCount(1, $options);
        $this->assertSame('system-ui, sans-serif',            $options[0]['value']);
        $this->assertSame('System UI',                        $options[0]['label']);
        $this->assertSame('https://example.com/system.css',   $options[0]['url']);
    }

    public function testOptionUrlIsNullWhenAbsent(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [
                            ['value' => 'Arial, sans-serif', 'label' => 'Arial'],
                        ],
                        'fonts' => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertNull($result[0]['options'][0]['url']);
    }

    public function testEmptyOptionsKeyProducesEmptyOptionsArray(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame([], $result[0]['options']);
    }

    public function testMissingOptionsKeyProducesEmptyOptionsArray(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label' => 'Default',
                        'fonts' => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame([], $result[0]['options']);
    }

    // -------------------------------------------------------------------------
    // Fonts (role definitions)
    // -------------------------------------------------------------------------

    public function testFontsAreMappedCorrectly(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [],
                        'fonts'   => [
                            [
                                'id'       => 'primary',
                                'label'    => 'Primary',
                                'property' => '--primary-font',
                                'default'  => 'system-ui, sans-serif',
                            ],
                        ],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);
        $fonts  = $result[0]['fonts'];

        $this->assertCount(1, $fonts);
        $this->assertSame('primary',             $fonts[0]['id']);
        $this->assertSame('Primary',             $fonts[0]['label']);
        $this->assertSame('--primary-font',      $fonts[0]['property']);
        $this->assertSame('system-ui, sans-serif', $fonts[0]['default']);
    }

    public function testEmptyFontsKeyProducesEmptyFontsArray(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame([], $result[0]['fonts']);
    }

    public function testMissingFontsKeyProducesEmptyFontsArray(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertSame([], $result[0]['fonts']);
    }

    public function testFontFieldsDefaultToEmptyStringWhenKeysAbsent(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'default' => [
                        'label'   => 'Default',
                        'options' => [],
                        'fonts'   => [
                            [],   // completely empty font entry
                        ],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);
        $font   = $result[0]['fonts'][0];

        $this->assertSame('', $font['id']);
        $this->assertSame('', $font['label']);
        $this->assertSame('', $font['property']);
        $this->assertSame('', $font['default']);
    }

    // -------------------------------------------------------------------------
    // Multiple palettes
    // -------------------------------------------------------------------------

    public function testMultiplePalettesAreReturnedInDefinitionOrder(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'brand'   => ['label' => 'Brand',   'options' => [], 'fonts' => []],
                    'minimal' => ['label' => 'Minimal', 'options' => [], 'fonts' => []],
                    'bold'    => ['label' => 'Bold',    'options' => [], 'fonts' => []],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertCount(3, $result);
        $this->assertSame('brand',   $result[0]['id']);
        $this->assertSame('minimal', $result[1]['id']);
        $this->assertSame('bold',    $result[2]['id']);
    }

    public function testEachPaletteHasIndependentOptionsAndFonts(): void
    {
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'font_palettes' => [
                    'a' => [
                        'label'   => 'A',
                        'options' => [['value' => 'Arial', 'label' => 'Arial']],
                        'fonts'   => [
                            ['id' => 'primary', 'label' => 'Primary', 'property' => '--pf', 'default' => 'Arial'],
                        ],
                    ],
                    'b' => [
                        'label'   => 'B',
                        'options' => [],
                        'fonts'   => [],
                    ],
                ],
            ]);

        $result = $this->provider->getFontPalettes(1);

        $this->assertCount(1, $result[0]['options']);
        $this->assertCount(1, $result[0]['fonts']);
        $this->assertCount(0, $result[1]['options']);
        $this->assertCount(0, $result[1]['fonts']);
    }

    // -------------------------------------------------------------------------
    // ConfigProvider integration — correct themeId forwarded
    // -------------------------------------------------------------------------

    public function testPassesThemeIdToConfigProvider(): void
    {
        $this->configProvider
            ->expects($this->once())
            ->method('getConfigurationWithInheritance')
            ->with(42)
            ->willReturn([]);

        $this->provider->getFontPalettes(42);
    }
}
