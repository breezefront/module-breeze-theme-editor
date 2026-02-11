<?php

namespace Swissup\BreezeThemeEditor\Api;

/**
 * @deprecated Since module version 1.x.x - No longer used with GraphQL Bearer token authentication
 * @see \Swissup\BreezeThemeEditor\Model\Utility\UserResolver - Now uses GraphQL context for user identification
 * @see \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator - Generates JWT tokens via Magento's UserTokenIssuer
 * 
 * This interface was part of the old custom token authentication system.
 * GraphQL now uses standard Magento Bearer tokens (JWT) which are validated by TokenUserContext.
 * This interface will be removed in a future major version.
 */
interface AccessTokenInterface
{
    /**
     * Get existing token (backward compatibility)
     *
     * @return string
     */
    public function getToken();

    /**
     * Create new token with metadata
     *
     * @param array $metadata ['user_id' => int, 'username' => string, ...]
     * @return string
     */
    public function createToken(array $metadata): string;

    /**
     * Validate token
     *
     * @param string $token
     * @return bool
     */
    public function validate($token);

    /**
     * Get parameter name
     *
     * @return string
     */
    public function getParamName(): string;

    /**
     * Validate request
     *
     * @param \Magento\Framework\App\RequestInterface $request
     * @return bool
     */
    public function validateRequest(\Magento\Framework\App\RequestInterface $request);

    /**
     * Get metadata by token
     *
     * @param string $token
     * @return array|null
     */
    public function getMetadata(string $token): ?array;

    /**
     * Get user ID by token
     *
     * @param string $token
     * @return int|null
     */
    public function getUserId(string $token): ?int;

    /**
     * Invalidate token
     *
     * @return void
     */
    public function invalidate();
}
