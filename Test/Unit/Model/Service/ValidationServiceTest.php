<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;

class ValidationServiceTest extends TestCase
{
    private ValidationService $service;
    private ConfigProvider|MockObject $configProvider;

    protected function setUp(): void
    {
        $this->configProvider = $this->createMock(ConfigProvider::class);
        $this->service = new ValidationService($this->configProvider);
    }

    // =========================================================================
    // validateValue — field lookup
    // =========================================================================

    public function testReturnsErrorWhenFieldNotFound(): void
    {
        $this->configProvider
            ->method('getField')
            ->with(1, 'colors', 'primary')
            ->willReturn(null);

        $result = $this->service->validateValue(1, 'colors', 'primary', '#FF0000');

        $this->assertSame('Field colors.primary not found in configuration', $result);
    }

    // =========================================================================
    // validateValue — required
    // =========================================================================

    public function testReturnsErrorWhenRequiredFieldIsEmpty(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'text', 'required' => true]);

        $result = $this->service->validateValue(1, 'general', 'title', '');

        $this->assertSame('Field title is required', $result);
    }

    public function testPassesWhenRequiredFieldHasValue(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'text', 'required' => true]);

        $result = $this->service->validateValue(1, 'general', 'title', 'My Store');

        $this->assertNull($result);
    }

    // =========================================================================
    // validateValue — color
    // =========================================================================

    public function testValidHexColorReturnsNull(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'color']);

        $this->assertNull($this->service->validateValue(1, 'colors', 'bg', '#FF0000'));
        $this->assertNull($this->service->validateValue(1, 'colors', 'bg', '#abcdef'));
    }

    public function testInvalidColorNameReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'color']);

        $result = $this->service->validateValue(1, 'colors', 'bg', 'red');

        $this->assertNotNull($result);
        $this->assertStringContainsString('HEX', $result);
    }

    public function testShortHexColorReturnsError(): void
    {
        // Only 6-char HEX is accepted — #FFF (3-char) is invalid
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'color']);

        $result = $this->service->validateValue(1, 'colors', 'bg', '#FFF');

        $this->assertNotNull($result);
    }

    // =========================================================================
    // validateValue — number / range
    // =========================================================================

    public function testNonNumericValueReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'number']);

        $result = $this->service->validateValue(1, 'layout', 'columns', 'abc');

        $this->assertSame('Value must be a number', $result);
    }

    public function testNumberBelowMinReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'range', 'min' => 5]);

        $result = $this->service->validateValue(1, 'layout', 'columns', '3');

        $this->assertSame('Value must be at least 5', $result);
    }

    public function testNumberAboveMaxReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'number', 'max' => 100]);

        $result = $this->service->validateValue(1, 'layout', 'opacity', '150');

        $this->assertSame('Value must not exceed 100', $result);
    }

    public function testValidNumberInRangeReturnsNull(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'range', 'min' => 0, 'max' => 100]);

        $result = $this->service->validateValue(1, 'layout', 'opacity', '50');

        $this->assertNull($result);
    }

    // =========================================================================
    // validateValue — text / textarea
    // =========================================================================

    public function testTextBelowMinLengthReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'text', 'minLength' => 5]);

        $result = $this->service->validateValue(1, 'seo', 'title', 'Hi');

        $this->assertSame('Text must be at least 5 characters', $result);
    }

    public function testTextAboveMaxLengthReturnsError(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'textarea', 'maxLength' => 10]);

        $result = $this->service->validateValue(1, 'seo', 'description', 'This is way too long');

        $this->assertSame('Text must not exceed 10 characters', $result);
    }

    public function testTextPatternMismatchReturnsCustomMessage(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn([
                'type'              => 'text',
                'pattern'           => '/^\d+$/',
                'validationMessage' => 'Only digits are allowed',
            ]);

        $result = $this->service->validateValue(1, 'general', 'zip', 'abc');

        $this->assertSame('Only digits are allowed', $result);
    }

    public function testTextPatternMismatchReturnsDefaultMessageWhenNoCustomMessage(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn([
                'type'    => 'text',
                'pattern' => '/^\d+$/',
            ]);

        $result = $this->service->validateValue(1, 'general', 'zip', 'abc');

        $this->assertSame('Invalid format', $result);
    }

    public function testUnknownTypeReturnsNull(): void
    {
        // Types not in the switch (e.g. 'select') fall through to return null
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'select']);

        $result = $this->service->validateValue(1, 'general', 'theme', 'option_a');

        $this->assertNull($result);
    }

    // =========================================================================
    // validateValues — batch iteration
    // =========================================================================

    public function testReturnsEmptyArrayWhenAllValuesAreValid(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturn(['type' => 'text']);

        $result = $this->service->validateValues(1, [
            ['sectionCode' => 'general', 'fieldCode' => 'title', 'value' => 'Hello'],
            ['sectionCode' => 'general', 'fieldCode' => 'slug',  'value' => 'hello'],
        ]);

        $this->assertSame([], $result);
    }

    public function testCollectsOnlyInvalidValues(): void
    {
        $this->configProvider
            ->method('getField')
            ->willReturnCallback(function (int $themeId, string $section, string $field) {
                if ($field === 'primary_color') {
                    return ['type' => 'color'];
                }
                return ['type' => 'text'];
            });

        $result = $this->service->validateValues(1, [
            ['sectionCode' => 'colors',  'fieldCode' => 'primary_color', 'value' => 'not-a-hex'],
            ['sectionCode' => 'general', 'fieldCode' => 'title',         'value' => 'Valid Title'],
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('primary_color', $result[0]['fieldCode']);
        $this->assertArrayHasKey('message', $result[0]);
    }
}
