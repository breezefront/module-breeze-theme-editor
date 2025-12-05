<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Swissup\BreezeThemeEditor\Api\AccessTokenInterface;
use Magento\Backend\Model\Auth\Session as AdminSession;

class TokenManager
{
    public function __construct(
        private AccessTokenInterface $accessToken,
        private AdminSession $authSession
    ) {}

    /**
     * Створити токен для поточного admin user
     *
     * @return string
     * @throws \Exception
     */
    public function createForCurrentAdmin(): string
    {
        $user = $this->authSession->getUser();

        if (! $user || !$user->getId()) {
            throw new \Exception('No admin user in session');
        }

        return $this->createForAdmin($user);
    }

    /**
     * Створити токен для конкретного admin user
     *
     * @param \Magento\User\Model\User $user
     * @return string
     */
    public function createForAdmin($user): string
    {
        $metadata = [
            'user_id' => (int)$user->getUserId(),
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'first_name' => $user->getFirstName(),
            'last_name' => $user->getLastName(),
        ];

        return $this->accessToken->createToken($metadata);
    }

    /**
     * Отримати існуючий токен (без metadata - backward compatibility)
     *
     * @return string
     */
    public function getToken(): string
    {
        return $this->accessToken->getToken();
    }

    /**
     * @return string
     */
    public function getParamName()
    {
        return $this->accessToken->getParamName();
    }

    /**
     * Отримати або створити токен для поточного admin
     *
     * @return string
     */
    public function getOrCreateToken(): string
    {
        try {
            $token = $this->accessToken->getToken();

            // Перевірити чи є metadata
            $metadata = $this->accessToken->getMetadata($token);

            if ($metadata && isset($metadata['user_id'])) {
                return $token;
            }

            // Немає metadata - створити новий токен
            return $this->createForCurrentAdmin();

        } catch (\Exception $e) {
            // Токена немає - створити новий
            return $this->createForCurrentAdmin();
        }
    }
}
