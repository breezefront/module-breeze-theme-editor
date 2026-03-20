<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Backend\Model\Auth\Session as AuthSession;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarAuthProvider;

/**
 * Unit tests for ToolbarAuthProvider
 *
 * Covers: canShow(), getAdminUsername(), getUserId(), getToken()
 */
class ToolbarAuthProviderTest extends TestCase
{
    private AuthSession $authSession;
    private AdminTokenGenerator $tokenGenerator;
    private ToolbarAuthProvider $provider;

    protected function setUp(): void
    {
        // AuthSession: isLoggedIn() is a real method → onlyMethods()
        //              getUser() is a magic __call method → addMethods()
        $this->authSession = $this->getMockBuilder(AuthSession::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['isLoggedIn'])
            ->addMethods(['getUser'])
            ->getMock();
        $this->tokenGenerator = $this->createMock(AdminTokenGenerator::class);

        $this->provider = new ToolbarAuthProvider(
            $this->authSession,
            $this->tokenGenerator
        );
    }

    // =========================================================================
    // canShow()
    // =========================================================================

    /** @test */
    public function testCanShowReturnsTrueWhenLoggedIn(): void
    {
        $this->authSession->method('isLoggedIn')->willReturn(true);
        $this->assertTrue($this->provider->canShow());
    }

    /** @test */
    public function testCanShowReturnsFalseWhenNotLoggedIn(): void
    {
        $this->authSession->method('isLoggedIn')->willReturn(false);
        $this->assertFalse($this->provider->canShow());
    }

    // =========================================================================
    // getAdminUsername()
    // =========================================================================

    /** @test */
    public function testGetAdminUsernameReturnsUsernameFromSession(): void
    {
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getUsername')->willReturn('john_admin');
        $this->authSession->method('getUser')->willReturn($user);

        $this->assertSame('john_admin', $this->provider->getAdminUsername());
    }

    /** @test */
    public function testGetAdminUsernameReturnsFallbackWhenNoUser(): void
    {
        $this->authSession->method('getUser')->willReturn(null);
        // Falls back to __('Admin') which casts to string 'Admin'
        $this->assertSame('Admin', $this->provider->getAdminUsername());
    }

    // =========================================================================
    // getUserId()
    // =========================================================================

    /** @test */
    public function testGetUserIdReturnsUserIdFromSession(): void
    {
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn(42);
        $this->authSession->method('getUser')->willReturn($user);

        $this->assertSame(42, $this->provider->getUserId());
    }

    /** @test */
    public function testGetUserIdReturnsNullWhenNoUser(): void
    {
        $this->authSession->method('getUser')->willReturn(null);
        $this->assertNull($this->provider->getUserId());
    }

    // =========================================================================
    // getToken()
    // =========================================================================

    /** @test */
    public function testGetTokenReturnsTokenFromGenerator(): void
    {
        $this->tokenGenerator->method('generateForCurrentAdmin')->willReturn('abc123token');
        $this->assertSame('abc123token', $this->provider->getToken());
    }

    /** @test */
    public function testGetTokenReturnsNullOnException(): void
    {
        $this->tokenGenerator->method('generateForCurrentAdmin')
            ->willThrowException(new \Exception('No admin logged in'));

        $this->assertNull($this->provider->getToken());
    }
}
