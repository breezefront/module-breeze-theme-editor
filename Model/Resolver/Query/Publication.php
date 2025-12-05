<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlNoSuchEntityException;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class Publication implements ResolverInterface
{
    public function __construct(
        private PublicationRepositoryInterface $publicationRepository,
        private ChangelogRepositoryInterface $changelogRepository,
        private ConfigProvider $configProvider
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

        // Отримати changelog
        $changelog = $this->changelogRepository->getByPublicationId($publicationId);

        // Отримати labels з config
        $themeId = $publication->getThemeId();
        $config = $this->configProvider->getConfiguration($themeId);
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

        return [
            'publicationId' => $publication->getPublicationId(),
            'themeId' => $publication->getThemeId(),
            'storeId' => $publication->getStoreId(),
            'title' => $publication->getTitle(),
            'description' => $publication->getDescription(),
            'publishedAt' => $publication->getPublishedAt(),
            'publishedBy' => $publication->getPublishedBy(),
            'publishedByName' => null, // TODO
            'publishedByEmail' => null, // TODO
            'isRollback' => (bool)$publication->getIsRollback(),
            'rollbackFrom' => $publication->getRollbackFrom(),
            'changesCount' => $publication->getChangesCount(),
            'changes' => $changes,
            'canRollback' => true
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
