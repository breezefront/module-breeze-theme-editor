<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Backend\Model\Auth\Session as AuthSession;
use Swissup\BreezeThemeEditor\Model\Service\AdminTokenGenerator;

/**
 * Provides authentication and user identity data for the admin toolbar.
 *
 * Responsibilities:
 * - Check if the admin user is currently authenticated
 * - Expose admin username and user ID
 * - Generate / cache the admin integration token for GraphQL
 */
class ToolbarAuthProvider
{
    /**
     * @var AuthSession
     */
    private $authSession;

    /**
     * @var AdminTokenGenerator
     */
    private $tokenGenerator;

    /**
     * @param AuthSession $authSession
     * @param AdminTokenGenerator $tokenGenerator
     */
    public function __construct(
        AuthSession $authSession,
        AdminTokenGenerator $tokenGenerator
    ) {
        $this->authSession    = $authSession;
        $this->tokenGenerator = $tokenGenerator;
    }

    /**
     * Admin area doesn't require AccessToken validation —
     * just check if the admin user is authenticated.
     *
     * @return bool
     */
    public function canShow(): bool
    {
        return $this->authSession->isLoggedIn();
    }

    /**
     * Get admin username.
     *
     * @return string
     */
    public function getAdminUsername(): string
    {
        $user = $this->authSession->getUser();
        return $user ? $user->getUsername() : (string)__('Admin');
    }

    /**
     * Get admin user ID.
     *
     * @return int|null
     */
    public function getUserId(): ?int
    {
        $user = $this->authSession->getUser();
        return $user ? (int)$user->getId() : null;
    }

    /**
     * Get Magento admin integration token for GraphQL authentication.
     *
     * Returns a cached token if still valid, or generates a new one.
     *
     * @return string|null
     */
    public function getToken(): ?string
    {
        try {
            return $this->tokenGenerator->generateForCurrentAdmin();
        } catch (\Exception $e) {
            return null;
        }
    }
}
