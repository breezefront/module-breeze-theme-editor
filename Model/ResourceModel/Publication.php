<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel;

use Magento\Framework\Model\ResourceModel\Db\AbstractDb;

class Publication extends AbstractDb
{
    protected function _construct()
    {
        $this->_init('breeze_theme_editor_publication', 'publication_id');
    }
}
