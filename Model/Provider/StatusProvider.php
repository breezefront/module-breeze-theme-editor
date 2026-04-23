<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Provider;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\ResourceConnection;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Serialize\SerializerInterface;

class StatusProvider
{
    private const CACHE_KEY = 'breeze_theme_editor_status_map';
    private const CACHE_TAG = 'breeze_theme_editor';
    private const CACHE_LIFETIME = 86400; // 24 hours

    private ?array $statusMap = null;

    public function __construct(
        private ResourceConnection $resource,
        private CacheInterface $cache,
        private SerializerInterface $serializer
    ) {}

    /**
     * Get status_id by code (DRAFT, PUBLISHED)
     */
    public function getStatusId(string $code): int
    {
        $map = $this->getStatusMap();
        $lowerCode = strtolower($code);

        if (!isset($map[$lowerCode])) {
            throw new NoSuchEntityException(__('Status "%1" not found', $code));
        }

        return (int)$map[$lowerCode]['status_id'];
    }

    /**
     * Get mapping from cache or database
     */
    private function getStatusMap(): array
    {
        if ($this->statusMap !== null) {
            return $this->statusMap;
        }

        // Try from cache
        $cached = $this->cache->load(self::CACHE_KEY);
        if ($cached) {
            $this->statusMap = $this->serializer->unserialize($cached);
            return $this->statusMap;
        }

        // Load from database
        $this->statusMap = $this->loadFromDatabase();

        // Save to cache
        $this->cache->save(
            $this->serializer->serialize($this->statusMap),
            self::CACHE_KEY,
            [self::CACHE_TAG],
            self::CACHE_LIFETIME
        );

        return $this->statusMap;
    }

    /**
     * Load from database
     */
    private function loadFromDatabase(): array
    {
        $connection = $this->resource->getConnection();
        $table = $this->resource->getTableName('breeze_theme_editor_status');

        $select = $connection->select()
            ->from($table, ['status_id', 'code', 'label', 'sort_order'])
            ->order('sort_order ASC');

        $rows = $connection->fetchAll($select);

        $map = [];
        foreach ($rows as $row) {
            $code = strtolower($row['code']);
            $map[$code] = [
                'status_id' => (int)$row['status_id'],
                'code' => $row['code'],
                'label' => $row['label'],
                'sort_order' => (int)$row['sort_order']
            ];
        }

        return $map;
    }
}
