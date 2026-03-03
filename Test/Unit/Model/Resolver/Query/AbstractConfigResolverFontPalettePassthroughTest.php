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
 * Tests for the fontPalette field passthrough in
 * AbstractConfigResolver::mergeSectionsWithValues()
 *
 * The relevant logic (lines 112-115 of AbstractConfigResolver):
 *
 *   if ($type === 'font_picker' && isset($setting['font_palette'])) {
 *       $field['fontPalette'] = $setting['font_palette'];
 *   }
 *
 * This copies the `font_palette` id from settings.json onto the GraphQL field
 * so that the JS renderer can look up the correct palette in FontPaletteManager.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\AbstractConfigResolver::mergeSectionsWithValues
 */
class AbstractConfigResolverFontPalettePassthroughTest extends TestCase
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
            $this->userResolverMock
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Set up mocks for a single setting and resolve, returning the first field.
     */
    private function resolveFirstField(array $setting): array
    {
        $this->userResolverMock->method('getCurrentUserId')->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByStoreId')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $this->configProviderMock->method('getConfigurationWithInheritance')->willReturn([
            'version'  => '1.0',
            'sections' => [
                [
                    'id'       => 'typography',
                    'name'     => 'Typography',
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
     * Test 1: font_picker field with font_palette → fontPalette present in field output
     */
    public function testFontPickerWithFontPaletteGetsFontPaletteField(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'base_font',
            'label'        => 'Base Font',
            'type'         => 'font_picker',
            'default'      => 'Arial',
            'font_palette' => 'default',
        ]);

        $this->assertArrayHasKey(
            'fontPalette',
            $field,
            'font_picker field with font_palette setting must expose fontPalette in the GraphQL output'
        );
        $this->assertSame(
            'default',
            $field['fontPalette'],
            'fontPalette value must equal the font_palette setting id'
        );
    }

    /**
     * Test 2: font_picker field without font_palette → fontPalette absent
     */
    public function testFontPickerWithoutFontPaletteHasNoFontPaletteField(): void
    {
        $field = $this->resolveFirstField([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            // no font_palette key
        ]);

        $this->assertArrayNotHasKey(
            'fontPalette',
            $field,
            'font_picker field without a font_palette setting must not have fontPalette in the output'
        );
    }

    /**
     * Test 3: non-font_picker field with font_palette → fontPalette absent
     *
     * The passthrough must be gated on type === 'font_picker'.  A different
     * field type that happens to have a font_palette key must not be affected.
     */
    public function testNonFontPickerFieldWithFontPaletteKeyIsIgnored(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'heading_size',
            'label'        => 'Heading Size',
            'type'         => 'range',
            'default'      => '24',
            'min'          => 12,
            'max'          => 72,
            'font_palette' => 'default',  // unexpected, but must not bleed into output
        ]);

        $this->assertArrayNotHasKey(
            'fontPalette',
            $field,
            'A non-font_picker field must never have fontPalette in the output, regardless of font_palette key presence'
        );
    }

    /**
     * Test 4: font_palette id is passed through verbatim (non-default palette name)
     */
    public function testFontPaletteIdIsPassedThroughVerbatim(): void
    {
        $field = $this->resolveFirstField([
            'id'           => 'body_font',
            'label'        => 'Body Font',
            'type'         => 'font_picker',
            'default'      => 'Georgia',
            'font_palette' => 'brand_identity',
        ]);

        $this->assertSame(
            'brand_identity',
            $field['fontPalette'],
            'The exact palette id must be forwarded without modification'
        );
    }
}
