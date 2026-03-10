<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Get only values (without config structure)
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Values extends AbstractQueryResolver
{
    public function __construct(
        private ValueInheritanceResolver $valueInheritanceResolver,
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
        $scope = $args['scope'] ?? 'stores';
        $scopeId = (int)($args['scopeId'] ?? $args['storeId'] ?? 0);

        // Auto-detect themeId
        $themeId = isset($args['themeId'])
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByScope($scope, $scopeId);

        $statusCode = $args['status'] ?? 'PUBLISHED';
        $sectionCodes = $args['sectionCodes'] ?? null;

        // Validate: PUBLICATION not supported for this query
        if ($statusCode === 'PUBLICATION') {
            throw new GraphQlInputException(
                __('PUBLICATION status is not supported. Use breezeThemeEditorConfigFromPublication query to load historical values.')
            );
        }

        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId($context);

        if ($statusCode === 'DRAFT' && !$userId) {
            throw new GraphQlAuthorizationException(__('Authorization required'));
        }

        $statusId = $this->statusProvider->getStatusId($statusCode);

        // For DRAFT: merge published values (base) + draft overrides so that fields
        // without a draft row still return the published value, not the theme default.
        if ($statusCode === 'PUBLISHED') {
            $values = $this->valueInheritanceResolver->resolveAllValues($themeId, $scope, $scopeId, $statusId, null);
        } else {
            $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');
            $values = $this->valueInheritanceResolver->resolveAllValuesWithFallback(
                $themeId,
                $scope,
                $scopeId,
                $statusId,
                $publishedStatusId,
                $userId
            );
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
            $key = $val['section_code'] .   '.' . $val['setting_code'];
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
