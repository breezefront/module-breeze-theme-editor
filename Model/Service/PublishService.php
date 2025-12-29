<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ChangelogFactory;
use Magento\Framework\Api\SearchCriteriaBuilder;

class PublishService
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private ValueService $valueService,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private PublicationFactory $publicationFactory,
        private ChangelogFactory $changelogFactory,
        private SearchCriteriaBuilder $searchCriteriaBuilder
    ) {}

    public function publish(
        int $themeId,
        int $storeId,
        int $userId,
        string $title,
        ?string $description = null
    ): array {
        $comparison = $this->compareProvider->compare($themeId, $storeId, $userId);

        if (!$comparison['hasChanges']) {
            throw new LocalizedException(__('No changes to publish'));
        }

        $draftStatusId = $this->statusProvider->getStatusId('DRAFT');
        $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        // Отримати всі draft значення через ValueService
        $draftValues = $this->valueService->getValuesByTheme($themeId, $storeId, $draftStatusId, $userId);

        // Створити publication запис
        $publication = $this->publicationFactory->create();
        $publication->setThemeId($themeId);
        $publication->setStoreId($storeId);
        $publication->setTitle($title);
        $publication->setDescription($description);
        $publication->setPublishedBy($userId);
        $publication->setIsRollback(false);
        $publication->setChangesCount($comparison['changesCount']);

        $this->publicationRepository->save($publication);

        // Зберегти changelog
        $this->saveChangelog($publication->getPublicationId(), $comparison['changes']);

        // Сучасний підхід: draftValues → ValueInterface моделі → saveMultiple
        $models = [];
        foreach ($draftValues as $val) {
            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setStoreId($storeId);
            $model->setStatusId($publishedStatusId);
            $model->setSectionCode($val['section_code']);
            $model->setSettingCode($val['setting_code']);
            $model->setValue($val['value']);
            $model->setUserId($userId);
            $models[] = $model;
        }
        if ($models) {
            $this->valueRepository->saveMultiple($models);
        }

        // Видалити draft через ValueService
        $this->valueService->deleteValues(
            $themeId,
            $storeId,
            $draftStatusId,
            $userId
        );

        return [
            'publicationId' => $publication->getPublicationId(),
            'themeId' => $themeId,
            'storeId' => $storeId,
            'title' => $title,
            'description' => $description,
            'publishedAt' => $publication->getPublishedAt(),
            'publishedBy' => $userId,
            'isRollback' => false,
            'changesCount' => $comparison['changesCount'],
            'changes' => $comparison['changes']
        ];
    }

    public function rollback(
        int $publicationId,
        int $userId,
        string $title,
        ?string $description = null
    ): array {
        $oldPublication = $this->publicationRepository->getById($publicationId);

        $themeId = $oldPublication->getThemeId();
        $storeId = $oldPublication->getStoreId();

        // Новий підхід: отримати changelog через SearchCriteria + getList()
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('publication_id', $publicationId)
            ->create();
        $searchResults = $this->changelogRepository->getList($criteria);
        $oldChanges = $searchResults->getItems();

        // Створити нову publication (rollback)
        $publication = $this->publicationFactory->create();
        $publication->setThemeId($themeId);
        $publication->setStoreId($storeId);
        $publication->setTitle($title);
        $publication->setDescription($description);
        $publication->setPublishedBy($userId);
        $publication->setIsRollback(true);
        $publication->setRollbackFrom($publicationId);
        $publication->setChangesCount(count($oldChanges));

        $this->publicationRepository->save($publication);

        // Застосувати старі значення → ValueInterface[]
        $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        $models = [];
        foreach ($oldChanges as $change) {
            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setStoreId($storeId);
            $model->setStatusId($publishedStatusId);
            $model->setSectionCode($change->getSectionCode());
            $model->setSettingCode($change->getSettingCode());
            $model->setValue($change->getNewValue()); // Rollback = newValue зі старої публікації
            $model->setUserId($userId);
            $models[] = $model;
        }
        if ($models) {
            $this->valueRepository->saveMultiple($models);
        }

        // Зберегти changelog для rollback
        $this->saveChangelogFromOld($publication->getPublicationId(), $oldChanges);

        return [
            'publicationId' => $publication->getPublicationId(),
            'themeId' => $themeId,
            'storeId' => $storeId,
            'title' => $title,
            'isRollback' => true,
            'rollbackFrom' => $publicationId,
            'changesCount' => count($oldChanges)
        ];
    }

    private function saveChangelog(int $publicationId, array $changes): void
    {
        foreach ($changes as $change) {
            $changelog = $this->changelogFactory->create();
            $changelog->setPublicationId($publicationId);
            $changelog->setSectionCode($change['sectionCode']);
            $changelog->setSettingCode($change['fieldCode']);
            $changelog->setOldValue($change['publishedValue']);
            $changelog->setNewValue($change['draftValue']);
            $this->changelogRepository->save($changelog);
        }
    }

    private function saveChangelogFromOld(int $newPublicationId, array $oldChanges): void
    {
        foreach ($oldChanges as $oldChange) {
            $changelog = $this->changelogFactory->create();
            $changelog->setPublicationId($newPublicationId);
            $changelog->setSectionCode($oldChange->getSectionCode());
            $changelog->setSettingCode($oldChange->getSettingCode());
            $changelog->setOldValue($oldChange->getOldValue());
            $changelog->setNewValue($oldChange->getNewValue());
            $this->changelogRepository->save($changelog);
        }
    }
}
