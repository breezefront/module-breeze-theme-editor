<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\ConfigProvider;

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
        $publishedValues = $this->valueRepository->getPublishedValues($themeId, $storeId);
        $draftValues = $this->valueRepository->getDraftValues($themeId, $storeId, $userId);

        // Конвертувати в асоціативні масиви
        $published = $this->convertToAssociative($publishedValues);
        $draft = $this->convertToAssociative($draftValues);

        $changes = [];

        // Знайти змінені та додані
        foreach ($draft as $key => $draftValue) {
            [$sectionCode, $fieldCode] = explode('.', $key);

            if (! isset($published[$key])) {
                // Додане нове значення
                $changes[] = $this->createChange(
                    $sectionCode,
                    $fieldCode,
                    null,
                    $draftValue,
                    'ADDED'
                );
            } elseif ($published[$key] !== $draftValue) {
                // Змінене значення
                $changes[] = $this->createChange(
                    $sectionCode,
                    $fieldCode,
                    $published[$key],
                    $draftValue,
                    'MODIFIED'
                );
            }
        }

        // Знайти видалені
        foreach ($published as $key => $publishedValue) {
            if (!isset($draft[$key])) {
                [$sectionCode, $fieldCode] = explode('.', $key);
                $changes[] = $this->createChange(
                    $sectionCode,
                    $fieldCode,
                    $publishedValue,
                    null,
                    'DELETED'
                );
            }
        }

        return [
            'hasChanges' => !empty($changes),
            'changesCount' => count($changes),
            'changes' => $changes
        ];
    }

    /**
     * Конвертувати масив values в асоціативний
     */
    private function convertToAssociative(array $values): array
    {
        $result = [];
        foreach ($values as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $result[$key] = $val['value'];
        }
        return $result;
    }

    /**
     * Створити об'єкт зміни з labels
     */
    private function createChange(
        string $sectionCode,
        string $fieldCode,
        ?string $oldValue,
        ?string $newValue,
        string $changeType
    ): array {
        // TODO: отримати labels з ConfigProvider

        return [
            'sectionCode' => $sectionCode,
            'sectionLabel' => $sectionCode, // TODO: get from config
            'fieldCode' => $fieldCode,
            'fieldLabel' => $fieldCode, // TODO: get from config
            'publishedValue' => $oldValue,
            'draftValue' => $newValue,
            'changeType' => $changeType
        ];
    }
}
