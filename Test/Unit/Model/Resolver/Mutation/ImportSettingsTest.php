<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\ImportSettings;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;

class ImportSettingsTest extends TestCase
{
    private ImportSettings $mutation;
    private ImportExportService|MockObject $importExportService;
    private UserResolver|MockObject $userResolver;
    private ThemeResolver|MockObject $themeResolver;
    private Field|MockObject $field;
    private ContextInterface|MockObject $context;
    private ResolveInfo|MockObject $resolveInfo;

    protected function setUp(): void
    {
        $this->importExportService = $this->createMock(ImportExportService::class);
        $this->userResolver        = $this->createMock(UserResolver::class);
        $this->themeResolver       = $this->createMock(ThemeResolver::class);
        $this->field               = $this->createMock(Field::class);
        $this->context             = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfo         = $this->createMock(ResolveInfo::class);

        $this->mutation = new ImportSettings(
            $this->importExportService,
            $this->userResolver,
            $this->themeResolver
        );
    }

    public function testSuccessfulImportReturnsCorrectResponse(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->importExportService
            ->method('import')
            ->willReturn(['imported' => 5, 'skipped' => 2, 'errors' => []]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'storeId'  => 1,
                'themeId'  => 5,
                'status'   => 'DRAFT',
                'jsonData' => '{}',
            ]]
        );

        $this->assertTrue($result['success']);
        $this->assertSame(5, $result['importedCount']);
        $this->assertSame(2, $result['skippedCount']);
        $this->assertSame([], $result['errors']);
    }

    public function testThrowsGraphQlInputExceptionWhenImportFails(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->importExportService
            ->method('import')
            ->willThrowException(new \RuntimeException('Invalid JSON'));

        $this->expectException(GraphQlInputException::class);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'storeId'  => 1,
                'themeId'  => 5,
                'jsonData' => 'not-json',
            ]]
        );
    }

    public function testResolvesThemeIdFromStoreIdWhenNotProvided(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->themeResolver
            ->expects($this->once())
            ->method('getThemeIdByStoreId')
            ->with(2)
            ->willReturn(10);
        $this->importExportService
            ->method('import')
            ->willReturn(['imported' => 1, 'skipped' => 0, 'errors' => []]);

        $result = $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'storeId'  => 2,
                'jsonData' => '{}',
            ]]
        );

        $this->assertTrue($result['success']);
    }

    public function testPassesStatusCodeDirectlyToImportService(): void
    {
        $this->userResolver->method('getCurrentUserId')->willReturn(1);
        $this->importExportService
            ->expects($this->once())
            ->method('import')
            ->with(5, 1, 'PUBLISHED', 1, '{}', true)
            ->willReturn(['imported' => 0, 'skipped' => 0, 'errors' => []]);

        $this->mutation->resolve(
            $this->field, $this->context, $this->resolveInfo, null,
            ['input' => [
                'storeId'  => 1,
                'themeId'  => 5,
                'status'   => 'PUBLISHED',
                'jsonData' => '{}',
            ]]
        );
    }
}
