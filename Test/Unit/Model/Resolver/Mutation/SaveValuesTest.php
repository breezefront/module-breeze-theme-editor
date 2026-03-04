<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\SaveValues;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class SaveValuesTest extends TestCase
{
    private SaveValues $mutation;
    private ValueRepositoryInterface|MockObject $valueRepository;
    private ValueService|MockObject $valueService;
    private StatusProvider|MockObject $statusProvider;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private ConfigProvider|MockObject $configProvider;
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
        $this->field           = $this->createMock(Field::class);
        $this->context         = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->context->method('getUserId')->willReturn(1);
        $this->context->method('getUserType')->willReturn(2);
        $this->resolveInfo = $this->createMock(ResolveInfo::class);

        $this->mutation = new SaveValues(
            $this->valueRepository,
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->configProvider
        );
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    /**
     * Build a ValueInterface mock that accepts all setters fluently.
     */
    private function makeValueMock(): ValueInterface|MockObject
    {
        $mock = $this->createMock(ValueInterface::class);
        foreach (['setThemeId','setStoreId','setStatusId','setSectionCode','setSettingCode','setValue','setUserId'] as $setter) {
            $mock->method($setter)->willReturnSelf();
        }
        return $mock;
    }

    /**
     * Build a minimal valid input array for the mutation.
     *
     * @param array<array{sectionCode:string,fieldCode:string,value:string}> $values
     */
    private function buildInput(array $values, array $override = []): array
    {
        return array_merge([
            'storeId' => 1,
            'themeId' => 5,
            'status'  => 'DRAFT',
            'values'  => $values,
        ], $override);
    }

    // =========================================================================
    // Batch save
    // =========================================================================

    public function testSuccessfullySavesMultipleValues(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(42);
        $this->statusProvider->method('getStatusId')->with('DRAFT')->willReturn(1);

        $mock1 = $this->makeValueMock();
        $mock2 = $this->makeValueMock();
        $this->valueRepository
            ->method('create')
            ->willReturnOnConsecutiveCalls($mock1, $mock2);
        $this->valueRepository
            ->expects($this->once())
            ->method('saveMultiple')
            ->with([$mock1, $mock2])
            ->willReturn(2);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = $this->buildInput([
            ['sectionCode' => 'colors',  'fieldCode' => 'primary', 'value' => '#FF0000'],
            ['sectionCode' => 'spacing', 'fieldCode' => 'margin',  'value' => '20px'],
        ]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['success']);
        $this->assertCount(2, $result['values']);
    }

    public function testSuccessMessageContainsSavedCount(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(3);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = $this->buildInput([
            ['sectionCode' => 'a', 'fieldCode' => 'x', 'value' => '1'],
            ['sectionCode' => 'b', 'fieldCode' => 'y', 'value' => '2'],
            ['sectionCode' => 'c', 'fieldCode' => 'z', 'value' => '3'],
        ]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertStringContainsString('3', (string)$result['message']);
    }

    // =========================================================================
    // isModified flag
    // =========================================================================

    public function testIsModifiedTrueWhenValueDiffersFromDefault(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([
            'colors.primary' => '#000000',
        ]);

        $input = $this->buildInput([
            ['sectionCode' => 'colors', 'fieldCode' => 'primary', 'value' => '#FF0000'],
        ]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['values'][0]['isModified']);
    }

    public function testIsModifiedFalseWhenValueMatchesDefault(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([
            'spacing.margin' => '20px',
        ]);

        $input = $this->buildInput([
            ['sectionCode' => 'spacing', 'fieldCode' => 'margin', 'value' => '20px'],
        ]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertFalse($result['values'][0]['isModified']);
    }

    public function testIsModifiedTrueWhenNoDefaultExists(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = $this->buildInput([
            ['sectionCode' => 'custom', 'fieldCode' => 'new_field', 'value' => 'anything'],
        ]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['values'][0]['isModified']);
    }

    // =========================================================================
    // Parameter resolution (inherited from AbstractSaveMutation)
    // =========================================================================

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByStoreId')
            ->with(2)
            ->willReturn(10);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = [
            'storeId' => 2,
            'status'  => 'DRAFT',
            'values'  => [['sectionCode' => 'a', 'fieldCode' => 'b', 'value' => 'c']],
        ];

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['success']);
    }

    public function testDefaultsToStatusDraftWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider
            ->expects($this->once())
            ->method('getStatusId')
            ->with('DRAFT')
            ->willReturn(1);
        $this->valueRepository->method('create')->willReturn($this->makeValueMock());
        $this->valueRepository->method('saveMultiple')->willReturn(1);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = [
            'storeId' => 1,
            'themeId' => 5,
            'values'  => [['sectionCode' => 'a', 'fieldCode' => 'b', 'value' => 'c']],
        ];

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['success']);
    }

    // =========================================================================
    // Edge cases
    // =========================================================================

    public function testEmptyValuesArrayReturnsEmptyResult(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueRepository
            ->expects($this->once())
            ->method('saveMultiple')
            ->with([])
            ->willReturn(0);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        $input = $this->buildInput([]);

        $result = $this->mutation->resolve($this->field, $this->context, $this->resolveInfo, null, ['input' => $input]);

        $this->assertTrue($result['success']);
        $this->assertSame([], $result['values']);
        $this->assertSame([], $result['validation_errors']);
    }
}
