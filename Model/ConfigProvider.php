<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\App\Filesystem\DirectoryList;
use Magento\Framework\Exception\FileSystemException;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Filesystem;
use Magento\Framework\Filesystem\Directory\ReadInterface;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;

class ConfigProvider
{
    private const CONFIG_FILE = 'etc/theme_editor/settings.json';

    private array $configCache = [];

    public function __construct(
        private Filesystem $filesystem,
        private SerializerInterface $serializer,
        private ThemeCollectionFactory $themeCollectionFactory
    ) {}

    /**
     * Отримати повну конфігурацію теми
     */
    public function getConfiguration(int $themeId): array
    {
        if (isset($this->configCache[$themeId])) {
            return $this->configCache[$themeId];
        }

        $themePath = $this->getThemePath($themeId);
        $config = $this->loadConfigFile($themePath);

        $this->configCache[$themeId] = $config;

        return $config;
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
     * Отримати конкретну секцію
     */
    public function getSection(int $themeId, string $sectionCode): ? array
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
     */
    public function getAllDefaults(int $themeId): array
    {
        $sections = $this->getSections($themeId);
        $defaults = [];

        foreach ($sections as $section) {
            foreach ($section['settings'] as $setting) {
                if (isset($setting['default'])) {
                    $key = $section['id'] . '.' . $setting['id'];
                    $defaults[$key] = $setting['default'];
                }
            }
        }

        return $defaults;
    }

    /**
     * Отримати шлях до теми
     */
    private function getThemePath(int $themeId): string
    {
        $themeCollection = $this->themeCollectionFactory->create();
        $theme = $themeCollection->getItemById($themeId);

        if (!$theme || !$theme->getId()) {
            throw new LocalizedException(__('Theme with ID %1 not found', $themeId));
        }

        return $theme->getFullPath();
    }

    /**
     * Завантажити config файл
     */
    private function loadConfigFile(string $themePath): array
    {
        try {
            $directory = $this->filesystem->getDirectoryRead(DirectoryList::APP);
            $configPath = 'design/' . $themePath . '/' . self::CONFIG_FILE;

            if (!$directory->isFile($configPath)) {
                throw new LocalizedException(
                    __('Theme editor configuration file not found: %1', $configPath)
                );
            }

            $content = $directory->readFile($configPath);
            $config = $this->serializer->unserialize($content);

            $this->validateConfig($config);

            return $config;

        } catch (FileSystemException $e) {
            throw new LocalizedException(
                __('Error reading theme configuration: %1', $e->getMessage())
            );
        }
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
    public function clearCache(? int $themeId = null): void
    {
        if ($themeId) {
            unset($this->configCache[$themeId]);
        } else {
            $this->configCache = [];
        }
    }
}
