<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Plugin\Mutation;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\Cache\TypeListInterface;
use Magento\PageCache\Model\Cache\Type as FullPageCache;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Publish;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Rollback;

/**
 * Invalidate cache after successful mutation.
 *
 * - SaveValues (draft save): invalidates block cache only
 * - Publish / Rollback:      invalidates block cache + Full Page Cache
 *
 * Registered in etc/graphql/di.xml (GraphQL area, not frontend).
 */
class InvalidateCacheAfterMutation
{
    public function __construct(
        private CacheInterface $cache,
        private TypeListInterface $cacheTypeList,
        private LoggerInterface $logger,
        private FullPageCache $fullPageCache
    ) {}

    public function afterResolve(object $subject, $result)
    {
        if (!$this->isSuccessful($result)) {
            return $result;
        }

        $this->invalidateBlockCache();

        if ($subject instanceof Publish || $subject instanceof Rollback) {
            $this->invalidateFpc();
        }

        $this->logger->debug('BTE: cache invalidated', [
            'mutation' => get_class($subject),
        ]);

        return $result;
    }

    private function isSuccessful($result): bool
    {
        return is_array($result) && isset($result['success']) && (bool)$result['success'];
    }

    private function invalidateBlockCache(): void
    {
        $this->cache->clean(['bte_theme_variables']);
    }

    private function invalidateFpc(): void
    {
        // Clean FPC storage by tag — works for Built-in FPC and Redis.
        // String mode used instead of \Zend_Cache::CLEANING_MODE_MATCHING_ANY_TAG
        // for Magento 2.4.9+ compatibility (Zend_Cache removed).
        $this->fullPageCache->clean('matchingAnyTag', ['bte_theme_variables']);

        // cleanType() flushes the cache type storage and resets the status flag.
        // Unlike invalidate() which only marks it as "invalid" without flushing,
        // cleanType() performs a real flush so frontend pages are immediately stale.
        $this->cacheTypeList->cleanType('full_page');
    }
}
