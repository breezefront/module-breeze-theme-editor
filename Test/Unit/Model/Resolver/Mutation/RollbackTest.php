<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Rollback;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Api\PublicationRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Publication;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;

class RollbackTest extends TestCase
{
    private Rollback $rollbackResolver;
    private PublishService|MockObject $publishServiceMock;
    private UserResolver|MockObject $userResolverMock;
    private PublicationRepositoryInterface|MockObject $publicationRepositoryMock;
    private Field|MockObject $fieldMock;
    private ContextInterface|MockObject $contextMock;
    private ResolveInfo|MockObject $resolveInfoMock;

    protected function setUp(): void
    {
        $this->publishServiceMock = $this->createMock(PublishService::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->publicationRepositoryMock = $this->createMock(PublicationRepositoryInterface::class);
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->resolveInfoMock = $this->createMock(ResolveInfo::class);

        $this->rollbackResolver = new Rollback(
            $this->publishServiceMock,
            $this->userResolverMock,
            $this->publicationRepositoryMock
        );
    }

    /**
     * Test 1: Successful rollback to existing publication
     */
    public function testSuccessfulRollbackToExistingPublication(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Rollback to v1.0',
                'description' => 'Rolling back due to issues'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 101
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(101);
        $newPublication->method('getThemeId')->willReturn(10);
        $newPublication->method('getStoreId')->willReturn(1);
        $newPublication->method('getTitle')->willReturn('Rollback to v1.0');
        $newPublication->method('getDescription')->willReturn('Rolling back due to issues');
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 10:00:00');
        $newPublication->method('getPublishedBy')->willReturn(5);
        $newPublication->method('getChangesCount')->willReturn(3);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        // First getById call: verify target publication exists
        $this->publicationRepositoryMock->expects($this->exactly(2))
            ->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->expects($this->once())
            ->method('rollback')
            ->with(50, 5, 'Rollback to v1.0', 'Rolling back due to issues')
            ->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('Successfully rolled back to publication #50', (string)$result['message']);
        $this->assertEquals(101, $result['publication']['publicationId']);
        $this->assertTrue($result['publication']['isRollback']);
        $this->assertEquals(50, $result['publication']['rollbackFrom']);
        $this->assertTrue($result['publication']['canRollback']);
    }

    /**
     * Test 2: Rollback without description (optional field)
     */
    public function testRollbackWithoutDescription(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Quick Rollback'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 102
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(102);
        $newPublication->method('getThemeId')->willReturn(10);
        $newPublication->method('getStoreId')->willReturn(1);
        $newPublication->method('getTitle')->willReturn('Quick Rollback');
        $newPublication->method('getDescription')->willReturn(null);
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 11:00:00');
        $newPublication->method('getPublishedBy')->willReturn(5);
        $newPublication->method('getChangesCount')->willReturn(2);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->expects($this->once())
            ->method('rollback')
            ->with(50, 5, 'Quick Rollback', null)
            ->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertNull($result['publication']['description']);
    }

    /**
     * Test 3: Throws exception when publication not found
     */
    public function testThrowsExceptionWhenPublicationNotFound(): void
    {
        $args = [
            'input' => [
                'publicationId' => 999,
                'title' => 'Rollback'
            ]
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->publicationRepositoryMock->expects($this->once())
            ->method('getById')
            ->with(999)
            ->willThrowException(new \Exception('Not found'));

        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage('Publication with ID 999 not found');

        $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 4: Returns all required publication fields
     */
    public function testReturnsAllRequiredPublicationFields(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Full Rollback Test'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 103
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(103);
        $newPublication->method('getThemeId')->willReturn(15);
        $newPublication->method('getStoreId')->willReturn(2);
        $newPublication->method('getTitle')->willReturn('Full Rollback Test');
        $newPublication->method('getDescription')->willReturn('Test description');
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 12:00:00');
        $newPublication->method('getPublishedBy')->willReturn(7);
        $newPublication->method('getChangesCount')->willReturn(5);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(7);

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->method('rollback')->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $publication = $result['publication'];

        // Verify all required fields are present
        $this->assertArrayHasKey('publicationId', $publication);
        $this->assertArrayHasKey('themeId', $publication);
        $this->assertArrayHasKey('scopeId', $publication);
        $this->assertArrayHasKey('title', $publication);
        $this->assertArrayHasKey('description', $publication);
        $this->assertArrayHasKey('publishedAt', $publication);
        $this->assertArrayHasKey('publishedBy', $publication);
        $this->assertArrayHasKey('publishedByName', $publication);
        $this->assertArrayHasKey('publishedByEmail', $publication);
        $this->assertArrayHasKey('isRollback', $publication);
        $this->assertArrayHasKey('rollbackFrom', $publication);
        $this->assertArrayHasKey('changesCount', $publication);
        $this->assertArrayHasKey('changes', $publication);
        $this->assertArrayHasKey('canRollback', $publication);

        // Verify specific values
        $this->assertEquals(103, $publication['publicationId']);
        $this->assertEquals(15, $publication['themeId']);
        $this->assertEquals(2, $publication['scopeId']);
        $this->assertEquals('Full Rollback Test', $publication['title']);
        $this->assertTrue($publication['isRollback']);
        $this->assertEquals(50, $publication['rollbackFrom']);
        $this->assertNull($publication['publishedByName']);
        $this->assertNull($publication['publishedByEmail']);
        $this->assertNull($publication['changes']);
        $this->assertTrue($publication['canRollback']);
    }

    /**
     * Test 5: Handles rollback with zero changes count
     */
    public function testHandlesRollbackWithZeroChangesCount(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'No Changes Rollback'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 104
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(104);
        $newPublication->method('getThemeId')->willReturn(10);
        $newPublication->method('getStoreId')->willReturn(1);
        $newPublication->method('getTitle')->willReturn('No Changes Rollback');
        $newPublication->method('getDescription')->willReturn(null);
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 13:00:00');
        $newPublication->method('getPublishedBy')->willReturn(5);
        $newPublication->method('getChangesCount')->willReturn(0);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->method('rollback')->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertEquals(0, $result['publication']['changesCount']);
    }

    /**
     * Test 6: Verifies target publication exists before rollback
     */
    public function testVerifiesTargetPublicationExistsBeforeRollback(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Test Verification'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        // Expect getById to be called twice: once for verification, once for result
        $this->publicationRepositoryMock->expects($this->exactly(2))
            ->method('getById');

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication) {
                if ($id === 50) {
                    return $targetPublication;
                }
                $newPub = $this->createMock(Publication::class);
                $newPub->method('getPublicationId')->willReturn(105);
                $newPub->method('getThemeId')->willReturn(10);
                $newPub->method('getStoreId')->willReturn(1);
                $newPub->method('getTitle')->willReturn('Test Verification');
                $newPub->method('getDescription')->willReturn(null);
                $newPub->method('getPublishedAt')->willReturn('2024-01-20 14:00:00');
                $newPub->method('getPublishedBy')->willReturn(5);
                $newPub->method('getChangesCount')->willReturn(1);
                return $newPub;
            });

        $this->publishServiceMock->method('rollback')->willReturn(['publicationId' => 105]);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
    }

    /**
     * Test 7: Changes field is always null in rollback response
     */
    public function testChangesFieldIsAlwaysNullInRollbackResponse(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Test Changes Null'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 106
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(106);
        $newPublication->method('getThemeId')->willReturn(10);
        $newPublication->method('getStoreId')->willReturn(1);
        $newPublication->method('getTitle')->willReturn('Test Changes Null');
        $newPublication->method('getDescription')->willReturn(null);
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 15:00:00');
        $newPublication->method('getPublishedBy')->willReturn(5);
        $newPublication->method('getChangesCount')->willReturn(10); // Even with changes count

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->method('rollback')->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        // Even though changes count is 10, changes array is null
        $this->assertEquals(10, $result['publication']['changesCount']);
        $this->assertNull($result['publication']['changes']);
    }

    /**
     * Test 8: User metadata fields are always null in rollback response
     */
    public function testUserMetadataFieldsAreAlwaysNullInRollbackResponse(): void
    {
        $args = [
            'input' => [
                'publicationId' => 50,
                'title' => 'Test User Metadata'
            ]
        ];

        $targetPublication = $this->createMock(Publication::class);

        $serviceResult = [
            'publicationId' => 107
        ];

        $newPublication = $this->createMock(Publication::class);
        $newPublication->method('getPublicationId')->willReturn(107);
        $newPublication->method('getThemeId')->willReturn(10);
        $newPublication->method('getStoreId')->willReturn(1);
        $newPublication->method('getTitle')->willReturn('Test User Metadata');
        $newPublication->method('getDescription')->willReturn(null);
        $newPublication->method('getPublishedAt')->willReturn('2024-01-20 16:00:00');
        $newPublication->method('getPublishedBy')->willReturn(5);
        $newPublication->method('getChangesCount')->willReturn(0);

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);

        $this->publicationRepositoryMock->method('getById')
            ->willReturnCallback(function ($id) use ($targetPublication, $newPublication) {
                return $id === 50 ? $targetPublication : $newPublication;
            });

        $this->publishServiceMock->method('rollback')->willReturn($serviceResult);

        $result = $this->rollbackResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        // User metadata is always null for rollback (not populated like in Publish)
        $this->assertNull($result['publication']['publishedByName']);
        $this->assertNull($result['publication']['publishedByEmail']);
    }
}
