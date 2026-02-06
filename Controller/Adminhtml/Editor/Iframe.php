<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\Raw;
use Magento\Framework\Controller\Result\RawFactory;

class Iframe extends AbstractEditor implements HttpGetActionInterface
{
    /**
     * @var RawFactory
     */
    private $rawResultFactory;

    /**
     * @param \Magento\Backend\App\Action\Context $context
     * @param \Magento\Framework\View\Result\PageFactory $resultPageFactory
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig
     * @param RawFactory $rawResultFactory
     */
    public function __construct(
        \Magento\Backend\App\Action\Context $context,
        \Magento\Framework\View\Result\PageFactory $resultPageFactory,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig,
        RawFactory $rawResultFactory
    ) {
        parent::__construct($context, $resultPageFactory, $storeManager, $scopeConfig);
        $this->rawResultFactory = $rawResultFactory;
    }

    /**
     * Render frontend page in iframe (pure redirect to frontend)
     *
     * @return Raw
     */
    public function execute()
    {
        $storeId = $this->getStoreId();
        $previewUrl = $this->getRequest()->getParam('url', '/');
        $jstest = $this->isJstestMode();
        
        // Get frontend store URL
        try {
            $store = $this->storeManager->getStore($storeId);
            $frontendUrl = $store->getBaseUrl(\Magento\Framework\UrlInterface::URL_TYPE_WEB);
            
            // Append preview URL path
            if ($previewUrl !== '/') {
                $frontendUrl = rtrim($frontendUrl, '/') . '/' . ltrim($previewUrl, '/');
            }
            
            // Add store parameter to ensure correct store view
            $storeCode = $store->getCode();
            $separator = (strpos($frontendUrl, '?') !== false) ? '&' : '?';
            $frontendUrl .= $separator . '___store=' . $storeCode;
            
            // Add theme preview parameter
            $themeId = $this->getThemeId();
            if ($themeId) {
                $frontendUrl .= '&preview_theme=' . $themeId;
            }
            
            // Add jstest parameter
            if ($jstest) {
                $frontendUrl .= '&jstest=1';
            }
        } catch (\Exception $e) {
            $frontendUrl = '/';
        }
        
        // Simple redirect HTML
        $html = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script>window.location.href = ' . json_encode($frontendUrl) . ';</script>
    <title>Loading Preview...</title>
</head>
<body style="margin:0;padding:20px;font-family:sans-serif;">
    <p>Loading preview... <a href="' . htmlspecialchars($frontendUrl, ENT_QUOTES, 'UTF-8') . '">Click here if not redirected</a></p>
</body>
</html>';
        
        $result = $this->rawResultFactory->create();
        $result->setHeader('Content-Type', 'text/html; charset=utf-8');
        $result->setContents($html);
        
        return $result;
    }
}
