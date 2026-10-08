<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\CssSafety;

class CssSafetyTest extends TestCase
{
    public static function markupProvider(): array
    {
        return [
            'closing style'  => ['1px</style><script>alert(1)</script>', true],
            'opening script' => ['x<script>', true],
            'html comment'   => ['a<!-- b', true],
            'uppercase'      => ['</STYLE>', true],
            'plain value'    => ['1px solid #fff', false],
            'child selector' => ['.a > .b', false],
            'media range'    => ['(width < 600px)', false],
        ];
    }

    #[DataProvider('markupProvider')]
    public function testContainsMarkup(string $value, bool $expected): void
    {
        $this->assertSame($expected, CssSafety::containsMarkup($value));
    }

    public static function declarationProvider(): array
    {
        return [
            'font stack'   => ["'Roboto', sans-serif", true],
            'gradient'     => ['linear-gradient(90deg, #fff 0%, #000 100%)', true],
            'semicolon'    => ['red; background:url(//evil)', false],
            'close rule'   => ['red } body { color: red', false],
            'open rule'    => ['red { x', false],
            'style tag'    => ['red</style>', false],
        ];
    }

    #[DataProvider('declarationProvider')]
    public function testIsSafeDeclarationValue(string $value, bool $expected): void
    {
        $this->assertSame($expected, CssSafety::isSafeDeclarationValue($value));
    }

    public static function variableNameProvider(): array
    {
        return [
            ['--color-brand-primary', true],
            ['--color-x_1', true],
            ['--color-x: red; } </style><script>', false],
            ['--color-x}', false],
            ['color-x', false],
            ['--', false],
        ];
    }

    #[DataProvider('variableNameProvider')]
    public function testIsValidCssVariableName(string $name, bool $expected): void
    {
        $this->assertSame($expected, CssSafety::isValidCssVariableName($name));
    }

    public static function paletteValueProvider(): array
    {
        return [
            ['#1979c3', true],
            ['#fff', true],
            ['25, 121, 195', true],
            ['#fff; } </style>', false],
            ['red', false],
        ];
    }

    #[DataProvider('paletteValueProvider')]
    public function testIsValidPaletteValue(string $value, bool $expected): void
    {
        $this->assertSame($expected, CssSafety::isValidPaletteValue($value));
    }

    public function testNeutralizeMarkupEscapesTagStartsOnly(): void
    {
        $css = CssSafety::neutralizeMarkup('a{b:1}</style><script>x</script> @media (width < 5px){}');

        $this->assertStringNotContainsString('</style>', $css);
        $this->assertStringNotContainsString('<script', $css);
        $this->assertStringContainsString('(width < 5px)', $css);
    }
}
