<?php

namespace Swissup\BreezeThemeEditor\Setup\Patch\Data;

use Magento\Framework\Setup\Patch\DataPatchInterface;
use Magento\Framework\App\ResourceConnection;

/**
 * Backfill `scope` column with 'stores' for all existing rows.
 *
 * Existing rows were always per-store-view, so 'stores' is the correct default.
 * The DB column already has DEFAULT 'stores', but this patch makes the migration
 * explicit and trackable via patch_list.
 */
class MigrateValueScope implements DataPatchInterface
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

        // Values table: set scope = 'stores' where scope is empty/null (safety net)
        $valueTable = $connection->getTableName('breeze_theme_editor_value');
        $connection->update(
            $valueTable,
            ['scope' => 'stores'],
            ['scope = ?' => '']
        );

        // Publications table: set scope = 'stores' where scope is empty/null (safety net)
        $publicationTable = $connection->getTableName('breeze_theme_editor_publication');
        $connection->update(
            $publicationTable,
            ['scope' => 'stores'],
            ['scope = ?' => '']
        );

        return $this;
    }

    public static function getDependencies()
    {
        return [InitThemeEditorStatus::class];
    }

    public function getAliases()
    {
        return [];
    }
}
