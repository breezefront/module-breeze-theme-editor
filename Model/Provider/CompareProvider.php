<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\PublicationDataTrait;
use Swissup\BreezeThemeEditor\Model\StatusCode;

class CompareProvider
{
    use PublicationDataTrait;

    public function __construct(
        private ValueService $valueService,
        private ConfigProvider $configProvider,
        private StatusProvider $statusProvider
    ) {}

    /**
     * Порівняти draft vs published
     */
    public function compare(int $themeId, ScopeInterface $scope, int $userId): array
    {
        $draftStatusId = $this->statusProvider->getStatusId(StatusCode::DRAFT);
        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        // Отримати draft через ValueService
        $draft = $this->valueService->getValuesByTheme($themeId, $scope, $draftStatusId, $userId);

        // Якщо draft порожній - немає змін
        if (empty($draft)) {
            return [
                'hasChanges' => false,
                'changesCount' => 0,
                'changes' => []
            ];
        }

        // Отримати published через ValueService
        $published = $this->valueService->getValuesByTheme($themeId, $scope, $publishedStatusId, null);

        // Створити map для швидкого пошуку
        $publishedMap = [];
        foreach ($published as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $publishedMap[$key] = $val['value'];
        }

        $draftMap = [];
        foreach ($draft as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $draftMap[$key] = $val['value'];
        }

        // Порівнювати ТІЛЬКИ ті ключі що є в draft
        $changes = [];
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
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
}
