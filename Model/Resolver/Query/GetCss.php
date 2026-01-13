<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

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
        private ConfigProvider $configProvider
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
            // Get config WITH inheritance
            $config = $this->configProvider->getConfigurationWithInheritance($themeId);
            $sections = $config['sections'] ?? [];

            // Build field lookup map: section.setting → field config
            $fieldMap = [];
            foreach ($sections as $section) {
                foreach ($section['settings'] ?? [] as $setting) {
                    $key = $section['id'] . '.' . $setting['id'];
                    $fieldMap[$key] = $setting;
                }
            }

            // Get values from publication (use special status code for publication query)
            // Note: We need to query publication_values table, not regular values table
            // For now, fallback to PUBLISHED status
            // TODO: Implement proper publication values loading when publication feature is complete
            
            // Temporary: Just use PUBLISHED CSS
            return $this->cssGenerator->generate($themeId, $storeId, 'PUBLISHED');
            
        } catch (\Exception $e) {
            return "/* Error generating CSS from publication: {$e->getMessage()} */";
        }
    }
}
