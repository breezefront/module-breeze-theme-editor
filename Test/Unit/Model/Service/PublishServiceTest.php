<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Magento\Framework\Exception\LocalizedException;
use Magento\Framework\Api\SearchCriteriaBuilder;
use Magento\Framework\Api\SearchCriteria;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Api\ChangelogRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\CompareProvider;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\PublicationFactory;
use Swissup\BreezeThemeEditor\Model\ChangelogFactory;
use Swissup\BreezeThemeEditor\Model\Publication;
use Swissup\BreezeThemeEditor\Model\Changelog;
use Swissup\BreezeThemeEditor\Model\Value;
use Swissup\BreezeThemeEditor\Api\Data\ChangelogSearchResultsInterface;

class PublishServiceTest extends TestCase
{
    private PublishService $publishService;
    private ValueRepositoryInterface|MockObject $valueRepositoryMock;
    private ValueService|MockObject $valueServiceMock;
    private StatusProvider|MockObject $statusProviderMock;
    private CompareProvider|MockObject $compareProviderMock;
    private PublicationRepositoryInterface|MockObject $publicationRepositoryMock;
    private ChangelogRepositoryInterface|MockObject $changelogRepositoryMock;
    private PublicationFactory|MockObject $publicationFactoryMock;
    private ChangelogFactory|MockObject $changelogFactoryMock;
    private SearchCriteriaBuilder|MockObject $searchCriteriaBuilderMock;

    protected function setUp(): void
    {
        $this->valueRepositoryMock = $this->createMock(ValueRepositoryInterface::class);
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->statusProviderMock = $this->createMock(StatusProvider::class);
        $this->compareProviderMock = $this->createMock(CompareProvider::class);
        $this->publicationRepositoryMock = $this->createMock(PublicationRepositoryInterface::class);
        $this->changelogRepositoryMock = $this->createMock(ChangelogRepositoryInterface::class);
        $this->publicationFactoryMock = $this->createMock(PublicationFactory::class);
        $this->changelogFactoryMock = $this->createMock(ChangelogFactory::class);
        $this->searchCriteriaBuilderMock = $this->createMock(SearchCriteriaBuilder::class);

        $this->publishService = new PublishService(
            $this->valueRepositoryMock,
            $this->valueServiceMock,
            $this->statusProviderMock,
            $this->compareProviderMock,
            $this->publicationRepositoryMock,
            $this->changelogRepositoryMock,
            $this->publicationFactoryMock,
            $this->changelogFactoryMock,
            $this->searchCriteriaBuilderMock
        );
    }

    // ========================================================================
    // PUBLISH TESTS
    // ========================================================================

    /**
     * Test 1: Successful publish with changes creates publication
     */
    public function testPublishWithChangesCreatesPublication(): void
    {
        $themeId = 1;
        $storeId = 1;
        $userId = 5;
        $title = 'Test Publication';
        $description = 'Test description';

        // Mock comparison with changes
        $comparison = [
            'hasChanges' => true,
            'changesCount' => 2,
            'changes' => [
                ['sectionCode' => 'colors', 'fieldCode' => 'primary', 'publishedValue' => '#000', 'draftValue' => '#ff0000'],
                ['sectionCode' => 'colors', 'fieldCode' => 'secondary', 'publishedValue' => null, 'draftValue' => '#00ff00'],
            ],
        ];

        $this->compareProviderMock->method('compare')
            ->with($themeId, $storeId, $userId)
            ->willReturn($comparison);

        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([
                ['DRAFT', 1],
                ['PUBLISHED', 2],
            ]);

        // Mock draft values
        $draftValues = [
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#ff0000'],
            ['section_code' => 'colors', 'setting_code' => 'secondary', 'value' => '#00ff00'],
        ];

        $this->valueServiceMock->method('getValuesByTheme')
            ->with($themeId, $storeId, 1, $userId)
            ->willReturn($draftValues);

        // Mock publication creation
        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $publicationMock->method('getPublishedAt')->willReturn('2024-01-01 10:00:00');

        $publicationMock->expects($this->once())->method('setThemeId')->with($themeId);
        $publicationMock->expects($this->once())->method('setStoreId')->with($storeId);
        $publicationMock->expects($this->once())->method('setTitle')->with($title);
        $publicationMock->expects($this->once())->method('setDescription')->with($description);
        $publicationMock->expects($this->once())->method('setPublishedBy')->with($userId);
        $publicationMock->expects($this->once())->method('setIsRollback')->with(false);
        $publicationMock->expects($this->once())->method('setChangesCount')->with(2);

        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);
        $this->publicationRepositoryMock->expects($this->once())->method('save')->with($publicationMock);

        // Mock changelog creation
        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);
        $this->changelogRepositoryMock->expects($this->exactly(2))->method('save');

        // Mock value models
        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->valueRepositoryMock->expects($this->once())->method('saveMultiple');

        // Mock draft deletion
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with($themeId, $storeId, 1, $userId);

        $result = $this->publishService->publish($themeId, $storeId, $userId, $title, $description);

        $this->assertEquals(100, $result['publicationId']);
        $this->assertEquals($themeId, $result['themeId']);
        $this->assertEquals($storeId, $result['storeId']);
        $this->assertEquals($title, $result['title']);
        $this->assertEquals($description, $result['description']);
        $this->assertFalse($result['isRollback']);
        $this->assertEquals(2, $result['changesCount']);
    }

    /**
     * Test 2: Publish with no changes throws exception
     */
    public function testPublishWithoutChangesThrowsException(): void
    {
        $comparison = [
            'hasChanges' => false,
            'changesCount' => 0,
            'changes' => [],
        ];

        $this->compareProviderMock->method('compare')->willReturn($comparison);

        $this->expectException(LocalizedException::class);
        $this->expectExceptionMessage('No changes to publish');

        $this->publishService->publish(1, 1, 5, 'Test');
    }

    /**
     * Test 3: Publish creates changelog for all changes
     */
    public function testPublishCreatesChangelogForAllChanges(): void
    {
        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges' => true,
            'changesCount' => 3,
            'changes' => [
                ['sectionCode' => 's1', 'fieldCode' => 'f1', 'publishedValue' => 'old1', 'draftValue' => 'new1'],
                ['sectionCode' => 's2', 'fieldCode' => 'f2', 'publishedValue' => 'old2', 'draftValue' => 'new2'],
                ['sectionCode' => 's3', 'fieldCode' => 'f3', 'publishedValue' => null, 'draftValue' => 'new3'],
            ],
        ]);

        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);

        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

        $changelogMock = $this->createMock(Changelog::class);
        $changelogMock->expects($this->exactly(3))->method('setPublicationId')->with(100);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        // Verify 3 changelog entries are saved
        $this->changelogRepositoryMock->expects($this->exactly(3))->method('save');

        $this->publishService->publish(1, 1, 5, 'Test');
    }

    /**
     * Test 4: Publish copies draft values to published
     */
    public function testPublishCopiesDraftValuesToPublished(): void
    {
        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges' => true,
            'changesCount' => 1,
            'changes' => [['sectionCode' => 's1', 'fieldCode' => 'f1', 'publishedValue' => null, 'draftValue' => 'val1']],
        ]);

        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $draftValues = [
            ['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'val1'],
            ['section_code' => 's2', 'setting_code' => 'f2', 'value' => 'val2'],
        ];

        $this->valueServiceMock->method('getValuesByTheme')->willReturn($draftValues);

        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->exactly(2))->method('setStatusId')->with(2); // PUBLISHED
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->valueRepositoryMock->expects($this->once())->method('saveMultiple');

        $this->publishService->publish(1, 1, 5, 'Test');
    }

    /**
     * Test 5: Publish deletes draft values after success
     */
    public function testPublishDeletesDraftValuesAfterSuccess(): void
    {
        $themeId = 1;
        $storeId = 1;
        $userId = 5;
        $draftStatusId = 1;

        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges' => true,
            'changesCount' => 1,
            'changes' => [['sectionCode' => 's', 'fieldCode' => 'f', 'publishedValue' => null, 'draftValue' => 'v']],
        ]);

        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', $draftStatusId], ['PUBLISHED', 2]]);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);

        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        // Verify draft deletion is called with correct parameters
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with($themeId, $storeId, $draftStatusId, $userId);

        $this->publishService->publish($themeId, $storeId, $userId, 'Test');
    }

    /**
     * Test 6: Published values must be saved with user_id=0, not the admin's userId.
     * Saving with $userId breaks the FK constraint and causes cascade-delete when admin is removed.
     */
    public function testPublishSavesPublishedValuesWithUserIdZero(): void
    {
        $userId = 5; // admin who clicked Publish

        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges'   => true,
            'changesCount' => 1,
            'changes'      => [['sectionCode' => 'colors', 'fieldCode' => 'base-color',
                                'publishedValue' => null, 'draftValue' => '#4FC13C']],
        ]);
        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturn([['section_code' => 'colors', 'setting_code' => 'base-color', 'value' => '#4FC13C']]);

        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->once())
            ->method('setUserId')
            ->with(0); // must be 0 (global/published), NOT $userId (5)

        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $this->publishService->publish(1, 1, $userId, 'Test');
    }

    /**
     * Test 7: Publish with empty draft values handles gracefully
     */
    public function testPublishWithEmptyDraftValues(): void
    {
        $this->compareProviderMock->method('compare')->willReturn([
            'hasChanges' => true,
            'changesCount' => 1,
            'changes' => [['sectionCode' => 's', 'fieldCode' => 'f', 'publishedValue' => 'old', 'draftValue' => null]],
        ]);

        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);
        $this->valueServiceMock->method('getValuesByTheme')->willReturn([]);

        $publicationMock = $this->createMock(Publication::class);
        $publicationMock->method('getPublicationId')->willReturn(100);
        $this->publicationFactoryMock->method('create')->willReturn($publicationMock);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        // When no draft values, saveMultiple should NOT be called
        $this->valueRepositoryMock->expects($this->never())->method('saveMultiple');

        $result = $this->publishService->publish(1, 1, 5, 'Test');
        $this->assertIsArray($result);
    }

    // ========================================================================
    // ROLLBACK TESTS
    // ========================================================================

    /**
     * Test 7: Successful rollback to existing publication
     */
    public function testRollbackToExistingPublication(): void
    {
        $oldPublicationId = 50;
        $userId = 5;
        $title = 'Rollback';
        $description = 'Rollback description';

        // Mock old publication
        $oldPublicationMock = $this->createMock(Publication::class);
        $oldPublicationMock->method('getThemeId')->willReturn(1);
        $oldPublicationMock->method('getStoreId')->willReturn(1);

        $this->publicationRepositoryMock->method('getById')
            ->with($oldPublicationId)
            ->willReturn($oldPublicationMock);

        // Mock search criteria building
        $searchCriteriaMock = $this->createMock(SearchCriteria::class);
        $this->searchCriteriaBuilderMock->expects($this->once())
            ->method('addFilter')
            ->with('publication_id', $oldPublicationId)
            ->willReturnSelf();
        $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);

        // Mock old changelog
        $oldChangelog1 = $this->createMock(Changelog::class);
        $oldChangelog1->method('getSectionCode')->willReturn('colors');
        $oldChangelog1->method('getSettingCode')->willReturn('primary');
        $oldChangelog1->method('getOldValue')->willReturn('#000');
        $oldChangelog1->method('getNewValue')->willReturn('#fff');

        $searchResultsMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultsMock->method('getItems')->willReturn([$oldChangelog1]);

        $this->changelogRepositoryMock->method('getList')
            ->with($searchCriteriaMock)
            ->willReturn($searchResultsMock);

        // Mock new publication creation
        $newPublicationMock = $this->createMock(Publication::class);
        $newPublicationMock->method('getPublicationId')->willReturn(101);
        $newPublicationMock->expects($this->once())->method('setIsRollback')->with(true);
        $newPublicationMock->expects($this->once())->method('setRollbackFrom')->with($oldPublicationId);

        $this->publicationFactoryMock->method('create')->willReturn($newPublicationMock);
        $this->publicationRepositoryMock->expects($this->once())->method('save');

        $this->statusProviderMock->method('getStatusId')
            ->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        // Draft must be cleared before old values are applied (regression: rollback used to orphan draft)
        $this->valueServiceMock->expects($this->once())
            ->method('deleteValues')
            ->with(1, 1, 1, $userId);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);
        $this->valueRepositoryMock->expects($this->once())->method('saveMultiple');

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        $result = $this->publishService->rollback($oldPublicationId, $userId, $title, $description);

        $this->assertEquals(101, $result['publicationId']);
        $this->assertTrue($result['isRollback']);
        $this->assertEquals($oldPublicationId, $result['rollbackFrom']);
        $this->assertEquals(1, $result['changesCount']);
    }

    /**
     * Test 8: Rollback applies old values to published
     */
    public function testRollbackAppliesOldValues(): void
    {
        $oldPublicationMock = $this->createMock(Publication::class);
        $oldPublicationMock->method('getThemeId')->willReturn(1);
        $oldPublicationMock->method('getStoreId')->willReturn(1);
        $this->publicationRepositoryMock->method('getById')->willReturn($oldPublicationMock);

        $searchCriteriaMock = $this->createMock(SearchCriteria::class);
        $this->searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);

        // Multiple old changelog entries
        $oldChangelog1 = $this->createMock(Changelog::class);
        $oldChangelog1->method('getSectionCode')->willReturn('s1');
        $oldChangelog1->method('getSettingCode')->willReturn('f1');
        $oldChangelog1->method('getNewValue')->willReturn('rollback_value_1');

        $oldChangelog2 = $this->createMock(Changelog::class);
        $oldChangelog2->method('getSectionCode')->willReturn('s2');
        $oldChangelog2->method('getSettingCode')->willReturn('f2');
        $oldChangelog2->method('getNewValue')->willReturn('rollback_value_2');

        $searchResultsMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultsMock->method('getItems')->willReturn([$oldChangelog1, $oldChangelog2]);
        $this->changelogRepositoryMock->method('getList')->willReturn($searchResultsMock);

        $newPublicationMock = $this->createMock(Publication::class);
        $newPublicationMock->method('getPublicationId')->willReturn(101);
        $this->publicationFactoryMock->method('create')->willReturn($newPublicationMock);

        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        // Create two separate value mocks to verify both values are set
        $valueMock1 = $this->createMock(Value::class);
        $valueMock1->expects($this->once())->method('setValue')->with('rollback_value_1');
        
        $valueMock2 = $this->createMock(Value::class);
        $valueMock2->expects($this->once())->method('setValue')->with('rollback_value_2');
        
        $this->valueRepositoryMock->method('create')
            ->willReturnOnConsecutiveCalls($valueMock1, $valueMock2);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        $this->publishService->rollback(50, 5, 'Rollback');
    }

    /**
     * Test 9: Rollback copies changelog from old publication
     */
    public function testRollbackCopiesChangelog(): void
    {
        $oldPublicationMock = $this->createMock(Publication::class);
        $oldPublicationMock->method('getThemeId')->willReturn(1);
        $oldPublicationMock->method('getStoreId')->willReturn(1);
        $this->publicationRepositoryMock->method('getById')->willReturn($oldPublicationMock);

        $searchCriteriaMock = $this->createMock(SearchCriteria::class);
        $this->searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);

        $oldChangelog = $this->createMock(Changelog::class);
        $oldChangelog->method('getSectionCode')->willReturn('s1');
        $oldChangelog->method('getSettingCode')->willReturn('f1');
        $oldChangelog->method('getOldValue')->willReturn('old');
        $oldChangelog->method('getNewValue')->willReturn('new');

        $searchResultsMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultsMock->method('getItems')->willReturn([$oldChangelog]);
        $this->changelogRepositoryMock->method('getList')->willReturn($searchResultsMock);

        $newPublicationMock = $this->createMock(Publication::class);
        $newPublicationMock->method('getPublicationId')->willReturn(101);
        $this->publicationFactoryMock->method('create')->willReturn($newPublicationMock);

        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        $valueMock = $this->createMock(Value::class);
        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        // Verify changelog is saved with old publication data
        $changelogMock = $this->createMock(Changelog::class);
        $changelogMock->expects($this->once())->method('setPublicationId')->with(101);
        $changelogMock->expects($this->once())->method('setSectionCode')->with('s1');
        $changelogMock->expects($this->once())->method('setSettingCode')->with('f1');
        $changelogMock->expects($this->once())->method('setOldValue')->with('old');
        $changelogMock->expects($this->once())->method('setNewValue')->with('new');

        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);
        $this->changelogRepositoryMock->expects($this->once())->method('save');

        $this->publishService->rollback(50, 5, 'Rollback');
    }

    /**
     * Test 10: Rollback with empty changelog handles gracefully
     */
    public function testRollbackWithEmptyChangelog(): void
    {
        $oldPublicationMock = $this->createMock(Publication::class);
        $oldPublicationMock->method('getThemeId')->willReturn(1);
        $oldPublicationMock->method('getStoreId')->willReturn(1);
        $this->publicationRepositoryMock->method('getById')->willReturn($oldPublicationMock);

        $searchCriteriaMock = $this->createMock(SearchCriteria::class);
        $this->searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteriaMock);

        $searchResultsMock = $this->createMock(ChangelogSearchResultsInterface::class);
        $searchResultsMock->method('getItems')->willReturn([]); // Empty changelog
        $this->changelogRepositoryMock->method('getList')->willReturn($searchResultsMock);

        $newPublicationMock = $this->createMock(Publication::class);
        $newPublicationMock->method('getPublicationId')->willReturn(101);
        $this->publicationFactoryMock->method('create')->willReturn($newPublicationMock);

        $this->statusProviderMock->method('getStatusId')->willReturn(2);

        // saveMultiple should NOT be called with empty changelog
        $this->valueRepositoryMock->expects($this->never())->method('saveMultiple');

        $result = $this->publishService->rollback(50, 5, 'Rollback');
        $this->assertEquals(0, $result['changesCount']);
    }

    /**
     * Test 10: Rollback published values must be saved with user_id=0, not the admin's userId.
     */
    public function testRollbackSavesPublishedValuesWithUserIdZero(): void
    {
        $userId = 5; // admin who clicked Rollback

        $oldPub = $this->createMock(Publication::class);
        $oldPub->method('getThemeId')->willReturn(1);
        $oldPub->method('getStoreId')->willReturn(1);
        $this->publicationRepositoryMock->method('getById')->willReturn($oldPub);

        $searchCriteria = $this->createMock(SearchCriteria::class);
        $this->searchCriteriaBuilderMock->method('addFilter')->willReturnSelf();
        $this->searchCriteriaBuilderMock->method('create')->willReturn($searchCriteria);

        $change = $this->createMock(Changelog::class);
        $change->method('getSectionCode')->willReturn('colors');
        $change->method('getSettingCode')->willReturn('base-color');
        $change->method('getNewValue')->willReturn('#4FC13C');

        $results = $this->createMock(ChangelogSearchResultsInterface::class);
        $results->method('getItems')->willReturn([$change]);
        $this->changelogRepositoryMock->method('getList')->willReturn($results);

        $newPub = $this->createMock(Publication::class);
        $newPub->method('getPublicationId')->willReturn(101);
        $this->publicationFactoryMock->method('create')->willReturn($newPub);

        $this->statusProviderMock->method('getStatusId')->willReturnMap([['DRAFT', 1], ['PUBLISHED', 2]]);

        $valueMock = $this->createMock(Value::class);
        $valueMock->expects($this->once())
            ->method('setUserId')
            ->with(0); // must be 0 (global/published), NOT $userId (5)

        $this->valueRepositoryMock->method('create')->willReturn($valueMock);

        $changelogMock = $this->createMock(Changelog::class);
        $this->changelogFactoryMock->method('create')->willReturn($changelogMock);

        $this->publishService->rollback(50, $userId, 'Rollback');
    }
}
