<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Api\SearchCriteriaBuilderFactory;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\StatusCode;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractQueryResolver;

/**
 * GraphQL resolver for getThemeEditorCss query
 * 
 * ACL: Inherits ::editor_view from AbstractQueryResolver
 * Returns generated CSS for specific status (PUBLISHED, DRAFT, or PUBLICATION)
 */
class GetCss extends AbstractQueryResolver
{
    use PublicationChangelogTrait;
    public function __construct(
        private CssGenerator $cssGenerator,
        private StatusProvider $statusProvider,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
        private ValueService $valueService,
        private ConfigProvider $configProvider,
        private ChangelogRepositoryInterface $changelogRepository,
        private SearchCriteriaBuilderFactory $searchCriteriaBuilderFactory,
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // 1. Get scope and scopeId
        $scope = $this->scopeFactory->create(
            $args['scope']['type'] ?? 'stores',
            (int)($args['scope']['scopeId'] ?? 0)
        );

        // 2. Get theme ID via ThemeResolver
        $themeId = $this->themeResolver->getThemeIdByScope($scope);

        // 3. Get status (default: PUBLISHED)
        $status = $args['status'] ?? StatusCode::PUBLISHED;

        // 4. Get publication ID (optional, for PUBLICATION status)
        $publicationId = isset($args['publicationId']) ? (int) $args['publicationId'] : null;

        // 5. Generate CSS based on status
        if ($status === 'PUBLICATION') {
            if (!$publicationId) {
                throw new GraphQlInputException(
                    __('publicationId is required when status is PUBLICATION')
                );
            }
            $css = $this->generateCssFromPublication($themeId, $publicationId);
        } else {
            $css = $this->cssGenerator->generate($themeId, $scope, $status);
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
     * @param int $publicationId
     * @return string
     */
    private function generateCssFromPublication(int $themeId, int $publicationId): string
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
}
