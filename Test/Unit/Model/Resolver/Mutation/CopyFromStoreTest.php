<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\CopyFromStore;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class CopyFromStoreTest extends TestCase
{
    private CopyFromStore $mutation;
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
        $this->resolveInfo     = $this->createMock(ResolveInfo::class);

        $this->mutation = new CopyFromStore(
            $this->valueRepository,
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->configProvider
        );
    }

    public function testThrowsExceptionWhenCopyingFromSameStore(): void
    {
        $this->expectException(GraphQlInputException::class);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'fromStoreId' => 1,
                'toStoreId'   => 1,
                'themeId'     => 5,
            ]]
        );
    }

    public function testSuccessfullyCopiesValuesAcrossStores(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        $this->themeResolver->method('getThemeIdByStoreId')
            ->with(1)
            ->willReturn(10); // fromThemeId
        $this->themeResolver->method('getThemeIdByStoreId')
            ->willReturnMap([[1, 10], [2, 5]]);
        $this->valueService->method('copyValues')->willReturn(3);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'fromStoreId' => 1,
                'toStoreId'   => 2,
                'themeId'     => 5,
            ]]
        );

        $this->assertTrue($result['success']);
        $this->assertSame(3, $result['copiedCount']);
        $this->assertIsArray($result['values']);
    }

    public function testResponseContainsAllRequiredKeys(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver->method('getThemeIdByStoreId')->willReturn(5);
        $this->valueService->method('copyValues')->willReturn(0);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'fromStoreId' => 1,
                'toStoreId'   => 2,
                'themeId'     => 5,
            ]]
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('values', $result);
        $this->assertArrayHasKey('copiedCount', $result);
    }

    public function testFiltersValuesBySectionCodesInResponse(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver->method('getThemeIdByStoreId')->willReturn(5);
        $this->valueService->method('copyValues')->willReturn(2);
        $this->valueService->method('getValuesByTheme')->willReturn([
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#fff', 'updated_at' => '2024-01-01'],
            ['section_code' => 'fonts', 'setting_code' => 'size', 'value' => '14px', 'updated_at' => '2024-01-01'],
        ]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'fromStoreId'  => 1,
                'toStoreId'    => 2,
                'themeId'      => 5,
                'sectionCodes' => ['colors'],
            ]]
        );

        $this->assertCount(1, $result['values']);
        $this->assertSame('colors', $result['values'][0]['sectionCode']);
    }

    public function testResolvesToThemeIdFromToStoreWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver
            ->method('getThemeIdByStoreId')
            ->willReturnMap([[1, 10], [2, 7]]);
        $this->valueService->method('copyValues')->willReturn(0);
        $this->valueService->method('getValuesByTheme')->willReturn([]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'fromStoreId' => 1,
                'toStoreId'   => 2,
                // no themeId — should resolve from toStoreId
            ]]
        );

        $this->assertTrue($result['success']);
    }
}
