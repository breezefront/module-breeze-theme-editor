<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;
use Swissup\BreezeThemeEditor\Model\UserResolver;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\ConfigProvider;

class SaveValues implements ResolverInterface
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

        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId();

        $storeId = (int)$input['storeId'];
        $themeId = isset($input['themeId']) && $input['themeId']
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $statusCode = $input['status'] ?? 'DRAFT';
        $statusId = $this->statusProvider->getStatusId($statusCode);

        $values = $input['values'];

        // Зберегти всі значення (batch)
        $savedCount = $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $values
        );

        // Отримати defaults для isModified
        $defaults = $this->configProvider->getAllDefaults($themeId);

        $result = [];
        foreach ($values as $val) {
            $key = $val['sectionCode'] . '.' . $val['fieldCode'];
            $defaultValue = $defaults[$key] ??  null;

            $result[] = [
                'sectionCode' => $val['sectionCode'],
                'fieldCode' => $val['fieldCode'],
                'value' => $val['value'],
                'isModified' => $val['value'] !== $defaultValue,
                'updatedAt' => date('Y-m-d H:i:s')
            ];
        }

        return [
            'success' => true,
            'message' => __('%1 values saved successfully', $savedCount),
            'values' => $result,
            'validation_errors' => [] // TODO: додати валідацію якщо потрібно
        ];
    }
}
