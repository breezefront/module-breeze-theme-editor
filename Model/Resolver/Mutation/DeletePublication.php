<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Model\Service\DeletePublicationService;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;

/**
 * Delete a historical publication record.
 *
 * ACL: Reuses editor_publish — deleting publications is as sensitive as creating them.
 *
 * Guard: The most recent publication for a given theme+store is considered the
 * "currently active" one and cannot be deleted.
 */
class DeletePublication extends AbstractMutationResolver
{
    /**
     * {@inheritdoc}
     *
     * Override: same permission level as Publish.
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_publish';
    }

    public function __construct(
        private DeletePublicationService $deleteService
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $publicationId = (int)$args['publicationId'];

        try {
            $this->deleteService->delete($publicationId);
        } catch (NoSuchEntityException $e) {
            throw new GraphQlInputException(
                __('Publication with ID %1 not found', $publicationId)
            );
        } catch (LocalizedException $e) {
            throw new GraphQlInputException(__($e->getMessage()));
        }

        return [
            'success' => true,
            'message' => __('Publication deleted successfully'),
            'values' => []
        ];
    }
}
