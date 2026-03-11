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
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

/**
 * Tests for AbstractConfigResolver::formatParams() — one test per concrete params type.
 *
 * Verifies that:
 *  - Each field type emits the correct params structure
 *  - The '_fieldType' key is always set (used by FieldParamsTypeResolver)
 *  - Types with no relevant params return null
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\AbstractConfigResolver::formatParams
 */
class AbstractConfigResolverParamsTest extends TestCase
{
    private Config $config;

    private ColorConverter $colorConverter;
    private ColorFormatter $colorFormatter;
    private ColorFormatResolver $colorFormatResolver;

    private SerializerInterface $serializerMock;
    private ConfigProvider $configProviderMock;
    private PaletteProvider $paletteProviderMock;
    private FontPaletteProvider $fontPaletteProviderMock;
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private CompareProvider $compareProviderMock;
    private ThemeResolver $themeResolverMock;
    private UserResolver $userResolverMock;
    private ScopeFactory $scopeFactory;
    private ScopeInterface $scopeMock;

    private Field $fieldMock;
    private ContextInterface $contextMock;
    private ResolveInfo $infoMock;

    protected function setUp(): void
    {
        $this->colorConverter      = new ColorConverter();
        $this->colorFormatter      = new ColorFormatter($this->colorConverter);
        $this->colorFormatResolver = new ColorFormatResolver($this->colorConverter);

        $this->serializerMock               = $this->createMock(SerializerInterface::class);
        $this->configProviderMock           = $this->createMock(ConfigProvider::class);
        $this->paletteProviderMock          = $this->createMock(PaletteProvider::class);
        $this->fontPaletteProviderMock      = $this->createMock(FontPaletteProvider::class);
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock           = $this->createMock(StatusProvider::class);
        $this->compareProviderMock          = $this->createMock(CompareProvider::class);
        $this->themeResolverMock            = $this->createMock(ThemeResolver::class);
        $this->userResolverMock             = $this->createMock(UserResolver::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );

        $this->fieldMock   = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2);
        $this->infoMock = $this->createMock(ResolveInfo::class);

        $this->serializerMock->method('serialize')->willReturnCallback(function ($value) {
            return json_encode($value);
        });

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
            $this->userResolverMock,
            $this->scopeFactory
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Set up common resolver mocks and inject a single setting into the config.
     */
    private function setupMocksForSetting(array $setting): void
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'version'  => '1.0',
            'sections' => [
                [
                    'id'       => 'test_section',
                    'name'     => 'Test Section',
                    'settings' => [$setting],
                ],
            ],
            'presets' => [],
        ]);

        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn([]);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
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
    // BreezeThemeEditorNumericParams (range / number / spacing)
    // -------------------------------------------------------------------------

    public function testRangeFieldProducesNumericParams(): void
    {
        $this->setupMocksForSetting([
            'id'      => 'font_size',
            'label'   => 'Font Size',
            'type'    => 'range',
            'default' => '16',
            'min'     => 10,
            'max'     => 32,
            'step'    => 1,
            'unit'    => 'px',
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params, 'range must produce params');
        $this->assertEquals('range', $params['_fieldType']);
        $this->assertEquals(10.0, $params['min']);
        $this->assertEquals(32.0, $params['max']);
        $this->assertEquals(1.0,  $params['step']);
        $this->assertEquals('px', $params['unit']);
    }

    public function testNumberFieldProducesNumericParams(): void
    {
        $this->setupMocksForSetting([
            'id'      => 'columns',
            'label'   => 'Columns',
            'type'    => 'number',
            'default' => '3',
            'min'     => 1,
            'max'     => 6,
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('number', $params['_fieldType']);
        $this->assertEquals(1.0, $params['min']);
        $this->assertEquals(6.0, $params['max']);
    }

    public function testSpacingFieldProducesNumericParams(): void
    {
        $this->setupMocksForSetting([
            'id'      => 'padding',
            'label'   => 'Padding',
            'type'    => 'spacing',
            'default' => '8',
            'step'    => 4,
            'unit'    => 'px',
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('spacing', $params['_fieldType']);
        $this->assertEquals(4.0,  $params['step']);
        $this->assertEquals('px', $params['unit']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSelectParams (select / icon_set_picker)
    // -------------------------------------------------------------------------

    public function testSelectFieldProducesSelectParams(): void
    {
        $this->setupMocksForSetting([
            'id'      => 'layout',
            'label'   => 'Layout',
            'type'    => 'select',
            'default' => 'grid',
            'options' => [
                ['value' => 'grid',  'label' => 'Grid'],
                ['value' => 'list',  'label' => 'List'],
            ],
            'maxItems' => 2,
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('select', $params['_fieldType']);
        $this->assertCount(2, $params['options']);
        $this->assertEquals('grid', $params['options'][0]['value']);
        $this->assertEquals('Grid', $params['options'][0]['label']);
        $this->assertEquals(2, $params['maxItems']);
    }

    public function testIconSetPickerFieldProducesSelectParams(): void
    {
        $this->setupMocksForSetting([
            'id'      => 'icons',
            'label'   => 'Icon Set',
            'type'    => 'icon_set_picker',
            'default' => 'heroicons',
            'options' => [
                ['value' => 'heroicons', 'label' => 'Heroicons', 'icon' => 'hero.svg'],
            ],
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('icon_set_picker', $params['_fieldType']);
        $this->assertCount(1, $params['options']);
        $this->assertEquals('hero.svg', $params['options'][0]['icon']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorFontPickerParams
    // -------------------------------------------------------------------------

    public function testFontPickerFieldProducesFontPickerParams(): void
    {
        $this->setupMocksForSetting([
            'id'          => 'base_font',
            'label'       => 'Base Font',
            'type'        => 'font_picker',
            'default'     => 'Arial',
            'options'     => [
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ],
            'fontWeights' => ['400', '700'],
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('font_picker', $params['_fieldType']);
        $this->assertCount(2, $params['options']);
        $this->assertEquals(['400', '700'], $params['fontWeights']);
        $this->assertArrayHasKey('fontStylesheets', $params);
        $this->assertCount(1, $params['fontStylesheets']);
        $this->assertEquals('Roboto', $params['fontStylesheets'][0]['value']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSocialLinksParams
    // -------------------------------------------------------------------------

    public function testSocialLinksFieldProducesSocialLinksParams(): void
    {
        $this->setupMocksForSetting([
            'id'        => 'social',
            'label'     => 'Social Links',
            'type'      => 'social_links',
            'default'   => '[]',
            'platforms' => ['facebook', 'twitter', 'instagram'],
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('social_links', $params['_fieldType']);
        $this->assertEquals(['facebook', 'twitter', 'instagram'], $params['platforms']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorImageUploadParams
    // -------------------------------------------------------------------------

    public function testImageUploadFieldProducesImageUploadParams(): void
    {
        $this->setupMocksForSetting([
            'id'                => 'logo',
            'label'             => 'Logo',
            'type'              => 'image_upload',
            'default'           => '',
            'sides'             => ['desktop', 'mobile'],
            'allowedExtensions' => ['jpg', 'png', 'webp'],
            'maxFileSize'       => 2048,
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('image_upload', $params['_fieldType']);
        $this->assertEquals(['desktop', 'mobile'], $params['sides']);
        // B1: allowedExtensions → acceptTypes (converted to dot-prefixed CSV)
        $this->assertEquals('.jpg,.png,.webp', $params['acceptTypes']);
        // B1: maxFileSize → maxSize
        $this->assertEquals(2048, $params['maxSize']);
        $this->assertArrayNotHasKey('allowedExtensions', $params, 'Raw allowedExtensions key must not leak into params');
        $this->assertArrayNotHasKey('maxFileSize', $params, 'Raw maxFileSize key must not leak into params');
    }

    public function testImageUploadWithDotPrefixedExtensionsIsIdempotent(): void
    {
        // Extensions may already have leading dot — must not double-add it
        $this->setupMocksForSetting([
            'id'                => 'logo',
            'label'             => 'Logo',
            'type'              => 'image_upload',
            'default'           => '',
            'allowedExtensions' => ['.jpg', '.png'],
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertEquals('.jpg,.png', $params['acceptTypes']);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorCodeParams
    // -------------------------------------------------------------------------

    public function testCodeFieldProducesCodeParams(): void
    {
        $this->setupMocksForSetting([
            'id'       => 'custom_css',
            'label'    => 'Custom CSS',
            'type'     => 'code',
            'default'  => '',
            'language' => 'css',
            'fallback' => '/* default */',
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNotNull($params);
        $this->assertEquals('code', $params['_fieldType']);
        $this->assertEquals('css',           $params['language']);
        $this->assertEquals('/* default */', $params['fallback']);
    }

    // -------------------------------------------------------------------------
    // Types that emit null params
    // -------------------------------------------------------------------------

    /**
     * @dataProvider nullParamsTypeProvider
     */
    public function testFieldTypesWithoutParamsReturnNull(string $type): void
    {
        $this->setupMocksForSetting([
            'id'      => 'test_field',
            'label'   => 'Test',
            'type'    => $type,
            'default' => 'value',
        ]);

        $params = $this->getFirstField()['params'];

        $this->assertNull($params, "Field type '{$type}' must return null params when no type-specific data is present");
    }

    public static function nullParamsTypeProvider(): array
    {
        return [
            'color'    => ['color'],
            'text'     => ['text'],
            'textarea' => ['textarea'],
            'checkbox' => ['checkbox'],
            'toggle'   => ['toggle'],
        ];
    }
}
