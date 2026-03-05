<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use Magento\Authorization\Model\UserContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class UserResolverTest extends TestCase
{
    private UserResolver $resolver;
    private LoggerInterface|MockObject $logger;
    private ContextInterface|MockObject $context;

    protected function setUp(): void
    {
        $this->logger   = $this->createMock(LoggerInterface::class);
        $this->resolver = new UserResolver($this->logger);
        $this->context  = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
    }

    // =========================================================================
    // getCurrentUserId — exception paths
    // =========================================================================

    public function testThrowsExceptionWhenUserIsGuest(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_GUEST);
        $this->context->method('getUserId')->willReturn(0);

        $this->expectException(GraphQlAuthorizationException::class);
        $this->resolver->getCurrentUserId($this->context);
    }

    public function testThrowsExceptionWhenUserIsCustomer(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_CUSTOMER);
        $this->context->method('getUserId')->willReturn(5);

        $this->expectException(GraphQlAuthorizationException::class);
        $this->resolver->getCurrentUserId($this->context);
    }

    public function testThrowsExceptionWhenAdminUserIdIsZero(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);
        $this->context->method('getUserId')->willReturn(0);

        $this->expectException(GraphQlAuthorizationException::class);
        $this->resolver->getCurrentUserId($this->context);
    }

    // =========================================================================
    // getCurrentUserId — happy path
    // =========================================================================

    public function testReturnsUserIdForAuthenticatedAdmin(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);
        $this->context->method('getUserId')->willReturn(42);

        $result = $this->resolver->getCurrentUserId($this->context);

        $this->assertSame(42, $result);
    }

    // =========================================================================
    // Helper methods
    // =========================================================================

    public function testGetUserTypeReturnsValueFromContext(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);

        $result = $this->resolver->getUserType($this->context);

        $this->assertSame(UserContextInterface::USER_TYPE_ADMIN, $result);
    }

    public function testGetCurrentUserMetadataReturnsAllFields(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);
        $this->context->method('getUserId')->willReturn(7);

        $result = $this->resolver->getCurrentUserMetadata($this->context);

        $this->assertSame(7, $result['userId']);
        $this->assertSame(UserContextInterface::USER_TYPE_ADMIN, $result['userType']);
        $this->assertTrue($result['isAdmin']);
        $this->assertTrue($result['isAuthorized']);
    }
}
