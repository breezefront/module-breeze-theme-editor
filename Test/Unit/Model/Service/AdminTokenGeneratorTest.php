<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use Magento\Backend\Model\Auth\Session as BackendSession;
use Magento\Integration\Model\CustomUserContext;
use Magento\Integration\Model\UserToken\UserTokenParametersFactory;
use Magento\Integration\Api\UserTokenIssuerInterface;
use Magento\Framework\Jwt\JwtManagerInterface;
use Magento\Framework\Jwt\Payload\ClaimsPayloadInterface;
use Magento\Framework\Jwt\Jws\JwsInterface;
use Magento\Framework\Jwt\Claim\ExpirationTime;
use Magento\JwtUserToken\Model\JwtSettingsProviderInterface;
use Magento\JwtUserToken\Api\ConfigReaderInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator;

class AdminTokenGeneratorTest extends TestCase
{
    private AdminTokenGenerator $adminTokenGenerator;
    private BackendSession $backendSession;
    private UserTokenIssuerInterface $tokenIssuer;
    private UserTokenParametersFactory $tokenParamsFactory;
    private LoggerInterface $logger;
    private JwtManagerInterface $jwtManager;
    private JwtSettingsProviderInterface $settingsProvider;
    private ConfigReaderInterface $configReader;

    protected function setUp(): void
    {
        // BackendSession: getData exists, but getUser/setData/unsetData are via __call()
        $this->backendSession = $this->getMockBuilder(BackendSession::class)
            ->disableOriginalConstructor()
            ->disableAutoReturnValueGeneration()
            ->disableArgumentCloning()
            ->disallowMockingUnknownTypes()
            ->onlyMethods(['getData']) // Exists in SessionManager
            ->addMethods(['getUser', 'setData', 'unsetData']) // Magic methods via __call()
            ->getMock();
            
        $this->tokenIssuer = $this->createMock(UserTokenIssuerInterface::class);
        $this->tokenParamsFactory = $this->createMock(UserTokenParametersFactory::class);
        $this->logger = $this->createMock(LoggerInterface::class);
        $this->jwtManager = $this->createMock(JwtManagerInterface::class);
        $this->settingsProvider = $this->createMock(JwtSettingsProviderInterface::class);
        $this->configReader = $this->createMock(ConfigReaderInterface::class);

        $this->adminTokenGenerator = new AdminTokenGenerator(
            $this->backendSession,
            $this->tokenIssuer,
            $this->tokenParamsFactory,
            $this->logger,
            $this->jwtManager,
            $this->settingsProvider,
            $this->configReader
        );
    }

    /**
     * Create mock JWT with expiration claim
     *
     * @param int $expiresAt Unix timestamp
     * @return JwsInterface
     */
    private function createMockJwt(int $expiresAt): JwsInterface
    {
        $expClaim = $this->createMock(ExpirationTime::class);
        $expClaim->method('getValue')->willReturn($expiresAt);
        
        $payload = $this->createMock(ClaimsPayloadInterface::class);
        $payload->method('getClaims')->willReturn(['exp' => $expClaim]);
        
        $jwt = $this->createMock(JwsInterface::class);
        $jwt->method('getPayload')->willReturn($payload);
        
        return $jwt;
    }

    public function testGenerateForCurrentAdminCreatesNewToken(): void
    {
        // Arrange
        $userId = 42;
        $expectedToken = 'test-token-abc123';
        $jwtExpiration = time() + 3600; // 1 hour from now
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn($userId);
        $user->method('getUsername')->willReturn('admin');
        
        $this->backendSession->method('getUser')->willReturn($user);
        
        // No cached token in session
        $this->backendSession->method('getData')
            ->with('bte_admin_token')
            ->willReturn(null);
        
        // Mock token parameters
        $tokenParams = $this->createMock(\Magento\Integration\Api\Data\UserTokenParametersInterface::class);
        $this->tokenParamsFactory->method('create')->willReturn($tokenParams);
        
        // Mock token issuer
        $this->tokenIssuer->method('create')
            ->willReturn($expectedToken);
        
        // Mock JWT expiration reading
        $mockJwt = $this->createMockJwt($jwtExpiration);
        $this->jwtManager->expects($this->once())
            ->method('read')
            ->with($expectedToken, $this->anything())
            ->willReturn($mockJwt);
        
        $this->settingsProvider->expects($this->once())
            ->method('prepareAllAccepted')
            ->willReturn([]);
        
        // Expect session to store token with JWT expiration
        $this->backendSession->expects($this->exactly(2))
            ->method('setData')
            ->willReturnCallback(function ($key, $value) use ($expectedToken, $jwtExpiration) {
                if ($key === 'bte_admin_token') {
                    $this->assertEquals($expectedToken, $value);
                } elseif ($key === 'bte_admin_token_expires') {
                    // Should match JWT expiration
                    $this->assertEquals($jwtExpiration, $value);
                }
                return $this->backendSession;
            });

        // Act
        $result = $this->adminTokenGenerator->generateForCurrentAdmin();

        // Assert
        $this->assertEquals($expectedToken, $result);
    }

    public function testGenerateForCurrentAdminReturnsCachedToken(): void
    {
        // Arrange
        $cachedToken = 'cached-token-xyz789';
        $futureExpiry = time() + 7200; // 2 hours from now (more than 5 min buffer)
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn(42);
        
        $this->backendSession->method('getUser')->willReturn($user);
        
        // Mock cached token in session
        // getData() is called twice: once for token, once for expiry
        $this->backendSession->method('getData')
            ->willReturnCallback(function($key) use ($cachedToken, $futureExpiry) {
                if ($key === 'bte_admin_token') {
                    return $cachedToken;
                }
                if ($key === 'bte_admin_token_expires') {
                    return $futureExpiry;
                }
                return null;
            });
        
        // Token issuer should NOT be called (using cache)
        $this->tokenIssuer->expects($this->never())->method('create');
        
        // Session should NOT be updated (using cache)
        $this->backendSession->expects($this->never())->method('setData');

        // Act
        $result = $this->adminTokenGenerator->generateForCurrentAdmin();

        // Assert
        $this->assertEquals($cachedToken, $result);
    }

    public function testGenerateForCurrentAdminRefreshesExpiredToken(): void
    {
        // Arrange
        $oldToken = 'old-expired-token';
        $newToken = 'new-refreshed-token';
        $pastExpiry = time() - 100; // Expired 100 seconds ago
        $newJwtExpiration = time() + 3600; // New token expires in 1 hour
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn(42);
        $user->method('getUsername')->willReturn('admin');
        
        $this->backendSession->method('getUser')->willReturn($user);
        
        // Mock expired token in session
        $this->backendSession->method('getData')
            ->willReturnCallback(function($key) use ($oldToken, $pastExpiry) {
                if ($key === 'bte_admin_token') {
                    return $oldToken;
                }
                if ($key === 'bte_admin_token_expires') {
                    return $pastExpiry;
                }
                return null;
            });
        
        // Mock token parameters
        $tokenParams = $this->createMock(\Magento\Integration\Api\Data\UserTokenParametersInterface::class);
        $this->tokenParamsFactory->method('create')->willReturn($tokenParams);
        
        // Mock token issuer to create new token
        $this->tokenIssuer->method('create')->willReturn($newToken);
        
        // Mock JWT reading for new token
        $mockJwt = $this->createMockJwt($newJwtExpiration);
        $this->jwtManager->expects($this->once())
            ->method('read')
            ->with($newToken, $this->anything())
            ->willReturn($mockJwt);
        
        $this->settingsProvider->method('prepareAllAccepted')->willReturn([]);
        
        // Expect session to store new token
        $this->backendSession->expects($this->exactly(2))
            ->method('setData')
            ->willReturnSelf();
        
        // Expect unsetData to be called (clearing old token)
        $this->backendSession->expects($this->exactly(2))
            ->method('unsetData');

        // Act
        $result = $this->adminTokenGenerator->generateForCurrentAdmin();

        // Assert
        $this->assertEquals($newToken, $result);
    }

    public function testGenerateForCurrentAdminThrowsExceptionWhenNotLoggedIn(): void
    {
        // Arrange
        $this->backendSession->method('getUser')->willReturn(null);

        // Expect exception
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('No admin user logged in');

        // Act
        $this->adminTokenGenerator->generateForCurrentAdmin();
    }

    public function testForceRefreshCreatesNewTokenEvenIfCached(): void
    {
        // Arrange
        $oldToken = 'old-cached-token';
        $newToken = 'force-refreshed-token';
        $newJwtExpiration = time() + 3600;
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn(42);
        $user->method('getUsername')->willReturn('admin');
        
        $this->backendSession->method('getUser')->willReturn($user);
        
        // Mock getData to return null (no cached token)
        // After clearCachedToken(), there should be no cached token
        $this->backendSession->method('getData')
            ->willReturn(null);
        
        // Mock token parameters
        $tokenParams = $this->createMock(\Magento\Integration\Api\Data\UserTokenParametersInterface::class);
        $this->tokenParamsFactory->method('create')->willReturn($tokenParams);
        
        // Mock token issuer - should be called once
        $this->tokenIssuer->expects($this->once())
            ->method('create')
            ->willReturn($newToken);
        
        // Mock JWT reading for new token
        $mockJwt = $this->createMockJwt($newJwtExpiration);
        $this->jwtManager->expects($this->once())
            ->method('read')
            ->with($newToken, $this->anything())
            ->willReturn($mockJwt);
        
        $this->settingsProvider->method('prepareAllAccepted')->willReturn([]);
        
        // Expect unsetData to be called (clearing old token)
        $this->backendSession->expects($this->exactly(2))
            ->method('unsetData');
        
        // Expect session to store new token
        $this->backendSession->expects($this->exactly(2))
            ->method('setData')
            ->willReturnSelf();

        // Act
        $result = $this->adminTokenGenerator->forceRefresh();

        // Assert
        $this->assertEquals($newToken, $result);
    }

    public function testTokenExpirationIsReadFromJwt(): void
    {
        // Arrange
        $userId = 42;
        $expectedToken = 'test-jwt-token';
        $jwtExpiration = time() + 3600; // 1 hour from now
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn($userId);
        $user->method('getUsername')->willReturn('admin');
        
        $this->backendSession->method('getUser')->willReturn($user);
        $this->backendSession->method('getData')->with('bte_admin_token')->willReturn(null);
        
        // Mock token parameters
        $tokenParams = $this->createMock(\Magento\Integration\Api\Data\UserTokenParametersInterface::class);
        $this->tokenParamsFactory->method('create')->willReturn($tokenParams);
        
        $this->tokenIssuer->method('create')->willReturn($expectedToken);
        
        // Mock JWT reading to return specific expiration
        $mockJwt = $this->createMockJwt($jwtExpiration);
        $this->jwtManager->expects($this->once())
            ->method('read')
            ->with($expectedToken, $this->anything())
            ->willReturn($mockJwt);
        
        $this->settingsProvider->method('prepareAllAccepted')->willReturn([]);
        
        // Capture the expiry time set in session
        $capturedExpiry = null;
        $this->backendSession->expects($this->exactly(2))
            ->method('setData')
            ->willReturnCallback(function ($key, $value) use (&$capturedExpiry) {
                if ($key === 'bte_admin_token_expires') {
                    $capturedExpiry = $value;
                }
                return $this->backendSession;
            });

        // Act
        $this->adminTokenGenerator->generateForCurrentAdmin();

        // Assert - expiry should match JWT expiration exactly
        $this->assertEquals($jwtExpiration, $capturedExpiry);
    }

    public function testTokenExpirationFallsBackToConfigWhenJwtReadFails(): void
    {
        // Arrange
        $userId = 42;
        $expectedToken = 'test-jwt-token';
        $configTtlMinutes = 60; // From config
        
        $user = $this->createMock(\Magento\User\Model\User::class);
        $user->method('getId')->willReturn($userId);
        $user->method('getUsername')->willReturn('admin');
        
        $this->backendSession->method('getUser')->willReturn($user);
        $this->backendSession->method('getData')->with('bte_admin_token')->willReturn(null);
        
        // Mock token parameters
        $tokenParams = $this->createMock(\Magento\Integration\Api\Data\UserTokenParametersInterface::class);
        $this->tokenParamsFactory->method('create')->willReturn($tokenParams);
        
        $this->tokenIssuer->method('create')->willReturn($expectedToken);
        
        // Mock JWT reading to throw exception
        $this->jwtManager->expects($this->once())
            ->method('read')
            ->willThrowException(new \Exception('JWT read failed'));
        
        $this->settingsProvider->method('prepareAllAccepted')->willReturn([]);
        
        // Mock config reader to return TTL
        $this->configReader->expects($this->once())
            ->method('getAdminTtl')
            ->willReturn($configTtlMinutes);
        
        // Expect error to be logged
        $this->logger->expects($this->atLeastOnce())
            ->method('error')
            ->with($this->stringContains('Failed to read JWT token expiration'));
        
        // Capture the expiry time set in session
        $capturedExpiry = null;
        $this->backendSession->expects($this->exactly(2))
            ->method('setData')
            ->willReturnCallback(function ($key, $value) use (&$capturedExpiry) {
                if ($key === 'bte_admin_token_expires') {
                    $capturedExpiry = $value;
                }
                return $this->backendSession;
            });

        // Act
        $this->adminTokenGenerator->generateForCurrentAdmin();

        // Assert - expiry should be calculated from config TTL
        $expectedExpiry = time() + ($configTtlMinutes * 60);
        $this->assertNotNull($capturedExpiry);
        $this->assertEqualsWithDelta($expectedExpiry, $capturedExpiry, 10); // Allow 10 seconds delta
    }
}
