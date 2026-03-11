<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\ResetToDefaults;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

class ResetToDefaultsTest extends TestCase
{
    private ResetToDefaults $mutation;
    private ValueRepositoryInterface|MockObject $valueRepository;
    private ValueService|MockObject $valueService;
    private StatusProvider|MockObject $statusProvider;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private ConfigProvider|MockObject $configProvider;
    private ValueInterface|MockObject $valueModel;
    private ScopeFactory|MockObject $scopeFactory;
    private ScopeInterface|MockObject $scopeMock;
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
        $this->scopeFactory    = $this->createMock(ScopeFactory::class);
        $this->scopeMock       = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        $this->field           = $this->createMock(Field::class);
        $this->context         = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo     = $this->createMock(ResolveInfo::class);

        // Fluent mock: valueRepository->create() returns a ValueInterface that supports chained setters
        $this->valueModel = $this->createMock(ValueInterface::class);
        $this->valueModel->method('setThemeId')->willReturnSelf();
        $this->valueModel->method('setStoreId')->willReturnSelf();
        $this->valueModel->method('setStatusId')->willReturnSelf();
        $this->valueModel->method('setSectionCode')->willReturnSelf();
        $this->valueModel->method('setSettingCode')->willReturnSelf();
        $this->valueModel->method('setValue')->willReturnSelf();
        $this->valueModel->method('setUserId')->willReturnSelf();

        $this->mutation = new ResetToDefaults(
            $this->valueRepository,
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->configProvider,
            $this->scopeFactory
        );
    }

    public function testResetsAllDefaultsAndReturnsCount(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([
            'colors.primary' => '#fff',
            'colors.secondary' => '#000',
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        $this->valueRepository->method('saveMultiple')->willReturn(2);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5]]
        );

        $this->assertTrue($result['success']);
        $this->assertSame(2, $result['resetCount']);
        $this->assertIsArray($result['values']);
    }

    public function testFiltersBySectionCodes(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([
            'colors.primary'  => '#fff',
            'typography.size' => '14px',
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        // Only 1 value model should be created (only 'colors' section)
        $this->valueRepository
            ->expects($this->once())
            ->method('saveMultiple')
            ->with($this->countOf(1))
            ->willReturn(1);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5, 'sectionCodes' => ['colors']]]
        );
    }

    public function testFiltersByFieldCodes(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([
            'colors.primary'   => '#fff',
            'colors.secondary' => '#000',
        ]);
        $this->valueRepository->method('create')->willReturn($this->valueModel);
        $this->valueRepository
            ->expects($this->once())
            ->method('saveMultiple')
            ->with($this->countOf(1))
            ->willReturn(1);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5, 'fieldCodes' => ['primary']]]
        );
    }

    public function testResponseStructureIsComplete(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([]);
        $this->valueRepository->method('saveMultiple')->willReturn(0);
        $this->valueService->method('getValuesByTheme')->willReturn([
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#fff', 'updated_at' => '2024-01-01'],
        ]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5]]
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('values', $result);
        $this->assertArrayHasKey('resetCount', $result);
        $this->assertFalse($result['values'][0]['isModified']); // Reset = not modified
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(10);
        $this->configProvider->method('getAllDefaults')->willReturn([]);
        $this->valueRepository->method('saveMultiple')->willReturn(0);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => ['scope' => ['type' => 'stores', 'scopeId' => 3]]]
        );

        $this->assertTrue($result['success']);
    }
}
