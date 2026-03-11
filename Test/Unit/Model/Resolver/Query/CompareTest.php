<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Compare;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

class CompareTest extends TestCase
{
    private Compare $resolver;
    private CompareProvider|MockObject $compareProvider;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private ScopeFactory|MockObject $scopeFactory;
    private ScopeInterface|MockObject $scopeMock;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->compareProvider = $this->createMock(CompareProvider::class);
        $this->userResolver    = $this->createMock(UserResolver::class);
        $this->themeResolver   = $this->createMock(ThemeResolver::class);
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

        $this->resolver = new Compare(
            $this->compareProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->scopeFactory
        );
    }

    public function testDelegatesToCompareProviderWithCorrectParams(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(42);
        $expected = [['sectionCode' => 'colors', 'fieldCode' => 'primary', 'changeType' => 'modified']];
        $this->compareProvider
            ->expects($this->once())
            ->method('compare')
            ->with(5, $this->isInstanceOf(ScopeInterface::class), 42)
            ->willReturn($expected);

        $result = $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5]
        );

        $this->assertSame($expected, $result);
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(10);
        $this->compareProvider
            ->expects($this->once())
            ->method('compare')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), 1)
            ->willReturn([]);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['scope' => ['type' => 'stores', 'scopeId' => 2]]
        );
    }

    public function testUsesThemeIdFromArgsWhenProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->themeResolver->expects($this->never())->method('getThemeIdByScope');
        $this->compareProvider
            ->expects($this->once())
            ->method('compare')
            ->with(7, $this->isInstanceOf(ScopeInterface::class), 1)
            ->willReturn([]);

        $this->resolver->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 7]
        );
    }
}
