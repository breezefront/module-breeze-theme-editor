<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Service\PresetService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Magento\Framework\Exception\LocalizedException;

class PresetServiceTest extends TestCase
{
    private PresetService $presetService;
    private ConfigProvider|MockObject $configProviderMock;
    private ValueRepositoryInterface|MockObject $valueRepositoryMock;
    private ValueService|MockObject $valueServiceMock;
    private StatusProvider|MockObject $statusProviderMock;

    protected function setUp(): void
    {
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->valueRepositoryMock = $this->createMock(ValueRepositoryInterface::class);
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);

        $this->presetService = new PresetService(
            $this->configProviderMock,
            $this->valueRepositoryMock,
            $this->valueServiceMock,
            $this->statusProviderMock
        );
    }

    /**
     * Test 1: Successfully finds preset by ID
     */
    public function testSuccessfullyFindsPresetById(): void
    {
        $themeId = 10;
        $presetId = 'dark-mode';

        $config = [
            'presets' => [
                [
                    'id' => 'light-mode',
                    'settings' => ['header.logo' => 'light-logo.png']
                ],
                [
                    'id' => 'dark-mode',
                    'settings' => [
                        'header.logo' => 'dark-logo.png',
                        'colors.primary' => '#ffffff'
                    ]
                ]
            ],
            'sections' => []
        ];

        $this->configProviderMock->expects($this->once())
            ->method('getConfigurationWithInheritance')
            ->with($themeId)
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        $this->assertCount(2, $result);
        $this->assertEquals('header', $result[0]['sectionCode']);
        $this->assertEquals('logo', $result[0]['fieldCode']);
        $this->assertEquals('dark-logo.png', $result[0]['value']);
        $this->assertEquals('colors', $result[1]['sectionCode']);
        $this->assertEquals('primary', $result[1]['fieldCode']);
        $this->assertEquals('#ffffff', $result[1]['value']);
    }

    /**
     * Test 2: Throws exception when preset not found
     */
    public function testThrowsExceptionWhenPresetNotFound(): void
    {
        $themeId = 10;
        $presetId = 'non-existent';

        $config = [
            'presets' => [
                ['id' => 'light-mode', 'settings' => []]
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Preset non-existent not found');

        $this->presetService->getPresetValues($themeId, $presetId);
    }

    /**
     * Test 3: Returns empty array when preset has no settings
     */
    public function testReturnsEmptyArrayWhenPresetHasNoSettings(): void
    {
        $themeId = 10;
        $presetId = 'empty-preset';

        $config = [
            'presets' => [
                ['id' => 'empty-preset', 'settings' => []]
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        $this->assertEmpty($result);
    }

    /**
     * Test 4: Returns empty array when preset missing settings key
     */
    public function testReturnsEmptyArrayWhenPresetMissingSettingsKey(): void
    {
        $themeId = 10;
        $presetId = 'no-settings-key';

        $config = [
            'presets' => [
                ['id' => 'no-settings-key'] // No 'settings' key
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        $this->assertEmpty($result);
    }

    /**
     * Test 5: Parses dot notation correctly (section.field)
     */
    public function testParsesDotNotationCorrectly(): void
    {
        $themeId = 10;
        $presetId = 'test-preset';

        $config = [
            'presets' => [
                [
                    'id' => 'test-preset',
                    'settings' => [
                        'header.logo' => 'logo.png',
                        'footer.copyright' => '2024',
                        'colors.primary' => '#ff0000'
                    ]
                ]
            ],
            'sections' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        $this->assertCount(3, $result);

        // Verify each parsed value
        foreach ($result as $item) {
            $this->assertArrayHasKey('sectionCode', $item);
            $this->assertArrayHasKey('fieldCode', $item);
            $this->assertArrayHasKey('value', $item);
        }

        // Verify specific values
        $headerLogo = array_filter($result, fn($item) => $item['sectionCode'] === 'header' && $item['fieldCode'] === 'logo');
        $this->assertCount(1, $headerLogo);
        $this->assertEquals('logo.png', reset($headerLogo)['value']);
    }

    /**
     * Test 6: Parses legacy format (field only, uses section map)
     */
    public function testParsesLegacyFormatWithSectionMap(): void
    {
        $themeId = 10;
        $presetId = 'legacy-preset';

        $config = [
            'presets' => [
                [
                    'id' => 'legacy-preset',
                    'settings' => [
                        'logo' => 'logo.png', // No dot notation
                        'copyright' => '2024'
                    ]
                ]
            ],
            'sections' => [
                [
                    'id' => 'header',
                    'settings' => [
                        ['id' => 'logo'],
                        ['id' => 'title']
                    ]
                ],
                [
                    'id' => 'footer',
                    'settings' => [
                        ['id' => 'copyright']
                    ]
                ]
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        $this->assertCount(2, $result);

        // Verify logo mapped to header section
        $logoValue = array_filter($result, fn($item) => $item['fieldCode'] === 'logo');
        $this->assertEquals('header', reset($logoValue)['sectionCode']);

        // Verify copyright mapped to footer section
        $copyrightValue = array_filter($result, fn($item) => $item['fieldCode'] === 'copyright');
        $this->assertEquals('footer', reset($copyrightValue)['sectionCode']);
    }

    /**
     * Test 7: Skips unknown settings (not in section map)
     */
    public function testSkipsUnknownSettingsNotInSectionMap(): void
    {
        $themeId = 10;
        $presetId = 'unknown-fields';

        $config = [
            'presets' => [
                [
                    'id' => 'unknown-fields',
                    'settings' => [
                        'logo' => 'logo.png', // Known
                        'unknown_field' => 'value', // Unknown - should be skipped
                        'another_unknown' => 'value2' // Unknown - should be skipped
                    ]
                ]
            ],
            'sections' => [
                [
                    'id' => 'header',
                    'settings' => [
                        ['id' => 'logo']
                    ]
                ]
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $result = $this->presetService->getPresetValues($themeId, $presetId);

        // Only 'logo' should be included, unknown fields skipped
        $this->assertCount(1, $result);
        $this->assertEquals('logo', $result[0]['fieldCode']);
    }

    /**
     * Test 8: Successfully applies preset for DRAFT status (userId set)
     */
    public function testSuccessfullyAppliesPresetForDraftStatus(): void
    {
        $themeId = 10;
        $storeId = 1;
        $presetId = 'test-preset';
        $statusCode = 'DRAFT';
        $userId = 5;

        $config = [
            'presets' => [
                [
                    'id' => 'test-preset',
                    'settings' => [
                        'header.logo' => 'logo.png',
                        'colors.primary' => '#ff0000'
                    ]
                ]
            ],
            'sections' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('DRAFT')
            ->willReturn(1);

        // Mock value models
        $valueMock1 = $this->createMock(ValueInterface::class);
        $valueMock2 = $this->createMock(ValueInterface::class);

        $this->valueRepositoryMock->expects($this->exactly(2))
            ->method('create')
            ->willReturnOnConsecutiveCalls($valueMock1, $valueMock2);

        // Verify models are set correctly
        $valueMock1->expects($this->once())->method('setThemeId')->with($themeId)->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setScope')->with('stores')->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setStoreId')->with($storeId)->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setStatusId')->with(1)->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setUserId')->with($userId)->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setSectionCode')->with('header')->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setSettingCode')->with('logo')->willReturn($valueMock1);
        $valueMock1->expects($this->once())->method('setValue')->with('logo.png')->willReturn($valueMock1);

        $valueMock2->method('setThemeId')->willReturn($valueMock2);
        $valueMock2->method('setScope')->willReturn($valueMock2);
        $valueMock2->method('setStoreId')->willReturn($valueMock2);
        $valueMock2->method('setStatusId')->willReturn($valueMock2);
        $valueMock2->method('setUserId')->willReturn($valueMock2);
        $valueMock2->method('setSectionCode')->willReturn($valueMock2);
        $valueMock2->method('setSettingCode')->willReturn($valueMock2);
        $valueMock2->method('setValue')->willReturn($valueMock2);

        // Overwrite existing
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with($themeId, 'stores', $storeId, 1, $userId);

        $this->valueRepositoryMock->expects($this->once())
            ->method('saveMultiple')
            ->with($this->callback(function ($models) {
                return count($models) === 2;
            }))
            ->willReturn(2);

        $result = $this->presetService->applyPreset($themeId, 'stores', $storeId, $presetId, $statusCode, $userId, true);

        $this->assertEquals(2, $result['appliedCount']);
        $this->assertCount(2, $result['values']);
    }

    /**
     * Test 9: Successfully applies preset for PUBLISHED status (userId = 0)
     */
    public function testSuccessfullyAppliesPresetForPublishedStatus(): void
    {
        $themeId = 10;
        $storeId = 1;
        $presetId = 'test-preset';
        $statusCode = 'PUBLISHED';
        $userId = 5; // Should be ignored for PUBLISHED

        $config = [
            'presets' => [
                [
                    'id' => 'test-preset',
                    'settings' => ['header.logo' => 'logo.png']
                ]
            ],
            'sections' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // Verify userId is set to 0 for PUBLISHED
        $valueMock->expects($this->once())->method('setUserId')->with(0)->willReturn($valueMock);
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setScope')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);

        // Verify deleteValues called with userId = 0
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with($themeId, 'stores', $storeId, 2, 0);

        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        $result = $this->presetService->applyPreset($themeId, 'stores', $storeId, $presetId, $statusCode, $userId, true);

        $this->assertEquals(1, $result['appliedCount']);
    }

    /**
     * Test 10: Throws exception when preset has no settings
     */
    public function testThrowsExceptionWhenApplyingEmptyPreset(): void
    {
        $themeId = 10;
        $storeId = 1;
        $presetId = 'empty-preset';
        $statusCode = 'DRAFT';
        $userId = 5;

        $config = [
            'presets' => [
                ['id' => 'empty-preset', 'settings' => []]
            ]
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('Preset "empty-preset" has no settings');

        $this->presetService->applyPreset($themeId, 'stores', $storeId, $presetId, $statusCode, $userId);
    }

    /**
     * Test 11: With overwriteExisting=true deletes existing values
     */
    public function testWithOverwriteTrueDeletesExistingValues(): void
    {
        $themeId = 10;
        $storeId = 1;
        $presetId = 'test-preset';
        $statusCode = 'DRAFT';
        $userId = 5;

        $config = [
            'presets' => [
                ['id' => 'test-preset', 'settings' => ['header.logo' => 'logo.png']]
            ],
            'sections' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setScope')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);

        // VERIFY: deleteValues IS called
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with($themeId, 'stores', $storeId, 1, $userId);

        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        $this->presetService->applyPreset($themeId, 'stores', $storeId, $presetId, $statusCode, $userId, true);
    }

    /**
     * Test 12: With overwriteExisting=false does NOT delete existing values
     */
    public function testWithOverwriteFalseDoesNotDeleteExistingValues(): void
    {
        $themeId = 10;
        $storeId = 1;
        $presetId = 'test-preset';
        $statusCode = 'DRAFT';
        $userId = 5;

        $config = [
            'presets' => [
                ['id' => 'test-preset', 'settings' => ['header.logo' => 'logo.png']]
            ],
            'sections' => []
        ];

        $this->configProviderMock->method('getConfigurationWithInheritance')
            ->willReturn($config);

        $this->statusProviderMock->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setScope')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);

        // VERIFY: deleteValues is NOT called
        $this->valueServiceMock->expects($this->never())
            ->method('deleteValues');

        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        $this->presetService->applyPreset($themeId, 'stores', $storeId, $presetId, $statusCode, $userId, false);
    }
}
