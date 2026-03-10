<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;

class CompareProviderTest extends TestCase
{
    private CompareProvider $compareProvider;
    private ValueService $valueService;
    private ConfigProvider $configProvider;
    private StatusProvider $statusProvider;

    protected function setUp(): void
    {
        $this->valueService = $this->createMock(ValueService::class);
        $this->configProvider = $this->createMock(ConfigProvider::class);
        $this->statusProvider = $this->createMock(StatusProvider::class);

        $this->compareProvider = new CompareProvider(
            $this->valueService,
            $this->configProvider,
            $this->statusProvider
        );
    }

    public function testReturnsNoChangesWhenDraftIsEmpty(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $this->valueService->expects($this->once())
            ->method('getValuesByTheme')
            ->with(5, 'stores', 1, 1, 42)
            ->willReturn([]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertFalse($result['hasChanges']);
        $this->assertEquals(0, $result['changesCount']);
        $this->assertEmpty($result['changes']);
    }

    public function testDetectsAddedValueWhenNotInPublished(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'header', 'setting_code' => 'bg_color', 'value' => '#ff0000']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues) {
                if ($statusId === 1) { // DRAFT
                    return $draftValues;
                }
                return []; // PUBLISHED empty
            });

        $this->configProvider->method('getConfigurationWithInheritance')->with(5)->willReturn([
            'sections' => [
                [
                    'id' => 'header',
                    'name' => 'Header Section',
                    'settings' => [
                        ['id' => 'bg_color', 'label' => 'Background Color']
                    ]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertTrue($result['hasChanges']);
        $this->assertEquals(1, $result['changesCount']);
        $this->assertCount(1, $result['changes']);
        $this->assertEquals('ADDED', $result['changes'][0]['changeType']);
        $this->assertEquals('header', $result['changes'][0]['sectionCode']);
        $this->assertEquals('bg_color', $result['changes'][0]['fieldCode']);
        $this->assertEquals('#ff0000', $result['changes'][0]['draftValue']);
        $this->assertNull($result['changes'][0]['publishedValue']);
    }

    public function testDetectsModifiedValueWhenDifferentFromPublished(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'footer', 'setting_code' => 'text_color', 'value' => '#ffffff']
        ];

        $publishedValues = [
            ['section_code' => 'footer', 'setting_code' => 'text_color', 'value' => '#000000']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues, $publishedValues) {
                if ($statusId === 1) { // DRAFT
                    return $draftValues;
                }
                return $publishedValues; // PUBLISHED
            });

        $this->configProvider->method('getConfigurationWithInheritance')->with(5)->willReturn([
            'sections' => [
                [
                    'id' => 'footer',
                    'name' => 'Footer Section',
                    'settings' => [
                        ['id' => 'text_color', 'label' => 'Text Color']
                    ]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertTrue($result['hasChanges']);
        $this->assertEquals(1, $result['changesCount']);
        $this->assertEquals('MODIFIED', $result['changes'][0]['changeType']);
        $this->assertEquals('#ffffff', $result['changes'][0]['draftValue']);
        $this->assertEquals('#000000', $result['changes'][0]['publishedValue']);
    }

    public function testIgnoresUnchangedValues(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#123456']
        ];

        $publishedValues = [
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#123456']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues, $publishedValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return $publishedValues;
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => []
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertFalse($result['hasChanges']);
        $this->assertEquals(0, $result['changesCount']);
        $this->assertEmpty($result['changes']);
    }

    public function testHandlesMultipleChanges(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'header', 'setting_code' => 'bg_color', 'value' => '#ff0000'],
            ['section_code' => 'footer', 'setting_code' => 'height', 'value' => '100px'],
            ['section_code' => 'sidebar', 'setting_code' => 'width', 'value' => '300px']
        ];

        $publishedValues = [
            ['section_code' => 'footer', 'setting_code' => 'height', 'value' => '80px']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues, $publishedValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return $publishedValues;
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'header',
                    'name' => 'Header',
                    'settings' => [['id' => 'bg_color', 'label' => 'BG Color']]
                ],
                [
                    'id' => 'footer',
                    'name' => 'Footer',
                    'settings' => [['id' => 'height', 'label' => 'Height']]
                ],
                [
                    'id' => 'sidebar',
                    'name' => 'Sidebar',
                    'settings' => [['id' => 'width', 'label' => 'Width']]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertTrue($result['hasChanges']);
        $this->assertEquals(3, $result['changesCount']);
        $this->assertCount(3, $result['changes']);
    }

    public function testExtractsLabelsFromConfiguration(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'typography', 'setting_code' => 'font_size', 'value' => '18px']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return [];
            });

        $this->configProvider->method('getConfigurationWithInheritance')->with(5)->willReturn([
            'sections' => [
                [
                    'id' => 'typography',
                    'name' => 'Typography Settings',
                    'settings' => [
                        ['id' => 'font_size', 'label' => 'Font Size (px)']
                    ]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertEquals('Typography Settings', $result['changes'][0]['sectionLabel']);
        $this->assertEquals('Font Size (px)', $result['changes'][0]['fieldLabel']);
    }

    public function testFallsBackToCodesWhenLabelsNotFound(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'unknown_section', 'setting_code' => 'unknown_field', 'value' => 'value']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return [];
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => []
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertEquals('unknown_section', $result['changes'][0]['sectionLabel']);
        $this->assertEquals('unknown_field', $result['changes'][0]['fieldLabel']);
    }

    public function testPassesCorrectParametersToValueService(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $callCount = 0;
        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use (&$callCount) {
                $callCount++;
                if ($callCount === 1) {
                    // First call: DRAFT with userId
                    $this->assertEquals(10, $themeId);
                    $this->assertEquals('stores', $scope);
                    $this->assertEquals(3, $scopeId);
                    $this->assertEquals(1, $statusId);
                    $this->assertEquals(99, $userId);
                    return [['section_code' => 'test', 'setting_code' => 'field', 'value' => 'value']];
                } elseif ($callCount === 2) {
                    // Second call: PUBLISHED without userId
                    $this->assertEquals(10, $themeId);
                    $this->assertEquals('stores', $scope);
                    $this->assertEquals(3, $scopeId);
                    $this->assertEquals(2, $statusId);
                    $this->assertNull($userId);
                    return [];
                }
                return [];
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn(['sections' => []]);

        // Act
        $this->compareProvider->compare(10, 'stores', 3, 99);
    }

    public function testHandlesComplexSectionStructure(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#ff0000'],
            ['section_code' => 'colors', 'setting_code' => 'secondary', 'value' => '#00ff00']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return [];
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'colors',
                    'name' => 'Color Palette',
                    'settings' => [
                        ['id' => 'primary', 'label' => 'Primary Color'],
                        ['id' => 'secondary', 'label' => 'Secondary Color']
                    ]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertEquals(2, $result['changesCount']);
        $this->assertEquals('Color Palette', $result['changes'][0]['sectionLabel']);
        $this->assertEquals('Color Palette', $result['changes'][1]['sectionLabel']);
    }

    public function testHandlesMissingSettingsInSection(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'layout', 'setting_code' => 'width', 'value' => '1200px']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues) {
                if ($statusId === 1) {
                    return $draftValues;
                }
                return [];
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'layout',
                    'name' => 'Layout Settings'
                    // Missing 'settings' key
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $this->assertTrue($result['hasChanges']);
        $this->assertEquals('width', $result['changes'][0]['fieldLabel']); // Falls back to code
    }

    public function testReturnsAllRequiredFieldsInChangeStructure(): void
    {
        // Arrange
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2]
            ]);

        $draftValues = [
            ['section_code' => 'test', 'setting_code' => 'field', 'value' => 'new']
        ];

        $publishedValues = [
            ['section_code' => 'test', 'setting_code' => 'field', 'value' => 'old']
        ];

        $this->valueService->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId, $scope, $scopeId, $statusId, $userId) use ($draftValues, $publishedValues) {
                return $statusId === 1 ? $draftValues : $publishedValues;
            });

        $this->configProvider->method('getConfigurationWithInheritance')->willReturn([
            'sections' => [
                [
                    'id' => 'test',
                    'name' => 'Test Section',
                    'settings' => [['id' => 'field', 'label' => 'Test Field']]
                ]
            ]
        ]);

        // Act
        $result = $this->compareProvider->compare(5, 'stores', 1, 42);

        // Assert
        $change = $result['changes'][0];
        $this->assertArrayHasKey('sectionCode', $change);
        $this->assertArrayHasKey('sectionLabel', $change);
        $this->assertArrayHasKey('fieldCode', $change);
        $this->assertArrayHasKey('fieldLabel', $change);
        $this->assertArrayHasKey('publishedValue', $change);
        $this->assertArrayHasKey('draftValue', $change);
        $this->assertArrayHasKey('changeType', $change);
    }
}
