<?php

namespace Swissup\BreezeThemeEditor\Block\Adminhtml\Editor;

use Magento\Backend\Block\Template;

class Iframe extends Template
{
    /**
     * @var string
     */
    protected $_template = 'Swissup_BreezeThemeEditor::editor/iframe.phtml';

    /**
     * @return string
     */
    public function getFrontendUrl(): string
    {
        return (string) $this->getData('frontend_url');
    }
}
