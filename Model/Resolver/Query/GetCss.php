<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;

/**
 * GraphQL resolver for getThemeEditorCss query
 * Returns generated CSS for specific status (PUBLISHED, DRAFT, or PUBLICATION)
 */
class GetCss implements ResolverInterface
{
    public function __construct(
        private CssGenerator $cssGenerator,
        private StatusProvider $statusProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
        private ValueService $valueService,
        private ConfigProvider $configProvider,
        private ChangelogRepositoryInterface $changelogRepository,
        private SearchCriteriaBuilderFactory $searchCriteriaBuilderFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // 1. Get store ID
        $storeId = (int) $args['storeId'];

        // 2. Get theme ID (auto-detect if not provided)
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int) $args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        // 3. Get status (default: PUBLISHED)
        $status = $args['status'] ?? 'PUBLISHED';

        // 4. Get publication ID (optional, for PUBLICATION status)
        $publicationId = isset($args['publicationId']) ? (int) $args['publicationId'] : null;

        // 5. Generate CSS based on status
        if ($status === 'PUBLICATION' && $publicationId) {
            $css = $this->generateCssFromPublication($themeId, $storeId, $publicationId);
        } else {
            $css = $this->cssGenerator->generate($themeId, $storeId, $status);
        }

        // 6. Return structured response
        return [
            'css' => $css,
            'status' => $status,
            'hasContent' => $this->hasRealCssContent($css)
        ];
    }

    /**
     * Check if CSS has real content (contains CSS variables)
     *
     * @param string $css
     * @return bool
     */
    private function hasRealCssContent(string $css): bool
    {
        return !empty($css)
            && $css !== ":root {\n}\n"
            && str_contains($css, '--'); // Contains CSS variables
    }

    /**
     * Generate CSS from publication values
     * Loads values from specific publication and generates CSS
     *
     * @param int $themeId
     * @param int $storeId
     * @param int $publicationId
     * @return string
     */
    private function generateCssFromPublication(int $themeId, int $storeId, int $publicationId): string
    {
        try {
            // Get changelog entries for this publication
            $changelog = $this->getPublicationChangelog($publicationId);

            if (empty($changelog)) {
                // No changes in publication, return empty CSS
                return ":root {\n}\n";
            }

            // Build values map: 'section.setting' => 'value'
            $valuesMap = $this->buildValuesMapFromChangelog($changelog);

            // Generate CSS from values map
            return $this->cssGenerator->generateFromValuesMap($themeId, $valuesMap);
            
        } catch (\Exception $e) {
            return "/* Error generating CSS from publication: {$e->getMessage()} */";
        }
    }

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
