<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\StatusProvider;
use Swissup\BreezeThemeEditor\Model\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\UserResolver;
use Swissup\BreezeThemeEditor\Model\ThemeResolver;

class Values implements ResolverInterface
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private ConfigProvider $configProvider,
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
        $storeId = (int)$args['storeId'];

        // Auto-detect themeId
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $statusCode = $args['status'] ?? 'PUBLISHED';
        $sectionCodes = $args['sectionCodes'] ?? null;

        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId();

        if ($statusCode === 'DRAFT' && !$userId) {
            throw new GraphQlAuthorizationException(__('Authorization required'));
        }

        $statusId = $this->statusProvider->getStatusId($statusCode);

        if ($statusCode === 'PUBLISHED') {
            $values = $this->valueRepository->getPublishedValues($themeId, $storeId);
        } else {
            $values = $this->valueRepository->getDraftValues($themeId, $storeId, $userId);
        }

        // Фільтр по секціях
        if ($sectionCodes) {
            $values = array_filter($values, function($val) use ($sectionCodes) {
                return in_array($val['section_code'], $sectionCodes);
            });
        }

        // Отримати defaults
        $defaults = $this->configProvider->getAllDefaults($themeId);

        $result = [];
        foreach ($values as $val) {
            $key = $val['section_code'] .  '.' . $val['setting_code'];
            $defaultValue = $defaults[$key] ?? null;

            $result[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value'],
                'isModified' => $val['value'] !== $defaultValue,
                'updatedAt' => $val['updated_at']
            ];
        }

        return $result;
    }
}
