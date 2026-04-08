<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\App\ResourceConnection;

/**
 * Admin User Loader utility
 * 
 * Loads admin user data (name, email) by user ID
 * Implements caching to avoid repeated DB queries
 */
class AdminUserLoader
{
    /**
     * @var array<int, array{username: string, email: string, firstname: string, lastname: string}>
     */
    private array $cache = [];

    public function __construct(
        private ResourceConnection $resourceConnection
    ) {}

    /**
     * Get admin user data by user ID
     *
     * @param int $userId
     * @return array{username: string, email: string, firstname: string, lastname: string, fullname: string}|null
     */
    public function getUserData(int $userId): ?array
    {
        // Check cache first
        if (isset($this->cache[$userId])) {
            return $this->cache[$userId];
        }

        // Load from database directly
        $connection = $this->resourceConnection->getConnection();
        $tableName = $this->resourceConnection->getTableName('admin_user');
        
        $select = $connection->select()
            ->from($tableName, ['username', 'email', 'firstname', 'lastname'])
            ->where('user_id = ?', $userId)
            ->limit(1);

        $user = $connection->fetchRow($select);

        if (!$user) {
            $this->cache[$userId] = null;
            return null;
        }

        $userData = [
            'username' => $user['username'] ?? '',
            'email' => $user['email'] ?? '',
            'firstname' => $user['firstname'] ?? '',
            'lastname' => $user['lastname'] ?? '',
            'fullname' => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? ''))
        ];

        // Cache the result
        $this->cache[$userId] = $userData;

        return $userData;
    }

    /**
     * Get multiple users data at once (optimized for batch loading)
     *
     * @param int[] $userIds
     * @return array<int, array{username: string, email: string, firstname: string, lastname: string, fullname: string}>
     */
    public function getMultipleUsersData(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }

        // Remove already cached
        $uncachedIds = array_diff($userIds, array_keys($this->cache));

        if (!empty($uncachedIds)) {
            // Load all uncached users in one query
            $connection = $this->resourceConnection->getConnection();
            $tableName = $this->resourceConnection->getTableName('admin_user');
            
            $select = $connection->select()
                ->from($tableName, ['user_id', 'username', 'email', 'firstname', 'lastname'])
                ->where('user_id IN (?)', $uncachedIds);

            $users = $connection->fetchAll($select);

            foreach ($users as $user) {
                $userId = (int)$user['user_id'];
                $this->cache[$userId] = [
                    'username' => $user['username'] ?? '',
                    'email' => $user['email'] ?? '',
                    'firstname' => $user['firstname'] ?? '',
                    'lastname' => $user['lastname'] ?? '',
                    'fullname' => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? ''))
                ];
            }

            // Mark non-existing users as null
            foreach ($uncachedIds as $userId) {
                if (!isset($this->cache[$userId])) {
                    $this->cache[$userId] = null;
                }
            }
        }

        // Return only requested users
        $result = [];
        foreach ($userIds as $userId) {
            if (isset($this->cache[$userId]) && $this->cache[$userId] !== null) {
                $result[$userId] = $this->cache[$userId];
            }
        }

        return $result;
    }

}
