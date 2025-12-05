<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ResetToDefaults implements ResolverInterface
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private ConfigProvider $configProvider
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

        $statusCode = $input['status'] ??  'DRAFT';
        $sectionCodes = $input['sectionCodes'] ?? null;
        $fieldCodes = $input['fieldCodes'] ??  null;

        $userId = $this->userResolver->getCurrentUserId();
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Отримати defaults
        $defaults = $this->configProvider->getAllDefaults($themeId);

        // Фільтр по sections/fields
        $resettingValues = [];
        foreach ($defaults as $key => $defaultValue) {
            [$sectionCode, $fieldCode] = explode('.', $key, 2);

            // Перевірка фільтрів
            if ($sectionCodes && !in_array($sectionCode, $sectionCodes)) {
                continue;
            }
            if ($fieldCodes && ! in_array($fieldCode, $fieldCodes)) {
                continue;
            }

            $resettingValues[] = [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => $defaultValue
            ];
        }

        // Зберегти default значення
        $resetCount = $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $resettingValues
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
                'isModified' => false, // Reset to default = not modified
                'updatedAt' => $val['updated_at']
            ];
        }

        return [
            'success' => true,
            'message' => __('Reset to defaults successfully'),
            'values' => $savedValues,
            'resetCount' => $resetCount
        ];
    }
}
