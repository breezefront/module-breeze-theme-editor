<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\View\Helper;

use Magento\Store\Model\StoreManagerInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;
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
class BreezeThemeEditor
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
        private StatusProvider $statusProvider
    ) {}

    /**
     * Get the current value of a theme editor setting.
     *
     * Returns the published value from DB (with scope + theme inheritance),
     * falling back to the default defined in settings.json.
     * Returns null if the setting does not exist at all.
     *
     * @param string $path  'section_code/setting_code'
     */
    public function get(string $path): ?string
    {
        if (array_key_exists($path, $this->cache)) {
            return $this->cache[$path];
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
