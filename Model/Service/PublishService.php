<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Magento\Framework\Exception\LocalizedException;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ChangelogFactory;

class PublishService
{
    public function __construct(
        private ValueRepository $valueRepository,
        private StatusProvider $statusProvider,
        private CompareProvider $compareProvider,
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private PublicationFactory $publicationFactory,
        private ChangelogFactory $changelogFactory
    ) {}

    /**
     * Опублікувати draft -> published
     */
    public function publish(
        int $themeId,
        int $storeId,
        int $userId,
        string $title,
        ?  string $description = null
    ): array {
        // Порівняти draft vs published
        $comparison = $this->compareProvider->compare($themeId, $storeId, $userId);

        if (!   $comparison['hasChanges']) {
            throw new LocalizedException(__('No changes to publish'));
        }

        $draftStatusId = $this->statusProvider->getStatusId('DRAFT');
        $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        // ✅ Отримати всі draft значення (без inheritance - тільки з цієї теми!)
        $draftValues = $this->valueRepository->getValuesByTheme($themeId, $storeId, $draftStatusId, $userId);

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

        // Скопіювати draft -> published (user_id = 0 для published)
        $formatted = [];
        foreach ($draftValues as $val) {
            $formatted[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode' => $val['setting_code'],
                'value' => $val['value']
            ];
        }

        $this->valueRepository->saveValues(
            $themeId,
            $storeId,
            $publishedStatusId,
            0, // ✅ published завжди user_id = 0
            $formatted
        );

        // Видалити draft
        $this->valueRepository->deleteValues(
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

    /**
     * Rollback до попередньої версії
     */
    public function rollback(
        int $publicationId,
        int $userId,
        string $title,
        ?  string $description = null
    ): array {
        // Отримати стару публікацію
        $oldPublication = $this->publicationRepository->getById($publicationId);

        $themeId = $oldPublication->getThemeId();
        $storeId = $oldPublication->getStoreId();

        // Отримати зміни зі старої публікації
        $oldChanges = $this->changelogRepository->getByPublicationId($publicationId);

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

        // Застосувати старі значення
        $publishedStatusId = $this->statusProvider->getStatusId('PUBLISHED');

        $values = [];
        foreach ($oldChanges as $change) {
            $values[] = [
                'sectionCode' => $change->getSectionCode(),
                'fieldCode' => $change->getSettingCode(),
                'value' => $change->getNewValue() // В rollback беремо newValue зі старої публікації
            ];
        }

        if (!empty($values)) {
            $this->valueRepository->saveValues(
                $themeId,
                $storeId,
                $publishedStatusId,
                0, // ✅ published завжди user_id = 0
                $values
            );
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

    /**
     * Зберегти changelog
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

    /**
     * Зберегти changelog з старого (для rollback)
     */
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
