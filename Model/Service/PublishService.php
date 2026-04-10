<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\App\ResourceConnection;
use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ChangelogFactory;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Swissup\BreezeThemeEditor\Model\StatusCode;

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
        private SearchCriteriaBuilder $searchCriteriaBuilder,
        private ResourceConnection $resourceConnection,
        private ScopeFactory $scopeFactory
    ) {}

    public function publish(
        int $themeId,
        ScopeInterface $scope,
        int $userId,
        string $title,
        ?string $description = null
    ): array {
        $comparison = $this->compareProvider->compare($themeId, $scope, $userId);

        if (!$comparison['hasChanges']) {
            throw new LocalizedException(__('No changes to publish'));
        }

        $draftStatusId = $this->statusProvider->getStatusId(StatusCode::DRAFT);
        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        // Load all draft values via ValueService
        $draftValues = $this->valueService->getValuesByTheme($themeId, $scope, $draftStatusId, $userId);

        // Create publication record
        $publication = $this->publicationFactory->create();
        $publication->setThemeId($themeId);
        $publication->setScope($scope->getType());
        $publication->setStoreId($scope->getScopeId());
        $publication->setTitle($title);
        $publication->setDescription($description);
        $publication->setPublishedBy($userId);
        $publication->setIsRollback(false);
        $publication->setChangesCount($comparison['changesCount']);

        $connection = $this->resourceConnection->getConnection();
        $connection->beginTransaction();
        try {
            $this->publicationRepository->save($publication);

            // Save changelog
            $this->saveChangelog($publication->getPublicationId(), $comparison['changes']);

            // Build merged published snapshot: current published values overridden by draft.
            $currentPublished = $this->valueService->getValuesByTheme(
                $themeId,
                $scope,
                $publishedStatusId,
                null // no user_id filter — load ALL published rows regardless of owner
            );

            $mergedMap = [];
            foreach ($currentPublished as $val) {
                $key = $val['section_code'] . '.' . $val['setting_code'];
                $mergedMap[$key] = $val;
            }
            foreach ($draftValues as $val) {
                $key = $val['section_code'] . '.' . $val['setting_code'];
                $mergedMap[$key] = $val; // draft overrides published
            }

            // Delete ALL existing published rows (removes legacy rows of any user_id)
            $this->valueService->deleteValues($themeId, $scope, $publishedStatusId, null);

            // Save clean merged snapshot with the publishing admin's user_id
            $this->applySnapshot($themeId, $scope, $publishedStatusId, $userId, array_values($mergedMap));

            // Delete draft values
            $this->valueService->deleteValues($themeId, $scope, $draftStatusId, $userId);

            $connection->commit();
        } catch (\Exception $e) {
            $connection->rollBack();
            throw $e;
        }

        return [
            'publicationId' => $publication->getPublicationId(),
            'themeId' => $themeId,
            'scope' => $scope->getType(),
            'scopeId' => $scope->getScopeId(),
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
        $scope = $this->scopeFactory->create(
            $oldPublication->getScope() ?: 'stores',
            (int)$oldPublication->getStoreId()
        );

        // Load changelog entries for the old publication via SearchCriteria
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('publication_id', $publicationId)
            ->create();
        $searchResults = $this->changelogRepository->getList($criteria);
        $oldChanges = $searchResults->getItems();

        // Create new publication record for rollback
        $publication = $this->publicationFactory->create();
        $publication->setThemeId($themeId);
        $publication->setScope($scope->getType());
        $publication->setStoreId($scope->getScopeId());
        $publication->setTitle($title);
        $publication->setDescription($description);
        $publication->setPublishedBy($userId);
        $publication->setIsRollback(true);
        $publication->setRollbackFrom($publicationId);
        $publication->setChangesCount(count($oldChanges));

        $draftStatusId = $this->statusProvider->getStatusId(StatusCode::DRAFT);
        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        $connection = $this->resourceConnection->getConnection();
        $connection->beginTransaction();
        try {
            $this->publicationRepository->save($publication);

            // Save changelog for rollback
            $normalizedChanges = [];
            foreach ($oldChanges as $c) {
                $normalizedChanges[] = [
                    'sectionCode'    => $c->getSectionCode(),
                    'fieldCode'      => $c->getSettingCode(),
                    'publishedValue' => $c->getOldValue(),
                    'draftValue'     => $c->getNewValue(),
                ];
            }
            $this->saveChangelog($publication->getPublicationId(), $normalizedChanges);

            // Clear current draft before restoring old values
            // (prevents draft from silently surviving rollback)
            $this->valueService->deleteValues($themeId, $scope, $draftStatusId, $userId);

            // Delete ALL existing published rows (removes legacy rows of any user_id)
            $this->valueService->deleteValues($themeId, $scope, $publishedStatusId, null);

            // Restore snapshot from changelog with the rolling-back admin's user_id
            $snapshotRows = [];
            foreach ($oldChanges as $change) {
                $snapshotRows[] = [
                    'section_code' => $change->getSectionCode(),
                    'setting_code' => $change->getSettingCode(),
                    'value'        => $change->getNewValue(),
                ];
            }
            $this->applySnapshot($themeId, $scope, $publishedStatusId, $userId, $snapshotRows);

            $connection->commit();
        } catch (\Exception $e) {
            $connection->rollBack();
            throw $e;
        }

        return [
            'publicationId' => $publication->getPublicationId(),
            'themeId' => $themeId,
            'scope' => $scope->getType(),
            'scopeId' => $scope->getScopeId(),
            'title' => $title,
            'isRollback' => true,
            'rollbackFrom' => $publicationId,
            'changesCount' => count($oldChanges)
        ];
    }

    /**
     * Persist a snapshot of value rows as published records owned by $userId.
     *
     * Each row must contain: section_code, setting_code, value.
     * Caller is responsible for deleting the old published rows beforehand.
     */
    private function applySnapshot(
        int $themeId,
        ScopeInterface $scope,
        int $publishedStatusId,
        int $userId,
        array $rows
    ): void {
        $models = [];
        foreach ($rows as $row) {
            $model = $this->valueRepository->create();
            $model->setThemeId($themeId);
            $model->setScope($scope->getType());
            $model->setStoreId($scope->getScopeId());
            $model->setStatusId($publishedStatusId);
            $model->setSectionCode($row['section_code']);
            $model->setSettingCode($row['setting_code']);
            $model->setValue($row['value']);
            $model->setUserId($userId);
            $models[] = $model;
        }
        if ($models) {
            $this->valueRepository->saveMultiple($models);
        }
    }

    /**
     * Persist changelog entries for a publication.
     *
     * Each item must have keys: sectionCode, fieldCode, publishedValue, draftValue.
     */
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
}
