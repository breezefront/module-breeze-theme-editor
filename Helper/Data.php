<?php

namespace Swissup\BreezeThemeEditor\Helper;

use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Store\Model\ScopeInterface;

class Data extends AbstractHelper
{
    const XML_PATH_ENABLED = 'breeze_theme_editor/general/enabled';

    /**
     * @param  int  $store
     * @param  string $key
     * @return boolean
     */
    private function isSetFlag($key, $store = null)
    {
        return $this->scopeConfig->isSetFlag($key, ScopeInterface::SCOPE_STORE, $store);
    }

    /**
     *
     * @param  int  $store
     * @return boolean
     */
    public function isEnabled($store = null)
    {
        return $this->isSetFlag(self::XML_PATH_ENABLED, $store);
    }
}
