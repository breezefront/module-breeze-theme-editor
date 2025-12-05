<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;

class ValueService
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private ValidationService $validationProvider
    ) {}

    /**
     * Зберегти значення
     */
    public function saveValues(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        array $values
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Для published user_id завжди 0
        $userIdForSave = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        // Валідація значень
        $validationErrors = $this->validationProvider->validateValues($themeId, $values);
        if (!empty($validationErrors)) {
            throw new LocalizedException(
                __('Validation failed: %1', implode(', ', array_column($validationErrors, 'message')))
            );
        }

        // Зберегти в БД
        $count = $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $statusId,
            $userIdForSave,
            $values
        );

        return $this->formatValuesForOutput($values);
    }

    /**
     * Зберегти одне значення (для live preview)
     */
    public function saveValue(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        string $sectionCode,
        string $fieldCode,
        string $value
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ?  0 : $userId;

        // Валідація одного значення
        $validationError = $this->validationProvider->validateValue(
            $themeId,
            $sectionCode,
            $fieldCode,
            $value
        );

        if ($validationError) {
            throw new LocalizedException(__($validationError));
        }

        $this->valueRepository->saveValue(
            $themeId,
            $storeId,
            $statusId,
            $userIdForSave,
            $sectionCode,
            $fieldCode,
            $value
        );

        return [
            'sectionCode' => $sectionCode,
            'fieldCode' => $fieldCode,
            'value' => $value
        ];
    }

    /**
     * Видалити draft
     */
    public function discardDraft(
        int $themeId,
        int $storeId,
        int $userId,
        ? array $sectionCodes = null
    ): int {
        $statusId = $this->statusProvider->getStatusId('DRAFT');

        return $this->valueRepository->deleteValues(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $sectionCodes
        );
    }

    /**
     * Скинути до default значень
     */
    public function resetToDefaults(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        ?array $sectionCodes = null,
        ?array $fieldCodes = null
    ): array {
        // Отримати defaults з ConfigProvider
        // Зберегти їх як нові значення
        // TODO: implement with ConfigProvider

        return [];
    }

    /**
     * Копіювати з іншого store
     */
    public function copyFromStore(
        int $fromStoreId,
        int $toStoreId,
        int $themeId,
        string $statusCode,
        int $userId,
        ?array $sectionCodes = null
    ): int {
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdFrom = ($statusCode === 'PUBLISHED') ? 0 : $userId;
        $userIdTo = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        return $this->valueRepository->copyValues(
            $themeId,
            $fromStoreId,
            $statusId,
            $userIdFrom,
            $themeId,
            $toStoreId,
            $statusId,
            $userIdTo,
            $sectionCodes
        );
    }

    /**
     * Форматувати значення для виводу
     */
    private function formatValuesForOutput(array $values): array
    {
        $result = [];
        foreach ($values as $val) {
            $result[] = [
                'sectionCode' => $val['sectionCode'],
                'fieldCode' => $val['fieldCode'],
                'value' => $val['value']
            ];
        }
        return $result;
    }
}
