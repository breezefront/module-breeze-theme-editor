<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

/**
 * Checks whether a scope's assigned theme has a Theme Editor settings.json.
 *
 * Memoizes the full theme→config-file map so the collection is loaded only
 * once per request, regardless of how many scopes are checked.
 */
class ThemeAvailabilityProvider
{
    /**
     * Memoized map of themeId => true for themes that have settings.json.
     * Null means the map has not been loaded yet.
     *
     * @var array<int, true>|null
     */
    private ?array $themeIdsWithConfig = null;

    public function __construct(
        private ThemeResolver  $themeResolver,
        private ConfigProvider $configProvider,
        private ScopeFactory   $scopeFactory,
    ) {}

    /**
     * Returns true when the theme assigned to the given scope has
     * etc/theme_editor/settings.json (i.e. Theme Editor is available for it).
     */
    public function hasSettings(string $scope, int $scopeId): bool
    {
        if ($this->themeIdsWithConfig === null) {
            $this->themeIdsWithConfig = $this->configProvider->getThemeIdsWithConfigFile();
        }

        try {
            $themeId = $this->themeResolver->getThemeIdByScope(
                $this->scopeFactory->create($scope, $scopeId)
            );
            return isset($this->themeIdsWithConfig[$themeId]);
        } catch (\Exception $e) {
            return false;
        }
    }
}
