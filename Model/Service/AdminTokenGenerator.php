<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Backend\Model\Auth\Session as AdminSession;
use Magento\Integration\Api\UserTokenIssuerInterface;
use Magento\Integration\Model\UserToken\UserTokenParametersFactory;
use Magento\Integration\Model\CustomUserContext;
use Magento\Authorization\Model\UserContextInterface;
use Magento\Framework\Jwt\JwtManagerInterface;
use Magento\Framework\Jwt\Payload\ClaimsPayloadInterface;
use Magento\JwtUserToken\Model\JwtSettingsProviderInterface;
use Magento\JwtUserToken\Api\ConfigReaderInterface;
use Psr\Log\LoggerInterface;

/**
 * Generate Magento admin integration tokens for Theme Editor
 * 
 * Uses native Magento JWT token system.
 * Token lifetime is controlled by webapi/jwtauth/admin_expiration config (default 60 minutes).
 * Token expiration is read directly from JWT 'exp' claim to match Magento's validation.
 * Token is cached in admin session with real expiration timestamp.
 */
class AdminTokenGenerator
{
    /**
     * Session key for storing cached token
     */
    private const SESSION_KEY_TOKEN = 'bte_admin_token';
    
    /**
     * Session key for storing token expiration time
     */
    private const SESSION_KEY_EXPIRES = 'bte_admin_token_expires';
    
    /**
     * Buffer time before expiration (generate new token 5 minutes before expiry)
     */
    private const TOKEN_EXPIRATION_BUFFER = 5 * 60; // 5 minutes

    /**
     * @var AdminSession
     */
    private $adminSession;

    /**
     * @var UserTokenIssuerInterface
     */
    private $tokenIssuer;

    /**
     * @var UserTokenParametersFactory
     */
    private $tokenParametersFactory;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var JwtManagerInterface
     */
    private $jwtManager;

    /**
     * @var JwtSettingsProviderInterface
     */
    private $settingsProvider;

    /**
     * @var ConfigReaderInterface
     */
    private $configReader;

    /**
     * @param AdminSession $adminSession
     * @param UserTokenIssuerInterface $tokenIssuer
     * @param UserTokenParametersFactory $tokenParametersFactory
     * @param LoggerInterface $logger
     * @param JwtManagerInterface $jwtManager
     * @param JwtSettingsProviderInterface $settingsProvider
     * @param ConfigReaderInterface $configReader
     */
    public function __construct(
        AdminSession $adminSession,
        UserTokenIssuerInterface $tokenIssuer,
        UserTokenParametersFactory $tokenParametersFactory,
        LoggerInterface $logger,
        JwtManagerInterface $jwtManager,
        JwtSettingsProviderInterface $settingsProvider,
        ConfigReaderInterface $configReader
    ) {
        $this->adminSession = $adminSession;
        $this->tokenIssuer = $tokenIssuer;
        $this->tokenParametersFactory = $tokenParametersFactory;
        $this->logger = $logger;
        $this->jwtManager = $jwtManager;
        $this->settingsProvider = $settingsProvider;
        $this->configReader = $configReader;
    }

    /**
     * Generate Magento admin token for currently logged-in admin
     * 
     * Returns cached token if still valid (checks real JWT expiration time).
     * Token lifetime is determined by webapi/jwtauth/admin_expiration config.
     * 
     * @return string Bearer token for GraphQL authentication
     * @throws \Exception If no admin user logged in
     */
    public function generateForCurrentAdmin(): string
    {
        $user = $this->adminSession->getUser();
        
        if (!$user || !$user->getId()) {
            throw new \Exception('No admin user logged in');
        }

        // Try to get cached token from session
        $cachedToken = $this->getCachedToken();
        
        if ($cachedToken && $this->isTokenValid($cachedToken)) {
            $this->logger->debug('[BTE] Using cached admin token');
            return $cachedToken;
        }

        // Token expired or doesn't exist - create new one
        if ($cachedToken) {
            $this->logger->debug('[BTE] Cached token expired, generating new one');
            $this->clearCachedToken();
        }

        // Create new token
        $token = $this->createNewToken((int) $user->getId());
        
        // Cache it in session
        $this->cacheToken($token);
        
        return $token;
    }

    /**
     * Force refresh token (clear cache and generate new)
     * 
     * @return string New token
     * @throws \Exception If no admin user logged in
     */
    public function forceRefresh(): string
    {
        $this->clearCachedToken();
        return $this->generateForCurrentAdmin();
    }

    /**
     * Get cached token from admin session
     * 
     * @return string|null
     */
    private function getCachedToken(): ?string
    {
        return $this->adminSession->getData(self::SESSION_KEY_TOKEN);
    }

    /**
     * Cache token in admin session with expiration time
     * 
     * Reads actual expiration time from JWT token.
     * Falls back to config-based TTL if JWT reading fails.
     * 
     * @param string $token
     * @return void
     */
    private function cacheToken(string $token): void
    {
        // Try to read real expiration from JWT
        $expiresAt = $this->getTokenExpiration($token);
        
        // Fallback: if failed to read JWT, calculate from config
        if (!$expiresAt) {
            $ttlMinutes = $this->configReader->getAdminTtl();
            $expiresAt = time() + ($ttlMinutes * 60);
            
            $this->logger->warning(sprintf(
                '[BTE] Could not read JWT expiration, using config TTL: %d minutes',
                $ttlMinutes
            ));
        }
        
        // Cache token and expiration in session
        $this->adminSession->setData(self::SESSION_KEY_TOKEN, $token);
        $this->adminSession->setData(self::SESSION_KEY_EXPIRES, $expiresAt);
        
        $secondsUntilExpiry = $expiresAt - time();
        
        $this->logger->debug(sprintf(
            '[BTE] Token cached in session, expires at: %s (%d seconds / %.1f minutes from now)',
            date('Y-m-d H:i:s', $expiresAt),
            $secondsUntilExpiry,
            $secondsUntilExpiry / 60
        ));
    }

    /**
     * Clear cached token from admin session
     * 
     * @return void
     */
    private function clearCachedToken(): void
    {
        $this->adminSession->unsetData(self::SESSION_KEY_TOKEN);
        $this->adminSession->unsetData(self::SESSION_KEY_EXPIRES);
    }

    /**
     * Get token expiration timestamp from JWT
     * 
     * Reads the 'exp' claim directly from JWT token using JwtManager.
     * This matches Magento's validation logic in ExpirationValidator.
     * 
     * @param string $token JWT token string
     * @return int|null Unix timestamp when token expires, or null if failed to read
     */
    private function getTokenExpiration(string $token): ?int
    {
        try {
            // Read JWT using same mechanism as Magento's ExpirationValidator
            $jwt = $this->jwtManager->read(
                $token, 
                $this->settingsProvider->prepareAllAccepted()
            );
            
            // Extract payload
            $payload = $jwt->getPayload();
            if (!$payload instanceof ClaimsPayloadInterface) {
                $this->logger->warning('[BTE] JWT payload does not contain claims');
                return null;
            }
            
            // Get exp claim
            $claims = $payload->getClaims();
            if (empty($claims['exp'])) {
                $this->logger->warning('[BTE] JWT does not contain exp claim');
                return null;
            }
            
            $expiration = (int) $claims['exp']->getValue();
            
            $this->logger->debug(sprintf(
                '[BTE] Token expiration read from JWT: %s (%d seconds from now)',
                date('Y-m-d H:i:s', $expiration),
                $expiration - time()
            ));
            
            return $expiration;
            
        } catch (\Exception $e) {
            $this->logger->error(
                '[BTE] Failed to read JWT token expiration: ' . $e->getMessage()
            );
            return null;
        }
    }

    /**
     * Check if cached token is still valid (not expired)
     * 
     * Uses expiration time from session, no DB query needed.
     * Adds 5-minute buffer before actual expiration for safety.
     * 
     * @param string $token
     * @return bool
     */
    private function isTokenValid(string $token): bool
    {
        $expiresAt = $this->adminSession->getData(self::SESSION_KEY_EXPIRES);
        
        if (!$expiresAt) {
            $this->logger->debug('[BTE] No expiration time found in session');
            return false;
        }
        
        // Check if token expires in less than buffer time
        $expiresIn = $expiresAt - time();
        
        $this->logger->debug(sprintf(
            '[BTE] Token validation: expires in %d seconds (buffer: %d seconds)',
            $expiresIn,
            self::TOKEN_EXPIRATION_BUFFER
        ));
        
        if ($expiresIn <= self::TOKEN_EXPIRATION_BUFFER) {
            $this->logger->debug(sprintf(
                '[BTE] Token expires in %d seconds (less than %d buffer), will refresh',
                $expiresIn,
                self::TOKEN_EXPIRATION_BUFFER
            ));
            return false;
        }
        
        $this->logger->debug('[BTE] Token is still valid');
        return true;
    }

    /**
     * Create new Magento integration token
     * 
     * Creates token via Magento's standard UserTokenIssuer.
     * Token is stored in oauth_token table.
     * 
     * @param int $userId Admin user ID
     * @return string Token string
     * @throws \Exception If token creation fails
     */
    private function createNewToken(int $userId): string
    {
        try {
            // Create UserContext with admin user ID and type
            $context = new CustomUserContext(
                $userId,
                UserContextInterface::USER_TYPE_ADMIN
            );
            
            // Create token parameters (empty is fine, will use defaults)
            $params = $this->tokenParametersFactory->create();
            
            // Generate token via Magento's standard mechanism
            $token = $this->tokenIssuer->create($context, $params);
            
            $this->logger->info(sprintf(
                '[BTE] Created new admin token for user ID: %d',
                $userId
            ));
            
            return $token;
            
        } catch (\Exception $e) {
            $this->logger->error(
                '[BTE] Failed to create admin token: ' . $e->getMessage()
            );
            throw $e;
        }
    }
}
