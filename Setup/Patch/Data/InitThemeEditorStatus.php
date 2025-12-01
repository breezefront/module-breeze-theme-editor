<?php

namespace Swissup\BreezeThemeEditor\Setup\Patch\Data;

use Magento\Framework\Setup\Patch\DataPatchInterface;
use Magento\Framework\App\ResourceConnection;

class InitThemeEditorStatus implements DataPatchInterface
{
    /** @var ResourceConnection */
    private $resource;

    public function __construct(ResourceConnection $resource)
    {
        $this->resource = $resource;
    }

    public function apply()
    {
        $connection = $this->resource->getConnection();
        $table = $connection->getTableName('breeze_theme_editor_status');

        $statuses = [
            ['code' => 'draft', 'label' => 'Draft', 'sort_order' => 10],
            ['code' => 'published', 'label' => 'Published', 'sort_order' => 20],
        ];

        foreach ($statuses as $status) {
            $select = $connection->select()
                ->from($table, ['status_id'])
                ->where('code = ?', $status['code']);
            $result = $connection->fetchOne($select);

            if (!$result) {
                $connection->insert($table, $status);
            }
        }
    }

    public static function getDependencies()
    {
        return [];
    }

    public function getAliases()
    {
        return [];
    }
}
