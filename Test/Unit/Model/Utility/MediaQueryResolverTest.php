<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\MediaQueryResolver;

/**
 * @covers \Swissup\BreezeThemeEditor\Model\Utility\MediaQueryResolver
 */
class MediaQueryResolverTest extends TestCase
{
    private MediaQueryResolver $resolver;

    protected function setUp(): void
    {
        $this->resolver = new MediaQueryResolver();
    }

    // -----------------------------------------------------------------------
    // Alias resolution
    // -----------------------------------------------------------------------

    public function testMobileAliasResolvesToMaxWidth767(): void
    {
        $this->assertSame('(max-width: 767px)', $this->resolver->resolve('mobile'));
    }

    public function testTabletAliasResolvesToMaxWidth1023(): void
    {
        $this->assertSame('(max-width: 1023px)', $this->resolver->resolve('tablet'));
    }

    public function testDesktopAliasResolvesToMinWidth1024(): void
    {
        $this->assertSame('(min-width: 1024px)', $this->resolver->resolve('desktop'));
    }

    // -----------------------------------------------------------------------
    // Raw query passthrough
    // -----------------------------------------------------------------------

    public function testRawQueryPassedThrough(): void
    {
        $this->assertSame('(max-width: 768px)', $this->resolver->resolve('(max-width: 768px)'));
    }

    public function testRawQueryWithMinWidthPassedThrough(): void
    {
        $this->assertSame('(min-width: 1200px)', $this->resolver->resolve('(min-width: 1200px)'));
    }

    public function testArbitraryRawQueryPassedThrough(): void
    {
        $this->assertSame(
            '(min-width: 640px) and (max-width: 1024px)',
            $this->resolver->resolve('(min-width: 640px) and (max-width: 1024px)')
        );
    }

    // -----------------------------------------------------------------------
    // Null / empty handling
    // -----------------------------------------------------------------------

    public function testNullReturnsNull(): void
    {
        $this->assertNull($this->resolver->resolve(null));
    }

    public function testEmptyStringReturnsNull(): void
    {
        $this->assertNull($this->resolver->resolve(''));
    }

    // -----------------------------------------------------------------------
    // Alias map completeness
    // -----------------------------------------------------------------------

    public function testGetAliasesReturnsAllBuiltinAliases(): void
    {
        $aliases = $this->resolver->getAliases();

        $this->assertArrayHasKey('mobile',  $aliases);
        $this->assertArrayHasKey('tablet',  $aliases);
        $this->assertArrayHasKey('desktop', $aliases);
    }
}
