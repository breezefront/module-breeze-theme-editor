<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Compare draft vs published changes
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Compare extends AbstractQueryResolver
{
    public function __construct(
        private CompareProvider $compareProvider,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId($context);

        $scope = $this->scopeFactory->fromInput($args['scope'] ?? []);

        // Auto-detect theme
        $themeId = isset($args['themeId'])
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        return $this->compareProvider->compare($themeId, $scope, $userId);
    }
}
