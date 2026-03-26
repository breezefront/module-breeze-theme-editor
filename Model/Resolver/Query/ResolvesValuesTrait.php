<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Query;

use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Provides resolveValues() helper to eliminate PUBLISHED/DRAFT branching duplication
 * in query resolvers that need to load saved values with fallback.
 *
 * Consumers MUST declare the following properties:
 *   - ValueInheritanceResolver $valueInheritanceResolver
 *   - StatusProvider           $statusProvider
 */
trait ResolvesValuesTrait
{
    /**
     * Resolve saved values for the given status, falling back to PUBLISHED values for DRAFT.
     *
     * For PUBLISHED: returns values directly (no fallback needed).
     * For DRAFT: merges published values (base) + draft overrides so that fields
     * without a draft row still return the published value, not the theme default.
     *
     * @param string         $statusCode  StatusCode::PUBLISHED or StatusCode::DRAFT
     * @param int            $themeId
     * @param ScopeInterface $scope
     * @param int            $statusId    DB ID for $statusCode
     * @param int|null       $userId      Current admin user ID (required for DRAFT)
     * @return array
     */
    protected function resolveValues(
        string $statusCode,
        int $themeId,
        ScopeInterface $scope,
        int $statusId,
        ?int $userId
    ): array {
        if ($statusCode === StatusCode::PUBLISHED) {
            return $this->valueInheritanceResolver->resolveAllValues($themeId, $scope, $statusId, null);
        }

        $publishedStatusId = $this->statusProvider->getStatusId(StatusCode::PUBLISHED);

        return $this->valueInheritanceResolver->resolveAllValuesWithFallback(
            $themeId,
            $scope,
            $statusId,
            $publishedStatusId,
            $userId
        );
    }
}
