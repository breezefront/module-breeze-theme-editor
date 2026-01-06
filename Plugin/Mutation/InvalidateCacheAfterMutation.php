<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Plugin\Mutation;

use Magento\Framework\App\CacheInterface;
use Psr\Log\LoggerInterface;

/**
 * Invalidate theme CSS variables cache after mutations
 *
 * Applies to: SaveValues, PublishDraft, Rollback mutations
 * Ensures generated CSS is refreshed after theme changes
 */
class InvalidateCacheAfterMutation
{
    public function __construct(
        private CacheInterface $cache,
        private LoggerInterface $logger
    ) {}

    /**
     * Invalidate cache after successful mutation
     *
     * @param object $subject Mutation resolver instance
     * @param mixed $result Mutation result
     * @return mixed
     */
    public function afterResolve(object $subject, $result)
    {
        if ($this->isSuccessful($result)) {
            $this->invalidateCache();

            $this->logger->debug('BTE: CSS Variables cache invalidated', [
                'mutation' => get_class($subject),
                'tags' => ['bte_theme_variables']
            ]);
        }

        return $result;
    }

    /**
     * Check if mutation was successful
     *
     * @param mixed $result
     * @return bool
     */
    private function isSuccessful($result): bool
    {
        if (!is_array($result)) {
            return false;
        }

        // SaveValues format:   ['success' => true]
        if (isset($result['success'])) {
            return (bool)$result['success'];
        }

        // PublishDraft format:  ['publishBreezeThemeEditor' => ['success' => true]]
        if (isset($result['publishBreezeThemeEditor']['success'])) {
            return (bool)$result['publishBreezeThemeEditor']['success'];
        }

        return false;
    }

    /**
     * Invalidate theme CSS variables cache
     *
     * @return void
     */
    private function invalidateCache(): void
    {
        $this->cache->clean(['bte_theme_variables']);
    }
}
