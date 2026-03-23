<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Plugin\TemplateEngine;

use Magento\Framework\View\Element\BlockInterface;
use Magento\Framework\View\TemplateEngine\Php;
use Swissup\BreezeThemeEditor\View\Helper\BreezeThemeEditor;

/**
 * Injects $breezeThemeEditor into every frontend .phtml template.
 *
 * Using a plugin instead of blockVariables in di.xml avoids the DI compile
 * issue where declaring <argument name="blockVariables"> in a module's di.xml
 * replaces (not merges) the array defined in app/etc/di.xml, wiping out
 * $escaper, $secureRenderer, $localeFormatter, etc.
 */
class PhpPlugin
{
    public function __construct(
        private BreezeThemeEditor $helper
    ) {}

    /**
     * @param Php $subject
     * @param BlockInterface $block
     * @param string $fileName
     * @param array $dictionary
     * @return array
     */
    public function beforeRender(
        Php $subject,
        BlockInterface $block,
        string $fileName,
        array $dictionary = []
    ): array {
        $dictionary['breezeThemeEditor'] = $this->helper;

        return [$block, $fileName, $dictionary];
    }
}
