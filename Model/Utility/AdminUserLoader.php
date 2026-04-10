<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\App\ResourceConnection;

/**
 * Admin User Loader utility
 *
 * Loads admin user data (name, email) by user ID.
 * Implements per-request caching to avoid repeated DB queries.
 */
class AdminUserLoader
{
    /**
     * @var array<int, array{username: string, email: string, firstname: string, lastname: string, fullname: string}|null>
     */
    private array $cache = [];

    public function __construct(
        private ResourceConnection $resourceConnection
    ) {}

    /**
     * Get admin user data by user ID.
     *
     * @param int $userId
     * @return array{username: string, email: string, firstname: string, lastname: string, fullname: string}|null
     */
    public function getUserData(int $userId): ?array
    {
        if (isset($this->cache[$userId])) {
            return $this->cache[$userId];
        }

        $connection = $this->resourceConnection->getConnection();
        $tableName  = $this->resourceConnection->getTableName('admin_user');

        $select = $connection->select()
            ->from($tableName, ['username', 'email', 'firstname', 'lastname'])
            ->where('user_id = ?', $userId)
            ->limit(1);

        $user = $connection->fetchRow($select);

        $this->cache[$userId] = $user ? $this->buildUserData($user) : null;

        return $this->cache[$userId];
    }

    /**
     * Get multiple users data at once (optimised for batch loading).
     *
     * @param int[] $userIds
     * @return array<int, array{username: string, email: string, firstname: string, lastname: string, fullname: string}>
     */
    public function getMultipleUsersData(array $userIds): array
    {
        if (empty($userIds)) {
            return [];
        }

        $uncachedIds = array_diff($userIds, array_keys($this->cache));

        if (!empty($uncachedIds)) {
            $connection = $this->resourceConnection->getConnection();
            $tableName  = $this->resourceConnection->getTableName('admin_user');

            $select = $connection->select()
                ->from($tableName, ['user_id', 'username', 'email', 'firstname', 'lastname'])
                ->where('user_id IN (?)', $uncachedIds);

            foreach ($connection->fetchAll($select) as $user) {
                $this->cache[(int)$user['user_id']] = $this->buildUserData($user);
            }

            // Mark non-existing users as null
            foreach ($uncachedIds as $userId) {
                if (!isset($this->cache[$userId])) {
                    $this->cache[$userId] = null;
                }
            }
        }

        $result = [];
        foreach ($userIds as $userId) {
            if (isset($this->cache[$userId]) && $this->cache[$userId] !== null) {
                $result[$userId] = $this->cache[$userId];
            }
        }

        return $result;
    }

    /**
     * Build a normalised user-data array from a raw DB row.
     *
     * @param array{username: string, email: string, firstname: string, lastname: string} $user
     * @return array{username: string, email: string, firstname: string, lastname: string, fullname: string}
     */
    private function buildUserData(array $user): array
    {
        return [
            'username'  => $user['username']  ?? '',
            'email'     => $user['email']     ?? '',
            'firstname' => $user['firstname'] ?? '',
            'lastname'  => $user['lastname']  ?? '',
            'fullname'  => trim(($user['firstname'] ?? '') . ' ' . ($user['lastname'] ?? '')),
        ];
    }
}
