<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Swissup\BreezeThemeEditor\Api\AccessTokenInterface;
use Magento\Framework\App\RequestInterface;

class UserResolver
{
    public function __construct(
        private AccessTokenInterface $accessToken,
        private RequestInterface $request
    ) {}

    /**
     * Отримати userId з токена
     */
    public function getCurrentUserId(): int
    {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            throw new GraphQlAuthorizationException(__('Access token required'));
        }

        // Валідувати токен
        if (!$this->accessToken->validate($token)) {
            throw new GraphQlAuthorizationException(__('Invalid access token'));
        }

        // Отримати userId з metadata
        $userId = $this->accessToken->getUserId($token);

        if (! $userId) {
            throw new GraphQlAuthorizationException(__('User not found for token'));
        }

        return $userId;
    }

    /**
     * Отримати повну metadata користувача
     */
    public function getCurrentUserMetadata(): ? array
    {
        $token = $this->getTokenFromRequest();

        if (!$token) {
            return null;
        }

        return $this->accessToken->getMetadata($token);
    }

    /**
     * Отримати токен з request
     */
    private function getTokenFromRequest(): ?string
    {
        // 1. З параметра
        $token = $this->request->getParam($this->accessToken->getParamName());

        if ($token) {
            return $token;
        }

        // 2.  З header
        $token = $this->request->getHeader('X-Breeze-Theme-Editor-Token');

        if ($token) {
            return $token;
        }

        // 3. Authorization Bearer
        $authHeader = $this->request->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            return substr($authHeader, 7);
        }

        return null;
    }

    /**
     * Перевірити чи є валідний токен
     */
    public function isAuthorized(): bool
    {
        try {
            $this->getCurrentUserId();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}
