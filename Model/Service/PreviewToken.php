<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\App\DeploymentConfig;

/**
 * Signed, short-lived proof that the browser belongs to an admin who opened the editor.
 *
 * The editor puts it into the `bte_php_preview_token` cookie next to `bte_php_preview`;
 * the storefront honours the preview overrides only when the token is valid.
 */
class PreviewToken
{
    public const COOKIE_NAME = 'bte_php_preview_token';

    private const LIFETIME = 4 * 3600;
    private const CONTEXT = 'bte_php_preview';

    public function __construct(
        private DeploymentConfig $deploymentConfig
    ) {}

    public function generate(int $userId, ?int $now = null): string
    {
        $expires = ($now ?? time()) + self::LIFETIME;

        return $expires . '.' . $userId . '.' . $this->sign($expires . '.' . $userId);
    }

    public function isValid(string $token, ?int $now = null): bool
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3 || !ctype_digit($parts[0]) || !ctype_digit($parts[1])) {
            return false;
        }

        if ((int) $parts[0] < ($now ?? time())) {
            return false;
        }

        return hash_equals($this->sign($parts[0] . '.' . $parts[1]), $parts[2]);
    }

    private function sign(string $payload): string
    {
        return hash_hmac('sha256', self::CONTEXT . '|' . $payload, (string) $this->deploymentConfig->get('crypt/key'));
    }
}
