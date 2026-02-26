<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use Magento\Framework\Component\ComponentRegistrar;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

class ConfigProvider
{
    private const CONFIG_FILE = 'etc/theme_editor/settings.json';
    private array $configCache = [];

    public function __construct(
        private SerializerInterface $serializer,
        private ThemeCollectionFactory $themeCollectionFactory,
        private ComponentRegistrar $componentRegistrar,
        private ThemeResolver $themeResolver
    ) {}

    /**
     * ✅ Отримати конфіг з inheritance (merge з батьківськими темами)
     */
    public function getConfigurationWithInheritance(int $themeId): array
    {
        $cacheKey = 'inherited_' . $themeId;
        if (isset($this->configCache[$cacheKey])) {
            return $this->configCache[$cacheKey];
        }
        $hierarchy = $this->themeResolver->getThemeHierarchy($themeId);
        $mergedConfig = [
            'version' => '1.0',
            'sections' => [],
            'presets' => [],
            'metadata' => [],
        ];
        foreach (array_reverse($hierarchy) as $themeInfo) {
            try {
                $themeConfig = $this->getConfiguration($themeInfo['theme_id']);
                $mergedConfig = $this->deepMerge($mergedConfig, $themeConfig);
            } catch (\Exception $e) {
                continue;
            }
        }
        $this->configCache[$cacheKey] = $mergedConfig;
        return $mergedConfig;
    }

    /**
     * ✅ Deep merge двох конфігів
     */
    private function deepMerge(array $base, array $override): array
    {
        foreach ($override as $key => $value) {
            if (is_array($value) && isset($base[$key]) && is_array($base[$key])) {
                if ($key === 'sections') {
                    $base[$key] = $this->mergeSections($base[$key], $value);
                } else {
                    $base[$key] = $this->deepMerge($base[$key], $value);
                }
            } else {
                $base[$key] = $value;
            }
        }
        return $base;
    }

    /**
     * ✅ Merge sections по їх ID
     */
    private function mergeSections(array $baseSections, array $overrideSections): array
    {
        $merged = $baseSections;
        foreach ($overrideSections as $overrideSection) {
            $found = false;
            foreach ($merged as $idx => &$baseSection) {
                if ($baseSection['id'] === $overrideSection['id']) {
                    if (!empty($overrideSection['disable'])) {
                        unset($merged[$idx]);
                    } else {
                        if (isset($overrideSection['settings'])) {
                            $baseSection['settings'] = $this->mergeSettings(
                                $baseSection['settings'] ?? [],
                                $overrideSection['settings']
                            );
                        }
                        foreach (['name', 'description', 'icon', 'order', 'selector'] as $field) {
                            if (isset($overrideSection[$field])) {
                                $baseSection[$field] = $overrideSection[$field];
                            }
                        }
                    }
                    $found = true;
                    break;
                }
            }
            unset($baseSection);
            if (!$found && empty($overrideSection['disable'])) {
                $merged[] = $overrideSection;
            }
        }
        return array_values($merged);
    }

    /**
     * ✅ Merge settings по їх ID
     */
    private function mergeSettings(array $baseSettings, array $overrideSettings): array
    {
        $merged = $baseSettings;
        foreach ($overrideSettings as $overrideSetting) {
            $found = false;
            foreach ($merged as $idx => &$baseSetting) {
                if ($baseSetting['id'] === $overrideSetting['id']) {
                    if (!empty($overrideSetting['disable'])) {
                        unset($merged[$idx]);
                    } else {
                        $baseSetting = array_merge($baseSetting, $overrideSetting);
                    }
                    $found = true;
                    break;
                }
            }
            unset($baseSetting);
            if (!$found && empty($overrideSetting['disable'])) {
                $merged[] = $overrideSetting;
            }
        }
        return array_values($merged);
    }

    /**
     * Отримати повну конфігурацію теми (без inheritance)
     */
    public function getConfiguration(int $themeId): array
    {
        if (isset($this->configCache[$themeId])) {
            return $this->configCache[$themeId];
        }
        $theme = $this->getTheme($themeId);
        $config = $this->loadConfigFile($theme);
        if (!isset($config['metadata'])) {
            $config['metadata'] = $this->buildMetadata($theme);
        }
        $this->configCache[$themeId] = $config;
        return $config;
    }

    /**
     * Побудувати metadata для теми
     */
    private function buildMetadata($theme): array
    {
        return [
            'themeId' => (int)$theme->getId(),
            'themeName' => $theme->getThemeTitle(),
            'themeCode' => $theme->getCode(),
            'themePath' => $theme->getThemePath(),
            'parentId' => $theme->getParentId() ? (int)$theme->getParentId() : null,
        ];
    }

    /**
     * Отримати тільки секції
     */
    public function getSections(int $themeId): array
    {
        $config = $this->getConfiguration($themeId);
        return $config['sections'] ?? [];
    }

    /**
     * Отримати metadata
     *
     * Спочатку спробувати з settings.json (підтримує кастомні поля від розробника теми),
     * при відсутності файлу — fallback до базової metadata з об'єкта теми.
     */
    public function getMetadata(int $themeId): array
    {
        try {
            $config = $this->getConfiguration($themeId);
            return $config['metadata'] ?? [];
        } catch (\Exception $e) {
            // Fallback: збираємо metadata з об'єкта теми без settings.json
            try {
                $theme = $this->getTheme($themeId);
                return $this->buildMetadata($theme);
            } catch (\Exception $e) {
                return [];
            }
        }
    }

    /**
     * Отримати конкретну секцію
     */
    public function getSection(int $themeId, string $sectionCode): ?array
    {
        $sections = $this->getSections($themeId);
        foreach ($sections as $section) {
            if ($section['id'] === $sectionCode) {
                return $section;
            }
        }
        return null;
    }

    /**
     * Отримати конкретне поле
     */
    public function getField(int $themeId, string $sectionCode, string $fieldCode): ?array
    {
        $section = $this->getSection($themeId, $sectionCode);
        if (!$section) {
            return null;
        }
        foreach ($section['settings'] as $setting) {
            if ($setting['id'] === $fieldCode) {
                return $setting;
            }
        }
        return null;
    }

    /**
     * Отримати presets
     */
    public function getPresets(int $themeId): array
    {
        $config = $this->getConfiguration($themeId);
        return $config['presets'] ?? [];
    }

    /**
     * Отримати конкретний preset
     */
    public function getPreset(int $themeId, string $presetId): ?array
    {
        $presets = $this->getPresets($themeId);
        foreach ($presets as $preset) {
            if ($preset['id'] === $presetId) {
                return $preset;
            }
        }
        return null;
    }

    /**
     * Отримати default значення для поля
     */
    public function getFieldDefault(int $themeId, string $sectionCode, string $fieldCode)
    {
        $field = $this->getField($themeId, $sectionCode, $fieldCode);
        return $field['default'] ?? null;
    }

    /**
     * Отримати всі default значення
     *
     * Використовує getConfigurationWithInheritance() щоб коректно повернути
     * defaults з усього ланцюга тем, навіть якщо активна тема не має settings.json.
     */
    public function getAllDefaults(int $themeId): array
    {
        $config = $this->getConfigurationWithInheritance($themeId);
        $defaults = [];
        foreach ($config['sections'] ?? [] as $section) {
            foreach ($section['settings'] ?? [] as $setting) {
                if (isset($setting['default'])) {
                    $defaults[$section['id'] . '.' . $setting['id']] = $setting['default'];
                }
            }
        }
        return $defaults;
    }

    /**
     * Отримати theme object
     */
    private function getTheme(int $themeId)
    {
        $themeCollection = $this->themeCollectionFactory->create();
        $theme = $themeCollection->getItemById($themeId);
        if (!$theme || !$theme->getId()) {
            throw new LocalizedException(__('Theme with ID %1 not found', $themeId));
        }
        return $theme;
    }

    /**
     * Завантажити config файл
     */
    private function loadConfigFile($theme): array
    {
        $configPath = $this->findConfigFile($theme);
        if (!$configPath) {
            throw new LocalizedException(
                __('Theme editor configuration file not found for theme: %1', $theme->getThemeTitle())
            );
        }
        try {
            $content = file_get_contents($configPath);
            $config = $this->serializer->unserialize($content);
            $this->validateConfig($config);
            return $config;
        } catch (\Exception $e) {
            throw new LocalizedException(
                __('Error reading theme configuration: %1', $e->getMessage())
            );
        }
    }

    /**
     * Знайти config файл в можливих локаціях
     */
    private function findConfigFile($theme): ?string
    {
        $themePath = $theme->getFullPath();
        $appDesignPath = BP . '/app/design/' . $themePath . '/' . self::CONFIG_FILE;
        if (file_exists($appDesignPath)) {
            return $appDesignPath;
        }
        $parts = explode('/', $themePath);
        if (count($parts) >= 2) {
            $area = $parts[0];
            $themeCode = implode('/', array_slice($parts, 1));
            $themePath = $this->componentRegistrar->getPath(
                ComponentRegistrar::THEME,
                $area . '/' . $themeCode
            );
            if ($themePath) {
                $composerPath = $themePath . '/' . self::CONFIG_FILE;
                if (file_exists($composerPath)) {
                    return $composerPath;
                }
            }
        }
        return null;
    }

    /**
     * Валідація конфігурації
     */
    private function validateConfig(array $config): void
    {
        if (!isset($config['version'])) {
            throw new LocalizedException(__('Missing "version" in theme configuration'));
        }
        if (!isset($config['sections']) || !is_array($config['sections'])) {
            throw new LocalizedException(__('Missing or invalid "sections" in theme configuration'));
        }
    }

    /**
     * Очистити кеш
     */
    public function clearCache(?int $themeId = null): void
    {
        if ($themeId) {
            unset($this->configCache[$themeId]);
            unset($this->configCache['inherited_' . $themeId]);
        } else {
            $this->configCache = [];
        }
    }
}
