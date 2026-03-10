<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Serialize\SerializerInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Service\ValidationService;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Value;

class ImportExportServiceTest extends TestCase
{
    private ImportExportService $importExportService;
    private ValueRepositoryInterface|MockObject $valueRepositoryMock;
    private ValueService|MockObject $valueServiceMock;
    private StatusProvider|MockObject $statusProviderMock;
    private SerializerInterface|MockObject $serializerMock;
    private ValidationService|MockObject $validationServiceMock;

    protected function setUp(): void
    {
        $this->valueRepositoryMock = $this->createMock(ValueRepositoryInterface::class);
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->serializerMock = $this->createMock(SerializerInterface::class);
        $this->validationServiceMock = $this->createMock(ValidationService::class);

        $this->importExportService = new ImportExportService(
            $this->valueRepositoryMock,
            $this->valueServiceMock,
            $this->statusProviderMock,
            $this->serializerMock,
            $this->validationServiceMock
        );
    }

    // ========================================================================
    // EXPORT TESTS
    // ========================================================================

    /**
     * Test 1: Export PUBLISHED status values
     */
    public function testExportPublishedStatus(): void
    {
        $themeId = 1;
        $storeId = 1;
        $statusCode = 'PUBLISHED';
        $statusId = 2;

        $this->statusProviderMock->method('getStatusId')
            ->with($statusCode)
            ->willReturn($statusId);

        $values = [
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#ff0000'],
            ['section_code' => 'colors', 'setting_code' => 'secondary', 'value' => '#00ff00'],
        ];

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with($themeId, 'stores', $storeId, $statusId, null)
            ->willReturn($values);

        $expectedExport = [
            'colors.primary' => '#ff0000',
            'colors.secondary' => '#00ff00',
        ];

        $this->serializerMock->expects($this->once())
            ->method('serialize')
            ->with($expectedExport)
            ->willReturn(json_encode($expectedExport));

        $result = $this->importExportService->export($themeId, 'stores', $storeId, $statusCode, null);

        $this->assertArrayHasKey('jsonData', $result);
        $this->assertArrayHasKey('filename', $result);
        $this->assertStringContainsString('theme_1_stores_1_PUBLISHED', $result['filename']);
        $this->assertStringContainsString('.json', $result['filename']);
    }

    /**
     * Test 2: Export DRAFT status values with userId
     */
    public function testExportDraftStatus(): void
    {
        $themeId = 1;
        $storeId = 1;
        $statusCode = 'DRAFT';
        $statusId = 1;
        $userId = 5;

        $this->statusProviderMock->method('getStatusId')
            ->with($statusCode)
            ->willReturn($statusId);

        $values = [
            ['section_code' => 'typography', 'setting_code' => 'font', 'value' => 'Arial'],
        ];

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with($themeId, 'stores', $storeId, $statusId, $userId)
            ->willReturn($values);

        $expectedExport = ['typography.font' => 'Arial'];

        $this->serializerMock->expects($this->once())
            ->method('serialize')
            ->with($expectedExport)
            ->willReturn(json_encode($expectedExport));

        $result = $this->importExportService->export($themeId, 'stores', $storeId, $statusCode, $userId);

        $this->assertStringContainsString('DRAFT', $result['filename']);
    }

    /**
     * Test 3: Export with empty values returns empty JSON
     */
    public function testExportEmptyValues(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);
        $this->serializerMock->method('serialize')->with([])->willReturn('{}');

        $result = $this->importExportService->export(1, 'stores', 1, 'PUBLISHED', null);

        $this->assertEquals('{}', $result['jsonData']);
    }

    /**
     * Test 4: Export filename format includes timestamp
     */
    public function testExportFilenameFormat(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);
        $this->serializerMock->method('serialize')->willReturn('{}');

        $result = $this->importExportService->export(3, 'stores', 5, 'PUBLISHED', null);

        // Format: theme_{themeId}_store_{storeId}_{status}_{date}.json
        $this->assertMatchesRegularExpression(
            '/^theme_3_stores_5_PUBLISHED_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/',
            $result['filename']
        );
    }

    /**
     * Test 5: Export formats keys with dot notation
     */
    public function testExportDotNotationFormat(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $values = [
            ['section_code' => 'header', 'setting_code' => 'logo_width', 'value' => '200px'],
            ['section_code' => 'footer', 'setting_code' => 'copyright', 'value' => '© 2024'],
        ];

        $this->valueServiceMock->method('getValuesByTheme')->willReturn($values);

        $this->serializerMock->expects($this->once())
            ->method('serialize')
            ->with([
                'header.logo_width' => '200px',
                'footer.copyright' => '© 2024',
            ]);

        $this->importExportService->export(1, 'stores', 1, 'PUBLISHED', null);
    }

    // ========================================================================
    // IMPORT TESTS
    // ========================================================================

    /**
     * Test 6: Import valid JSON successfully
     */
    public function testImportValidJson(): void
    {
        $themeId = 1;
        $storeId = 1;
        $statusCode = 'DRAFT';
        $statusId = 1;
        $userId = 5;

        $jsonData = json_encode(['colors.primary' => '#ff0000']);

        $this->statusProviderMock->method('getStatusId')->willReturn($statusId);
        $this->serializerMock->method('unserialize')->willReturn(['colors.primary' => '#ff0000']);
        $this->validationServiceMock->method('validateValues')->willReturn([]);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->once())->method('setThemeId')->with($themeId);
        $valueMock->expects($this->once())->method('setStoreId')->with($storeId);
        $valueMock->expects($this->once())->method('setStatusId')->with($statusId);
        $valueMock->expects($this->once())->method('setUserId')->with($userId);
        $valueMock->expects($this->once())->method('setSectionCode')->with('colors');
        $valueMock->expects($this->once())->method('setSettingCode')->with('primary');
        $valueMock->expects($this->once())->method('setValue')->with('#ff0000');

        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->valueRepositoryMock->expects($this->once())
            ->method('saveMultiple')
            ->willReturn(1);

        $result = $this->importExportService->import(
            $themeId,
            'stores', $storeId,
            $statusCode,
            $userId,
            $jsonData,
            true
        );

        $this->assertEquals(1, $result['importedCount']);
        $this->assertEquals(0, $result['skippedCount']);
        $this->assertEmpty($result['errors']);
    }

    /**
     * Test 7: Import with invalid JSON throws exception
     */
    public function testImportInvalidJsonThrowsException(): void
    {
        $this->serializerMock->method('unserialize')
            ->willThrowException(new \Exception('Invalid JSON'));

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('Invalid JSON data');

        $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, 'invalid json', true);
    }

    /**
     * Test 8: Import with non-array data throws exception
     */
    public function testImportNonArrayDataThrowsException(): void
    {
        $this->serializerMock->method('unserialize')->willReturn('not an array');

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('Invalid data format');

        $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '"string"', true);
    }

    /**
     * Test 9: Import with invalid key format adds to errors
     */
    public function testImportInvalidKeyFormat(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'invalid_key_no_dot' => 'value',
        ]);

        $result = $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);

        $this->assertEquals(0, $result['importedCount']);
        $this->assertEquals(1, $result['skippedCount']);
        $this->assertCount(1, $result['errors']);
        $this->assertStringContainsString('Invalid key format', $result['errors'][0]);
    }

    /**
     * Test 10: Import with validation errors collects them
     */
    public function testImportWithValidationErrors(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'colors.primary' => 'invalid-color',
        ]);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $this->validationServiceMock->method('validateValues')->willReturn([
            ['message' => 'Invalid color format'],
        ]);

        $result = $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);

        $this->assertEquals(0, $result['importedCount']);
        $this->assertEquals(1, $result['skippedCount']);
        $this->assertContains('Invalid color format', $result['errors']);
    }

    /**
     * Test 11: Import with overwriteExisting=true should delete existing values
     * 
     * EXPECTED: overwriteExisting=true means "replace all" - delete existing first
     * This matches the behavior in PresetService.php:107
     */
    public function testImportWithOverwriteTrueDeletesExisting(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'colors.primary' => '#ff0000',
        ]);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([]);
        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        // overwriteExisting=true means "replace all" - delete first
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with(1, 'stores', 1, 1, 5);

        $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);
    }

    /**
     * Test 12: Import with overwriteExisting=false should NOT delete existing values
     * 
     * EXPECTED: overwriteExisting=false means "merge mode" - keep existing, add new
     */
    public function testImportWithOverwriteFalseDoesNotDeleteExisting(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'colors.primary' => '#ff0000',
        ]);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([]);
        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        // overwriteExisting=false means "merge" - no delete
        $this->valueServiceMock->expects($this->never())
            ->method('deleteValues');

        $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', false);
    }

    /**
     * Test 13: Import empty data array imports nothing
     */
    public function testImportEmptyData(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([]);

        $this->valueRepositoryMock->expects($this->never())->method('saveMultiple');

        $result = $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);

        $this->assertEquals(0, $result['importedCount']);
        $this->assertEquals(0, $result['skippedCount']);
    }

    /**
     * Test 14: Import converts non-string values to serialized format
     */
    public function testImportSerializesComplexValues(): void
    {
        $complexValue = ['key' => 'value', 'nested' => ['data']];

        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'section.setting' => $complexValue,
        ]);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->once())
            ->method('setValue')
            ->with(json_encode($complexValue));

        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([]);
        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        $this->serializerMock->expects($this->once())
            ->method('serialize')
            ->with($complexValue)
            ->willReturn(json_encode($complexValue));

        $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);
    }

    /**
     * Test 15: Import with PUBLISHED status sets userId to 0
     */
    public function testImportPublishedStatusSetsUserIdToZero(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(2);
        $this->serializerMock->method('unserialize')->willReturn([
            'colors.primary' => '#ff0000',
        ]);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->once())
            ->method('setUserId')
            ->with(0); // PUBLISHED always uses userId=0

        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([]);
        $this->valueRepositoryMock->method('saveMultiple')->willReturn(1);

        $this->importExportService->import(1, 'stores', 1, 'PUBLISHED', 5, '{}', true);
    }

    /**
     * Test 16: Import counts are accurate with partial errors
     * 
     * When there are errors (invalid keys), no values are saved
     * importedCount=0, skippedCount=number of errors
     */
    public function testImportCountsAccurate(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'valid.key1' => 'value1',
            'valid.key2' => 'value2',
            'invalid_key' => 'value3', // Will be skipped
        ]);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([]);
        
        // saveMultiple is NOT called because there are errors
        $this->valueRepositoryMock->expects($this->never())->method('saveMultiple');

        $result = $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);

        // When there are errors, nothing is saved
        $this->assertEquals(0, $result['importedCount']);
        $this->assertEquals(1, $result['skippedCount']);
        $this->assertCount(1, $result['errors']);
    }

    /**
     * Test 17: Import with both validation errors and invalid keys
     */
    public function testImportPartialSuccessScenario(): void
    {
        $this->statusProviderMock->method('getStatusId')->willReturn(1);
        $this->serializerMock->method('unserialize')->willReturn([
            'colors.primary' => 'invalid-color',
            'invalid_key' => 'value',
        ]);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->validationServiceMock->method('validateValues')->willReturn([
            ['message' => 'Invalid color format'],
        ]);

        $result = $this->importExportService->import(1, 'stores', 1, 'DRAFT', 5, '{}', true);

        $this->assertEquals(0, $result['importedCount']);
        $this->assertEquals(2, $result['skippedCount']); // Both errors counted
        $this->assertCount(2, $result['errors']);
    }
}
