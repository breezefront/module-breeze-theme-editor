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

/**
 * Tests for ref setting resolution in SectionFormatter::mergeSectionsWithValues().
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\SectionFormatter::mergeSectionsWithValues
 */
class SectionFormatterRefTest extends TestCase
{
    private SectionFormatter $formatter;

    private array $baseSections = [];

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

        $this->formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $this->baseSections = [
            [
                'id'       => 'general',
                'name'     => 'General',
                'settings' => [
                    [
                        'id'       => 'primary_color',
                        'label'    => 'Primary Color',
                        'type'     => 'color',
                        'property' => '--color-primary',
                        'default'  => '#1979c3',
                    ]
                ]
            ],
            [
                'id'       => 'typography',
                'name'     => 'Typography',
                'settings' => [
                    [
                        'ref' => 'general.primary_color'
                    ]
                ]
            ]
        ];
    }

    private function format(array $sections, array $valuesMap = []): array
    {
        return $this->formatter->mergeSectionsWithValues($sections, $valuesMap, 1);
    }

    private function getTypographyField(array $result): array
    {
        foreach ($result as $section) {
            if ($section['code'] === 'typography') {
                return $section['fields'][0];
            }
        }
        $this->fail('typography section or its first field not found in result');
    }

    // =========================================================================

    /**
     * Ref field resolved to original field data (code, type, property).
     */
    public function testRefSettingResolvesToOriginalFieldData(): void
    {
        $result = $this->format($this->baseSections);
        $field  = $this->getTypographyField($result);

        $this->assertEquals('primary_color', $field['code']);
        $this->assertEquals('COLOR', $field['type']);
        $this->assertEquals('--color-primary', $field['property']);
    }

    /**
     * Allowed display fields (label, description, help_text, placeholder) can be overridden.
     */
    public function testRefSettingOverridesAllowedDisplayFields(): void
    {
        $sections = $this->baseSections;
        $sections[1]['settings'][0] = [
            'ref'         => 'general.primary_color',
            'label'       => 'Brand Color',
            'description' => 'Used for headings',
            'help_text'   => 'Pick a color',
            'placeholder' => '#000000',
        ];

        $result = $this->format($sections);
        $field  = $this->getTypographyField($result);

        $this->assertEquals('Brand Color', $field['label']);
        $this->assertEquals('Used for headings', $field['description']);
        $this->assertEquals('Pick a color', $field['helpText']);
        $this->assertEquals('#000000', $field['placeholder']);
    }

    /**
     * Structural fields (type, property, default) cannot be overridden via ref.
     */
    public function testRefSettingDoesNotOverrideStructuralFields(): void
    {
        $sections = $this->baseSections;
        $sections[1]['settings'][0] = [
            'ref'      => 'general.primary_color',
            'type'     => 'text',       // must be ignored
            'property' => '--wrong',    // must be ignored
            'default'  => '#000000',    // must be ignored
        ];

        $result = $this->format($sections);
        $field  = $this->getTypographyField($result);

        $this->assertEquals('COLOR', $field['type']);
        $this->assertEquals('--color-primary', $field['property']);
        // default comes from original setting via FieldFormatter::encodeValue
        $this->assertStringContainsString('1979c3', $field['default'] ?? '');
    }

    /**
     * Ref field carries originalSectionCode = original section id.
     */
    public function testRefSettingCarriesOriginalSectionCode(): void
    {
        $result = $this->format($this->baseSections);
        $field  = $this->getTypographyField($result);

        $this->assertArrayHasKey('originalSectionCode', $field);
        $this->assertEquals('general', $field['originalSectionCode']);
    }

    /**
     * Ref field looks up value by original section key, not display section key.
     */
    public function testRefSettingUsesOriginalSectionKeyForValueLookup(): void
    {
        $valuesMap = [
            'general.primary_color'    => '#ff0000',
            'typography.primary_color' => '#00ff00', // should NOT be used
        ];

        $result = $this->format($this->baseSections, $valuesMap);
        $field  = $this->getTypographyField($result);

        $this->assertEquals('#ff0000', $field['value']);
    }

    /**
     * Ref to non-existent target is silently skipped (no exception, field absent).
     */
    public function testRefSettingSkippedWhenTargetNotFound(): void
    {
        $sections = $this->baseSections;
        $sections[1]['settings'][0] = [
            'ref' => 'general.nonexistent_field'
        ];

        $result = $this->format($sections);

        foreach ($result as $section) {
            if ($section['code'] === 'typography') {
                $this->assertEmpty($section['fields'], 'typography section should have no fields');
                return;
            }
        }

        $this->fail('typography section not found');
    }

    /**
     * isModified=true when saved value differs from default (resolved via original key).
     */
    public function testRefSettingIsModifiedBasedOnOriginalKey(): void
    {
        $configProvider = $this->createMock(ConfigProvider::class);
        $configProvider->method('getAllDefaults')->willReturn([
            'general.primary_color' => '#1979c3'
        ]);
        $configProvider->method('getConfigurationWithInheritance')->willReturn([]);

        $colorConverter = new ColorConverter();
        $colorPipeline  = new ColorPipeline(
            new ColorFormatResolver($colorConverter),
            new ColorFormatter($colorConverter)
        );
        $serializer = $this->createMock(SerializerInterface::class);
        $serializer->method('serialize')->willReturnCallback(fn($v) => json_encode($v));

        $formatter = new SectionFormatter($configProvider, $colorPipeline, $serializer);

        $valuesMap = ['general.primary_color' => '#ff0000']; // differs from default
        $result    = $formatter->mergeSectionsWithValues($this->baseSections, $valuesMap, 1);
        $field     = $this->getTypographyField($result);

        $this->assertTrue($field['isModified']);
    }

    /**
     * Original field in general section is rendered normally alongside its ref in typography.
     */
    public function testOriginalFieldUnchangedByRefPresenceInOtherSection(): void
    {
        $valuesMap = ['general.primary_color' => '#ff0000'];
        $result    = $this->format($this->baseSections, $valuesMap);

        $generalField = null;
        foreach ($result as $section) {
            if ($section['code'] === 'general') {
                $generalField = $section['fields'][0];
                break;
            }
        }

        $this->assertNotNull($generalField);
        $this->assertEquals('primary_color', $generalField['code']);
        $this->assertEquals('#ff0000', $generalField['value']);
        $this->assertArrayNotHasKey('originalSectionCode', $generalField);
    }
}
