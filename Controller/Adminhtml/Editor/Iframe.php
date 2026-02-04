<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\Controller\ResultInterface;
use Magento\Framework\View\Result\Page;

class Iframe extends AbstractEditor
{
    /**
     * Render frontend page in iframe (preview only - no toolbar)
     *
     * @return ResultInterface|Page
     */
    public function execute()
    {
        $storeId = $this->getStoreId();
        $themeId = $this->getThemeId();
        $url = $this->getRequest()->getParam('url', '/');
        $jstest = $this->isJstestMode();
        
        // Create page result for iframe content
        $resultPage = $this->resultPageFactory->create();
        
        // Use minimal admin layout (no admin header/sidebar)
        $resultPage->addHandle('breeze_editor_editor_iframe');
        
        // Pass data to layout
        if ($block = $resultPage->getLayout()->getBlock('breeze.editor.iframe')) {
            $block->setData('store_id', $storeId)
                  ->setData('theme_id', $themeId)
                  ->setData('preview_url', $url)
                  ->setData('jstest', $jstest);
        }
        
        return $resultPage;
    }
}
