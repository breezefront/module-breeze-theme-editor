<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\App\CacheInterface;
use Magento\Framework\App\ResourceConnection;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Serialize\SerializerInterface;

class StatusProvider
{
    private const CACHE_KEY = 'breeze_theme_editor_status_map';
    private const CACHE_TAG = 'breeze_theme_editor';
    private const CACHE_LIFETIME = 86400; // 24 години

    private ? array $statusMap = null;

    public function __construct(
        private ResourceConnection $resource,
        private CacheInterface $cache,
        private SerializerInterface $serializer
    ) {}

    /**
     * Отримати status_id по code (DRAFT, PUBLISHED)
     */
    public function getStatusId(string $code): int
    {
        $map = $this->getStatusMap();
        $lowerCode = strtolower($code);

        if (! isset($map[$lowerCode])) {
            throw new NoSuchEntityException(__('Status "%1" not found', $code));
        }

        return (int)$map[$lowerCode]['status_id'];
    }

    /**
     * Отримати code по status_id
     */
    public function getStatusCode(int $statusId): string
    {
        $map = $this->getStatusMap();

        foreach ($map as $code => $data) {
            if ((int)$data['status_id'] === $statusId) {
                return strtoupper($code); // Повертаємо у форматі DRAFT, PUBLISHED
            }
        }

        throw new NoSuchEntityException(__('Status ID "%1" not found', $statusId));
    }

    /**
     * Отримати всі статуси
     */
    public function getAllStatuses(): array
    {
        $map = $this->getStatusMap();
        $result = [];

        foreach ($map as $data) {
            $result[] = [
                'code' => strtoupper($data['code']),
                'label' => $data['label'],
                'sortOrder' => $data['sort_order']
            ];
        }

        return $result;
    }

    /**
     * Отримати мапінг з кешу або БД
     */
    private function getStatusMap(): array
    {
        if ($this->statusMap !== null) {
            return $this->statusMap;
        }

        // Спробувати з кешу
        $cached = $this->cache->load(self::CACHE_KEY);
        if ($cached) {
            $this->statusMap = $this->serializer->unserialize($cached);
            return $this->statusMap;
        }

        // Завантажити з БД
        $this->statusMap = $this->loadFromDatabase();

        // Зберегти в кеш
        $this->cache->save(
            $this->serializer->serialize($this->statusMap),
            self::CACHE_KEY,
            [self::CACHE_TAG],
            self::CACHE_LIFETIME
        );

        return $this->statusMap;
    }

    /**
     * Завантажити з БД
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

    /**
     * Очистити кеш
     */
    public function clearCache(): void
    {
        $this->cache->remove(self::CACHE_KEY);
        $this->statusMap = null;
    }
}
