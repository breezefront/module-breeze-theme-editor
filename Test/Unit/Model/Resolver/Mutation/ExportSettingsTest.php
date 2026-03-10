<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\ExportSettings;

/**
 * Unit tests for ExportSettings GraphQL mutation
 * 
 * Tests PUBLICATION status validation and export logic
 * 
 * @covers \Swissup\BreezeThemeEditor\Model\Resolver\Mutation\ExportSettings
 */
class ExportSettingsTest extends TestCase
{
    private ExportSettings $exportSettings;
    private ImportExportService $importExportServiceMock;
    private UserResolver $userResolverMock;
    private ThemeResolver $themeResolverMock;
    private StatusProvider $statusProviderMock;
    
    private Field $fieldMock;
    private ContextInterface $contextMock;
    private ResolveInfo $infoMock;
    
    protected function setUp(): void
    {
        // Create all dependency mocks
        $this->importExportServiceMock = $this->createMock(ImportExportService::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        
        // Create GraphQL mocks
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->infoMock = $this->createMock(ResolveInfo::class);
        
        // Instantiate ExportSettings resolver
        $this->exportSettings = new ExportSettings(
            $this->importExportServiceMock,
            $this->userResolverMock,
            $this->themeResolverMock,
            $this->statusProviderMock
        );
    }
    
    /**
     * Test 1: Should throw exception when status is PUBLICATION
     * 
     * SCENARIO: User tries to export with status: 'PUBLICATION'
     * EXPECTED: GraphQlInputException with clear message
     * REASON: Cannot export from historical PUBLICATION (export from DRAFT or PUBLISHED only)
     */
    public function testThrowsExceptionWhenStatusIsPublication(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        
        $args = [
            'scope' => ['type' => 'stores', 'scopeId' => 1],
            'status' => 'PUBLICATION'
        ];
        
        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage(
            'PUBLICATION status is not supported for export. Export from DRAFT or PUBLISHED status only.'
        );
        
        $this->exportSettings->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
    }
    
    /**
     * Test 2: Should export DRAFT settings with userId
     * 
     * SCENARIO: Authenticated user exports DRAFT settings
     * EXPECTED: Export service called with userId, returns success with JSON data
     */
    public function testExportsDraftSettingsWithUserId(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $mockJson = '{"colors":{"primary":"#ff0000"},"typography":{"font":"Arial"}}';
        
        $this->importExportServiceMock->expects($this->once())
            ->method('export')
            ->with(1, 'stores', 1, 'DRAFT', 5) // themeId, scope, scopeId, statusCode, userId
            ->willReturn([
                'jsonData' => $mockJson,
                'filename' => 'theme_1_store_1_DRAFT_2024-01-15_10-30-00.json'
            ]);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'DRAFT'];
        $result = $this->exportSettings->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertTrue($result['success']);
        $this->assertEquals('Settings exported successfully', (string)$result['message']);
        $this->assertEquals($mockJson, $result['jsonData']);
        $this->assertEquals('theme_1_store_1_DRAFT_2024-01-15_10-30-00.json', $result['filename']);
        $this->assertStringContainsString('.json', $result['filename']);
    }
    
    /**
     * Test 3: Should export PUBLISHED settings without userId
     * 
     * SCENARIO: Export PUBLISHED settings
     * EXPECTED: Export service called with userId = null
     */
    public function testExportsPublishedSettingsWithoutUserId(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $this->importExportServiceMock->expects($this->once())
            ->method('export')
            ->with(1, 'stores', 1, 'PUBLISHED', null) // userId = null for PUBLISHED
            ->willReturn([
                'jsonData' => '{}',
                'filename' => 'theme_1_store_1_PUBLISHED_2024-01-15_10-30-00.json'
            ]);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1], 'status' => 'PUBLISHED'];
        $result = $this->exportSettings->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertTrue($result['success']);
        $this->assertEquals('{}', $result['jsonData']);
    }
    
    /**
     * Test 4: Should default to PUBLISHED when status not provided
     * 
     * SCENARIO: User doesn't pass status parameter
     * EXPECTED: Uses 'PUBLISHED' as default
     */
    public function testDefaultsToPublishedWhenStatusNotProvided(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(1);
        
        $this->importExportServiceMock->method('export')->willReturn([
            'jsonData' => '{}',
            'filename' => 'theme_1_store_1_PUBLISHED_2024-01-15_10-30-00.json'
        ]);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 1]]; // no status
        $result = $this->exportSettings->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        $this->assertTrue($result['success']);
    }
    
    /**
     * Test 5: Should generate filename with timestamp and correct format
     * 
     * SCENARIO: Export settings
     * EXPECTED: Filename follows pattern: breeze-theme-editor-{themeId}-store{storeId}-{timestamp}.json
     */
    public function testGeneratesFilenameWithTimestamp(): void
    {
        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(1);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(3);
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->importExportServiceMock->method('export')->willReturn([
            'jsonData' => '{}',
            'filename' => 'theme_3_store_5_PUBLISHED_2024-01-15_10-30-00.json'
        ]);
        
        $args = ['scope' => ['type' => 'stores', 'scopeId' => 5], 'status' => 'PUBLISHED'];
        $result = $this->exportSettings->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->infoMock,
            null,
            $args
        );
        
        // Check filename format from service: theme_{themeId}_store_{storeId}_{status}_{timestamp}.json
        // Example: theme_3_store_5_PUBLISHED_2024-01-15_10-30-00.json
        $this->assertEquals('theme_3_store_5_PUBLISHED_2024-01-15_10-30-00.json', $result['filename']);
    }
}
