<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use Magento\Framework\Api\SearchCriteria;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchResultsInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;

class ValueServiceTest extends TestCase
{
    private ValueService $valueService;
    private ValueRepositoryInterface $valueRepository;
    private SearchCriteriaBuilder $searchCriteriaBuilder;
    private SearchCriteria $searchCriteria;
    private SearchResultsInterface $searchResults;

    protected function setUp(): void
    {
        $this->valueRepository = $this->createMock(ValueRepositoryInterface::class);
        $this->searchCriteriaBuilder = $this->createMock(SearchCriteriaBuilder::class);
        $this->searchCriteria = $this->createMock(SearchCriteria::class);
        $this->searchResults = $this->createMock(SearchResultsInterface::class);

        // Setup fluent SearchCriteriaBuilder
        $this->searchCriteriaBuilder->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilder->method('setPageSize')->willReturnSelf();
        $this->searchCriteriaBuilder->method('create')->willReturn($this->searchCriteria);

        $this->valueService = new ValueService(
            $this->valueRepository,
            $this->searchCriteriaBuilder
        );
    }

    public function testGetValuesByThemeReturnsFormattedArray(): void
    {
        // Arrange
        $value1 = $this->createMock(ValueInterface::class);
        $value1->method('getSectionCode')->willReturn('header');
        $value1->method('getSettingCode')->willReturn('bg_color');
        $value1->method('getValue')->willReturn('#ff0000');
        $value1->method('getUpdatedAt')->willReturn('2025-02-01 12:00:00');

        $value2 = $this->createMock(ValueInterface::class);
        $value2->method('getSectionCode')->willReturn('footer');
        $value2->method('getSettingCode')->willReturn('text_color');
        $value2->method('getValue')->willReturn('#ffffff');
        $value2->method('getUpdatedAt')->willReturn('2025-02-02 15:30:00');

        $this->searchResults->method('getItems')->willReturn([$value1, $value2]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $result = $this->valueService->getValuesByTheme(5, 'stores', 1, 1, 42);

        // Assert
        $this->assertCount(2, $result);
        $this->assertEquals('header', $result[0]['section_code']);
        $this->assertEquals('bg_color', $result[0]['setting_code']);
        $this->assertEquals('#ff0000', $result[0]['value']);
        $this->assertEquals('2025-02-01 12:00:00', $result[0]['updated_at']);
        $this->assertEquals('footer', $result[1]['section_code']);
    }

    public function testGetValuesByThemeWithUserId(): void
    {
        // Arrange
        $this->searchCriteriaBuilder->expects($this->exactly(5))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) {
                static $callCount = 0;
                $callCount++;
                
                if ($callCount === 1) {
                    $this->assertEquals('theme_id', $field);
                    $this->assertEquals(5, $value);
                } elseif ($callCount === 2) {
                    $this->assertEquals('scope', $field);
                    $this->assertEquals('stores', $value);
                } elseif ($callCount === 3) {
                    $this->assertEquals('store_id', $field);
                    $this->assertEquals(1, $value);
                } elseif ($callCount === 4) {
                    $this->assertEquals('status_id', $field);
                    $this->assertEquals(1, $value);
                } elseif ($callCount === 5) {
                    $this->assertEquals('user_id', $field);
                    $this->assertEquals(42, $value);
                }
                
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->getValuesByTheme(5, 'stores', 1, 1, 42);
    }

    public function testGetValuesByThemeWithoutUserId(): void
    {
        // Arrange
        $this->searchCriteriaBuilder->expects($this->exactly(4))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) {
                static $callCount = 0;
                $callCount++;
                
                // Should NOT receive user_id filter
                $this->assertNotEquals('user_id', $field);
                
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->getValuesByTheme(5, 'stores', 1, 2, null);
    }

    public function testGetValuesByThemeReturnsEmptyArrayWhenNoResults(): void
    {
        // Arrange
        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $result = $this->valueService->getValuesByTheme(5, 'stores', 1, 1);

        // Assert
        $this->assertIsArray($result);
        $this->assertEmpty($result);
    }

    public function testGetSingleValueReturnsValue(): void
    {
        // Arrange
        $value = $this->createMock(ValueInterface::class);
        $value->method('getValue')->willReturn('#123456');

        $this->searchResults->method('getItems')->willReturn([$value]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $result = $this->valueService->getSingleValue(5, 'stores', 1, 1, 'colors', 'primary', 42);

        // Assert
        $this->assertEquals('#123456', $result);
    }

    public function testGetSingleValueReturnsNullWhenNotFound(): void
    {
        // Arrange
        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $result = $this->valueService->getSingleValue(5, 'stores', 1, 1, 'colors', 'primary');

        // Assert
        $this->assertNull($result);
    }

    public function testGetSingleValueAppliesPageSize(): void
    {
        // Arrange
        $this->searchCriteriaBuilder->expects($this->once())
            ->method('setPageSize')
            ->with(1)
            ->willReturnSelf();

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->getSingleValue(5, 'stores', 1, 1, 'test', 'field');
    }

    public function testDeleteValuesReturnsCountOfDeletedItems(): void
    {
        // Arrange
        $value1 = $this->createMock(ValueInterface::class);
        $value2 = $this->createMock(ValueInterface::class);
        $value3 = $this->createMock(ValueInterface::class);

        $this->searchResults->method('getItems')->willReturn([$value1, $value2, $value3]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);
        $this->valueRepository->expects($this->exactly(3))->method('delete');

        // Act
        $count = $this->valueService->deleteValues(5, 'stores', 1, 1, 42);

        // Assert
        $this->assertEquals(3, $count);
    }

    public function testDeleteValuesWithSectionCodesFilter(): void
    {
        // Arrange
        $this->searchCriteriaBuilder->expects($this->exactly(5))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) {
                static $callCount = 0;
                $callCount++;
                
                if ($callCount === 5) {
                    $this->assertEquals('section_code', $field);
                    $this->assertEquals(['header', 'footer'], $value);
                    $this->assertEquals('in', $condition);
                }
                
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->deleteValues(5, 'stores', 1, 1, null, ['header', 'footer']);
    }

    public function testDeleteValuesReturnsZeroWhenNoMatches(): void
    {
        // Arrange
        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $count = $this->valueService->deleteValues(5, 'stores', 1, 1);

        // Assert
        $this->assertEquals(0, $count);
    }

    public function testCopyValuesCopiesAllMatchingValues(): void
    {
        // Arrange
        $sourceValue1 = $this->createMock(ValueInterface::class);
        $sourceValue1->method('getSectionCode')->willReturn('header');
        $sourceValue1->method('getSettingCode')->willReturn('bg_color');
        $sourceValue1->method('getValue')->willReturn('#ff0000');

        $sourceValue2 = $this->createMock(ValueInterface::class);
        $sourceValue2->method('getSectionCode')->willReturn('footer');
        $sourceValue2->method('getSettingCode')->willReturn('text_color');
        $sourceValue2->method('getValue')->willReturn('#ffffff');

        $this->searchResults->method('getItems')->willReturn([$sourceValue1, $sourceValue2]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        $newValue1 = $this->createMock(ValueInterface::class);
        $newValue1->method('setThemeId')->willReturnSelf();
        $newValue1->method('setStoreId')->willReturnSelf();
        $newValue1->method('setStatusId')->willReturnSelf();
        $newValue1->method('setUserId')->willReturnSelf();
        $newValue1->method('setSectionCode')->willReturnSelf();
        $newValue1->method('setSettingCode')->willReturnSelf();
        $newValue1->method('setValue')->willReturnSelf();

        $newValue2 = $this->createMock(ValueInterface::class);
        $newValue2->method('setThemeId')->willReturnSelf();
        $newValue2->method('setStoreId')->willReturnSelf();
        $newValue2->method('setStatusId')->willReturnSelf();
        $newValue2->method('setUserId')->willReturnSelf();
        $newValue2->method('setSectionCode')->willReturnSelf();
        $newValue2->method('setSettingCode')->willReturnSelf();
        $newValue2->method('setValue')->willReturnSelf();

        $this->valueRepository->method('create')
            ->willReturnOnConsecutiveCalls($newValue1, $newValue2);

        $this->valueRepository->expects($this->once())
            ->method('saveMultiple')
            ->with($this->callback(function ($models) {
                return count($models) === 2;
            }))
            ->willReturn(2);

        // Act
        $count = $this->valueService->copyValues(5, 'stores', 1, 1, 42, 6, 'stores', 2, 2, 100);

        // Assert
        $this->assertEquals(2, $count);
    }

    public function testCopyValuesReturnsZeroWhenNoSourceValues(): void
    {
        // Arrange
        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $count = $this->valueService->copyValues(5, 'stores', 1, 1, 42, 6, 'stores', 2, 2, 100);

        // Assert
        $this->assertEquals(0, $count);
    }

    public function testCopyValuesSetsCorrectTargetParameters(): void
    {
        // Arrange
        $sourceValue = $this->createMock(ValueInterface::class);
        $sourceValue->method('getSectionCode')->willReturn('test');
        $sourceValue->method('getSettingCode')->willReturn('field');
        $sourceValue->method('getValue')->willReturn('value');

        $this->searchResults->method('getItems')->willReturn([$sourceValue]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        $newValue = $this->createMock(ValueInterface::class);
        $newValue->expects($this->once())->method('setThemeId')->with(10)->willReturnSelf();
        $newValue->expects($this->once())->method('setStoreId')->with(3)->willReturnSelf();
        $newValue->expects($this->once())->method('setStatusId')->with(2)->willReturnSelf();
        $newValue->expects($this->once())->method('setUserId')->with(99)->willReturnSelf();
        $newValue->method('setSectionCode')->willReturnSelf();
        $newValue->method('setSettingCode')->willReturnSelf();
        $newValue->method('setValue')->willReturnSelf();

        $this->valueRepository->method('create')->willReturn($newValue);
        $this->valueRepository->method('saveMultiple')->willReturn(1);

        // Act
        $this->valueService->copyValues(5, 'stores', 1, 1, 42, 10, 'stores', 3, 2, 99);
    }

    public function testCopyValuesWithSectionCodesFilter(): void
    {
        // Arrange
        $filterCalls = [];
        $this->searchCriteriaBuilder->expects($this->exactly(6))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) use (&$filterCalls) {
                $filterCalls[] = ['field' => $field, 'value' => $value, 'condition' => $condition];
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->copyValues(5, 'stores', 1, 1, 42, 6, 'stores', 2, 2, 100, ['colors', 'typography']);

        // Assert
        $sectionCodeFilter = array_filter($filterCalls, fn($f) => $f['field'] === 'section_code');
        $this->assertCount(1, $sectionCodeFilter);
        $sectionCodeFilter = reset($sectionCodeFilter);
        $this->assertEquals(['colors', 'typography'], $sectionCodeFilter['value']);
        $this->assertEquals('in', $sectionCodeFilter['condition']);
    }

    public function testDeleteValuesWithFieldCodesFilter(): void
    {
        // Arrange: verify that setting_code 'in' filter is applied when fieldCodes provided
        $filterCalls = [];
        $this->searchCriteriaBuilder->expects($this->exactly(6))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) use (&$filterCalls) {
                $filterCalls[] = ['field' => $field, 'value' => $value, 'condition' => $condition];
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->deleteValues(5, 'stores', 1, 1, null, ['colors'], ['body-bg', 'text-color']);

        // Assert: setting_code filter was added
        $fieldCodeFilter = array_filter($filterCalls, fn($f) => $f['field'] === 'setting_code');
        $this->assertCount(1, $fieldCodeFilter, 'setting_code filter must be applied once');

        $fieldCodeFilter = reset($fieldCodeFilter);
        $this->assertEquals(['body-bg', 'text-color'], $fieldCodeFilter['value']);
        $this->assertEquals('in', $fieldCodeFilter['condition']);
    }

    public function testDeleteValuesWithoutFieldCodesDoesNotAddSettingCodeFilter(): void
    {
        // Arrange: without fieldCodes, setting_code filter must NOT be added
        $filterCalls = [];
        $this->searchCriteriaBuilder->expects($this->exactly(4))
            ->method('addFilter')
            ->willReturnCallback(function ($field, $value, $condition = null) use (&$filterCalls) {
                $filterCalls[] = ['field' => $field, 'value' => $value];
                return $this->searchCriteriaBuilder;
            });

        $this->searchResults->method('getItems')->willReturn([]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);

        // Act
        $this->valueService->deleteValues(5, 'stores', 1, 1);

        // Assert: no setting_code filter
        $settingFilter = array_filter($filterCalls, fn($f) => $f['field'] === 'setting_code');
        $this->assertCount(0, $settingFilter, 'setting_code filter must NOT be applied when fieldCodes is null');
    }

    public function testDeleteValuesSingleFieldDeletesOnlyThatField(): void
    {
        // Arrange: only the matching value should be deleted
        $matchingValue = $this->createMock(ValueInterface::class);

        $this->searchResults->method('getItems')->willReturn([$matchingValue]);
        $this->valueRepository->method('getList')->willReturn($this->searchResults);
        $this->valueRepository->expects($this->once())->method('delete')->with($matchingValue);

        // Act
        $count = $this->valueService->deleteValues(21, 'stores', 21, 1, null, ['colors'], ['body-bg']);

        // Assert
        $this->assertEquals(1, $count);
    }
}
