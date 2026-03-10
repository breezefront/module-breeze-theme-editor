<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Query;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\Query\Values;

/**
 * Unit tests for Values GraphQL resolver
 * 
 * Tests PUBLICATION status validation and values loading logic
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Query\Values
 */
class ValuesTest extends TestCase
{
    private Values $values;
    private ValueInheritanceResolver $valueInheritanceResolverMock;
    private StatusProvider $statusProviderMock;
    private ConfigProvider $configProviderMock;
    private UserResolver $userResolverMock;
    private ThemeResolver $themeResolverMock;
    
    private Field $fieldMock;
    private ContextInterface $contextMock;
    private ResolveInfo $infoMock;
    
    protected function setUp(): void
    {
        // Create all dependency mocks
        $this->valueInheritanceResolverMock = $this->createMock(ValueInheritanceResolver::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        
        // Create GraphQL mocks
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->infoMock = $this->createMock(ResolveInfo::class);
        
        // Instantiate Values resolver
        $this->values = new Values(
            $this->valueInheritanceResolverMock,
            $this->statusProviderMock,
            $this->configProviderMock,
            $this->userResolverMock,
            $this->themeResolverMock
        );
    }
    
    /**
     * Test 1: Should throw exception when status is PUBLICATION
     * 
     * SCENARIO: User passes status: 'PUBLICATION' to breezeThemeEditorValues
     * EXPECTED: GraphQlInputException with clear message
     * REASON: Values query doesn't support PUBLICATION (use ConfigFromPublication instead)
     */
    public function testThrowsExceptionWhenStatusIsPublication(): void
    {
        $args = [
            'storeId' => 1,
            'status' => 'PUBLICATION'
        ];
        
        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage(
            'PUBLICATION status is not supported. Use breezeThemeEditorConfigFromPublication query to load historical values.'
        );
        
        $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }
    
    /**
     * Test 2: Should load values for DRAFT status with userId
     * 
     * SCENARIO: Authenticated user loads DRAFT values
     * EXPECTED: Values returned with userId passed to ValueInheritanceResolver
     */
    public function testLoadsValuesForDraftStatus(): void
    {
        // Setup mocks
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        
        $mockValues = [
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#ff0000',
                'updated_at' => '2026-01-01 12:00:00'
            ]
        ];
        
        $this->valueInheritanceResolverMock->method('resolveAllValuesWithFallback')
            ->willReturn($mockValues);
        
        $mockDefaults = ['colors.primary' => '#0000ff']; // different from value
        $this->configProviderMock->method('getAllDefaults')->willReturn($mockDefaults);
        
        // Execute
        $args = ['storeId' => 1, 'status' => 'DRAFT'];
        $result = $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        // Assert
        $this->assertCount(1, $result);
        $this->assertEquals('colors', $result[0]['sectionCode']);
        $this->assertEquals('primary', $result[0]['fieldCode']);
        $this->assertEquals('#ff0000', $result[0]['value']);
        $this->assertTrue($result[0]['isModified']); // different from default
        $this->assertEquals('2026-01-01 12:00:00', $result[0]['updatedAt']);
    }
    
    /**
     * Test 3: Should load values for PUBLISHED status without userId
     * 
     * SCENARIO: Load PUBLISHED values
     * EXPECTED: Values returned with userId = null
     */
    public function testLoadsValuesForPublishedStatus(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->expects($this->once())
            ->method('getStatusId')
            ->with('PUBLISHED')
            ->willReturn(2);
        
        $this->valueInheritanceResolverMock->expects($this->once())
            ->method('resolveAllValues')
            ->with(1, 'stores', 1, 2, null) // userId = null for PUBLISHED
            ->willReturn([]);
        
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        
        $args = ['storeId' => 1, 'status' => 'PUBLISHED'];
        $result = $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertIsArray($result);
    }
    
    /**
     * Test 4: Should throw authorization exception for DRAFT without userId
     * 
     * SCENARIO: Unauthenticated user tries to load DRAFT values
     * EXPECTED: GraphQlAuthorizationException
     */
    public function testThrowsAuthorizationExceptionForDraftWithoutUserId(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->willThrowException(new GraphQlAuthorizationException(__('Access token required')));
        
        $args = ['storeId' => 1, 'status' => 'DRAFT'];
        
        $this->expectException(GraphQlAuthorizationException::class);
        $this->expectExceptionMessage('Access token required');
        
        $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }
    
    /**
     * Test 5: Should filter values by sectionCodes
     * 
     * SCENARIO: User requests only specific sections
     * EXPECTED: Only values from requested sections returned
     */
    public function testFiltersValuesBySectionCodes(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        
        $mockValues = [
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#ff0000',
                'updated_at' => null
            ],
            [
                'section_code' => 'typography',
                'setting_code' => 'font',
                'value' => 'Arial',
                'updated_at' => null
            ],
            [
                'section_code' => 'layout',
                'setting_code' => 'width',
                'value' => '1200px',
                'updated_at' => null
            ]
        ];
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($mockValues);
        $this->configProviderMock->method('getAllDefaults')->willReturn([]);
        
        $args = [
            'storeId' => 1,
            'status' => 'PUBLISHED',
            'sectionCodes' => ['colors', 'typography'] // filter to 2 sections
        ];
        
        $result = $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        // Should return only 2 values (colors and typography), not layout
        $this->assertCount(2, $result);
        
        $sectionCodes = array_column($result, 'sectionCode');
        $this->assertContains('colors', $sectionCodes);
        $this->assertContains('typography', $sectionCodes);
        $this->assertNotContains('layout', $sectionCodes);
    }
    
    /**
     * Test 6: Should mark value as modified when different from default
     * 
     * SCENARIO: Value differs from default
     * EXPECTED: isModified = true
     */
    public function testMarksValueAsModified(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        
        $mockValues = [
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#ff0000', // red
                'updated_at' => null
            ]
        ];
        
        $mockDefaults = [
            'colors.primary' => '#0000ff' // blue (different!)
        ];
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($mockValues);
        $this->configProviderMock->method('getAllDefaults')->willReturn($mockDefaults);
        
        $args = ['storeId' => 1, 'status' => 'PUBLISHED'];
        $result = $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertTrue($result[0]['isModified']);
    }
    
    /**
     * Test 7: Should NOT mark value as modified when same as default
     * 
     * SCENARIO: Value equals default
     * EXPECTED: isModified = false
     */
    public function testDoesNotMarkValueAsModifiedWhenSameAsDefault(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        
        $mockValues = [
            [
                'section_code' => 'colors',
                'setting_code' => 'primary',
                'value' => '#0000ff', // blue
                'updated_at' => null
            ]
        ];
        
        $mockDefaults = [
            'colors.primary' => '#0000ff' // blue (same!)
        ];
        
        $this->valueInheritanceResolverMock->method('resolveAllValues')->willReturn($mockValues);
        $this->configProviderMock->method('getAllDefaults')->willReturn($mockDefaults);
        
        $args = ['storeId' => 1, 'status' => 'PUBLISHED'];
        $result = $this->values->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertFalse($result[0]['isModified']);
    }
}
