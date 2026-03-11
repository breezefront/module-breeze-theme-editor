<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;

/**
 * Publish draft to production
 * 
 * ACL: Override - requires ::editor_publish permission
 */
class Publish extends AbstractMutationResolver
{
    /**
     * {@inheritdoc}
     * 
     * Override: Publish requires special permission
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_publish';
    }
    
    public function __construct(
        private PublishService $publishManager,
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
        $input = $args['input'];

        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId($context);
        $userMetadata = $this->userResolver->getCurrentUserMetadata($context);

        $scope = $this->scopeFactory->create(
            $input['scope']['type'] ?? 'stores',
            (int)($input['scope']['scopeId'] ?? 0)
        );
        $themeId = $this->themeResolver->getThemeIdByScope($scope);

        $title = $input['title'];
        $description = $input['description'] ?? null;

        if (empty($title)) {
            throw new GraphQlInputException(__('Publication title is required'));
        }

        // Опублікувати через PublishManager
        $result = $this->publishManager->publish(
            $themeId,
            $scope->getType(),
            $scope->getScopeId(),
            $userId,
            $title,
            $description
        );

        return [
            'success' => true,
            'message' => __('Settings published successfully'),
            'publication' => [
                'publicationId' => $result['publicationId'],
                'themeId' => $result['themeId'],
                'scope' => $result['scope'],
                'scopeId' => $result['scopeId'],
                'title' => $result['title'],
                'description' => $result['description'],
                'publishedAt' => $result['publishedAt'],
                'publishedBy' => $result['publishedBy'],
                'publishedByName' => $userMetadata['username'] ?? null,
                'publishedByEmail' => $userMetadata['email'] ?? null,
                'isRollback' => $result['isRollback'],
                'rollbackFrom' => null,
                'changesCount' => $result['changesCount'],
                'changes' => $this->formatChanges($result['changes']),
                'canRollback' => true
            ]
        ];
    }

    /**
     * Форматувати зміни для GraphQL
     */
    private function formatChanges(array $changes): array
    {
        $result = [];
        $changeId = 1;

        foreach ($changes as $change) {
            $result[] = [
                'changeId' => $changeId++,
                'sectionCode' => $change['sectionCode'],
                'sectionLabel' => $change['sectionLabel'],
                'fieldCode' => $change['fieldCode'],
                'fieldLabel' => $change['fieldLabel'],
                'oldValue' => $change['publishedValue'],
                'newValue' => $change['draftValue'],
                'changeType' => $change['changeType']
            ];
        }

        return $result;
    }
}
