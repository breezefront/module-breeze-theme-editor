<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\DiscardDraft;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class DiscardDraftTest extends TestCase
{
    private DiscardDraft $mutation;
    private ValueService|MockObject $valueService;
    private StatusProvider|MockObject $statusProvider;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->valueService   = $this->createMock(ValueService::class);
        $this->statusProvider = $this->createMock(StatusProvider::class);
        $this->userResolver   = $this->createMock(UserResolver::class);
        $this->themeResolver  = $this->createMock(ThemeResolver::class);
        $this->field          = $this->createMock(Field::class);
        $this->context        = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo    = $this->createMock(ResolveInfo::class);

        $this->mutation = new DiscardDraft(
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver
        );
    }

    public function testDiscardsAllDraftValuesAndReturnsCount(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(42);
        $this->statusProvider->method('getStatusId')->with('DRAFT')->willReturn(1);
        $this->valueService
            ->expects($this->once())
            ->method('deleteValues')
            ->with(5, 'stores', 1, 1, 42, null, null)
            ->willReturn(7);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5]
        );

        $this->assertTrue($result['success']);
        $this->assertSame(7, $result['discardedCount']);
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByStoreId')
            ->with(3)
            ->willReturn(10);
        $this->valueService->method('deleteValues')->willReturn(0);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 3]
        );

        $this->assertTrue($result['success']);
    }

    public function testPassesSectionCodesAndFieldCodesToDeleteValues(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueService
            ->expects($this->once())
            ->method('deleteValues')
            ->with(5, 'stores', 1, 1, 1, ['colors', 'typography'], ['primary', 'font_size'])
            ->willReturn(2);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            [
                'storeId'      => 1,
                'themeId'      => 5,
                'sectionCodes' => ['colors', 'typography'],
                'fieldCodes'   => ['primary', 'font_size'],
            ]
        );
    }

    public function testResponseStructureIsComplete(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->valueService->method('deleteValues')->willReturn(3);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['storeId' => 1, 'themeId' => 5]
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('discardedCount', $result);
        $this->assertSame(3, $result['discardedCount']);
    }
}
