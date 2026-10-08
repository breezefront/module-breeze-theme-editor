<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\View\Helper;

use Magento\Framework\App\Response\Http as HttpResponse;
use Magento\Framework\App\ResponseInterface;
use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\PreviewToken;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;
use Swissup\BreezeThemeEditor\Api\View\Helper\BreezeThemeEditorInterface;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

/**
 * View helper for reading Breeze Theme Editor settings in .phtml templates.
 *
 * Automatically injected as $breezeThemeEditor into all frontend templates
 * via Plugin\TemplateEngine\PhpPlugin (beforeRender).
 *
 * Usage in .phtml:
 *   $breezeThemeEditor?->get('section/setting')
 *   $breezeThemeEditor?->is('section/setting', 'value')
 */
class BreezeThemeEditor implements BreezeThemeEditorInterface
{
    /**
     * Per-request in-memory cache.
     * Key: 'section/setting', Value: resolved string or null.
     *
     * @var array<string, string|null>
     */
    private array $cache = [];

    public function __construct(
        private StoreManagerInterface $storeManager,
        private ThemeResolver $themeResolver,
        private ScopeFactory $scopeFactory,
        private ValueInheritanceResolver $valueInheritanceResolver,
        private ConfigProvider $configProvider,
        private StatusProvider $statusProvider,
        private PreviewToken $previewToken,
        private ResponseInterface $response
    ) {}

    /**
     * Get the current value of a theme editor setting.
     *
     * Returns the published value from DB (with scope + theme inheritance),
     * falling back to the default defined in settings.json.
     * Returns null if the setting does not exist at all.
     *
     * During live preview (editor iframe requests), the `bte_php_preview`
     * cookie written by PhpPreviewManager.js takes precedence so that
     * PHP-only settings are reflected immediately without a publish.
     *
     * @param string $path  'section_code/setting_code'
     */
    public function get(string $path): ?string
    {
        if (array_key_exists($path, $this->cache)) {
            return $this->cache[$path];
        }

        // Live-preview override: JS writes pending values into this cookie so
        // that PHP renders the updated value on iframe reload (no publish needed).
        // Only honoured together with a signed token issued to an admin who opened
        // the editor; the response is then kept out of the full page cache.
        $overrides = $this->getPreviewOverrides();
        if ($overrides !== null && array_key_exists($path, $overrides)) {
            $override = (string) $overrides[$path];
            $this->cache[$path] = $override;
            if ($this->response instanceof HttpResponse) {
                $this->response->setNoCacheHeaders();
            }
            return $override;
        }

        $this->cache[$path] = $this->resolve($path);

        return $this->cache[$path];
    }

    /**
     * Check whether a theme editor setting equals the given value.
     *
     * @param string $path   'section_code/setting_code'
     * @param string $value  Value to compare against
     */
    private function getPreviewOverrides(): ?array
    {
        $previewCookie = $_COOKIE['bte_php_preview'] ?? null;
        $token = $_COOKIE[PreviewToken::COOKIE_NAME] ?? null;
        if (!is_string($previewCookie) || !is_string($token) || !$this->previewToken->isValid($token)) {
            return null;
        }

        $overrides = json_decode(urldecode($previewCookie), true);

        return is_array($overrides) ? $overrides : null;
    }

    public function is(string $path, string $value): bool
    {
        return $this->get($path) === $value;
    }

    /**
     * Resolve the setting value for the current store.
     */
    private function resolve(string $path): ?string
    {
        [$sectionCode, $settingCode] = $this->parsePath($path);

        if ($sectionCode === '' || $settingCode === '') {
            return null;
        }

        try {
            $storeId  = (int) $this->storeManager->getStore()->getId();
            $themeId  = $this->themeResolver->getThemeIdByStoreId($storeId);
            $scope    = $this->scopeFactory->create('stores', $storeId);
            $statusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

            $result = $this->valueInheritanceResolver->resolveSingleValue(
                $themeId,
                $scope,
                $statusId,
                $sectionCode,
                $settingCode
            );

            return $result['value'];
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Split 'section/setting' into ['section', 'setting'].
     * Returns ['', ''] for invalid input.
     *
     * @return array{string, string}
     */
    private function parsePath(string $path): array
    {
        $parts = explode('/', $path, 2);

        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return ['', ''];
        }

        return $parts;
    }
}
