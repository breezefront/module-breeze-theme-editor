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

class SaveValue implements ResolverInterface
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

        $sectionCode = $input['sectionCode'];
        $fieldCode = $input['fieldCode'];
        $newValue = $input['value'];

        // Зберегти значення
        $this->valueRepository->saveValue(
            $themeId,
            $storeId,
            $statusId,
            $userId,
            $sectionCode,
            $fieldCode,
            $newValue
        );

        // Отримати default для isModified
        $defaults = $this->configProvider->getAllDefaults($themeId);
        $defaultValue = $defaults[$sectionCode .  '.' . $fieldCode] ?? null;

        return [
            'success' => true,
            'message' => __('Value saved successfully'),
            'value' => [
                'sectionCode' => $sectionCode,
                'fieldCode' => $fieldCode,
                'value' => $newValue,
                'isModified' => $newValue !== $defaultValue,
                'updatedAt' => date('Y-m-d H:i:s')
            ]
        ];
    }
}
