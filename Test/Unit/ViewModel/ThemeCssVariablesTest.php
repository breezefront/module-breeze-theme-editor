<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel;

use Magento\Framework\App\RequestInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Helper\Data as HelperData;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Service\CssGenerator;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\ViewModel\ThemeCssVariables;

class ThemeCssVariablesTest extends TestCase
{
    public function testErrorDetailsAreLoggedNotPrintedIntoThePublicPage(): void
    {
        $helper = $this->createMock(HelperData::class);
        $helper->method('isEnabled')->willReturn(true);

        $storeManager = $this->createMock(StoreManagerInterface::class);
        $storeManager->method('getStore')
            ->willThrowException(new \RuntimeException('SQLSTATE[HY000] secret-host */ </style><script>'));

        $logger = $this->createMock(LoggerInterface::class);
        $logger->expects($this->once())->method('error')->with($this->stringContains('secret-host'));

        $viewModel = new ThemeCssVariables(
            $this->createMock(CssGenerator::class),
            $this->createMock(ThemeResolver::class),
            $storeManager,
            $this->createMock(RequestInterface::class),
            $helper,
            $this->createMock(ScopeFactory::class),
            $logger
        );

        $css = $viewModel->getInlineCssContent();

        $this->assertStringNotContainsString('secret-host', $css);
        $this->assertStringNotContainsString('<script>', $css);
    }
}
