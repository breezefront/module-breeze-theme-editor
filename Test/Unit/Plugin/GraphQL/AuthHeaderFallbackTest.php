<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Plugin\GraphQL;

use Laminas\Http\Headers;
use Magento\Framework\App\Request\Http as HttpRequest;
use Magento\Framework\App\RequestInterface;
use Magento\Webapi\Model\Authorization\TokenUserContext;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Helper\Data as ConfigHelper;
use Swissup\BreezeThemeEditor\Plugin\GraphQL\AuthHeaderFallback;

/**
 * @see \Swissup\BreezeThemeEditor\Plugin\GraphQL\AuthHeaderFallback
 */
class AuthHeaderFallbackTest extends TestCase
{
    private const CUSTOM_HEADER = 'X-Bte-Authorization';
    private const TOKEN         = 'Bearer eyJraWQiOiIxIiwiYWxnIjoiSFMyNTYifQ.payload.signature';

    private const BASIC_CREDENTIALS = 'Basic YmFzaWN1c2VyOmJhc2ljcGFzcw==';

    private ConfigHelper|MockObject $configHelper;
    private HttpRequest|MockObject $request;
    private Headers|MockObject $headers;
    private TokenUserContext|MockObject $subject;

    protected function setUp(): void
    {
        $this->configHelper = $this->createMock(ConfigHelper::class);
        $this->headers      = $this->createMock(Headers::class);
        $this->request      = $this->createMock(HttpRequest::class);
        $this->subject      = $this->createMock(TokenUserContext::class);

        $this->request->method('getHeaders')->willReturn($this->headers);
    }

    private function createPlugin(?RequestInterface $request = null): AuthHeaderFallback
    {
        return new AuthHeaderFallback($request ?? $this->request, $this->configHelper);
    }

    public function testCopiesBearerTokenFromCustomHeader(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, false],
            [self::CUSTOM_HEADER, false, self::TOKEN],
        ]);

        $this->headers->expects($this->once())
            ->method('addHeaderLine')
            ->with('Authorization', self::TOKEN);

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    public function testGetUserTypeAlsoCopiesTheToken(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, false],
            [self::CUSTOM_HEADER, false, self::TOKEN],
        ]);

        $this->headers->expects($this->once())
            ->method('addHeaderLine')
            ->with('Authorization', self::TOKEN);

        $this->createPlugin()->beforeGetUserType($this->subject);
    }

    public function testDoesNothingWhenDefaultHeaderIsConfigured(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(false);

        $this->request->expects($this->never())->method('getHeader');
        $this->headers->expects($this->never())->method('addHeaderLine');

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    public function testDoesNotOverwriteAnExistingBearerToken(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, 'Bearer already-there'],
            [self::CUSTOM_HEADER, false, self::TOKEN],
        ]);

        $this->headers->expects($this->never())->method('addHeaderLine');

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    /**
     * The real Basic Auth case: the web server authenticates the browser's
     * credentials and still forwards `Authorization: Basic ...` to PHP. Leaving
     * it in place would make TokenUserContext read Basic credentials and treat
     * the admin as a guest, which is exactly the bug this plugin exists for.
     */
    public function testReplacesForwardedBasicCredentials(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, self::BASIC_CREDENTIALS],
            [self::CUSTOM_HEADER, false, self::TOKEN],
        ]);

        $basicHeader = $this->createMock(\Laminas\Http\Header\HeaderInterface::class);

        $this->headers->method('has')
            ->with('Authorization')
            ->willReturnOnConsecutiveCalls(true, false);
        $this->headers->method('get')
            ->with('Authorization')
            ->willReturn($basicHeader);

        $this->headers->expects($this->once())
            ->method('removeHeader')
            ->with($basicHeader);
        $this->headers->expects($this->once())
            ->method('addHeaderLine')
            ->with('Authorization', self::TOKEN);

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    public function testKeepsBasicCredentialsWhenTheCustomHeaderIsEmpty(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, self::BASIC_CREDENTIALS],
            [self::CUSTOM_HEADER, false, false],
        ]);

        $this->headers->expects($this->never())->method('removeHeader');
        $this->headers->expects($this->never())->method('addHeaderLine');

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    /**
     * @param mixed $customValue
     * @dataProvider nonBearerValueDataProvider
     */
    public function testIgnoresNonBearerValues($customValue): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, false],
            [self::CUSTOM_HEADER, false, $customValue],
        ]);

        $this->headers->expects($this->never())->method('addHeaderLine');

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    /**
     * @return array<string, array{0: mixed}>
     */
    public static function nonBearerValueDataProvider(): array
    {
        return [
            'header absent'   => [false],
            'empty string'    => [''],
            'basic auth'      => ['Basic dXNlcjpwYXNz'],
            'bare token'      => ['eyJraWQiOiIxIn0.payload.signature'],
        ];
    }

    public function testAcceptsBearerRegardlessOfCase(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $this->request->method('getHeader')->willReturnMap([
            ['Authorization', false, false],
            [self::CUSTOM_HEADER, false, 'bearer some-token'],
        ]);

        $this->headers->expects($this->once())
            ->method('addHeaderLine')
            ->with('Authorization', 'bearer some-token');

        $this->createPlugin()->beforeGetUserId($this->subject);
    }

    public function testSkipsRequestsThatAreNotHttpRequests(): void
    {
        $this->configHelper->method('isCustomAuthHeader')->willReturn(true);
        $this->configHelper->method('getAuthHeaderName')->willReturn(self::CUSTOM_HEADER);

        $request = $this->createMock(RequestInterface::class);

        $this->headers->expects($this->never())->method('addHeaderLine');

        $this->createPlugin($request)->beforeGetUserId($this->subject);
    }
}
