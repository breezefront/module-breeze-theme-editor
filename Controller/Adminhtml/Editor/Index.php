<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\Controller\ResultInterface;

class Index extends AbstractEditor
{
    /**
     * Editor index page - main admin interface
     *
     * @return ResultInterface
     */
    public function execute()
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->getConfig()->getTitle()->prepend(__('Theme Editor'));
        
        // Pass data to layout
        $storeId = $this->getStoreId();
        $themeId = $this->getThemeId();
        $jstest = $this->isJstestMode();
        
        $resultPage->getLayout()->getBlock('breeze.editor.index')
            ->setData('store_id', $storeId)
            ->setData('theme_id', $themeId)
            ->setData('jstest', $jstest);
        
        return $resultPage;
    }
}
