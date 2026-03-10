<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;

class ImportExportService
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private SerializerInterface $serializer,
        private ValidationService $validationProvider
    ) {}

    /**
     * Експорт налаштувань
     */
    public function export(
        int $themeId,
        string $scope,
        int $scopeId,
        string $statusCode,
        ?  int $userId = null
    ): array {
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Використати ValueService для отримання значень
        if ($statusCode === 'PUBLISHED') {
            $values = $this->valueService->getValuesByTheme($themeId, $scope, $scopeId, $statusId, null);
        } else {
            $values = $this->valueService->getValuesByTheme($themeId, $scope, $scopeId, $statusId, $userId);
        }

        // Форматувати для експорту
        $export = [];
        foreach ($values as $val) {
            $key = $val['section_code'] . '.' . $val['setting_code'];
            $export[$key] = $val['value'];
        }

        $jsonData = $this->serializer->serialize($export);
        $filename = sprintf(
            'theme_%d_%s_%d_%s_%s.json',
            $themeId,
            $scope,
            $scopeId,
            $statusCode,
            date('Y-m-d_H-i-s')
        );

        return [
            'jsonData' => $jsonData,
            'filename' => $filename
        ];
    }

    /**
     * @param int $themeId
     * @param string $scope
     * @param int $scopeId
     * @param string $statusCode
     * @param int $userId
     * @param string $jsonData
     * @param bool $overwriteExisting
     * @return array
     * @throws LocalizedException
     * @throws \Magento\Framework\Exception\CouldNotSaveException
     * @throws \Magento\Framework\Exception\NoSuchEntityException
     */
    public function import(
        int $themeId,
        string $scope,
        int $scopeId,
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
        $userIdForSave = ($statusCode === 'PUBLISHED') ? 0 : $userId;

        // Конвертувати у ValueInterface[]
        $models = [];
        $errors = [];

        foreach ($data as $key => $value) {
            if (strpos($key, '.') === false) {
                $errors[] = "Invalid key format: {$key}";
                continue;
            }

            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setScope($scope);
            $model->setStoreId($scopeId);
            $model->setStatusId($statusId);
            $model->setUserId($userIdForSave);
            $model->setSectionCode($sectionCode);
            $model->setSettingCode($fieldCode);
            $model->setValue(is_string($value) ? $value : $this->serializer->serialize($value));

            $models[] = $model;
        }

        // Валідація
        $validationErrors = $this->validationProvider->validateValues($themeId, $models);
        if (!empty($validationErrors)) {
            foreach ($validationErrors as $error) {
                $errors[] = $error['message'];
            }
        }

        $imported = 0;
        $skipped = count($errors);

        if (!empty($models) && empty($errors)) {
            // Delete existing values if overwrite mode enabled
            if ($overwriteExisting) {
                $this->valueService->deleteValues(
                    $themeId,
                    $scope,
                    $scopeId,
                    $statusId,
                    $userIdForSave
                );
            }

            $imported = $this->valueRepository->saveMultiple($models);
        }

        return [
            'importedCount' => $imported,
            'skippedCount' => $skipped,
            'errors' => $errors
        ];
    }
}
