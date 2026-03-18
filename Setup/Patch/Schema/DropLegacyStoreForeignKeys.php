<?php

namespace Swissup\BreezeThemeEditor\Setup\Patch\Schema;

use Magento\Framework\Setup\Patch\SchemaPatchInterface;
use Magento\Framework\Setup\SchemaSetupInterface;

/**
 * Drop legacy foreign keys from store_id -> store.store_id.
 *
 * These FKs were created by an earlier version of the module but were later
 * removed from db_schema.xml because INT UNSIGNED (store_id) is incompatible
 * with SMALLINT UNSIGNED (store.store_id). On instances that still have them
 * in the database, Magento's declarative schema fails with SQLSTATE HY000:3780
 * when trying to MODIFY COLUMN store_id as part of an ALTER TABLE that also
 * adds the `scope` column.
 *
 * This patch drops the FKs if they exist, allowing the ALTER TABLE to proceed.
 */
class DropLegacyStoreForeignKeys implements SchemaPatchInterface
{
    private const FK_VALUE = 'BREEZE_THEME_EDITOR_VALUE_STORE_ID_STORE_STORE_ID';
    private const FK_PUBLICATION = 'BREEZE_THEME_EDITOR_PUBLICATION_STORE_ID_STORE_STORE_ID';

    public function __construct(
        private readonly SchemaSetupInterface $schemaSetup
    ) {
    }

    public function apply(): self
    {
        $this->schemaSetup->startSetup();
        $connection = $this->schemaSetup->getConnection();

        $fksToDrop = [
            'breeze_theme_editor_value'       => self::FK_VALUE,
            'breeze_theme_editor_publication' => self::FK_PUBLICATION,
        ];

        foreach ($fksToDrop as $table => $fkName) {
            $foreignKeys = $connection->getForeignKeys($table);

            if (isset($foreignKeys[strtoupper($fkName)])) {
                $connection->dropForeignKey($table, $fkName);
            }
        }

        $this->schemaSetup->endSetup();

        return $this;
    }

    public static function getDependencies(): array
    {
        return [];
    }

    public function getAliases(): array
    {
        return [];
    }
}
