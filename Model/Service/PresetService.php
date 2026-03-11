<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;

class PresetService
{
    public function __construct(
        private ConfigProvider $configProvider,
        private ValueRepositoryInterface $valueRepository,
        private ValueService $valueService,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Get preset values parsed from settings
     */
    public function getPresetValues(int $themeId, string $presetId): array
    {
        // Use getConfigurationWithInheritance to find presets from parent themes
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $presets = $config['presets'] ?? [];

        // Find preset by ID
        $preset = null;
        foreach ($presets as $p) {
            if ($p['id'] === $presetId) {
                $preset = $p;
                break;
            }
        }

        if (!$preset) {
            throw new \Exception("Preset {$presetId} not found");
        }

        $settings = $preset['settings'] ?? [];

        if (empty($settings)) {
            return [];
        }

        // Preset settings support two formats:
        // 1. Dot notation: {"section_code.field_code": "value"}
        // 2. Field only: {"field_code": "value"} (legacy)
        $values = [];
        foreach ($settings as $key => $value) {
            // Parse dot notation if present
            if (strpos($key, '.') !== false) {
                [$sectionCode, $fieldCode] = explode('.', $key, 2);
            } else {
                // Fallback: lookup in section map (for backward compatibility)
                $sectionMap = $this->buildSettingSectionMap($config);
                $sectionCode = $sectionMap[$key] ?? null;
                $fieldCode = $key;
            }

            if (!$sectionCode) {
                continue; // Skip unknown settings
            }

            $values[] = [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => $value
            ];
        }

        return $values;
    }

    /**
     * Apply preset
     */
    public function applyPreset(
        int $themeId,
        ScopeInterface $scope,
        string $presetId,
        string $statusCode,
        int $userId,
        bool $overwriteExisting = true
    ): array {
        // Get preset values (already uses inheritance)
        $presetValues = $this->getPresetValues($themeId, $presetId);

        if (empty($presetValues)) {
            throw new LocalizedException(__('Preset "%1" has no settings', $presetId));
        }

        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        // Create ValueInterface models
        $models = [];
        foreach ($presetValues as $item) {
            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setScope($scope->getType());
            $model->setStoreId($scope->getScopeId());
            $model->setStatusId($statusId);
            $model->setUserId($userIdForSave);
            $model->setSectionCode($item['sectionCode']);
            $model->setSettingCode($item['fieldCode']);
            $model->setValue($item['value']);
            $models[] = $model;
        }

        // If overwrite - delete existing values
        if ($overwriteExisting) {
            $this->valueService->deleteValues(
                $themeId,
                $scope,
                $statusId,
                $userIdForSave
            );
        }

        // Save through saveMultiple
        $count = $this->valueRepository->saveMultiple($models);

        return [
            'appliedCount' => $count,
            'values' => $presetValues
        ];
    }

    /**
     * Build map: setting_code => section_code (for backward compatibility)
     */
    private function buildSettingSectionMap(array $config): array
    {
        $map = [];

        foreach ($config['sections'] ?? [] as $section) {
            $sectionCode = $section['id'];

            foreach ($section['settings'] ?? [] as $setting) {
                $settingCode = $setting['id'];
                $map[$settingCode] = $sectionCode;
            }
        }

        return $map;
    }
}
