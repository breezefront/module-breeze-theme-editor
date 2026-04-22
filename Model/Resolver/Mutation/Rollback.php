<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Rollback to previous publication
 * 
 * ACL: Override - requires ::editor_rollback permission
 */
class Rollback extends AbstractMutationResolver
{
    /**
     * {@inheritdoc}
     * 
     * Override: Rollback requires special permission
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_rollback';
    }
    
    public function __construct(
        private PublishService $publishManager,
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private UserResolver $userResolver,
        private PublicationRepositoryInterface $publicationRepository,
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];
        $publicationId = (int)$input['publicationId'];
        $title = $input['title'];
        $description = $input['description'] ?? null;

        $userId = $this->userResolver->getCurrentUserId($context);

        // Перевірити що публікація існує
        try {
            $targetPublication = $this->publicationRepository->getById($publicationId);
        } catch (\Exception $e) {
            throw new GraphQlInputException(
                __('Publication with ID %1 not found', $publicationId)
            );
        }

        // Виконати rollback
        $result = $this->publishManager->rollback(
            $publicationId,
            $userId,
            $title,
            $description
        );

        // Отримати створену публікацію
        $newPublication = $this->publicationRepository->getById($result['publicationId']);

        // Завантажити published values після rollback
        $scope = $this->scopeFactory->fromInput([
            'type'    => $newPublication->getScope(),
            'scopeId' => $newPublication->getStoreId(),
        ]);
        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);
        $publishedRows = $this->valueService->getValuesByTheme(
            $newPublication->getThemeId(),
            $scope,
            $publishedStatusId
        );

        $values = [];
        foreach ($publishedRows as $row) {
            $values[] = [
                'sectionCode' => $row['section_code'],
                'fieldCode'   => $row['setting_code'],
                'value'       => $row['value'],
                'isModified'  => true,
                'updatedAt'   => $row['updated_at'],
            ];
        }

        return [
            'success' => true,
            'message' => __('Successfully rolled back to publication #%1', $publicationId),
            'values'  => $values,
            'publication' => [
                'publicationId' => $newPublication->getPublicationId(),
                'themeId' => $newPublication->getThemeId(),
                'scope' => $newPublication->getScope(),
                'scopeId' => $newPublication->getStoreId(),
                'title' => $newPublication->getTitle(),
                'description' => $newPublication->getDescription(),
                'publishedAt' => $newPublication->getPublishedAt(),
                'publishedBy' => $newPublication->getPublishedBy(),
                'publishedByName' => null,
                'publishedByEmail' => null,
                'isRollback' => true,
                'rollbackFrom' => $publicationId,
                'changesCount' => $newPublication->getChangesCount(),
                'changes' => null,
                'canRollback' => true
            ]
        ];
    }
}
