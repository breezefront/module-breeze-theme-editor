<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Config;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Data\Scope;

/**
 * Tests for auto-generation of the _font_palette synthetic section.
 *
 * Covers:
 *   - AbstractConfigResolver::mergeFontPaletteRolesAsFields()
 *   - backward-compat guard in mergeSectionsWithValues()
 *   - collectFontPaletteProperties() (via guard)
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\AbstractConfigResolver
 */
class AbstractConfigResolverFontPaletteAutoGenTest extends TestCase
{
    /** Default font palettes returned by FontPaletteProvider */
    private array $defaultFontPalettes = [
        [
            'id'      => 'default',
            'label'   => 'Default Font Palette',
            'options' => [
                ['value' => 'system-ui, sans-serif', 'label' => 'System UI', 'url' => null],
                ['value' => 'Arial, sans-serif',     'label' => 'Arial',     'url' => null],
            ],
            'fonts' => [
                [
                    'id'       => 'primary',
                    'label'    => 'Primary',
                    'property' => '--primary-font',
                    'default'  => 'system-ui, sans-serif',
                ],
                [
                    'id'       => 'secondary',
                    'label'    => 'Secondary',
                    'property' => '--secondary-font',
                    'default'  => 'system-ui, sans-serif',
                ],
            ],
        ],
    ];

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a fresh Config resolver with given mock values.
     *
     * @param array $themeConfig       - what getConfigurationWithInheritance() returns
     * @param array $fontPalettes      - what getFontPalettes() returns (default: $this->defaultFontPalettes)
     * @param array $savedValues       - what resolveAllValues() returns
     * @return array{resolver: Config, field: Field, context: ContextInterface, info: ResolveInfo}
     */
    private function buildResolver(
        array $themeConfig,
        ?array $fontPalettes = null,
        array $savedValues = []
    ): array {
        $colorConverter      = new ColorConverter();
        $colorPipeline       = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );

        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getConfigurationWithInheritance')->willReturn($themeConfig);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getMetadata')->willReturn(['themeId' => 1]);

        $fontPaletteProvider = $this->createMock(FontPaletteProvider::class);
        $fontPaletteProvider->method('getFontPalettes')
            ->willReturn($fontPalettes ?? $this->defaultFontPalettes);

        $paletteProvider = $this->createMock(PaletteProvider::class);
        $paletteProvider->method('getPalettes')->willReturn([]);

        $valueInheritanceResolver = $this->createMock(ValueInheritanceResolver::class);
        $valueInheritanceResolver->method('resolveAllValues')->willReturn($savedValues);
        $valueInheritanceResolver->method('resolveAllValuesWithFallback')->willReturn($savedValues);

        $statusProvider = $this->createMock(StatusProvider::class);
        $statusProvider->method('getStatusId')->willReturn(1);

        $compareProvider = $this->createMock(CompareProvider::class);
        $compareProvider->method('compare')->willReturn(['hasChanges' => false, 'changesCount' => 0]);

        $themeResolver = $this->createMock(ThemeResolver::class);
        $userResolver  = $this->createMock(UserResolver::class);
        $userResolver->method('getCurrentUserId')->willReturn(1);

        $scopeFactory = $this->createMock(ScopeFactory::class);
        $scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new Scope($type, $scopeId)
        );

        $fieldMock = $this->createMock(Field::class);

        $context = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $context->method('getUserId')->willReturn(1);
        $context->method('getUserType')->willReturn(2);

        $info = $this->createMock(ResolveInfo::class);

        $resolver = new Config(
            $serializer,
            $configProvider,
            $paletteProvider,
            $fontPaletteProvider,
            $colorPipeline,
            $valueInheritanceResolver,
            $statusProvider,
            $compareProvider,
            $themeResolver,
            $userResolver,
            $scopeFactory
        );

        return compact('resolver', 'fieldMock', 'context', 'info');
    }

    /**
     * Resolve and return sections array.
     */
    private function resolve(array $themeConfig, ?array $fontPalettes = null, array $savedValues = []): array
    {
        ['resolver' => $resolver, 'fieldMock' => $field, 'context' => $context, 'info' => $info]
            = $this->buildResolver($themeConfig, $fontPalettes, $savedValues);

        $result = $resolver->resolve(
            $field, $context, $info, null,
            ['storeId' => 1, 'status' => 'DRAFT']
        );

        return $result['sections'];
    }

    private function findSection(array $sections, string $code): ?array
    {
        foreach ($sections as $section) {
            if ($section['code'] === $code) {
                return $section;
            }
        }
        return null;
    }

    private function baseConfig(array $sectionSettings = []): array
    {
        return [
            'version'       => '1.0',
            'sections'      => [['id' => 'typography', 'name' => 'Typography', 'settings' => $sectionSettings]],
            'font_palettes' => [],
            'presets'       => [],
        ];
    }

    // -------------------------------------------------------------------------
    // Tests — _font_palette section generation
    // -------------------------------------------------------------------------

    /**
     * Test 1: _font_palette section is generated when font_palettes.fonts[] is defined
     */
    public function testFontPaletteSectionIsGenerated(): void
    {
        $sections = $this->resolve($this->baseConfig());

        $fontSection = $this->findSection($sections, '_font_palette');
        $this->assertNotNull($fontSection, '_font_palette section must be present in sections');
    }

    /**
     * Test 2: _font_palette section is absent when no font palettes defined
     */
    public function testFontPaletteSectionAbsentWhenNoPalettes(): void
    {
        $sections = $this->resolve($this->baseConfig(), []);

        $fontSection = $this->findSection($sections, '_font_palette');
        $this->assertNull($fontSection, '_font_palette section must be absent when no font palettes defined');
    }

    /**
     * Test 3: _font_palette fields have correct code, type, property, fontPalette, label, default
     */
    public function testFontPaletteSectionFieldsHaveCorrectStructure(): void
    {
        $sections = $this->resolve($this->baseConfig());

        $fontSection = $this->findSection($sections, '_font_palette');
        $this->assertNotNull($fontSection);

        $fields = $fontSection['fields'];
        $this->assertCount(2, $fields, 'Should have 2 role fields (primary + secondary)');

        $primary = $fields[0];
        $this->assertSame('primary-font',           $primary['code']);
        $this->assertSame('FONT_PICKER',             $primary['type']);
        $this->assertSame('--primary-font',          $primary['property']);
        $this->assertSame('default',                 $primary['fontPalette']);
        $this->assertSame('Primary',                 $primary['label']);
        $this->assertSame('system-ui, sans-serif',   $primary['default']);
        $this->assertNull($primary['value'],         'value must be null when not saved');
        $this->assertFalse($primary['isModified'],   'isModified must be false when value is null');
    }

    /**
     * Test 4: saved value from valuesMap is placed into field value and isModified=true
     */
    public function testSavedValueAppearsInFontPaletteField(): void
    {
        $sections = $this->resolve(
            $this->baseConfig(),
            null,
            [['section_code' => '_font_palette', 'setting_code' => 'primary-font', 'value' => 'Arial, sans-serif']]
        );

        $fontSection = $this->findSection($sections, '_font_palette');
        $primary = array_values(array_filter(
            $fontSection['fields'],
            fn($f) => $f['code'] === 'primary-font'
        ))[0];

        $this->assertSame('Arial, sans-serif', $primary['value']);
        $this->assertTrue($primary['isModified'], 'isModified must be true when saved value differs from default');
    }

    /**
     * Test 5: isModified is false when saved value equals default
     */
    public function testIsModifiedFalseWhenValueEqualsDefault(): void
    {
        $sections = $this->resolve(
            $this->baseConfig(),
            null,
            [['section_code' => '_font_palette', 'setting_code' => 'primary-font', 'value' => 'system-ui, sans-serif']]
        );

        $fontSection = $this->findSection($sections, '_font_palette');
        $primary = array_values(array_filter(
            $fontSection['fields'],
            fn($f) => $f['code'] === 'primary-font'
        ))[0];

        $this->assertFalse($primary['isModified'], 'isModified must be false when saved value equals default');
    }

    /**
     * Test 6: backward-compat guard — legacy font_picker role entries in sections are skipped
     * when their property matches an auto-generated font palette role.
     */
    public function testLegacyRoleEntriesInSectionsAreSkipped(): void
    {
        $themeConfig = [
            'version' => '1.0',
            'sections' => [
                [
                    'id'       => 'typography',
                    'name'     => 'Typography',
                    'settings' => [
                        // Legacy role entry — should be skipped by guard
                        [
                            'id'           => 'primary-font',
                            'label'        => 'Primary Font',
                            'type'         => 'font_picker',
                            'property'     => '--primary-font',
                            'font_palette' => 'default',
                            'default'      => 'system-ui, sans-serif',
                        ],
                        // Non-role field — must remain
                        [
                            'id'      => 'font-size',
                            'label'   => 'Font Size',
                            'type'    => 'range',
                            'default' => '16',
                        ],
                    ],
                ],
            ],
            'font_palettes' => [
                'default' => [
                    'fonts' => [
                        ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                    ],
                ],
            ],
            'presets' => [],
        ];

        $sections = $this->resolve($themeConfig);

        $typographySection = $this->findSection($sections, 'typography');
        $this->assertNotNull($typographySection);

        $fieldCodes = array_column($typographySection['fields'], 'code');

        $this->assertNotContains(
            'primary-font',
            $fieldCodes,
            'Legacy font_picker role entry must be skipped by backward-compat guard'
        );
        $this->assertContains(
            'font-size',
            $fieldCodes,
            'Non-role fields must still be included in the section'
        );
    }

    /**
     * Test 7: guard does NOT skip font_picker entries without property
     */
    public function testFontPickerWithoutPropertyIsNotSkipped(): void
    {
        $themeConfig = [
            'version' => '1.0',
            'sections' => [
                [
                    'id'       => 'typography',
                    'name'     => 'Typography',
                    'settings' => [
                        [
                            'id'           => 'custom-font',
                            'label'        => 'Custom Font',
                            'type'         => 'font_picker',
                            'font_palette' => 'default',
                            // no 'property' key
                            'default'      => 'Arial, sans-serif',
                        ],
                    ],
                ],
            ],
            'font_palettes' => [
                'default' => [
                    'fonts' => [
                        ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                    ],
                ],
            ],
            'presets' => [],
        ];

        $sections = $this->resolve($themeConfig);

        $typographySection = $this->findSection($sections, 'typography');
        $fieldCodes = array_column($typographySection['fields'], 'code');

        $this->assertContains(
            'custom-font',
            $fieldCodes,
            'font_picker without a property key must not be skipped by the guard'
        );
    }

    /**
     * Test 8: guard does NOT skip font_picker entries whose property is not in font_palettes
     */
    public function testFontPickerWithUnrelatedPropertyIsNotSkipped(): void
    {
        $themeConfig = [
            'version' => '1.0',
            'sections' => [
                [
                    'id'       => 'typography',
                    'name'     => 'Typography',
                    'settings' => [
                        [
                            'id'           => 'base-font',
                            'label'        => 'Base Font',
                            'type'         => 'font_picker',
                            'property'     => '--base-font',   // not a palette role property
                            'font_palette' => 'default',
                            'default'      => 'Arial, sans-serif',
                        ],
                    ],
                ],
            ],
            'font_palettes' => [
                'default' => [
                    'fonts' => [
                        ['id' => 'primary', 'label' => 'Primary', 'property' => '--primary-font', 'default' => 'system-ui'],
                    ],
                ],
            ],
            'presets' => [],
        ];

        $sections = $this->resolve($themeConfig);

        $typographySection = $this->findSection($sections, 'typography');
        $fieldCodes = array_column($typographySection['fields'], 'code');

        $this->assertContains(
            'base-font',
            $fieldCodes,
            'font_picker whose property is not a palette role must not be skipped'
        );
    }
}
