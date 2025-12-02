<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Model\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;

class PresetManager
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Застосувати preset
     */
    public function applyPreset(
        int $themeId,
        int $storeId,
        string $presetId,
        string $statusCode,
        int $userId,
        bool $overwriteExisting = true
    ): array {
        // Отримати preset з конфігурації
        $preset = $this->configProvider->getPreset($themeId, $presetId);

        if (!$preset) {
            throw new LocalizedException(__('Preset "%1" not found', $presetId));
        }

        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        // Конвертувати preset settings в формат для збереження
        $values = [];

        if (isset($preset['settings']) && is_array($preset['settings'])) {
            foreach ($preset['settings'] as $key => $value) {
                // key format: "section_code.field_code" або просто "field_code"
                if (strpos($key, '.') !== false) {
                    [$sectionCode, $fieldCode] = explode('.', $key, 2);
                } else {
                    // Якщо немає секції - спробувати знайти в конфігурації
                    [$sectionCode, $fieldCode] = $this->findFieldInConfig($themeId, $key);
                }

                $values[] = [
                    'sectionCode' => $sectionCode,
                    'fieldCode' => $fieldCode,
                    'value' => is_string($value) ? $value : json_encode($value)
                ];
            }
        }

        if (empty($values)) {
            throw new LocalizedException(__('Preset has no settings'));
        }

        // Якщо не overwrite - видалити існуючі
        if (!$overwriteExisting) {
            $this->valueRepository->deleteValues(
                $themeId,
                $storeId,
                $statusId,
                $userIdForSave
            );
        }

        // Зберегти значення
        $count = $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $statusId,
            $userIdForSave,
            $values
        );

        return [
            'appliedCount' => $count,
            'values' => $values
        ];
    }

    /**
     * Знайти поле в конфігурації
     */
    private function findFieldInConfig(int $themeId, string $fieldCode): array
    {
        $sections = $this->configProvider->getSections($themeId);

        foreach ($sections as $section) {
            foreach ($section['settings'] as $setting) {
                if ($setting['id'] === $fieldCode) {
                    return [$section['id'], $fieldCode];
                }
            }
        }

        throw new LocalizedException(__('Field "%1" not found in configuration', $fieldCode));
    }
}
