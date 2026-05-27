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
 * Tests that SectionFormatter forwards the `mediaAlias` field to the GraphQL response.
 *
 * mediaAlias = original value from settings.json (before alias resolution).
 * Used by JS to determine which device mode activates the field.
 *
 * Rules:
 *   - Known alias (mobile/tablet/desktop) → forwarded as-is
 *   - Raw query string                    → forwarded as-is (JS ignores for device logic)
 *   - Absent / null                       → null
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter::mergeSectionsWithValues
 */
class SectionFormatterMediaAliasTest extends TestCase
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

    private function format(array $sections): array
    {
        return $this->formatter->mergeSectionsWithValues($sections, [], 1);
    }

    private function getField(array $result, string $sectionId, int $index = 0): array
    {
        foreach ($result as $section) {
            if ($section['code'] === $sectionId) {
                return $section['fields'][$index];
            }
        }
        $this->fail("Section '{$sectionId}' not found");
    }

    private function makeSection(array $settingOverrides): array
    {
        return [[
            'id'       => 'typography',
            'name'     => 'Typography',
            'settings' => [array_merge([
                'id'       => 'font_size',
                'label'    => 'Font Size',
                'type'     => 'range',
                'property' => '--font-size',
                'default'  => '16px',
            ], $settingOverrides)],
        ]];
    }

    // -----------------------------------------------------------------------
    // mediaAlias absent
    // -----------------------------------------------------------------------

    public function testMediaAliasIsNullWhenMediaNotDefined(): void
    {
        $field = $this->getField($this->format($this->makeSection([])), 'typography');

        $this->assertArrayHasKey('mediaAlias', $field);
        $this->assertNull($field['mediaAlias']);
    }

    // -----------------------------------------------------------------------
    // Known aliases — forwarded as-is
    // -----------------------------------------------------------------------

    public function testMediaAliasMobileForwardedAsIs(): void
    {
        $field = $this->getField(
            $this->format($this->makeSection(['media' => 'mobile'])),
            'typography'
        );

        $this->assertSame('mobile', $field['mediaAlias']);
    }

    public function testMediaAliasTabletForwardedAsIs(): void
    {
        $field = $this->getField(
            $this->format($this->makeSection(['media' => 'tablet'])),
            'typography'
        );

        $this->assertSame('tablet', $field['mediaAlias']);
    }

    public function testMediaAliasDesktopForwardedAsIs(): void
    {
        $field = $this->getField(
            $this->format($this->makeSection(['media' => 'desktop'])),
            'typography'
        );

        $this->assertSame('desktop', $field['mediaAlias']);
    }

    // -----------------------------------------------------------------------
    // Raw query — forwarded as-is (JS treats it as non-device field)
    // -----------------------------------------------------------------------

    public function testMediaAliasRawQueryForwardedAsIs(): void
    {
        $field = $this->getField(
            $this->format($this->makeSection(['media' => '(max-width: 768px)'])),
            'typography'
        );

        $this->assertSame('(max-width: 768px)', $field['mediaAlias']);
    }

    // -----------------------------------------------------------------------
    // media and mediaAlias coexist independently
    // -----------------------------------------------------------------------

    public function testMediaAndMediaAliasAreIndependent(): void
    {
        $field = $this->getField(
            $this->format($this->makeSection(['media' => 'mobile'])),
            'typography'
        );

        // media = resolved query, mediaAlias = original alias
        $this->assertSame('(max-width: 767px)', $field['media']);
        $this->assertSame('mobile',             $field['mediaAlias']);
    }

    public function testRawQueryMediaAndMediaAliasAreTheSame(): void
    {
        $raw   = '(max-width: 768px)';
        $field = $this->getField(
            $this->format($this->makeSection(['media' => $raw])),
            'typography'
        );

        // raw query: both media and mediaAlias equal the raw string
        $this->assertSame($raw, $field['media']);
        $this->assertSame($raw, $field['mediaAlias']);
    }
}
