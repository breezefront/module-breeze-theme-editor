<?php

declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

/**
 * Trait for handling publication changelog operations
 * 
 * Shared between ConfigFromPublication and GetCss resolvers
 */
trait PublicationChangelogTrait
{
    /**
     * Get changelog entries for publication
     *
     * @param int $publicationId
     * @return array
     */
    private function getPublicationChangelog(int $publicationId): array
    {
        $searchCriteriaBuilder = $this->searchCriteriaBuilderFactory->create();

        $searchCriteria = $searchCriteriaBuilder
            ->addFilter('publication_id', $publicationId)
            ->create();

        $result = $this->changelogRepository->getList($searchCriteria);

        $changelog = [];
        foreach ($result->getItems() as $change) {
            $changelog[] = [
                'section_code' => $change->getSectionCode(),
                'setting_code' => $change->getSettingCode(),
                'old_value' => $change->getOldValue(),
                'new_value' => $change->getNewValue()
            ];
        }

        return $changelog;
    }

    /**
     * Build values map from changelog (use new_value)
     *
     * @param array $changelog
     * @return array Map of 'section.setting' => 'value'
     */
    private function buildValuesMapFromChangelog(array $changelog): array
    {
        $valuesMap = [];

        foreach ($changelog as $change) {
            $key = $change['section_code'] . '.' . $change['setting_code'];
            $valuesMap[$key] = $change['new_value'];
        }

        return $valuesMap;
    }
}
