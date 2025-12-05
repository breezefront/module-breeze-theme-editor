<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;

class Rollback implements ResolverInterface
{
    public function __construct(
        private PublishService $publishManager,
        private UserResolver $userResolver,
        private PublicationRepositoryInterface $publicationRepository
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];
        $publicationId = (int)$input['publicationId'];
        $title = $input['title'];
        $description = $input['description'] ?? null;

        $userId = $this->userResolver->getCurrentUserId();

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

        return [
            'success' => true,
            'message' => __('Successfully rolled back to publication #%1', $publicationId),
            'publication' => [
                'publicationId' => $newPublication->getPublicationId(),
                'themeId' => $newPublication->getThemeId(),
                'storeId' => $newPublication->getStoreId(),
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
