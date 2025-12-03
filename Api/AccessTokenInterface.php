<?php

namespace Swissup\BreezeThemeEditor\Api;

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
