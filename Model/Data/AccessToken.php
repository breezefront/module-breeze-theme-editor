<?php

namespace Swissup\BreezeThemeEditor\Model\Data;

use Magento\Framework\Encryption\Helper\Security;
use Magento\Framework\Exception\LocalizedException;

/**
 * @deprecated Since module version 1.x.x - No longer used with GraphQL Bearer token authentication
 * @see \Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator - Now generates JWT tokens
 * 
 * This class was part of the old custom token system. GraphQL now uses Magento's standard
 * Bearer token authentication (JWT) which doesn't require custom token storage.
 */
class AccessToken implements \Swissup\BreezeThemeEditor\Api\AccessTokenInterface
{
    const CACHE_ID = 'swissup_breeze_theme_editor_3h_access_token';
    const CACHE_ID_META = 'swissup_breeze_theme_editor_3h_access_token_meta';
    const CACHE_TAG = 'swissup_breeze_theme_editor_client';
    const LIFETIME = 10800; // 3 hours
    const PARAM_NAME = 'breeze_theme_editor_access_token';

    private $mathRandom;
    private $cacheFrontend;
    private $serializer;

    /**
     * @param \Magento\Framework\Math\Random $mathRandom
     * @param \Magento\Framework\App\Cache\Frontend\Pool $cacheFrontendPool
     * @param \Magento\Framework\Serialize\SerializerInterface $serializer
     */
    public function __construct(
        \Magento\Framework\Math\Random $mathRandom,
        \Magento\Framework\App\Cache\Frontend\Pool $cacheFrontendPool,
        \Magento\Framework\Serialize\SerializerInterface $serializer
    ) {
        $this->mathRandom = $mathRandom;
        $this->cacheFrontend = $cacheFrontendPool->get(\Magento\Framework\App\Cache\Frontend\Pool::DEFAULT_FRONTEND_ID);
        $this->serializer = $serializer;
    }

    /**
     * Retrieve State Token (без metadata - для backward compatibility)
     *
     * @return string A 16 bit unique key
     * @throws \Magento\Framework\Exception\LocalizedException
     */
    public function getToken()
    {
        if (!$this->isPresent()) {
            $token = $this->mathRandom->getRandomString(16);
            $this->set($token);
        }
        return $this->cacheFrontend->load(self::CACHE_ID);
    }

    /**
     * Створити токен з metadata
     *
     * @param array $metadata ['user_id' => int, 'username' => string, 'email' => string, ...]
     * @return string
     * @throws LocalizedException
     */
    public function createToken(array $metadata): string
    {
        $token = $this->mathRandom->getRandomString(16);
        $this->set($token);
        $this->setMetadata($token, $metadata);
        return $token;
    }

    /**
     * Determine if the token is present in the cache
     *
     * @return bool
     */
    private function isPresent()
    {
        return (bool) $this->cacheFrontend->test(self::CACHE_ID);
    }

    /**
     * Save the value of the token
     *
     * @param string $value
     * @return void
     */
    private function set($value)
    {
        $this->cacheFrontend->save(
            (string) $value,
            self::CACHE_ID, [self::CACHE_TAG],
            self::LIFETIME
        );
    }

    /**
     * Зберегти metadata для токена
     *
     * @param string $token
     * @param array $metadata
     * @return void
     */
    private function setMetadata(string $token, array $metadata)
    {
        // Додати токен і timestamp до metadata
        $metadata['token'] = $token;
        $metadata['created_at'] = $metadata['created_at'] ?? time();

        $serialized = $this->serializer->serialize($metadata);

        $this->cacheFrontend->save(
            $serialized,
            self::CACHE_ID_META,
            [self::CACHE_TAG],
            self::LIFETIME
        );
    }

    /**
     * Отримати metadata по токену
     *
     * @param string $token
     * @return array|null
     */
    public function getMetadata(string $token): ?array
    {
        // Перевірити що токен валідний
        if (!$this->validate($token)) {
            return null;
        }

        $serialized = $this->cacheFrontend->load(self::CACHE_ID_META);

        if (!$serialized) {
            return null;
        }

        try {
            $metadata = $this->serializer->unserialize($serialized);

            // Додаткова перевірка: токен в metadata має співпадати
            if (!isset($metadata['token']) || !Security::compareStrings($metadata['token'], $token)) {
                return null;
            }

            return $metadata;
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Отримати User ID по токену
     *
     * @param string $token
     * @return int|null
     */
    public function getUserId(string $token): ?int
    {
        $metadata = $this->getMetadata($token);
        return isset($metadata['user_id']) ?  (int)$metadata['user_id'] : null;
    }

    /**
     * Validate token
     *
     * @param string $token
     * @return bool
     * @throws LocalizedException
     */
    public function validate($token)
    {
        if (!$token) {
            return false;
        }

        $currentToken = $this->cacheFrontend->load(self::CACHE_ID);

        if (!$currentToken) {
            return false;
        }

        return Security::compareStrings($token, $currentToken);
    }

    /**
     * Get parameter name
     *
     * @return string
     */
    public function getParamName(): string
    {
        return self::PARAM_NAME;
    }

    /**
     * Validate request
     *
     * @param \Magento\Framework\App\RequestInterface $request
     * @return bool
     */
    public function validateRequest(\Magento\Framework\App\RequestInterface $request)
    {
        $token = $request->getParam($this->getParamName(), null);
        return $this->validate($token);
    }

    /**
     * Invalidate token (logout)
     *
     * @return void
     */
    public function invalidate()
    {
        $this->cacheFrontend->remove(self::CACHE_ID);
        $this->cacheFrontend->remove(self::CACHE_ID_META);
    }
}
