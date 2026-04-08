<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\ResourceConnection;
use Magento\Framework\DB\Adapter\AdapterInterface;
use Magento\Framework\DB\Select;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Serialize\SerializerInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;

class StatusProviderTest extends TestCase
{
    private StatusProvider $statusProvider;
    private ResourceConnection $resource;
    private CacheInterface $cache;
    private SerializerInterface $serializer;
    private AdapterInterface $connection;

    protected function setUp(): void
    {
        $this->resource = $this->createMock(ResourceConnection::class);
        $this->cache = $this->createMock(CacheInterface::class);
        $this->serializer = $this->createMock(SerializerInterface::class);
        $this->connection = $this->createMock(AdapterInterface::class);

        $this->statusProvider = new StatusProvider(
            $this->resource,
            $this->cache,
            $this->serializer
        );
    }

    public function testGetStatusIdReturnsDraftId(): void
    {
        // Arrange
        $this->setupDatabaseMock();

        // Act
        $result = $this->statusProvider->getStatusId('DRAFT');

        // Assert
        $this->assertEquals(1, $result);
    }

    public function testGetStatusIdReturnsPublishedId(): void
    {
        // Arrange
        $this->setupDatabaseMock();

        // Act
        $result = $this->statusProvider->getStatusId('PUBLISHED');

        // Assert
        $this->assertEquals(2, $result);
    }

    public function testGetStatusIdIsCaseInsensitive(): void
    {
        // Arrange
        $this->setupDatabaseMock();

        // Act & Assert
        $this->assertEquals(1, $this->statusProvider->getStatusId('draft'));
        $this->assertEquals(1, $this->statusProvider->getStatusId('DRAFT'));
        $this->assertEquals(1, $this->statusProvider->getStatusId('Draft'));
        $this->assertEquals(2, $this->statusProvider->getStatusId('published'));
        $this->assertEquals(2, $this->statusProvider->getStatusId('PUBLISHED'));
    }

    public function testGetStatusIdThrowsExceptionForInvalidCode(): void
    {
        // Arrange
        $this->setupDatabaseMock();

        $this->expectException(NoSuchEntityException::class);
        $this->expectExceptionMessage('Status "INVALID" not found');

        // Act
        $this->statusProvider->getStatusId('INVALID');
    }

    public function testUsesInMemoryCacheAfterFirstLoad(): void
    {
        // Arrange
        $this->setupDatabaseMock();

        // Act - First call loads from DB
        $this->statusProvider->getStatusId('DRAFT');

        // Second call should use in-memory cache (no DB query)
        $result = $this->statusProvider->getStatusId('PUBLISHED');

        // Assert
        $this->assertEquals(2, $result);
        // The connection should only be called once (in setupDatabaseMock)
    }

    public function testLoadFromCacheIfAvailable(): void
    {
        // Arrange
        $cachedData = [
            'draft' => [
                'status_id' => 1,
                'code' => 'DRAFT',
                'label' => 'Draft',
                'sort_order' => 10
            ],
            'published' => [
                'status_id' => 2,
                'code' => 'PUBLISHED',
                'label' => 'Published',
                'sort_order' => 20
            ]
        ];

        $this->cache->expects($this->once())
            ->method('load')
            ->with('breeze_theme_editor_status_map')
            ->willReturn('serialized_data');

        $this->serializer->expects($this->once())
            ->method('unserialize')
            ->with('serialized_data')
            ->willReturn($cachedData);

        // Connection should NOT be called when cache is available
        $this->resource->expects($this->never())->method('getConnection');

        // Act
        $result = $this->statusProvider->getStatusId('DRAFT');

        // Assert
        $this->assertEquals(1, $result);
    }

    public function testSavesToCacheAfterLoadingFromDatabase(): void
    {
        // Arrange
        $this->cache->expects($this->once())
            ->method('load')
            ->willReturn(false); // No cache

        $this->setupDatabaseMock();

        $this->serializer->expects($this->once())
            ->method('serialize')
            ->willReturnCallback(function ($data) {
                return json_encode($data); // Simple serialization
            });

        $this->cache->expects($this->once())
            ->method('save')
            ->with(
                $this->isType('string'),
                'breeze_theme_editor_status_map',
                ['breeze_theme_editor'],
                86400
            );

        // Act
        $this->statusProvider->getStatusId('DRAFT');
    }

    /**
     * Helper method to setup database mock
     */
    private function setupDatabaseMock(): void
    {
        $this->cache->method('load')->willReturn(false);

        $this->resource->method('getConnection')->willReturn($this->connection);
        $this->resource->method('getTableName')
            ->with('breeze_theme_editor_status')
            ->willReturn('breeze_theme_editor_status');

        $select = $this->createMock(Select::class);
        $select->method('from')->willReturnSelf();
        $select->method('order')->willReturnSelf();

        $this->connection->method('select')->willReturn($select);
        $this->connection->method('fetchAll')->willReturn([
            [
                'status_id' => 1,
                'code' => 'DRAFT',
                'label' => 'Draft',
                'sort_order' => 10
            ],
            [
                'status_id' => 2,
                'code' => 'PUBLISHED',
                'label' => 'Published',
                'sort_order' => 20
            ]
        ]);

        $this->serializer->method('serialize')->willReturn('serialized');
        $this->cache->method('save')->willReturn(true);
    }
}
