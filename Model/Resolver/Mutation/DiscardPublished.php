<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Reset all published customizations to theme defaults.
 * Deletes every PUBLISHED value row, making the live site fall back to defaults.
 *
 * ACL: editor_reset_published (overrides default editor_edit from AbstractMutationResolver)
 */
class DiscardPublished extends AbstractMutationResolver
{
    public function __construct(
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private ThemeResolver $themeResolver,
        private ScopeFactory $scopeFactory
    ) {}

    /**
     * {@inheritdoc}
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_reset_published';
    }

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $scope = $this->scopeFactory->fromInput($args['scope'] ?? []);
        $themeId = isset($args['themeId'])
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        // Delete all PUBLISHED values (userId=null — published values have no per-user scope)
        $discardedCount = $this->valueService->deleteValues(
            $themeId,
            $scope,
            $publishedStatusId,
            null,   // userId — not applicable for PUBLISHED
            null,   // sectionCodes — reset everything
            null    // fieldCodes — reset everything
        );

        return [
            'success' => true,
            'message' => __('Published customizations reset to theme defaults'),
            'discardedCount' => $discardedCount
        ];
    }
}
