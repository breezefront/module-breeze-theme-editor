<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Backend\Model\Auth\Session as AdminSession;
use Magento\Integration\Api\UserTokenIssuerInterface;
use Magento\Integration\Model\UserToken\UserTokenParametersFactory;
use Magento\Integration\Model\CustomUserContext;
use Magento\Authorization\Model\UserContextInterface;
use Psr\Log\LoggerInterface;

/**
 * Generate Magento admin integration tokens for Theme Editor
 * 
 * Uses native Magento token system (oauth_token table).
 * Tokens are valid for 4 hours (configurable in oauth/access_token_lifetime/admin).
 * Token is cached in admin session to avoid creating new token on each request.
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
     * Token lifetime in seconds (4 hours, same as Magento config default)
     */
    private const TOKEN_LIFETIME = 4 * 3600; // 4 hours
    
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
     * @param AdminSession $adminSession
     * @param UserTokenIssuerInterface $tokenIssuer
     * @param UserTokenParametersFactory $tokenParametersFactory
     * @param LoggerInterface $logger
     */
    public function __construct(
        AdminSession $adminSession,
        UserTokenIssuerInterface $tokenIssuer,
        UserTokenParametersFactory $tokenParametersFactory,
        LoggerInterface $logger
    ) {
        $this->adminSession = $adminSession;
        $this->tokenIssuer = $tokenIssuer;
        $this->tokenParametersFactory = $tokenParametersFactory;
        $this->logger = $logger;
    }

    /**
     * Generate Magento admin token for currently logged-in admin
     * 
     * Returns cached token if still valid, otherwise creates new one.
     * Token is stored in admin session with expiration timestamp.
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
     * @param string $token
     * @return void
     */
    private function cacheToken(string $token): void
    {
        $expiresAt = time() + self::TOKEN_LIFETIME;
        
        $this->adminSession->setData(self::SESSION_KEY_TOKEN, $token);
        $this->adminSession->setData(self::SESSION_KEY_EXPIRES, $expiresAt);
        
        $this->logger->debug(sprintf(
            '[BTE] Token cached in session, expires at: %s',
            date('Y-m-d H:i:s', $expiresAt)
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
            return false;
        }
        
        // Check if token expires in less than buffer time
        $expiresIn = $expiresAt - time();
        
        if ($expiresIn <= self::TOKEN_EXPIRATION_BUFFER) {
            $this->logger->debug(sprintf(
                '[BTE] Token expires in %d seconds (less than %d buffer), will refresh',
                $expiresIn,
                self::TOKEN_EXPIRATION_BUFFER
            ));
            return false;
        }
        
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
