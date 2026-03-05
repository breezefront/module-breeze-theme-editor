<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Plugin\GraphQL;

use Magento\Authorization\Model\UserContextInterface;
use Magento\Framework\Authorization;
use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface;
use Swissup\BreezeThemeEditor\Plugin\GraphQL\AclAuthorization;

class AclAuthorizationTest extends TestCase
{
    private AclAuthorization $plugin;
    private Authorization|MockObject $authorization;
    private LoggerInterface|MockObject $logger;
    private ResolverInterface|MockObject $resolver;
    private MockObject $context;
    private MockObject $field;
    private MockObject $info;

    protected function setUp(): void
    {
        $this->authorization = $this->createMock(Authorization::class);
        $this->logger        = $this->createMock(LoggerInterface::class);
        $this->plugin        = new AclAuthorization($this->authorization, $this->logger);
        $this->resolver      = $this->createMock(ResolverInterface::class);

        $this->context = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['getUserType', 'getUserId'])
            ->getMock();
        $this->field = $this->createMock(\Magento\Framework\GraphQl\Config\Element\Field::class);
        $this->info  = $this->createMock(\Magento\Framework\GraphQl\Schema\Type\ResolveInfo::class);
    }

    // =========================================================================
    // Authentication check
    // =========================================================================

    public function testThrowsExceptionWhenUserIsNotAdmin(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_CUSTOMER);
        $this->context->method('getUserId')->willReturn(5);

        $this->expectException(GraphQlAuthorizationException::class);

        $this->plugin->beforeResolve($this->resolver, $this->field, $this->context, $this->info);
    }

    public function testThrowsExceptionWhenUserIsGuest(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_GUEST);
        $this->context->method('getUserId')->willReturn(0);

        $this->expectException(GraphQlAuthorizationException::class);

        $this->plugin->beforeResolve($this->resolver, $this->field, $this->context, $this->info);
    }

    // =========================================================================
    // ACL permission check
    // =========================================================================

    public function testThrowsExceptionWhenAdminLacksAclPermission(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);
        $this->context->method('getUserId')->willReturn(1);

        $this->resolver->method('getAclResource')
            ->willReturn('Swissup_BreezeThemeEditor::editor_publish');

        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_publish')
            ->willReturn(false);

        $this->expectException(GraphQlAuthorizationException::class);

        $this->plugin->beforeResolve($this->resolver, $this->field, $this->context, $this->info);
    }

    public function testPassesWhenAdminHasRequiredPermission(): void
    {
        $this->context->method('getUserType')->willReturn(UserContextInterface::USER_TYPE_ADMIN);
        $this->context->method('getUserId')->willReturn(1);

        $this->resolver->method('getAclResource')
            ->willReturn('Swissup_BreezeThemeEditor::editor_edit');

        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_edit')
            ->willReturn(true);

        // No exception expected
        $this->plugin->beforeResolve($this->resolver, $this->field, $this->context, $this->info);

        $this->assertTrue(true); // assert execution reached here
    }
}
