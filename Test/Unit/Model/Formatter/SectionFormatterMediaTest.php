<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Formatter;

use PHPUnit\Framework\TestCase;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ColorPipeline;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatter;
use Swissup\BreezeThemeEditor\Model\Utility\ColorFormatResolver;
use Swissup\BreezeThemeEditor\Model\Utility\MediaQueryResolver;

/**
 * Tests that SectionFormatter forwards the `media` field to the GraphQL response.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter::mergeSectionsWithValues
 */
class SectionFormatterMediaTest extends TestCase
{
    private SectionFormatter $formatter;

    protected function setUp(): void
    {
        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $this->formatter = new SectionFormatter(
            $configProvider,
            $colorPipeline,
            $serializer,
            new MediaQueryResolver()
        );
    }

    private function format(array $sections, array $valuesMap = []): array
    {
        return $this->formatter->mergeSectionsWithValues($sections, $valuesMap, 1);
    }

    private function getField(array $result, string $sectionId, int $index = 0): array
    {
        foreach ($result as $section) {
            if ($section['code'] === $sectionId) {
                return $section['fields'][$index];
            }
        }
        $this->fail("Section '{$sectionId}' not found in result");
    }

    // -----------------------------------------------------------------------
    // media absent
    // -----------------------------------------------------------------------

    public function testMediaIsNullWhenNotDefined(): void
    {
        $sections = [[
            'id'       => 'typography',
            'name'     => 'Typography',
            'settings' => [[
                'id'       => 'font_size',
                'label'    => 'Font Size',
                'type'     => 'range',
                'property' => '--font-size',
                'default'  => '16px',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'typography');

        $this->assertArrayHasKey('media', $field);
        $this->assertNull($field['media']);
    }

    // -----------------------------------------------------------------------
    // Alias resolution
    // -----------------------------------------------------------------------

    public function testMediaMobileAliasResolvedToQuery(): void
    {
        $sections = [[
            'id'       => 'typography',
            'name'     => 'Typography',
            'settings' => [[
                'id'       => 'font_size_mobile',
                'label'    => 'Font Size Mobile',
                'type'     => 'range',
                'property' => '--font-size',
                'default'  => '14px',
                'media'    => 'mobile',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'typography');

        $this->assertSame('(max-width: 767px)', $field['media']);
    }

    public function testMediaTabletAliasResolvedToQuery(): void
    {
        $sections = [[
            'id'       => 'layout',
            'name'     => 'Layout',
            'settings' => [[
                'id'       => 'columns_gap',
                'label'    => 'Columns Gap',
                'type'     => 'range',
                'property' => '--columns-gap',
                'default'  => '16px',
                'media'    => 'tablet',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'layout');

        $this->assertSame('(max-width: 1023px)', $field['media']);
    }

    public function testMediaDesktopAliasResolvedToQuery(): void
    {
        $sections = [[
            'id'       => 'layout',
            'name'     => 'Layout',
            'settings' => [[
                'id'       => 'sidebar_width',
                'label'    => 'Sidebar Width',
                'type'     => 'range',
                'property' => '--sidebar-width',
                'default'  => '300px',
                'media'    => 'desktop',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'layout');

        $this->assertSame('(min-width: 1024px)', $field['media']);
    }

    // -----------------------------------------------------------------------
    // Raw query passthrough
    // -----------------------------------------------------------------------

    public function testMediaRawQueryPassedThrough(): void
    {
        $sections = [[
            'id'       => 'layout',
            'name'     => 'Layout',
            'settings' => [[
                'id'       => 'max_width',
                'label'    => 'Max Width',
                'type'     => 'range',
                'property' => '--max-width',
                'default'  => '1280px',
                'media'    => '(max-width: 768px)',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'layout');

        $this->assertSame('(max-width: 768px)', $field['media']);
    }

    // -----------------------------------------------------------------------
    // selector + media coexist
    // -----------------------------------------------------------------------

    public function testMediaAndSelectorCoexist(): void
    {
        $sections = [[
            'id'       => 'layout',
            'name'     => 'Layout',
            'settings' => [[
                'id'       => 'columns_gap',
                'label'    => 'Columns Gap',
                'type'     => 'range',
                'property' => '--columns-gap',
                'default'  => '16px',
                'selector' => '.columns-container',
                'media'    => 'mobile',
            ]],
        ]];

        $field = $this->getField($this->format($sections), 'layout');

        $this->assertSame('.columns-container', $field['selector']);
        $this->assertSame('(max-width: 767px)', $field['media']);
    }
}
