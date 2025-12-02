<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Swissup\BreezeThemeEditor\Api\Data\ChangelogInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\ChangelogFactory;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Changelog as ChangelogResource;
use Swissup\BreezeThemeEditor\Model\ResourceModel\Changelog\CollectionFactory;
use Magento\Framework\Exception\CouldNotSaveException;
use Magento\Framework\Exception\CouldNotDeleteException;
use Magento\Framework\Exception\NoSuchEntityException;

class ChangelogRepository implements ChangelogRepositoryInterface
{
    private array $instances = [];

    public function __construct(
        private ChangelogFactory $changelogFactory,
        private ChangelogResource $changelogResource,
        private CollectionFactory $collectionFactory
    ) {}

    public function getById(int $changeId): ChangelogInterface
    {
        if (isset($this->instances[$changeId])) {
            return $this->instances[$changeId];
        }

        $changelog = $this->changelogFactory->create();
        $this->changelogResource->load($changelog, $changeId);

        if (!$changelog->getChangeId()) {
            throw new NoSuchEntityException(
                __('Changelog with id "%1" does not exist.', $changeId)
            );
        }

        $this->instances[$changeId] = $changelog;

        return $changelog;
    }

    public function getByPublicationId(int $publicationId): array
    {
        $collection = $this->collectionFactory->create();
        $collection->addPublicationFilter($publicationId);

        return $collection->getItems();
    }

    public function save(ChangelogInterface $changelog): ChangelogInterface
    {
        try {
            $this->changelogResource->save($changelog);
            unset($this->instances[$changelog->getChangeId()]);
        } catch (\Exception $e) {
            throw new CouldNotSaveException(
                __('Could not save changelog: %1', $e->getMessage())
            );
        }

        return $changelog;
    }

    public function saveMultiple(array $changelogs): int
    {
        $count = 0;
        foreach ($changelogs as $changelog) {
            $this->save($changelog);
            $count++;
        }
        return $count;
    }

    public function delete(ChangelogInterface $changelog): bool
    {
        try {
            $changeId = $changelog->getChangeId();
            $this->changelogResource->delete($changelog);
            unset($this->instances[$changeId]);

            return true;
        } catch (\Exception $e) {
            throw new CouldNotDeleteException(
                __('Could not delete changelog: %1', $e->getMessage())
            );
        }
    }

    public function deleteByPublicationId(int $publicationId): int
    {
        $collection = $this->collectionFactory->create();
        $collection->addPublicationFilter($publicationId);

        $count = 0;
        foreach ($collection as $changelog) {
            $this->delete($changelog);
            $count++;
        }

        return $count;
    }
}
