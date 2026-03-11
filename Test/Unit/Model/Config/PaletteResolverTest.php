<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Config;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteResolver;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;

class PaletteResolverTest extends TestCase
{
    private PaletteResolver $paletteResolver;
    private ConfigProvider $configProvider;
    private ValueInheritanceResolver $valueInheritanceResolver;
    private PaletteProvider $paletteProvider;

    protected function setUp(): void
    {
        $this->configProvider = $this->createMock(ConfigProvider::class);
        $this->valueInheritanceResolver = $this->createMock(ValueInheritanceResolver::class);
        $this->paletteProvider = $this->createMock(PaletteProvider::class);

        $this->paletteResolver = new PaletteResolver(
            $this->configProvider,
            $this->valueInheritanceResolver,
            $this->paletteProvider
        );
    }

    public function testReturnsOriginalValueWhenNotCssVariable(): void
    {
        // Act
        $result = $this->paletteResolver->resolve('#ff0000', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#ff0000', $result);
    }

    public function testReturnsOriginalValueWhenNotColorVariable(): void
    {
        // Act
        $result = $this->paletteResolver->resolve('var(--spacing-large)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('var(--spacing-large)', $result);
    }

    public function testReturnsOriginalValueWhenInvalidCssVariableFormat(): void
    {
        // Act
        $result = $this->paletteResolver->resolve('var(--color-', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('var(--color-', $result);
    }

    public function testResolvesCustomPaletteValueFromDatabase(): void
    {
        // Arrange
        $this->valueInheritanceResolver->expects($this->once())
            ->method('resolveSingleValue')
            ->with(5, $this->isInstanceOf(ScopeInterface::class), 1, '_palette', '--color-brand-primary', null)
            ->willReturn(['value' => '#123456']);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-brand-primary)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#123456', $result);
    }

    public function testConvertsLegacyRgbToHex(): void
    {
        // Arrange
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => '255, 0, 0']);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-brand-primary)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#ff0000', $result);
    }

    public function testFallsBackToDefaultWhenNoCustomValue(): void
    {
        // Arrange
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => null]);

        $this->configProvider->expects($this->once())
            ->method('getConfigurationWithInheritance')
            ->with(5)
            ->willReturn([
                'palettes' => [
                    [
                        'groups' => [
                            [
                                'colors' => [
                                    [
                                        'css_var' => '--color-brand-primary',
                                        'default' => '#1979c3'
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-brand-primary)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#1979c3', $result);
    }

    public function testReturnsBlackWhenColorNotFoundInDefaults(): void
    {
        // Arrange
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => null]);

        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'palettes' => [
                    [
                        'groups' => [
                            [
                                'colors' => [
                                    [
                                        'css_var' => '--color-other',
                                        'default' => '#ffffff'
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-not-found)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#000000', $result);
    }

    public function testReturnsBlackWhenNoPalettesInConfig(): void
    {
        // Arrange
        $this->valueInheritanceResolver->method('resolveSingleValue')
            ->willReturn(['value' => null]);

        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([]);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-brand-primary)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#000000', $result);
    }

    public function testGetFieldsUsingColorFindsMatchingFields(): void
    {
        // Arrange
        $this->configProvider->expects($this->once())
            ->method('getConfigurationWithInheritance')
            ->with(5)
            ->willReturn([
                'sections' => [
                    [
                        'id' => 'header',
                        'settings' => [
                            [
                                'id' => 'bg_color',
                                'label' => 'Background Color',
                                'default' => 'var(--color-brand-primary)'
                            ],
                            [
                                'id' => 'text_color',
                                'label' => 'Text Color',
                                'default' => '#ffffff'
                            ]
                        ]
                    ],
                    [
                        'id' => 'footer',
                        'settings' => [
                            [
                                'id' => 'link_color',
                                'label' => 'Link Color',
                                'default' => 'var(--color-brand-primary)'
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->getFieldsUsingColor('--color-brand-primary', 5);

        // Assert
        $this->assertCount(2, $result);
        $this->assertEquals('header', $result[0]['section']);
        $this->assertEquals('bg_color', $result[0]['field']);
        $this->assertEquals('Background Color', $result[0]['label']);
        $this->assertEquals('footer', $result[1]['section']);
        $this->assertEquals('link_color', $result[1]['field']);
        $this->assertEquals('Link Color', $result[1]['label']);
    }

    public function testGetFieldsUsingColorReturnsEmptyWhenNoMatches(): void
    {
        // Arrange
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'sections' => [
                    [
                        'id' => 'header',
                        'settings' => [
                            [
                                'id' => 'bg_color',
                                'label' => 'Background Color',
                                'default' => '#ff0000'
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->getFieldsUsingColor('--color-brand-primary', 5);

        // Assert
        $this->assertEmpty($result);
    }

    public function testGetFieldsUsingColorFallsBackToFieldIdForLabel(): void
    {
        // Arrange
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'sections' => [
                    [
                        'id' => 'colors',
                        'settings' => [
                            [
                                'id' => 'primary',
                                'default' => 'var(--color-brand-primary)'
                                // Missing 'label'
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->getFieldsUsingColor('--color-brand-primary', 5);

        // Assert
        $this->assertCount(1, $result);
        $this->assertEquals('primary', $result[0]['label']);
    }

    public function testGetFieldsUsingColorHandlesNonStringDefaults(): void
    {
        // Arrange
        $this->configProvider->method('getConfigurationWithInheritance')
            ->willReturn([
                'sections' => [
                    [
                        'id' => 'layout',
                        'settings' => [
                            [
                                'id' => 'width',
                                'default' => 1200 // Non-string default
                            ],
                            [
                                'id' => 'color',
                                'default' => 'var(--color-brand-primary)'
                            ]
                        ]
                    ]
                ]
            ]);

        // Act
        $result = $this->paletteResolver->getFieldsUsingColor('--color-brand-primary', 5);

        // Assert
        $this->assertCount(1, $result);
        $this->assertEquals('color', $result[0]['field']);
    }

    public function testExtractsCssVariableNameCorrectly(): void
    {
        // Arrange
        $this->valueInheritanceResolver->expects($this->once())
            ->method('resolveSingleValue')
            ->with(5, $this->isInstanceOf(ScopeInterface::class), 1, '_palette', '--color-brand-secondary', null)
            ->willReturn(['value' => '#abcdef']);

        // Act
        $result = $this->paletteResolver->resolve('var(--color-brand-secondary)', new Scope('stores', 1), 5);

        // Assert
        $this->assertEquals('#abcdef', $result);
    }
}
