<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Swissup\BreezeThemeEditor\Model\Utility\AdminUserLoader;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * Get publication details with changelog
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 */
class Publication extends AbstractQueryResolver
{
    public function __construct(
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private ConfigProvider $configProvider,
        private SearchCriteriaBuilder $searchCriteriaBuilder,
        private AdminUserLoader $adminUserLoader
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $publicationId = (int)$args['publicationId'];

        try {
            $publication = $this->publicationRepository->getById($publicationId);
        } catch (\Exception $e) {
            throw new GraphQlNoSuchEntityException(
                __('Publication with ID %1 not found', $publicationId)
            );
        }

        // Отримати changelog через SearchCriteria
        $criteria = $this->searchCriteriaBuilder
            ->addFilter('publication_id', $publicationId)
            ->create();
        $searchResults = $this->changelogRepository->getList($criteria);
        $changelog = $searchResults->getItems();

        // Отримати labels з config
        $themeId = $publication->getThemeId();
        $config = $this->configProvider->getConfigurationWithInheritance($themeId);
        $labels = $this->extractLabels($config);

        $changes = [];
        $changeId = 1;
        foreach ($changelog as $change) {
            $sectionCode = $change->getSectionCode();
            $fieldCode = $change->getSettingCode();

            $changes[] = [
                'changeId' => $changeId++,
                'sectionCode' => $sectionCode,
                'sectionLabel' => $labels[$sectionCode]['label'] ?? $sectionCode,
                'fieldCode' => $fieldCode,
                'fieldLabel' => $labels[$sectionCode]['fields'][$fieldCode] ?? $fieldCode,
                'oldValue' => $change->getOldValue(),
                'newValue' => $change->getNewValue(),
                'changeType' => $this->determineChangeType(
                    $change->getOldValue(),
                    $change->getNewValue()
                )
            ];
        }

        // Load user data
        $publishedBy = $publication->getPublishedBy();
        $userData = $this->adminUserLoader->getUserData($publishedBy);

        return [
            'publicationId'   => $publication->getPublicationId(),
            'themeId'         => $publication->getThemeId(),
            'storeId'         => $publication->getStoreId(),
            'title'           => $publication->getTitle(),
            'description'     => $publication->getDescription(),
            'publishedAt'     => $publication->getPublishedAt(),
            'publishedBy'     => $publishedBy,
            'publishedByName' => $userData['fullname'] ?? $userData['username'] ?? null,
            'publishedByEmail'=> $userData['email'] ?? null,
            'isRollback'      => (bool)$publication->getIsRollback(),
            'rollbackFrom'    => $publication->getRollbackFrom(),
            'changesCount'    => $publication->getChangesCount(),
            'changes'         => $changes,
            'canRollback'     => true
        ];
    }

    private function extractLabels(array $config): array
    {
        $labels = [];
        foreach ($config['sections'] ??  [] as $section) {
            $sectionCode = $section['id'];
            $labels[$sectionCode] = [
                'label' => $section['name'],
                'fields' => []
            ];
            foreach ($section['settings'] ?? [] as $setting) {
                $labels[$sectionCode]['fields'][$setting['id']] = $setting['label'];
            }
        }
        return $labels;
    }

    private function determineChangeType(? string $oldValue, ?string $newValue): string
    {
        if ($oldValue === null) {
            return 'ADDED';
        }
        if ($newValue === null) {
            return 'DELETED';
        }
        return 'MODIFIED';
    }
}
