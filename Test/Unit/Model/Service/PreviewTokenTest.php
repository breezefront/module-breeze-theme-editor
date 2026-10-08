<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use Magento\Framework\App\DeploymentConfig;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Service\PreviewToken;

class PreviewTokenTest extends TestCase
{
    private function create(string $key): PreviewToken
    {
        $config = $this->createMock(DeploymentConfig::class);
        $config->method('get')->with('crypt/key')->willReturn($key);

        return new PreviewToken($config);
    }

    public function testGeneratedTokenIsValid(): void
    {
        $service = $this->create('key-a');

        $this->assertTrue($service->isValid($service->generate(7)));
    }

    public function testTokenExpires(): void
    {
        $service = $this->create('key-a');
        $token = $service->generate(7, 1000);

        $this->assertTrue($service->isValid($token, 1000 + 3600));
        $this->assertFalse($service->isValid($token, 1000 + 5 * 3600));
    }

    public function testTokenSignedWithAnotherKeyIsRejected(): void
    {
        $token = $this->create('key-a')->generate(7);

        $this->assertFalse($this->create('key-b')->isValid($token));
    }

    public function testChangingTheUserIdInvalidatesTheToken(): void
    {
        $service = $this->create('key-a');
        [$expires, , $signature] = explode('.', $service->generate(7));

        $this->assertFalse($service->isValid($expires . '.8.' . $signature));
    }

    public static function malformedProvider(): array
    {
        return [[''], ['abc'], ['1.2'], ['a.b.c'], ['1.2.3.4'], ['-1.2.sig']];
    }

    #[DataProvider('malformedProvider')]
    public function testMalformedTokenIsRejected(string $token): void
    {
        $this->assertFalse($this->create('key-a')->isValid($token));
    }
}
