<?php

declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

/**
 * Trait for formatting publication data arrays
 *
 * Shared between Publication resolver and CompareProvider
 */
trait PublicationDataTrait
{
    /**
     * Extract section/field labels from a config array.
     *
     * Returns a nested map:
     *   [ $sectionCode => [ 'label' => string, 'fields' => [ $fieldCode => string ] ] ]
     *
     * @param array $config Result of ConfigProvider::getConfigurationWithInheritance()
     * @return array
     */
    private function extractLabels(array $config): array
    {
        $labels = [];
        foreach ($config['sections'] ?? [] as $section) {
            $sectionCode = $section['id'];
            $labels[$sectionCode] = [
                'label'  => $section['name'],
                'fields' => [],
            ];
            foreach ($section['settings'] ?? [] as $setting) {
                $labels[$sectionCode]['fields'][$setting['id']] = $setting['label'];
            }
        }
        return $labels;
    }

    /**
     * Format a publication model into a GraphQL-ready data array.
     *
     * @param object     $publication Publication model instance
     * @param array      $userData    Resolved admin user data (fullname, username, email)
     * @param array|null $changes     Pre-built changelog entries; null when not loaded
     * @return array
     */
    private function formatPublicationData(
        object $publication,
        array $userData,
        ?array $changes = null
    ): array {
        return [
            'publicationId'    => $publication->getPublicationId(),
            'themeId'          => $publication->getThemeId(),
            'scope'            => $publication->getScope(),
            'scopeId'          => $publication->getStoreId(),
            'title'            => $publication->getTitle(),
            'description'      => $publication->getDescription(),
            'publishedAt'      => $publication->getPublishedAt(),
            'publishedBy'      => $publication->getPublishedBy(),
            'publishedByName'  => $userData['fullname'] ?? $userData['username'] ?? null,
            'publishedByEmail' => $userData['email'] ?? null,
            'isRollback'       => (bool)$publication->getIsRollback(),
            'rollbackFrom'     => $publication->getRollbackFrom(),
            'changesCount'     => $publication->getChangesCount(),
            'changes'          => $changes,
            'canRollback'      => true,
        ];
    }
}
