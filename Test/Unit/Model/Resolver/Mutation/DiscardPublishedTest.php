<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\DiscardPublished;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;

class DiscardPublishedTest extends TestCase
{
    private DiscardPublished $resolver;
    private ValueService|MockObject $valueServiceMock;
    private StatusProvider|MockObject $statusProviderMock;
    private ThemeResolver|MockObject $themeResolverMock;
    private ScopeFactory|MockObject $scopeFactory;
    private ScopeInterface|MockObject $scopeMock;
    private Field|MockObject $fieldMock;
    private ContextInterface|MockObject $contextMock;
    private ResolveInfo|MockObject $resolveInfoMock;

    protected function setUp(): void
    {
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->resolveInfoMock = $this->createMock(ResolveInfo::class);

        $this->resolver = new DiscardPublished(
            $this->valueServiceMock,
            $this->statusProviderMock,
            $this->themeResolverMock,
            $this->scopeFactory
        );
    }

    /**
     * Test 1: Successful discard — returns success=true and discardedCount
     *
     * SCENARIO: Valid storeId + themeId provided, PUBLISHED values exist
     * EXPECTED: deleteValues called with PUBLISHED statusId and userId=null; returns discardedCount
     */
    public function testSuccessfulDiscardReturnsSuccessAndDiscardedCount(): void
    {
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);

        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with(10, 'stores', 1, 2, null, null, null)
            ->willReturn(7);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 10];
        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(7, $result['discardedCount']);
        $this->assertArrayHasKey('message', $result);
    }

    /**
     * Test 2: Uses ThemeResolver when themeId is not provided
     *
     * SCENARIO: args contain storeId but no themeId
     * EXPECTED: ThemeResolver::getThemeIdByStoreId called to auto-detect themeId
     */
    public function testAutoDetectsThemeIdWhenNotProvided(): void
    {
        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(15);

        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with(15, 'stores', 3, 2, null, null, null)
            ->willReturn(3);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 3]]; // no themeId
        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(3, $result['discardedCount']);
    }

    /**
     * Test 3: Does NOT use ThemeResolver when themeId is explicitly provided
     *
     * SCENARIO: themeId is passed in args
     * EXPECTED: ThemeResolver::getThemeIdByStoreId never called
     */
    public function testDoesNotCallThemeResolverWhenThemeIdProvided(): void
    {
        $this->themeResolverMock->expects($this->never())
            ->method('getThemeIdByScope');

        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->valueServiceMock->method('deleteValues')->willReturn(0);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 5];
        $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 4: Calls deleteValues with userId=null (PUBLISHED has no per-user scope)
     *
     * SCENARIO: Mutation executed by an admin user
     * EXPECTED: deleteValues called with null userId regardless of logged-in user
     */
    public function testCallsDeleteValuesWithNullUserId(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with(
                $this->anything(), // themeId
                $this->anything(), // scope
                $this->anything(), // scopeId
                $this->anything(), // statusId
                null,              // userId MUST be null
                null,
                null
            )
            ->willReturn(0);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 10];
        $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 5: Returns discardedCount=0 when there are no PUBLISHED values
     *
     * SCENARIO: No published customizations exist (fresh install or already reset)
     * EXPECTED: success=true, discardedCount=0
     */
    public function testReturnsZeroDiscardedCountWhenNoPublishedValues(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->valueServiceMock->method('deleteValues')->willReturn(0);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 10];
        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(0, $result['discardedCount']);
    }

    /**
     * Test 6: getAclResource returns editor_reset_published
     *
     * SCENARIO: ACL check performed
     * EXPECTED: Returns the reset_published resource, NOT the default editor_edit
     */
    public function testGetAclResourceReturnsResetPublished(): void
    {
        $this->assertEquals(
            'Swissup_BreezeThemeEditor::editor_reset_published',
            $this->resolver->getAclResource()
        );
    }

    /**
     * Test 7: Result contains all required output fields
     *
     * SCENARIO: Successful execution
     * EXPECTED: Result array has success, message, and discardedCount keys
     */
    public function testResultContainsAllRequiredOutputFields(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->valueServiceMock->method('deleteValues')->willReturn(4);

        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'themeId' => 10];
        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('discardedCount', $result);
        $this->assertTrue($result['success']);
        $this->assertEquals(4, $result['discardedCount']);
    }
}
