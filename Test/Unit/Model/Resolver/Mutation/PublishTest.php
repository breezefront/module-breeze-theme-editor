<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Publish;
use Swissup\BreezeThemeEditor\Model\Service\PublishService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;

class PublishTest extends TestCase
{
    private Publish $publishResolver;
    private PublishService|MockObject $publishServiceMock;
    private UserResolver|MockObject $userResolverMock;
    private ThemeResolver|MockObject $themeResolverMock;
    private ScopeFactory|MockObject $scopeFactory;
    private ScopeInterface|MockObject $scopeMock;
    private Field|MockObject $fieldMock;
    private ContextInterface|MockObject $contextMock;
    private ResolveInfo|MockObject $resolveInfoMock;

    protected function setUp(): void
    {
        $this->publishServiceMock = $this->createMock(PublishService::class);
        $this->userResolverMock = $this->createMock(UserResolver::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->scopeFactory = $this->createMock(ScopeFactory::class);
        $this->scopeMock    = $this->createMock(ScopeInterface::class);
        $this->scopeFactory->method('create')->willReturnCallback(
            fn(string $type, int $scopeId) => new \Swissup\BreezeThemeEditor\Model\Data\Scope($type, $scopeId)
        );
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->contextMock->method('getUserId')->willReturn(1);
        $this->contextMock->method('getUserType')->willReturn(2); // USER_TYPE_ADMIN
        $this->resolveInfoMock = $this->createMock(ResolveInfo::class);

        $this->publishResolver = new Publish(
            $this->publishServiceMock,
            $this->userResolverMock,
            $this->themeResolverMock,
            $this->scopeFactory
        );
    }

    /**
     * Test 1: Successful publish with all required fields
     */
    public function testSuccessfulPublishWithAllRequiredFields(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'v1.0 Release',
                'description' => 'Initial release'
            ]
        ];

        $serviceResult = [
            'publicationId' => 100,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'v1.0 Release',
            'description' => 'Initial release',
            'publishedAt' => '2024-01-15 10:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 3,
            'changes' => [
                [
                    'sectionCode' => 'header',
                    'sectionLabel' => 'Header',
                    'fieldCode' => 'logo',
                    'fieldLabel' => 'Logo',
                    'publishedValue' => 'old.png',
                    'draftValue' => 'new.png',
                    'changeType' => 'modified'
                ]
            ]
        ];

        $userMetadata = [
            'username' => 'john_doe',
            'email' => 'john@example.com'
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn($userMetadata);

        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);

        $this->publishServiceMock->expects($this->once())
            ->method('publish')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), 5, 'v1.0 Release', 'Initial release')
            ->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertEquals('Settings published successfully', (string)$result['message']);
        $this->assertEquals(100, $result['publication']['publicationId']);
        $this->assertEquals('v1.0 Release', $result['publication']['title']);
        $this->assertEquals('john_doe', $result['publication']['publishedByName']);
        $this->assertEquals('john@example.com', $result['publication']['publishedByEmail']);
        $this->assertEquals(3, $result['publication']['changesCount']);
        $this->assertTrue($result['publication']['canRollback']);
    }

    /**
     * Test 2: Publish without description (optional field)
     */
    public function testPublishWithoutDescription(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'Quick Fix'
            ]
        ];

        $serviceResult = [
            'publicationId' => 101,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'Quick Fix',
            'description' => null,
            'publishedAt' => '2024-01-15 11:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 1,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);

        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);

        $this->publishServiceMock->expects($this->once())
            ->method('publish')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), 5, 'Quick Fix', null)
            ->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
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
     * Test 3: Throws exception when title is empty
     */
    public function testThrowsExceptionWhenTitleIsEmpty(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => ''
            ]
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);

        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);

        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage('Publication title is required');

        $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 4: Auto-detects themeId when not provided
     */
    public function testAutoDetectsThemeIdWhenNotProvided(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'title' => 'Auto Theme'
            ]
        ];

        $serviceResult = [
            'publicationId' => 102,
            'themeId' => 20,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'Auto Theme',
            'description' => null,
            'publishedAt' => '2024-01-15 12:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 0,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);

        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(20);

        $this->publishServiceMock->expects($this->once())
            ->method('publish')
            ->with(20, $this->isInstanceOf(ScopeInterface::class), 5, 'Auto Theme', null)
            ->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertEquals(20, $result['publication']['themeId']);
    }

    /**
     * Test 5: Uses provided themeId when available
     */
    public function testUsesProvidedThemeIdWhenAvailable(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 15,
                'title' => 'Custom Theme'
            ]
        ];

        $serviceResult = [
            'publicationId' => 103,
            'themeId' => 15,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'Custom Theme',
            'description' => null,
            'publishedAt' => '2024-01-15 13:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 0,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);

        // ThemeResolver is always called to resolve themeId from scope
        $this->themeResolverMock->expects($this->once())
            ->method('getThemeIdByScope')
            ->with($this->isInstanceOf(ScopeInterface::class))
            ->willReturn(15);

        $this->publishServiceMock->expects($this->once())
            ->method('publish')
            ->with(15, $this->isInstanceOf(ScopeInterface::class), 5, 'Custom Theme', null)
            ->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertEquals(15, $result['publication']['themeId']);
    }

    /**
     * Test 6: Formats changes correctly for GraphQL response
     */
    public function testFormatsChangesCorrectlyForGraphQLResponse(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'Multi Change'
            ]
        ];

        $serviceResult = [
            'publicationId' => 104,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'Multi Change',
            'description' => null,
            'publishedAt' => '2024-01-15 14:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 3,
            'changes' => [
                [
                    'sectionCode' => 'header',
                    'sectionLabel' => 'Header',
                    'fieldCode' => 'logo',
                    'fieldLabel' => 'Logo',
                    'publishedValue' => 'old_logo.png',
                    'draftValue' => 'new_logo.png',
                    'changeType' => 'modified'
                ],
                [
                    'sectionCode' => 'colors',
                    'sectionLabel' => 'Colors',
                    'fieldCode' => 'primary',
                    'fieldLabel' => 'Primary Color',
                    'publishedValue' => null,
                    'draftValue' => '#FF0000',
                    'changeType' => 'added'
                ],
                [
                    'sectionCode' => 'footer',
                    'sectionLabel' => 'Footer',
                    'fieldCode' => 'text',
                    'fieldLabel' => 'Footer Text',
                    'publishedValue' => 'Old Text',
                    'draftValue' => null,
                    'changeType' => 'deleted'
                ]
            ]
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);
        $this->publishServiceMock->method('publish')->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $changes = $result['publication']['changes'];

        $this->assertCount(3, $changes);

        // Change 1: Modified
        $this->assertEquals(1, $changes[0]['changeId']);
        $this->assertEquals('header', $changes[0]['sectionCode']);
        $this->assertEquals('logo', $changes[0]['fieldCode']);
        $this->assertEquals('old_logo.png', $changes[0]['oldValue']);
        $this->assertEquals('new_logo.png', $changes[0]['newValue']);
        $this->assertEquals('modified', $changes[0]['changeType']);

        // Change 2: Added
        $this->assertEquals(2, $changes[1]['changeId']);
        $this->assertEquals('colors', $changes[1]['sectionCode']);
        $this->assertNull($changes[1]['oldValue']);
        $this->assertEquals('#FF0000', $changes[1]['newValue']);
        $this->assertEquals('added', $changes[1]['changeType']);

        // Change 3: Deleted
        $this->assertEquals(3, $changes[2]['changeId']);
        $this->assertEquals('footer', $changes[2]['sectionCode']);
        $this->assertEquals('Old Text', $changes[2]['oldValue']);
        $this->assertNull($changes[2]['newValue']);
        $this->assertEquals('deleted', $changes[2]['changeType']);
    }

    /**
     * Test 7: Handles empty changes array
     */
    public function testHandlesEmptyChangesArray(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'No Changes'
            ]
        ];

        $serviceResult = [
            'publicationId' => 105,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'No Changes',
            'description' => null,
            'publishedAt' => '2024-01-15 15:00:00',
            'publishedBy' => 5,
            'isRollback' => false,
            'changesCount' => 0,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(5);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);
        $this->publishServiceMock->method('publish')->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertEmpty($result['publication']['changes']);
        $this->assertEquals(0, $result['publication']['changesCount']);
    }

    /**
     * Test 8: Includes user metadata in response when available
     */
    public function testIncludesUserMetadataInResponseWhenAvailable(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'With Metadata'
            ]
        ];

        $serviceResult = [
            'publicationId' => 106,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'With Metadata',
            'description' => null,
            'publishedAt' => '2024-01-15 16:00:00',
            'publishedBy' => 7,
            'isRollback' => false,
            'changesCount' => 0,
            'changes' => []
        ];

        $userMetadata = [
            'username' => 'jane_smith',
            'email' => 'jane@example.com',
            'firstname' => 'Jane',
            'lastname' => 'Smith'
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(7);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn($userMetadata);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);
        $this->publishServiceMock->method('publish')->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertEquals('jane_smith', $result['publication']['publishedByName']);
        $this->assertEquals('jane@example.com', $result['publication']['publishedByEmail']);
    }

    /**
     * Test 9: Handles missing user metadata gracefully
     */
    public function testHandlesMissingUserMetadataGracefully(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'No Metadata'
            ]
        ];

        $serviceResult = [
            'publicationId' => 107,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'No Metadata',
            'description' => null,
            'publishedAt' => '2024-01-15 17:00:00',
            'publishedBy' => 8,
            'isRollback' => false,
            'changesCount' => 0,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(8);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn([]);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);
        $this->publishServiceMock->method('publish')->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertNull($result['publication']['publishedByName']);
        $this->assertNull($result['publication']['publishedByEmail']);
    }

    /**
     * Test 10: Returns all required publication fields
     */
    public function testReturnsAllRequiredPublicationFields(): void
    {
        $args = [
            'input' => [
                'scope' => ['type' => 'stores', 'scopeId' => 1],
                'themeId' => 10,
                'title' => 'Complete Test'
            ]
        ];

        $serviceResult = [
            'publicationId' => 108,
            'themeId' => 10,
            'scope' => 'stores',
            'scopeId' => 1,
            'title' => 'Complete Test',
            'description' => 'Description',
            'publishedAt' => '2024-01-15 18:00:00',
            'publishedBy' => 9,
            'isRollback' => false,
            'changesCount' => 5,
            'changes' => []
        ];

        $this->userResolverMock->method('getCurrentUserId')
            ->with($this->contextMock)
            ->willReturn(9);
        $this->userResolverMock->method('getCurrentUserMetadata')
            ->with($this->contextMock)
            ->willReturn(['username' => 'user9']);
        $this->themeResolverMock->method('getThemeIdByScope')->willReturn(10);
        $this->publishServiceMock->method('publish')->willReturn($serviceResult);

        $result = $this->publishResolver->resolve(
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
        $this->assertArrayHasKey('scope', $publication);
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

        // Verify values
        $this->assertEquals(108, $publication['publicationId']);
        $this->assertEquals(10, $publication['themeId']);
        $this->assertEquals(1, $publication['scopeId']);
        $this->assertFalse($publication['isRollback']);
        $this->assertNull($publication['rollbackFrom']);
        $this->assertTrue($publication['canRollback']);
    }
}
