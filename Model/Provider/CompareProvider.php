<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class CompareProvider
{
    public function __construct(
        private ValueRepository $valueRepository,
        private ConfigProvider $configProvider
    ) {}

    /**
     * Порівняти draft vs published
     */
    public function compare(int $themeId, int $storeId, int $userId): array
    {
        // Отримати draft
        $draft = $this->valueRepository->getDraftValues($themeId, $storeId, $userId);

        // Якщо draft порожній - немає змін
        if (empty($draft)) {
            return [
                'hasChanges' => false,
                'changesCount' => 0,
                'changes' => []
            ];
        }

        // Отримати published
        $published = $this->valueRepository->getPublishedValues($themeId, $storeId);

        // Створити map для швидкого пошуку
        $publishedMap = [];
        foreach ($published as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $publishedMap[$key] = $val['value'];
        }

        $draftMap = [];
        foreach ($draft as $val) {
            $key = $val['section_code'] . '.' .  $val['setting_code'];
            $draftMap[$key] = $val['value'];
        }

        // Порівнювати ТІЛЬКИ ті ключі що є в draft
        $changes = [];
        $config = $this->configProvider->getConfiguration($themeId);
        $labels = $this->extractLabels($config);

        foreach ($draftMap as $key => $draftValue) {
            $publishedValue = $publishedMap[$key] ?? null;

            if ($publishedValue === $draftValue) {
                continue; // Без змін
            }

            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            $changeType = 'MODIFIED';
            if ($publishedValue === null) {
                $changeType = 'ADDED';
            }

            $changes[] = [
                'sectionCode' => $sectionCode,
                'sectionLabel' => $labels[$sectionCode]['label'] ?? $sectionCode,
                'fieldCode' => $fieldCode,
                'fieldLabel' => $labels[$sectionCode]['fields'][$fieldCode] ?? $fieldCode,
                'publishedValue' => $publishedValue,
                'draftValue' => $draftValue,
                'changeType' => $changeType
            ];
        }

        return [
            'hasChanges' => count($changes) > 0,
            'changesCount' => count($changes),
            'changes' => $changes
        ];
    }

    /**
     * Витягти labels з конфігу
     */
    private function extractLabels(array $config): array
    {
        $labels = [];

        foreach ($config['sections'] ??  [] as $section) {
            $sectionCode = $section['id'];
            $labels[$sectionCode] = [
                'label' => $section['name'],
                'fields' => []
            ];

            foreach ($section['settings'] ??  [] as $setting) {
                $labels[$sectionCode]['fields'][$setting['id']] = $setting['label'];
            }
        }

        return $labels;
    }
}
