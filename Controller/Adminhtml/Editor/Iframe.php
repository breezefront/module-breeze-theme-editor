<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Framework\Controller\Result\Raw;
use Magento\Framework\Controller\Result\RawFactory;
use Magento\Framework\Url\DecoderInterface;
use Magento\Framework\UrlInterface;
use Psr\Log\LoggerInterface;

class Iframe extends AbstractEditor implements HttpGetActionInterface
{
    /**
     * @var RawFactory
     */
    private $rawResultFactory;

    /**
     * @var \Magento\Framework\View\Element\BlockFactory
     */
    private $blockFactory;

    /**
     * @var DecoderInterface
     */
    private $urlDecoder;

    /**
     * @param \Magento\Backend\App\Action\Context $context
     * @param \Magento\Framework\View\Result\PageFactory $resultPageFactory
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig
     * @param \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession
     * @param LoggerInterface $logger
     * @param RawFactory $rawResultFactory
     * @param \Magento\Framework\View\Element\BlockFactory $blockFactory
     * @param DecoderInterface $urlDecoder
     */
    public function __construct(
        \Magento\Backend\App\Action\Context $context,
        \Magento\Framework\View\Result\PageFactory $resultPageFactory,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        \Magento\Framework\App\Config\ScopeConfigInterface $scopeConfig,
        \Swissup\BreezeThemeEditor\Model\Session\BackendSession $backendSession,
        LoggerInterface $logger,
        RawFactory $rawResultFactory,
        \Magento\Framework\View\Element\BlockFactory $blockFactory,
        DecoderInterface $urlDecoder
    ) {
        parent::__construct($context, $resultPageFactory, $storeManager, $scopeConfig, $backendSession, $logger);
        $this->rawResultFactory = $rawResultFactory;
        $this->blockFactory     = $blockFactory;
        $this->urlDecoder       = $urlDecoder;
    }

    /**
     * Render frontend page in iframe (pure redirect to frontend)
     *
     * @return Raw
     */
    public function execute()
    {
        $storeId    = $this->getStoreId();
        $rawUrl     = $this->getRequest()->getParam('url', '');
        $previewUrl = $rawUrl ? $this->urlDecoder->decode($rawUrl) : '/';
        $jstest     = $this->isJstestMode();

        $frontendUrl = $this->buildFrontendUrl($storeId, $previewUrl, $jstest);

        /** @var \Swissup\BreezeThemeEditor\Block\Adminhtml\Editor\Iframe $block */
        $block = $this->blockFactory->createBlock(
            \Swissup\BreezeThemeEditor\Block\Adminhtml\Editor\Iframe::class,
            ['data' => ['frontend_url' => $frontendUrl]]
        );

        $result = $this->rawResultFactory->create();
        $result->setHeader('Content-Type', 'text/html; charset=utf-8');
        $result->setContents($block->toHtml());

        return $result;
    }

    /**
     * Build frontend URL for the preview
     *
     * @param int $storeId
     * @param string $previewUrl
     * @param bool $jstest
     * @return string
     */
    private function buildFrontendUrl(int $storeId, string $previewUrl, bool $jstest): string
    {
        try {
            $store = $this->storeManager->getStore($storeId);
            $frontendUrl = $store->getBaseUrl(UrlInterface::URL_TYPE_WEB);

            if ($previewUrl !== '/') {
                $frontendUrl = rtrim($frontendUrl, '/') . '/' . ltrim($previewUrl, '/');
            }

            $separator = (strpos($frontendUrl, '?') !== false) ? '&' : '?';
            $frontendUrl .= $separator . '___store=' . $store->getCode();

            if ($jstest) {
                $frontendUrl .= '&jstest=1';
            }

            $this->logger->info(sprintf(
                '[BTE Iframe] Building URL: store=%d (%s), url=%s',
                $storeId,
                $store->getCode(),
                $frontendUrl
            ));
        } catch (\Exception $e) {
            $this->logger->error('[BTE Iframe] Failed to build URL: ' . $e->getMessage());
            $frontendUrl = '/';
        }

        return $frontendUrl;
    }
}
