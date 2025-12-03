<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\App\RequestInterface;
use Swissup\BreezeThemeEditor\Api\AccessTokenInterface;

class AccessTokenValidator
{
    public function __construct(
        private AccessTokenInterface $accessToken,
        private RequestInterface $request
    ) {}

    /**
     * Валідувати токен з headers
     */
    public function validateToken(? string $token): bool
    {
        if (empty($token)) {
            throw new GraphQlAuthorizationException(__('Access token is required'));
        }

        if (!$this->accessToken->validate($token)) {
            throw new GraphQlAuthorizationException(__('Invalid or expired access token'));
        }

        return true;
    }

    /**
     * Отримати токен з request
     */
    public function getTokenFromRequest(): ?string
    {
        // 1. Спробувати з GET/POST параметра (як у вашому існуючому коді)
        $token = $this->request->getParam($this->accessToken->getParamName());

        if ($token) {
            return $token;
        }

        // 2. Спробувати з custom header
        $token = $this->request->getHeader('X-Breeze-Theme-Editor-Token');

        if ($token) {
            return $token;
        }

        // 3. Спробувати з Authorization Bearer
        $authHeader = $this->request->getHeader('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            return substr($authHeader, 7);
        }

        return null;
    }

    /**
     * Валідувати поточний request
     */
    public function validateCurrentRequest(): bool
    {
        $token = $this->getTokenFromRequest();
        return $this->validateToken($token);
    }
}
