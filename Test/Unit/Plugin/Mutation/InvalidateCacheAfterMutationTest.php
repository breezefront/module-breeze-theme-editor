<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Plugin\Mutation;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\Cache\TypeListInterface;
use Magento\PageCache\Model\Cache\Type as FullPageCache;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Publish;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Rollback;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\SaveValues;
use Swissup\BreezeThemeEditor\Plugin\Mutation\InvalidateCacheAfterMutation;

class InvalidateCacheAfterMutationTest extends TestCase
{
    private InvalidateCacheAfterMutation $plugin;
    private CacheInterface|MockObject $cache;
    private TypeListInterface|MockObject $cacheTypeList;
    private LoggerInterface|MockObject $logger;
    private FullPageCache|MockObject $fullPageCache;

    protected function setUp(): void
    {
        $this->cache         = $this->createMock(CacheInterface::class);
        $this->cacheTypeList = $this->createMock(TypeListInterface::class);
        $this->logger        = $this->createMock(LoggerInterface::class);
        $this->fullPageCache = $this->createMock(FullPageCache::class);

        $this->plugin = new InvalidateCacheAfterMutation(
            $this->cache,
            $this->cacheTypeList,
            $this->logger,
            $this->fullPageCache
        );
    }

    // =========================================================================
    // SaveValues — block cache only
    // =========================================================================

    public function testSaveValuesSuccessInvalidatesBlockCacheOnly(): void
    {
        $subject = $this->createMock(SaveValues::class);
        $result  = ['success' => true];

        $this->cache->expects($this->once())
            ->method('clean')
            ->with(['bte_theme_variables']);

        $this->cacheTypeList->expects($this->never())
            ->method('invalidate');

        $this->fullPageCache->expects($this->never())
            ->method('clean');

        $this->plugin->afterResolve($subject, $result);
    }

    // =========================================================================
    // Publish — block cache + FPC
    // =========================================================================

    public function testPublishSuccessInvalidatesBlockCacheAndFpc(): void
    {
        $subject = $this->createMock(Publish::class);
        $result  = ['success' => true];

        $this->cache->expects($this->once())
            ->method('clean')
            ->with(['bte_theme_variables']);

        $this->fullPageCache->expects($this->once())
            ->method('clean')
            ->with(\Zend_Cache::CLEANING_MODE_MATCHING_ANY_TAG, ['bte_theme_variables']);

        $this->cacheTypeList->expects($this->once())
            ->method('invalidate')
            ->with('full_page');

        $this->plugin->afterResolve($subject, $result);
    }

    // =========================================================================
    // Rollback — block cache + FPC
    // =========================================================================

    public function testRollbackSuccessInvalidatesBlockCacheAndFpc(): void
    {
        $subject = $this->createMock(Rollback::class);
        $result  = ['success' => true];

        $this->cache->expects($this->once())
            ->method('clean')
            ->with(['bte_theme_variables']);

        $this->fullPageCache->expects($this->once())
            ->method('clean')
            ->with(\Zend_Cache::CLEANING_MODE_MATCHING_ANY_TAG, ['bte_theme_variables']);

        $this->cacheTypeList->expects($this->once())
            ->method('invalidate')
            ->with('full_page');

        $this->plugin->afterResolve($subject, $result);
    }

    // =========================================================================
    // Unsuccessful results — nothing touched
    // =========================================================================

    public function testNoInvalidationWhenSuccessIsFalse(): void
    {
        $subject = $this->createMock(Publish::class);
        $result  = ['success' => false];

        $this->cache->expects($this->never())->method('clean');
        $this->fullPageCache->expects($this->never())->method('clean');
        $this->cacheTypeList->expects($this->never())->method('invalidate');

        $this->plugin->afterResolve($subject, $result);
    }

    public function testNoInvalidationWhenResultIsNonArray(): void
    {
        $subject = $this->createMock(Publish::class);

        $this->cache->expects($this->never())->method('clean');
        $this->fullPageCache->expects($this->never())->method('clean');
        $this->cacheTypeList->expects($this->never())->method('invalidate');

        $this->plugin->afterResolve($subject, null);
        $this->plugin->afterResolve($subject, 'string');
        $this->plugin->afterResolve($subject, true);
    }

    public function testNoInvalidationWhenSuccessKeyMissing(): void
    {
        $subject = $this->createMock(Publish::class);
        $result  = ['publicationId' => 42]; // no 'success' key

        $this->cache->expects($this->never())->method('clean');
        $this->fullPageCache->expects($this->never())->method('clean');
        $this->cacheTypeList->expects($this->never())->method('invalidate');

        $this->plugin->afterResolve($subject, $result);
    }

    // =========================================================================
    // Return value passthrough
    // =========================================================================

    public function testResultIsReturnedUnchangedOnSuccess(): void
    {
        $subject = $this->createMock(Publish::class);
        $result  = ['success' => true, 'publicationId' => 99];

        $returned = $this->plugin->afterResolve($subject, $result);

        $this->assertSame($result, $returned);
    }

    public function testResultIsReturnedUnchangedOnFailure(): void
    {
        $subject = $this->createMock(Publish::class);
        $result  = ['success' => false];

        $returned = $this->plugin->afterResolve($subject, $result);

        $this->assertSame($result, $returned);
    }
}
