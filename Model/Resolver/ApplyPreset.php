<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\PresetManager;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;
use Swissup\BreezeThemeEditor\Model\UserResolver;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;

class ApplyPreset implements ResolverInterface
{
    public function __construct(
        private PresetManager $presetManager,
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];
        $storeId = (int)$input['storeId'];
        $themeId = isset($input['themeId']) && $input['themeId']
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $presetId = $input['presetId'];
        $statusCode = $input['status'] ?? 'DRAFT';
        $overwriteExisting = $input['overwriteExisting'] ?? false;

        $userId = $this->userResolver->getCurrentUserId();
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Отримати preset values
        try {
            $presetValues = $this->presetManager->getPresetValues($themeId, $presetId);
        } catch (\Exception $e) {
            throw new GraphQlInputException(
                __('Preset "%1" not found', $presetId)
            );
        }

        if (empty($presetValues)) {
            throw new GraphQlInputException(__('Preset is empty'));
        }

        // Якщо не overwrite - видалити існуючі значення для цих полів
        if (!$overwriteExisting) {
            // Застосувати тільки ті поля яких немає в draft
            $existing = $this->valueRepository->getDraftValues($themeId, $storeId, $userId);
            $existingKeys = [];
            foreach ($existing as $val) {
                $existingKeys[] = $val['section_code'] . '.' . $val['setting_code'];
            }

            $presetValues = array_filter($presetValues, function($val) use ($existingKeys) {
                $key = $val['sectionCode'] . '.' . $val['fieldCode'];
                return !in_array($key, $existingKeys);
            });
        }

        // Зберегти preset values
        $appliedCount = $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $presetValues
        );

        // Отримати збережені значення
        $savedValues = [];
        if ($statusCode === 'DRAFT') {
            $values = $this->valueRepository->getDraftValues($themeId, $storeId, $userId);
        } else {
            $values = $this->valueRepository->getPublishedValues($themeId, $storeId);
        }

        foreach ($values as $val) {
            $savedValues[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value'],
                'isModified' => true,
                'updatedAt' => $val['updated_at']
            ];
        }

        return [
            'success' => true,
            'message' => __('Preset "%1" applied successfully', $presetId),
            'values' => $savedValues,
            'appliedCount' => $appliedCount
        ];
    }
}
