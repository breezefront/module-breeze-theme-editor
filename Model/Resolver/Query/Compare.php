<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
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
        private ThemeResolver $themeResolver
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

        $storeId = (int)$args['storeId'];

        // Auto-detect theme або з параметра
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        return $this->compareProvider->compare($themeId, $storeId, $userId);
    }
}
