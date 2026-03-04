<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Resolver\FieldParamsTypeResolver;

/**
 * Tests for FieldParamsTypeResolver::resolveType()
 *
 * Verifies that every registered field type maps to the correct GraphQL
 * concrete type name, and that unknown types throw a LogicException.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\FieldParamsTypeResolver::resolveType
 */
class FieldParamsTypeResolverTest extends TestCase
{
    private FieldParamsTypeResolver $resolver;

    protected function setUp(): void
    {
        $this->resolver = new FieldParamsTypeResolver();
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorNumericParams
    // -------------------------------------------------------------------------

    /**
     * @dataProvider numericTypeProvider
     */
    public function testNumericFieldTypesResolveToNumericParams(string $fieldType): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => $fieldType]);
        $this->assertEquals('BreezeThemeEditorNumericParams', $result);
    }

    public static function numericTypeProvider(): array
    {
        return [
            'range'   => ['range'],
            'number'  => ['number'],
            'spacing' => ['spacing'],
        ];
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSelectParams
    // -------------------------------------------------------------------------

    /**
     * @dataProvider selectTypeProvider
     */
    public function testSelectFieldTypesResolveToSelectParams(string $fieldType): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => $fieldType]);
        $this->assertEquals('BreezeThemeEditorSelectParams', $result);
    }

    public static function selectTypeProvider(): array
    {
        return [
            'select'          => ['select'],
            'icon_set_picker' => ['icon_set_picker'],
        ];
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorFontPickerParams
    // -------------------------------------------------------------------------

    public function testFontPickerResolvesToFontPickerParams(): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => 'font_picker']);
        $this->assertEquals('BreezeThemeEditorFontPickerParams', $result);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorSocialLinksParams
    // -------------------------------------------------------------------------

    public function testSocialLinksResolvesToSocialLinksParams(): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => 'social_links']);
        $this->assertEquals('BreezeThemeEditorSocialLinksParams', $result);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorImageUploadParams
    // -------------------------------------------------------------------------

    public function testImageUploadResolvesToImageUploadParams(): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => 'image_upload']);
        $this->assertEquals('BreezeThemeEditorImageUploadParams', $result);
    }

    // -------------------------------------------------------------------------
    // BreezeThemeEditorCodeParams
    // -------------------------------------------------------------------------

    public function testCodeResolvesToCodeParams(): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => 'code']);
        $this->assertEquals('BreezeThemeEditorCodeParams', $result);
    }

    // -------------------------------------------------------------------------
    // Case sensitivity
    // -------------------------------------------------------------------------

    public function testFieldTypeIsCaseInsensitive(): void
    {
        // resolveType() calls strtolower() internally
        $result = $this->resolver->resolveType(['_fieldType' => 'RANGE']);
        $this->assertEquals('BreezeThemeEditorNumericParams', $result);
    }

    public function testMixedCaseIsNormalized(): void
    {
        $result = $this->resolver->resolveType(['_fieldType' => 'Font_Picker']);
        $this->assertEquals('BreezeThemeEditorFontPickerParams', $result);
    }

    // -------------------------------------------------------------------------
    // Unknown type throws
    // -------------------------------------------------------------------------

    public function testUnknownFieldTypeThrowsLogicException(): void
    {
        $this->expectException(\LogicException::class);
        $this->expectExceptionMessageMatches('/color/');

        $this->resolver->resolveType(['_fieldType' => 'color']);
    }

    public function testMissingFieldTypeKeyThrowsLogicException(): void
    {
        $this->expectException(\LogicException::class);

        // Empty string is not a registered type
        $this->resolver->resolveType([]);
    }

    public function testCompletelyUnknownTypeThrowsLogicException(): void
    {
        $this->expectException(\LogicException::class);
        $this->expectExceptionMessageMatches('/nonexistent/');

        $this->resolver->resolveType(['_fieldType' => 'nonexistent']);
    }
}
