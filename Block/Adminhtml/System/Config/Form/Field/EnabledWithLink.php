<?php

namespace Swissup\BreezeThemeEditor\Block\Adminhtml\System\Config\Form\Field;

use Magento\Config\Block\System\Config\Form\Field;
use Magento\Framework\Data\Form\Element\AbstractElement;

/**
 * Combined Enable/Disable select with Frontend link
 */
class EnabledWithLink extends Field
{
    /**
     * @var string
     */
    protected $_template = 'Swissup_BreezeThemeEditor::system/config/enabled_with_link.phtml';

    /**
     * @var \Magento\Framework\UrlInterface
     */
    private $urlBuilder;

    /**
     * @var \Magento\Store\Model\StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var \Swissup\BreezeThemeEditor\Model\Utility\TokenManager
     */
    private $tokenManager;

    /**
     * @var \Swissup\BreezeThemeEditor\Helper\Data
     */
    private $helper;

    /**
     * @param \Magento\Backend\Block\Template\Context $context
     * @param \Magento\Framework\UrlInterface $urlBuilder
     * @param \Magento\Store\Model\StoreManagerInterface $storeManager
     * @param \Swissup\BreezeThemeEditor\Model\Utility\TokenManager $tokenManager
     * @param \Swissup\BreezeThemeEditor\Helper\Data $helper
     * @param array $data
     */
    public function __construct(
        \Magento\Backend\Block\Template\Context $context,
        \Magento\Framework\UrlInterface $urlBuilder,
        \Magento\Store\Model\StoreManagerInterface $storeManager,
        \Swissup\BreezeThemeEditor\Model\Utility\TokenManager $tokenManager,
        \Swissup\BreezeThemeEditor\Helper\Data $helper,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->urlBuilder = $urlBuilder;
        $this->storeManager = $storeManager;
        $this->tokenManager = $tokenManager;
        $this->helper = $helper;
    }

    /**
     * Retrieve element HTML markup
     *
     * @param AbstractElement $element
     * @return string
     */
    protected function _getElementHtml(AbstractElement $element)
    {
        $this->setElement($element);
        return $this->_toHtml();
    }

    /**
     * Get select HTML
     *
     * @return string
     */
    public function getSelectHtml()
    {
        $element = $this->getElement();
        return parent::_getElementHtml($element);
    }

    /**
     * Check if currently enabled in config
     *
     * @return bool
     */
    public function isCurrentlyEnabled()
    {
        $storeId = $this->getRequest()->getParam('store');
        return $this->helper->isEnabled($storeId);
    }

    /**
     * Get frontend URL with access token
     *
     * @return string
     */
    public function getFrontendUrl()
    {
        $storeId = $this->getRequest()->getParam('store');

        try {
            $store = $this->storeManager->getStore($storeId);
            $baseUrl = $store->getBaseUrl(\Magento\Framework\UrlInterface::URL_TYPE_WEB);
        } catch (\Exception $e) {
            $baseUrl = $this->urlBuilder->getBaseUrl();
        }

        // Отримати або створити токен з user metadata
        $token = $this->tokenManager->getOrCreateToken();

        $params = [
            $this->tokenManager->getParamName() => $token,
        ];

        return $baseUrl . '?' . http_build_query($params);
    }

    /**
     * Get element HTML ID
     *
     * @return string
     */
    public function getElementHtmlId()
    {
        return $this->getElement()->getHtmlId();
    }
}
