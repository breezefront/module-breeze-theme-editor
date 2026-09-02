<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Helper;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\App\Helper\Context;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Helper\Data;

/**
 * @see \Swissup\BreezeThemeEditor\Helper\Data
 */
class DataTest extends TestCase
{
    private Data $helper;
    private ScopeConfigInterface|MockObject $scopeConfig;

    protected function setUp(): void
    {
        $this->scopeConfig = $this->createMock(ScopeConfigInterface::class);

        $context = $this->createMock(Context::class);
        $context->method('getScopeConfig')->willReturn($this->scopeConfig);

        $this->helper = new Data($context);
    }

    /**
     * @param mixed $configValue
     * @param string $expected
     * @dataProvider authHeaderDataProvider
     */
    public function testGetAuthHeaderName($configValue, string $expected): void
    {
        $this->scopeConfig->method('getValue')->willReturn($configValue);

        $this->assertSame($expected, $this->helper->getAuthHeaderName());
    }

    /**
     * @return array<string, array{0: mixed, 1: string}>
     */
    public static function authHeaderDataProvider(): array
    {
        return [
            'default value'        => ['Authorization', 'Authorization'],
            'custom header'        => ['X-Bte-Authorization', 'X-Bte-Authorization'],
            'surrounding spaces'   => ['  X-Bte-Authorization  ', 'X-Bte-Authorization'],
            'empty string'         => ['', 'Authorization'],
            'null'                 => [null, 'Authorization'],
            'space inside'         => ['X Bte Auth', 'Authorization'],
            'colon injection'      => ["X-Bte:evil", 'Authorization'],
            'crlf injection'       => ["X-Bte\r\nEvil: 1", 'Authorization'],
            'underscore rejected'  => ['X_Bte_Authorization', 'Authorization'],

            // Names the client sets itself — the token would overwrite their value
            'client content type'  => ['Content-Type', 'Authorization'],
            'client requested with' => ['X-Requested-With', 'Authorization'],
            'client store header'  => ['Store', 'Authorization'],
            'reserved any case'    => ['CONTENT-TYPE', 'Authorization'],

            // Names browsers refuse to let scripts set
            'forbidden cookie'     => ['Cookie', 'Authorization'],
            'forbidden host'       => ['Host', 'Authorization'],
            'forbidden origin'     => ['Origin', 'Authorization'],
            'forbidden referer'    => ['Referer', 'Authorization'],
            'forbidden proxy prefix' => ['Proxy-Whatever', 'Authorization'],
            'forbidden sec prefix' => ['Sec-Whatever', 'Authorization'],
        ];
    }

    /**
     * @param mixed $configValue
     * @param bool $expected
     * @dataProvider isCustomAuthHeaderDataProvider
     */
    public function testIsCustomAuthHeader($configValue, bool $expected): void
    {
        $this->scopeConfig->method('getValue')->willReturn($configValue);

        $this->assertSame($expected, $this->helper->isCustomAuthHeader());
    }

    /**
     * @return array<string, array{0: mixed, 1: bool}>
     */
    public static function isCustomAuthHeaderDataProvider(): array
    {
        return [
            'default'          => ['Authorization', false],
            'default any case' => ['AUTHORIZATION', false],
            'empty falls back' => ['', false],
            'invalid falls back' => ['X Bte', false],
            'reserved falls back' => ['Content-Type', false],
            'forbidden falls back' => ['Cookie', false],
            'custom'           => ['X-Bte-Authorization', true],
        ];
    }
}
