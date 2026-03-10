<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\PresetService;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

class ApplyPreset extends AbstractSaveMutation
{
    public function __construct(
        protected \Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface $valueRepository,
        protected \Swissup\BreezeThemeEditor\Model\Service\ValueService $valueService,
        protected \Swissup\BreezeThemeEditor\Model\Provider\StatusProvider $statusProvider,
        protected \Swissup\BreezeThemeEditor\Model\Utility\UserResolver $userResolver,
        protected \Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver $themeResolver,
        protected \Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider $configProvider,
        private PresetService $presetManager
    ) {
        parent::__construct(
            $valueRepository,
            $valueService,
            $statusProvider,
            $userResolver,
            $themeResolver,
            $configProvider
        );
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];
        $params = $this->prepareBaseParams($input, $context);

        $presetId = $input['presetId'];
        $overwriteExisting = $input['overwriteExisting'] ?? false;

        // Отримати preset values (plain масив)
        try {
            $presetValues = $this->presetManager->getPresetValues($params['themeId'], $presetId);
        } catch (\Exception $e) {
            throw new GraphQlInputException(
                __('Preset "%1" not found', $presetId)
            );
        }

        if (empty($presetValues)) {
            throw new GraphQlInputException(__('Preset is empty'));
        }

        // Якщо не overwrite - застосовуємо лише нові поля
        if (!$overwriteExisting) {
            $existing = $this->valueService->getValuesByTheme(
                $params['themeId'],
                $params['scope'],
                $params['scopeId'],
                $params['statusId'],
                $params['statusCode'] === 'DRAFT' ?  $params['userId'] : null
            );

            $existingKeys = [];
            foreach ($existing as $val) {
                $existingKeys[] = $val['section_code'] . '.' . $val['setting_code'];
            }

            $presetValues = array_filter($presetValues, function($val) use ($existingKeys) {
                $key = $val['sectionCode'] .  '.' . $val['fieldCode'];
                return !in_array($key, $existingKeys);
            });
        }

        // СТВОРЮЄМО ValueInterface[] моделі
        $userIdForSave = $params['statusCode'] === 'DRAFT' ? $params['userId'] : 0;
        $valueModels = [];
        foreach ($presetValues as $val) {
            $valueModel = $this->valueRepository->create();
            $valueModel->setThemeId($params['themeId']);
            $valueModel->setScope($params['scope']);
            $valueModel->setStoreId($params['scopeId']);
            $valueModel->setStatusId($params['statusId']);
            $valueModel->setSectionCode($val['sectionCode']);
            $valueModel->setSettingCode($val['fieldCode']);
            $valueModel->setValue($val['value']);
            $valueModel->setUserId($userIdForSave);
            $valueModels[] = $valueModel;
        }

        // Зберігаємо через saveMultiple()
        $appliedCount = $this->valueRepository->saveMultiple($valueModels);

        // Отримати збережені значення через ValueService
        $values = $this->valueService->getValuesByTheme(
            $params['themeId'],
            $params['scope'],
            $params['scopeId'],
            $params['statusId'],
            $params['statusCode'] === 'DRAFT' ? $params['userId'] : null
        );

        $savedValues = [];
        foreach ($values as $val) {
            $savedValues[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode'   => $val['setting_code'],
                'value'       => $val['value'],
                'isModified'  => true,
                'updatedAt'   => $val['updated_at']
            ];
        }

        return [
            'success'      => true,
            'message'      => __('Preset "%1" applied successfully', $presetId),
            'values'       => $savedValues,
            'appliedCount' => $appliedCount
        ];
    }
}
