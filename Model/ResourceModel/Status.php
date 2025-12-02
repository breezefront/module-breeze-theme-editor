<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\ResourceModel;

use Magento\Framework\Model\ResourceModel\Db\AbstractDb;

class Status extends AbstractDb
{
    protected function _construct()
    {
        $this->_init('breeze_theme_editor_status', 'status_id');
    }

    /**
     * Load status by code
     */
    public function loadByCode(\Swissup\BreezeThemeEditor\Model\Status $status, string $code): self
    {
        $connection = $this->getConnection();
        $select = $connection->select()
            ->from($this->getMainTable())
            ->where('code = ?', $code);

        $data = $connection->fetchRow($select);
        if ($data) {
            $status->setData($data);
        }

        return $this;
    }
}
