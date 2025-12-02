<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Api\Data\PublicationInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Publication as PublicationResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Publication\CollectionFactory;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;

class PublicationRepository implements PublicationRepositoryInterface
{
    private array $instances = [];

    public function __construct(
        private PublicationFactory $publicationFactory,
        private PublicationResource $publicationResource,
        private CollectionFactory $collectionFactory
    ) {}

    public function getById(int $publicationId): PublicationInterface
    {
        if (isset($this->instances[$publicationId])) {
            return $this->instances[$publicationId];
        }

        $publication = $this->publicationFactory->create();
        $this->publicationResource->load($publication, $publicationId);

        if (!$publication->getPublicationId()) {
            throw new NoSuchEntityException(
                __('Publication with id "%1" does not exist.', $publicationId)
            );
        }

        $this->instances[$publicationId] = $publication;

        return $publication;
    }

    public function getList(
        int $themeId,
        int $storeId,
        int $pageSize = 20,
        int $currentPage = 1,
        ?string $search = null
    ): array {
        $collection = $this->collectionFactory->create();
        $collection->addThemeStoreFilter($themeId, $storeId);
        $collection->addPublishedAtOrder('DESC');

        if ($search) {
            $collection->addTitleSearch($search);
        }

        $collection->setPageSize($pageSize);
        $collection->setCurPage($currentPage);

        return [
            'items' => $collection->getItems(),
            'total_count' => $collection->getSize()
        ];
    }

    public function getLatest(int $themeId, int $storeId): ?PublicationInterface
    {
        $collection = $this->collectionFactory->create();
        $collection->addThemeStoreFilter($themeId, $storeId);
        $collection->addPublishedAtOrder('DESC');
        $collection->setPageSize(1);

        $item = $collection->getFirstItem();

        return $item->getPublicationId() ? $item : null;
    }

    public function save(PublicationInterface $publication): PublicationInterface
    {
        try {
            $this->publicationResource->save($publication);
            unset($this->instances[$publication->getPublicationId()]);
        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save publication: %1', $e->getMessage())
            );
        }

        return $publication;
    }

    public function delete(PublicationInterface $publication): bool
    {
        try {
            $publicationId = $publication->getPublicationId();
            $this->publicationResource->delete($publication);
            unset($this->instances[$publicationId]);

            return true;
        } catch (\Exception $e) {
            throw new CouldNotDeleteException(
                __('Could not delete publication: %1', $e->getMessage())
            );
        }
    }
}
