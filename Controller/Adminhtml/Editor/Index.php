<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\ResultInterface;

class Index extends AbstractEditor implements HttpGetActionInterface
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

        // Prevent browser from caching this page (bfcache).
        // Editor state depends on PHP-read cookies (bte_last_store_id etc.) —
        // a stale bfcache snapshot would show the wrong store after history.back().
        $resultPage->getResponse()->setHeader('Cache-Control', 'no-store', true);

        // Pass data to layout
        $storeId = $this->getStoreId();
        $jstest = $this->isJstestMode();
        
        $resultPage->getLayout()->getBlock('breeze.editor.index')
            ->setData('store_id', $storeId)
            ->setData('jstest', $jstest);
        
        return $resultPage;
    }
}
