<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;

class ImportExportService
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private SerializerInterface $serializer,
        private ValidationService $validationProvider
    ) {}

    /**
     * Експорт налаштувань
     */
    public function export(
        int $themeId,
        int $storeId,
        string $statusCode,
        ? int $userId = null
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // ✅ Використати getValuesByTheme (без inheritance - тільки з цієї теми!)
        if ($statusCode === 'PUBLISHED') {
            $values = $this->valueRepository->getValuesByTheme($themeId, $storeId, $statusId, null);
        } else {
            $values = $this->valueRepository->getValuesByTheme($themeId, $storeId, $statusId, $userId);
        }

        // Форматувати для експорту
        $export = [];
        foreach ($values as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $export[$key] = $val['value'];
        }

        $jsonData = $this->serializer->serialize($export);
        $filename = sprintf(
            'theme_%d_store_%d_%s_%s.json',
            $themeId,
            $storeId,
            $statusCode,
            date('Y-m-d_H-i-s')
        );

        return [
            'jsonData' => $jsonData,
            'filename' => $filename
        ];
    }

    /**
     * Імпорт налаштувань
     */
    public function import(
        int $themeId,
        int $storeId,
        string $statusCode,
        int $userId,
        string $jsonData,
        bool $overwriteExisting = true
    ): array {
        try {
            $data = $this->serializer->unserialize($jsonData);
        } catch (\Exception $e) {
            throw new LocalizedException(__('Invalid JSON data: %1', $e->getMessage()));
        }

        if (!is_array($data)) {
            throw new LocalizedException(__('Invalid data format'));
        }

        $statusId = $this->statusProvider->getStatusId($statusCode);
        $userIdForSave = ($statusCode === 'PUBLISHED') ?    0 : $userId;

        // Конвертувати в формат для збереження
        $values = [];
        $errors = [];

        foreach ($data as $key => $value) {
            if (strpos($key, '.') === false) {
                $errors[] = "Invalid key format: {$key}";
                continue;
            }

            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            $values[] = [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => is_string($value) ?  $value : $this->serializer->serialize($value)
            ];
        }

        // Валідація
        $validationErrors = $this->validationProvider->validateValues($themeId, $values);
        if (!empty($validationErrors)) {
            foreach ($validationErrors as $error) {
                $errors[] = $error['message'];
            }
        }

        $imported = 0;
        $skipped = count($errors);

        if (!   empty($values) && empty($errors)) {
            // Видалити існуючі якщо потрібно
            if (!$overwriteExisting) {
                $this->valueRepository->deleteValues(
                    $themeId,
                    $storeId,
                    $statusId,
                    $userIdForSave
                );
            }

            $imported = $this->valueRepository->saveValues(
                $themeId,
                $storeId,
                $statusId,
                $userIdForSave,
                $values
            );
        }

        return [
            'importedCount' => $imported,
            'skippedCount' => $skipped,
            'errors' => $errors
        ];
    }
}
