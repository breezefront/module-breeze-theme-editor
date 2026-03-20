<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\SavePaletteValue;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Model\Config\PaletteResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;

class SavePaletteValueTest extends TestCase
{
    private SavePaletteValue $savePaletteValueResolver;
    private ValueRepositoryInterface|MockObject $valueRepositoryMock;
    private PaletteResolver|MockObject $paletteResolverMock;
    private ThemeResolver|MockObject $themeResolverMock;
    private UserResolver|MockObject $userResolverMock;
    private ScopeFactory|MockObject $scopeFactory;
    private ScopeInterface|MockObject $scopeMock;
    private StatusProvider|MockObject $statusProviderMock;
    private Field|MockObject $fieldMock;
    private ContextInterface|MockObject $contextMock;
    private ResolveInfo|MockObject $resolveInfoMock;

    protected function setUp(): void
    {
        $this->valueRepositoryMock = $this->createMock(ValueRepositoryInterface::class);
        $this->paletteResolverMock = $this->createMock(PaletteResolver::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        $this->scopeFactory->method('fromInput')->willReturnCallback(
            fn(array $data) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($data['type'] ?? 'stores', (int)($data['scopeId'] ?? 0))
        );
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->statusProviderMock->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(1);
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->resolveInfoMock = $this->createMock(ResolveInfo::class);

        $this->savePaletteValueResolver = new SavePaletteValue(
            $this->valueRepositoryMock,
            $this->paletteResolverMock,
            $this->themeResolverMock,
            $this->userResolverMock,
            $this->scopeFactory,
            $this->statusProviderMock
        );
    }

    /**
     * Test 1: Successful save with valid HEX color with hash
     */
    public function testSuccessfulSaveWithValidHexColorWithHash(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-brand-primary',
                'value' => '#1979c3'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->expects($this->once())->method('setThemeId')->with(10);
        $valueMock->expects($this->once())->method('setStoreId')->with(1);
        $valueMock->expects($this->once())->method('setStatusId')->with(1);
        $valueMock->expects($this->once())->method('setSectionCode')->with('_palette');
        $valueMock->expects($this->once())->method('setSettingCode')->with('--color-brand-primary');
        $valueMock->expects($this->once())->method('setValue')->with('#1979c3');
        $valueMock->expects($this->once())->method('setUserId')->with(5);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->valueRepositoryMock->expects($this->once())
            ->method('saveMultiple')
            ->with([$valueMock]);

        $this->paletteResolverMock->method('getFieldsUsingColor')
            ->with('--color-brand-primary', 10)
            ->willReturn(['button_bg', 'link_color', 'header_bg']);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals('Palette color saved successfully', (string)$result['message']);
        $this->assertEquals(3, $result['affectedFields']);
    }

    /**
     * Test 2: Successful save with HEX color without hash
     */
    public function testSuccessfulSaveWithHexColorWithoutHash(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-secondary',
                'value' => 'ff5733'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // Should normalize to add hash
        $valueMock->expects($this->once())->method('setValue')->with('#ff5733');
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 3: Successful save with shorthand HEX color
     */
    public function testSuccessfulSaveWithShorthandHexColor(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-accent',
                'value' => '#f5a'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // Shorthand should be expanded: #f5a -> #ff55aa
        $valueMock->expects($this->once())->method('setValue')->with('#ff55aa');
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 4: Successful save with RGB color (legacy format, auto-converted)
     */
    public function testSuccessfulSaveWithRgbColorLegacyFormat(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-legacy',
                'value' => '25, 121, 195'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // RGB should be converted to HEX: "25, 121, 195" -> "#1979c3"
        $valueMock->expects($this->once())->method('setValue')->with('#1979c3');
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn(['field1']);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(1, $result['affectedFields']);
    }

    /**
     * Test 5: Returns error for invalid CSS variable name (missing --color- prefix)
     */
    public function testReturnsErrorForInvalidCssVariableNameMissingPrefix(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--brand-primary', // Missing "--color-" prefix
                'value' => '#1979c3'
            ]
        ];

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Invalid CSS variable name', (string)$result['message']);
        $this->assertEquals(0, $result['affectedFields']);
    }

    /**
     * Test 6: Returns error for invalid CSS variable name (no dashes)
     */
    public function testReturnsErrorForInvalidCssVariableNameNoDashes(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => 'brand-primary',
                'value' => '#1979c3'
            ]
        ];

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Invalid CSS variable name', (string)$result['message']);
        $this->assertEquals(0, $result['affectedFields']);
    }

    /**
     * Test 7: Returns error for invalid color format
     */
    public function testReturnsErrorForInvalidColorFormat(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-invalid',
                'value' => 'not-a-color'
            ]
        ];

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Invalid color format', (string)$result['message']);
        $this->assertEquals(0, $result['affectedFields']);
    }

    /**
     * Test 8: Auto-detects themeId when not provided
     */
    public function testAutoDetectsThemeIdWhenNotProvided(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'cssVar' => '--color-auto',
                'value' => '#123456'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(20);

        $valueMock->expects($this->once())->method('setThemeId')->with(20);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 9: Uses provided themeId when available
     */
    public function testUsesProvidedThemeIdWhenAvailable(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 15,
                'cssVar' => '--color-explicit',
                'value' => '#abcdef'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // ThemeResolver should NOT be called
        $this->themeResolverMock->expects($this->never())
            ->method('getThemeIdByScope');

        $valueMock->expects($this->once())->method('setThemeId')->with(15);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 10: Handles database save exception gracefully
     */
    public function testHandlesDatabaseSaveExceptionGracefully(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-error',
                'value' => '#ff0000'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->valueRepositoryMock->expects($this->once())
            ->method('saveMultiple')
            ->willThrowException(new \Exception('Database connection error'));

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Failed to save palette value', (string)$result['message']);
        $this->assertStringContainsString('Database connection error', (string)$result['message']);
        $this->assertEquals(0, $result['affectedFields']);
    }

    /**
     * Test 11: Returns zero affected fields when color not used anywhere
     */
    public function testReturnsZeroAffectedFieldsWhenColorNotUsedAnywhere(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-unused',
                'value' => '#999999'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');

        $this->paletteResolverMock->method('getFieldsUsingColor')
            ->with('--color-unused', 10)
            ->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(0, $result['affectedFields']);
    }

    /**
     * Test 12: Returns correct count of affected fields
     */
    public function testReturnsCorrectCountOfAffectedFields(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-popular',
                'value' => '#0066cc'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');

        $this->paletteResolverMock->method('getFieldsUsingColor')
            ->with('--color-popular', 10)
            ->willReturn([
                'button_bg',
                'button_border',
                'link_color',
                'icon_color',
                'active_tab_bg',
                'hover_color',
                'focus_outline'
            ]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals(7, $result['affectedFields']);
    }

    /**
     * Test 13: Always saves to section "_palette"
     */
    public function testAlwaysSavesToSectionPalette(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-test',
                'value' => '#000000'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->expects($this->once())->method('setSectionCode')->with('_palette');
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setStatusId')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 14: Always saves with PUBLISHED statusId (resolved via StatusProvider)
     */
    public function testAlwaysSavesWithStatusIdPublished(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'cssVar' => '--color-test',
                'value' => '#ffffff'
            ]
        ];

        $valueMock = $this->createMock(ValueInterface::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $valueMock->expects($this->once())->method('setStatusId')->with(1);
        $valueMock->method('setThemeId')->willReturn($valueMock);
        $valueMock->method('setStoreId')->willReturn($valueMock);
        $valueMock->method('setSectionCode')->willReturn($valueMock);
        $valueMock->method('setSettingCode')->willReturn($valueMock);
        $valueMock->method('setValue')->willReturn($valueMock);
        $valueMock->method('setUserId')->willReturn($valueMock);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->valueRepositoryMock->method('saveMultiple');
        $this->paletteResolverMock->method('getFieldsUsingColor')->willReturn([]);

        $result = $this->savePaletteValueResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }
}
