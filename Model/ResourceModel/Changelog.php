<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel;

use Magento\Framework\Model\ResourceModel\Db\AbstractDb;

class Changelog extends AbstractDb
{
    protected function _construct()
    {
        $this->_init('breeze_theme_editor_changelog', 'change_id');
    }
}
