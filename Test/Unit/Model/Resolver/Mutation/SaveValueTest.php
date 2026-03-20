<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\SaveValue;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

class SaveValueTest extends TestCase
{
    private SaveValue $mutation;
    private ValueRepositoryInterface $valueRepository;
    private ValueService $valueService;
    private StatusProvider $statusProvider;
    private UserResolver $userResolver;
    private ThemeResolver $themeResolver;
    private ConfigProvider $configProvider;
    private ScopeFactory $scopeFactory;
    private ScopeInterface $scopeMock;
    private Field $field;
    private ContextInterface $contextMock;
    private ResolveInfo $resolveInfo;

    protected function setUp(): void
    {
        $this->valueRepository = $this->createMock(ValueRepositoryInterface::class);
        $this->valueService = $this->createMock(ValueService::class);
        $this->statusProvider = $this->createMock(StatusProvider::class);
        $this->userResolver = $this->createMock(UserResolver::class);
        $this->themeResolver = $this->createMock(ThemeResolver::class);
        $this->configProvider = $this->createMock(ConfigProvider::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        $this->scopeFactory->method('fromInput')->willReturnCallback(
            fn(array $data) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($data['type'] ?? 'stores', (int)($data['scopeId'] ?? 0))
        );
        $this->field = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->resolveInfo = $this->createMock(ResolveInfo::class);

        $this->mutation = new SaveValue(
            $this->valueRepository,
            $this->valueService,
            $this->statusProvider,
            $this->userResolver,
            $this->themeResolver,
            $this->configProvider,
            $this->scopeFactory
        );
    }

    public function testSuccessfullySavesDraftValueWithAllParameters(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'DRAFT',
            'sectionCode' => 'header',
            'fieldCode' => 'bg_color',
            'value' => '#ff0000'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(42);
        $this->statusProvider->method('getStatusId')->with('DRAFT')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->expects($this->once())->method('setThemeId')->with(5)->willReturnSelf();
        $valueMock->expects($this->once())->method('setStoreId')->with(1)->willReturnSelf();
        $valueMock->expects($this->once())->method('setStatusId')->with(1)->willReturnSelf();
        $valueMock->expects($this->once())->method('setSectionCode')->with('header')->willReturnSelf();
        $valueMock->expects($this->once())->method('setSettingCode')->with('bg_color')->willReturnSelf();
        $valueMock->expects($this->once())->method('setValue')->with('#ff0000')->willReturnSelf();
        $valueMock->expects($this->once())->method('setUserId')->with(42)->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->valueRepository->expects($this->once())->method('save')->with($valueMock);

        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([
            'header.bg_color' => '#000000'
        ]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['success']);
        $this->assertEquals('Value saved successfully', (string)$result['message']);
        $this->assertEquals('header', $result['value']['sectionCode']);
        $this->assertEquals('bg_color', $result['value']['fieldCode']);
        $this->assertEquals('#ff0000', $result['value']['value']);
        $this->assertTrue($result['value']['isModified']);
        $this->assertNotEmpty($result['value']['updatedAt']);
    }

    public function testSuccessfullySavesPublishedValueWithUserId(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'PUBLISHED',
            'sectionCode' => 'footer',
            'fieldCode' => 'text_color',
            'value' => '#ffffff'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(100);
        $this->statusProvider->method('getStatusId')->with('PUBLISHED')->willReturn(2);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->expects($this->once())->method('setStatusId')->with(2)->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->expects($this->once())->method('setUserId')->with(100)->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->valueRepository->expects($this->once())->method('save')->with($valueMock);

        $this->configProvider->method('getAllDefaults')->willReturn([]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['success']);
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 2],
            'status' => 'DRAFT',
            'sectionCode' => 'colors',
            'fieldCode' => 'primary',
            'value' => '#123456'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);
        $this->themeResolver->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(10);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['success']);
    }

    public function testDefaultsToDefaultStatusWhenNotProvided(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'sectionCode' => 'layout',
            'fieldCode' => 'width',
            'value' => '1200px'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->expects($this->once())
            ->method('getStatusId')
            ->with('DRAFT')
            ->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['success']);
    }

    public function testIsModifiedTrueWhenValueDiffersFromDefault(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'DRAFT',
            'sectionCode' => 'typography',
            'fieldCode' => 'font_size',
            'value' => '18px'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([
            'typography.font_size' => '16px'
        ]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['value']['isModified']);
    }

    public function testIsModifiedFalseWhenValueMatchesDefault(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'DRAFT',
            'sectionCode' => 'spacing',
            'fieldCode' => 'margin',
            'value' => '20px'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([
            'spacing.margin' => '20px'
        ]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertFalse($result['value']['isModified']);
    }

    public function testIsModifiedTrueWhenNoDefaultExists(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'DRAFT',
            'sectionCode' => 'custom',
            'fieldCode' => 'new_field',
            'value' => 'custom_value'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->with(5)->willReturn([]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertTrue($result['value']['isModified']);
    }

    public function testReturnsFormattedResponseWithAllFields(): void
    {
        // Arrange
        $input = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'themeId' => 5,
            'status' => 'DRAFT',
            'sectionCode' => 'buttons',
            'fieldCode' => 'border_radius',
            'value' => '8px'
        ];

        $this->userResolver->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->statusProvider->method('getStatusId')->willReturn(1);

        $valueMock = $this->createMock(ValueInterface::class);
        $valueMock->method('setThemeId')->willReturnSelf();
        $valueMock->method('setStoreId')->willReturnSelf();
        $valueMock->method('setStatusId')->willReturnSelf();
        $valueMock->method('setSectionCode')->willReturnSelf();
        $valueMock->method('setSettingCode')->willReturnSelf();
        $valueMock->method('setValue')->willReturnSelf();
        $valueMock->method('setUserId')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($valueMock);
        $this->configProvider->method('getAllDefaults')->willReturn([]);

        // Act
        $result = $this->mutation->resolve($this->field, $this->contextMock, $this->resolveInfo, null, ['input' => $input]);

        // Assert
        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
        $this->assertArrayHasKey('value', $result);
        $this->assertArrayHasKey('sectionCode', $result['value']);
        $this->assertArrayHasKey('fieldCode', $result['value']);
        $this->assertArrayHasKey('value', $result['value']);
        $this->assertArrayHasKey('isModified', $result['value']);
        $this->assertArrayHasKey('updatedAt', $result['value']);
        $this->assertEquals('buttons', $result['value']['sectionCode']);
        $this->assertEquals('border_radius', $result['value']['fieldCode']);
        $this->assertEquals('8px', $result['value']['value']);
    }
}
