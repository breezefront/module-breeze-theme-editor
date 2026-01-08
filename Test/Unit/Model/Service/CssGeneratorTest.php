<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class CssGeneratorTest extends TestCase
{
    private CssGenerator $cssGenerator;
    private ValueService|MockObject $valueServiceMock;
    private StatusProvider|MockObject $statusProviderMock;
    private ConfigProvider|MockObject $configProviderMock;

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
     * Test: Empty values should return empty string
     */
    public function testGenerateWithNoValues(): void
    {
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(1);

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with(1, 1, 1, null)
            ->willReturn([]);

        $result = $this->cssGenerator->generate(1, 1, 'PUBLISHED');

        $this->assertEmpty($result);
    }

    /**
     * Test: COLOR type - HEX to RGB conversion
     */
    public function testColorTypeHexToRgb(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#FF0000'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'primary',
                            'type' => 'color',
                            'css_var' => '--primary-color'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString(':root {', $result);
        $this->assertStringContainsString('--primary-color: 255, 0, 0;', $result);
        $this->assertStringContainsString('/* #FF0000 */', $result);
    }

    /**
     * Test: COLOR type - Short HEX (#FFF)
     */
    public function testColorTypeShortHex(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'white',
                'value' => '#FFF'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'white',
                            'type' => 'color',
                            'css_var' => '--white'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--white: 255, 255, 255;', $result);
    }

    /**
     * Test: COLOR type - RGB value (should pass through)
     */
    public function testColorTypeRgbPassThrough(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'text',
                'value' => 'rgb(17, 24, 39)'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'text',
                            'type' => 'color',
                            'css_var' => '--text-color'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        // Should pass through as-is since it doesn't start with #
        $this->assertStringContainsString('--text-color: rgb(17, 24, 39);', $result);
    }

    /**
     * Test: TOGGLE type - boolean to "1"/"0"
     */
    public function testToggleTypeTrueValue(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'header',
                'setting_code' => 'sticky',
                'value' => true
            ]
        ], [
            'sections' => [
                [
                    'id' => 'header',
                    'settings' => [
                        [
                            'id' => 'sticky',
                            'type' => 'toggle',
                            'css_var' => '--header-sticky'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--header-sticky: 1;', $result);
    }

    /**
     * Test: TOGGLE type - false value
     */
    public function testToggleTypeFalseValue(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'header',
                'setting_code' => 'sticky',
                'value' => false
            ]
        ], [
            'sections' => [
                [
                    'id' => 'header',
                    'settings' => [
                        [
                            'id' => 'sticky',
                            'type' => 'toggle',
                            'css_var' => '--header-sticky'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--header-sticky: 0;', $result);
    }

    /**
     * Test: FONT_PICKER type - adds fallback
     */
    public function testFontPickerAddsFallback(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'typography',
                'setting_code' => 'body_font',
                'value' => 'Open Sans'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'body_font',
                            'type' => 'font_picker',
                            'css_var' => '--font-family-base'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--font-family-base: "Open Sans", sans-serif;', $result);
    }

    /**
     * Test: FONT_PICKER type - already quoted
     */
    public function testFontPickerAlreadyQuoted(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'typography',
                'setting_code' => 'body_font',
                'value' => '"Roboto", Arial, sans-serif'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'typography',
                    'settings' => [
                        [
                            'id' => 'body_font',
                            'type' => 'font_picker',
                            'css_var' => '--font-family-base'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        // Should not double-quote
        $this->assertStringContainsString('--font-family-base: "Roboto", Arial, sans-serif;', $result);
    }

    /**
     * Test: TEXTAREA type - escapes CSS comments
     */
    public function testTextareaEscapesComments(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'advanced',
                'setting_code' => 'custom_css',
                'value' => '/* comment */ body { color: red; }'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'advanced',
                    'settings' => [
                        [
                            'id' => 'custom_css',
                            'type' => 'textarea',
                            'css_var' => '--custom-css'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        // Should escape /* and */
        $this->assertStringContainsString('/ *', $result);
        $this->assertStringContainsString('* /', $result);
        $this->assertStringNotContainsString('/*', $result);
    }

    /**
     * Test: NUMBER, RANGE, SELECT, TEXT types - pass through as string
     */
    public function testSimpleTypesPassThrough(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'layout',
                'setting_code' => 'columns',
                'value' => '3'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'opacity',
                'value' => '0.8'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'width',
                'value' => '1280px'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'sidebar',
                'value' => '220px'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'layout',
                    'settings' => [
                        [
                            'id' => 'columns',
                            'type' => 'number',
                            'css_var' => '--columns'
                        ],
                        [
                            'id' => 'opacity',
                            'type' => 'range',
                            'css_var' => '--opacity'
                        ],
                        [
                            'id' => 'width',
                            'type' => 'select',
                            'css_var' => '--width'
                        ],
                        [
                            'id' => 'sidebar',
                            'type' => 'text',
                            'css_var' => '--sidebar-width'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--columns: 3;', $result);
        $this->assertStringContainsString('--opacity: 0.8;', $result);
        $this->assertStringContainsString('--width: 1280px;', $result);
        $this->assertStringContainsString('--sidebar-width: 220px;', $result);
    }

    /**
     * Test: Skip fields with default values
     */
    public function testSkipsDefaultValues(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#1979c3'  // Same as default
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'primary',
                            'type' => 'color',
                            'css_var' => '--primary',
                            'default' => '#1979c3'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        // Should not contain the variable since it's default
        $this->assertStringNotContainsString('--primary:', $result);
        $this->assertEquals(":root {\n}\n", $result);
    }

    /**
     * Test: Skip fields without css_var
     */
    public function testSkipsFieldsWithoutCssVar(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'meta',
                'setting_code' => 'version',
                'value' => '1.0.0'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'meta',
                    'settings' => [
                        [
                            'id' => 'version',
                            'type' => 'text'
                            // No css_var
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringNotContainsString('1.0.0', $result);
        $this->assertEquals(":root {\n}\n", $result);
    }

    /**
     * Test: !important flag
     */
    public function testImportantFlag(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'override',
                'value' => '#FF0000'
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'override',
                            'type' => 'color',
                            'css_var' => '--override-color',
                            'important' => true
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--override-color: 255, 0, 0 !important;', $result);
    }

    /**
     * Test: Multiple values generate correct CSS
     */
    public function testMultipleValuesGeneration(): void
    {
        $this->setupMocks([
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#FF0000'
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'width',
                'value' => '1280px'
            ],
            [
                'section_code' => 'header',
                'setting_code' => 'sticky',
                'value' => true
            ]
        ], [
            'sections' => [
                [
                    'id' => 'colors',
                    'settings' => [
                        [
                            'id' => 'primary',
                            'type' => 'color',
                            'css_var' => '--primary-color'
                        ]
                    ]
                ],
                [
                    'id' => 'layout',
                    'settings' => [
                        [
                            'id' => 'width',
                            'type' => 'select',
                            'css_var' => '--container-width'
                        ]
                    ]
                ],
                [
                    'id' => 'header',
                    'settings' => [
                        [
                            'id' => 'sticky',
                            'type' => 'toggle',
                            'css_var' => '--header-sticky'
                        ]
                    ]
                ]
            ]
        ]);

        $result = $this->cssGenerator->generate(1, 1);

        $this->assertStringContainsString('--primary-color: 255, 0, 0;', $result);
        $this->assertStringContainsString('--container-width: 1280px;', $result);
        $this->assertStringContainsString('--header-sticky: 1;', $result);
    }

    /**
     * Helper: Setup mocks for tests
     */
    private function setupMocks(array $values, array $config): void
    {
        $this->statusProviderMock->method('getStatusId')
            ->willReturn(1);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturn($values);

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);
    }
}
