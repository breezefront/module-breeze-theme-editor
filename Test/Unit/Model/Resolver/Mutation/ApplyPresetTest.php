<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\ApplyPreset;
use Swissup\BreezeThemeEditor\Model\Service\PresetService;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class ApplyPresetTest extends TestCase
{
    private ApplyPreset $mutation;
    private ValueRepositoryInterface|MockObject $valueRepository;
    private ValueService|MockObject $valueService;
    private StatusProvider|MockObject $statusProvider;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private ConfigProvider|MockObject $configProvider;
    private PresetService|MockObject $presetService;
    private ValueInterface|MockObject $valueModel;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->valueRepository = $this->createMock(ValueRepositoryInterface::class);
        $this->valueService    = $this->createMock(ValueService::class);
        $this->statusProvider  = $this->createMock(StatusProvider::class);
        $this->userResolver    = $this->createMock(UserResolver::class);
        $this->themeResolver   = $this->createMock(ThemeResolver::class);
        $this->configProvider  = $this->createMock(ConfigProvider::class);
        $this->presetService   = $this->createMock(PresetService::class);
        $this->field           = $this->createMock(Field::class);
        $this->context         = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo     = $this->createMock(ResolveInfo::class);

        $this->valueModel = $this->createMock(ValueInterface::class);
        $this->valueModel->method('setThemeId')->willReturnSelf();
        $this->valueModel->method('setStoreId')->willReturnSelf();
        $this->valueModel->method('setStatusId')->willReturnSelf();
        $this->valueModel->method('setSectionCode')->willReturnSelf();
        $this->valueModel->method('setSettingCode')->willReturnSelf();
        $this->valueModel->method('setValue')->willReturnSelf();
        $this->valueModel->method('setUserId')->willReturnSelf();

        $this->mutation = new ApplyPreset(
            $this->valueRepository,
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->configProvider,
            $this->presetService
        );
    }

    public function testThrowsExceptionWhenPresetNotFound(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->presetService
            ->method('getPresetValues')
            ->willThrowException(new \Exception('Preset not found'));

        $this->expectException(GraphQlInputException::class);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['storeId' => 1, 'themeId' => 5, 'presetId' => 'nonexistent']]
        );
    }

    public function testThrowsExceptionWhenPresetIsEmpty(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->presetService->method('getPresetValues')->willReturn([]);

        $this->expectException(GraphQlInputException::class);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['storeId' => 1, 'themeId' => 5, 'presetId' => 'empty-preset']]
        );
    }

    public function testAppliesPresetAndReturnsSavedValues(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->presetService->method('getPresetValues')->willReturn([
            ['sectionCode' => 'colors', 'fieldCode' => 'primary', 'value' => '#f00'],
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->valueService->method('getValuesByTheme')->willReturn([
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#f00', 'updated_at' => '2024-01-01'],
        ]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['storeId' => 1, 'themeId' => 5, 'presetId' => 'light']]
        );

        $this->assertTrue($result['success']);
        $this->assertSame(1, $result['appliedCount']);
        $this->assertCount(1, $result['values']);
    }

    public function testSkipsExistingValuesWhenOverwriteIsFalse(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->presetService->method('getPresetValues')->willReturn([
            ['sectionCode' => 'colors', 'fieldCode' => 'primary', 'value' => '#f00'],
            ['sectionCode' => 'colors', 'fieldCode' => 'secondary', 'value' => '#00f'],
        ]);
        // Existing value for 'colors.primary'
        $this->valueService->method('getValuesByTheme')->willReturn([
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#fff', 'updated_at' => '2024-01-01'],
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        // Only 1 new value (secondary) should be saved, primary is skipped
        $this->valueRepository
            ->expects($this->once())
            ->method('saveMultiple')
            ->with($this->countOf(1))
            ->willReturn(1);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['storeId' => 1, 'themeId' => 5, 'presetId' => 'light', 'overwriteExisting' => false]]
        );
    }

    public function testResponseStructureIsComplete(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->presetService->method('getPresetValues')->willReturn([
            ['sectionCode' => 'colors', 'fieldCode' => 'primary', 'value' => '#f00'],
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['storeId' => 1, 'themeId' => 5, 'presetId' => 'light']]
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('values', $result);
        $this->assertArrayHasKey('appliedCount', $result);
    }
}
