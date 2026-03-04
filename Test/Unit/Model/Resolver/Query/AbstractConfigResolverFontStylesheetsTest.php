<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Config\PaletteProvider;
use Swissup\BreezeThemeEditor\Model\Config\FontPaletteProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Config;

/**
 * Tests for fontStylesheets extraction in AbstractConfigResolver::formatParams()
 *
 * Verifies that options with a 'url' key are collected into a separate
 * 'fontStylesheets' array on the field params, while options without 'url'
 * are excluded from that array.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\AbstractConfigResolver::formatParams
 */
class AbstractConfigResolverFontStylesheetsTest extends TestCase
{
    private Config $config;

    // Real objects (no mocks)
    private ColorConverter $colorConverter;
    private ColorFormatter $colorFormatter;
    private ColorFormatResolver $colorFormatResolver;

    // Mocked dependencies
    private SerializerInterface $serializerMock;
    private ConfigProvider $configProviderMock;
    private PaletteProvider $paletteProviderMock;
    private FontPaletteProvider $fontPaletteProviderMock;
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private CompareProvider $compareProviderMock;
    private ThemeResolver $themeResolverMock;
    private UserResolver $userResolverMock;

    private Field $fieldMock;
    private ContextInterface $contextMock;
    private ResolveInfo $infoMock;

    protected function setUp(): void
    {
        // Real color utilities
        $this->colorConverter     = new ColorConverter();
        $this->colorFormatter     = new ColorFormatter($this->colorConverter);
        $this->colorFormatResolver = new ColorFormatResolver($this->colorConverter);

        // Mock external dependencies
        $this->serializerMock                 = $this->createMock(SerializerInterface::class);
        $this->configProviderMock             = $this->createMock(ConfigProvider::class);
        $this->paletteProviderMock            = $this->createMock(PaletteProvider::class);
        $this->fontPaletteProviderMock        = $this->createMock(FontPaletteProvider::class);
        $this->valueInheritanceResolverMock   = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock             = $this->createMock(StatusProvider::class);
        $this->compareProviderMock            = $this->createMock(CompareProvider::class);
        $this->themeResolverMock              = $this->createMock(ThemeResolver::class);
        $this->userResolverMock               = $this->createMock(UserResolver::class);

        // GraphQL mocks
        $this->fieldMock   = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2);
        $this->infoMock = $this->createMock(ResolveInfo::class);

        // Serializer passthrough
        $this->serializerMock->method('serialize')->willReturnCallback(function ($value) {
            return json_encode($value);
        });

        // Instantiate real Config resolver
        $this->config = new Config(
            $this->serializerMock,
            $this->configProviderMock,
            $this->paletteProviderMock,
            $this->fontPaletteProviderMock,
            $this->colorFormatResolver,
            $this->colorFormatter,
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->compareProviderMock,
            $this->themeResolverMock,
            $this->userResolverMock
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Set up mocks for a font_picker setting with the given options array.
     */
    private function setupMocksForFontPickerField(array $options): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'version'  => '1.0',
            'sections' => [
                [
                    'id'   => 'typography',
                    'name' => 'Typography',
                    'settings' => [
                        [
                            'id'      => 'base_font',
                            'label'   => 'Base Font',
                            'type'    => 'font_picker',
                            'default' => 'Arial',
                            'options' => $options,
                        ],
                    ],
                ],
            ],
            'presets' => [],
        ]);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn(['typography.base_font' => 'Arial']);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->compareProviderMock->method('compare')->willReturn(['hasChanges' => false, 'changesCount' => 0]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);
    }

    /**
     * Execute the resolver and return the first field from the first section.
     */
    private function getFirstField(): array
    {
        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            ['storeId' => 1, 'status' => 'DRAFT']
        );

        return $result['sections'][0]['fields'][0];
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /**
     * Test 1: Options with no 'url' keys → fontStylesheets absent from params
     */
    public function testNoUrlOptionsProduceNoFontStylesheets(): void
    {
        $this->setupMocksForFontPickerField([
            ['value' => 'Arial',   'label' => 'Arial'],
            ['value' => 'Georgia', 'label' => 'Georgia'],
            ['value' => 'Verdana', 'label' => 'Verdana'],
        ]);

        $field = $this->getFirstField();

        $this->assertArrayNotHasKey(
            'fontStylesheets',
            $field['params'] ?? [],
            'When no options have a url key, fontStylesheets must not appear in params'
        );
        $this->assertEquals(
            'font_picker',
            $field['params']['_fieldType'] ?? null,
            '_fieldType must be set so FieldParamsTypeResolver can dispatch to the correct concrete type'
        );
    }

    /**
     * Test 2: All options have 'url' keys → fontStylesheets contains all of them
     */
    public function testAllUrlOptionsAreCollectedIntoFontStylesheets(): void
    {
        $this->setupMocksForFontPickerField([
            ['value' => 'Roboto',    'label' => 'Roboto',    'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ['value' => 'Open Sans', 'label' => 'Open Sans', 'url' => 'https://fonts.googleapis.com/css2?family=Open+Sans'],
        ]);

        $field = $this->getFirstField();

        $stylesheets = $field['params']['fontStylesheets'] ?? null;

        $this->assertNotNull($stylesheets, 'fontStylesheets must be present when options have url keys');
        $this->assertCount(2, $stylesheets);

        $this->assertEquals('Roboto',    $stylesheets[0]['value']);
        $this->assertEquals('https://fonts.googleapis.com/css2?family=Roboto', $stylesheets[0]['url']);

        $this->assertEquals('Open Sans', $stylesheets[1]['value']);
        $this->assertEquals('https://fonts.googleapis.com/css2?family=Open+Sans', $stylesheets[1]['url']);
    }

    /**
     * Test 3: Mix of options with and without 'url' → only url-bearing options appear in fontStylesheets
     */
    public function testMixedOptionsOnlyUrlOnesAppearInFontStylesheets(): void
    {
        $this->setupMocksForFontPickerField([
            ['value' => 'Arial',     'label' => 'Arial'],                      // no url
            ['value' => 'Georgia',   'label' => 'Georgia'],                    // no url
            ['value' => 'Roboto',    'label' => 'Roboto',    'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ['value' => 'Lato',      'label' => 'Lato',      'url' => 'https://fonts.googleapis.com/css2?family=Lato'],
            ['value' => 'Verdana',   'label' => 'Verdana'],                    // no url
        ]);

        $field = $this->getFirstField();

        $stylesheets = $field['params']['fontStylesheets'] ?? null;

        $this->assertNotNull($stylesheets, 'fontStylesheets must be present');
        $this->assertCount(2, $stylesheets, 'Only options with url should appear in fontStylesheets');

        $values = array_column($stylesheets, 'value');
        $this->assertContains('Roboto', $values);
        $this->assertContains('Lato',   $values);
        $this->assertNotContains('Arial',   $values);
        $this->assertNotContains('Georgia', $values);
        $this->assertNotContains('Verdana', $values);
    }

    /**
     * Test 4: Setting with no 'options' key at all → no fontStylesheets
     */
    public function testSettingWithNoOptionsKeyProducesNoFontStylesheets(): void
    {
        // Use a setting without options at all
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'version'  => '1.0',
            'sections' => [
                [
                    'id'   => 'typography',
                    'name' => 'Typography',
                    'settings' => [
                        [
                            'id'      => 'font_size',
                            'label'   => 'Font Size',
                            'type'    => 'range',
                            'default' => '16',
                            'min'     => 10,
                            'max'     => 32,
                            // no 'options' key
                        ],
                    ],
                ],
            ],
            'presets' => [],
        ]);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn(['typography.font_size' => '16']);
        $this->configProviderMock->method('getMetadata')->willReturn(['themeId' => 1]);
        $this->compareProviderMock->method('compare')->willReturn(['hasChanges' => false, 'changesCount' => 0]);
        $this->paletteProviderMock->method('getPalettes')->willReturn([]);

        $result = $this->config->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            ['storeId' => 1, 'status' => 'DRAFT']
        );

        $field = $result['sections'][0]['fields'][0];

        $this->assertArrayNotHasKey(
            'fontStylesheets',
            $field['params'] ?? [],
            'A setting without an options key must not produce fontStylesheets'
        );
        $this->assertEquals(
            'range',
            $field['params']['_fieldType'] ?? null,
            '_fieldType must be set for range fields'
        );
    }

    /**
     * Test 5: Options array is still present in params alongside fontStylesheets
     */
    public function testRegularOptionsArrayIsPreservedAlongsideFontStylesheets(): void
    {
        $this->setupMocksForFontPickerField([
            ['value' => 'Arial',  'label' => 'Arial'],
            ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
        ]);

        $field = $this->getFirstField();

        $this->assertArrayHasKey(
            'options',
            $field['params'] ?? [],
            'The regular options array must still be present in params'
        );
        $this->assertCount(2, $field['params']['options'], 'Both options should appear in the regular options array');

        $this->assertArrayHasKey(
            'fontStylesheets',
            $field['params'] ?? [],
            'fontStylesheets must also be present'
        );
        $this->assertCount(1, $field['params']['fontStylesheets'], 'Only the url-bearing option should be in fontStylesheets');
    }
}
