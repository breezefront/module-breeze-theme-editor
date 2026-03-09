<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Resolver\Mutation;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Resolver\Mutation\DeletePublication;
use Swissup\BreezeThemeEditor\Model\Service\DeletePublicationService;
use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Framework\Exception\LocalizedException;

class DeletePublicationTest extends TestCase
{
    private DeletePublication $resolver;
    private DeletePublicationService|MockObject $deleteServiceMock;
    private Field|MockObject $fieldMock;
    private ContextInterface|MockObject $contextMock;
    private ResolveInfo|MockObject $resolveInfoMock;

    protected function setUp(): void
    {
        $this->deleteServiceMock = $this->createMock(DeletePublicationService::class);
        $this->fieldMock = $this->createMock(Field::class);
        $this->contextMock = $this->getMockBuilder(ContextInterface::class)
            ->addMethods(['getUserId', 'getUserType'])
            ->getMock();
        $this->resolveInfoMock = $this->createMock(ResolveInfo::class);

        $this->resolver = new DeletePublication($this->deleteServiceMock);
    }

    /**
     * Test 1: Successful deletion returns success response
     */
    public function testSuccessfulDeletion(): void
    {
        $args = ['publicationId' => 42];

        $this->deleteServiceMock
            ->expects($this->once())
            ->method('delete')
            ->with(42);

        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('deleted', (string)$result['message']);
    }

    /**
     * Test 2: Throws GraphQlInputException when publication not found
     */
    public function testThrowsWhenPublicationNotFound(): void
    {
        $args = ['publicationId' => 999];

        $this->deleteServiceMock
            ->expects($this->once())
            ->method('delete')
            ->with(999)
            ->willThrowException(new NoSuchEntityException(__('Not found')));

        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage('Publication with ID 999 not found');

        $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 3: Throws GraphQlInputException when trying to delete the active publication
     */
    public function testThrowsWhenDeletingActivePublication(): void
    {
        $args = ['publicationId' => 10];

        $this->deleteServiceMock
            ->expects($this->once())
            ->method('delete')
            ->with(10)
            ->willThrowException(
                new LocalizedException(__('The currently active publication cannot be deleted.'))
            );

        $this->expectException(GraphQlInputException::class);
        $this->expectExceptionMessage('The currently active publication cannot be deleted.');

        $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }

    /**
     * Test 4: Uses editor_publish ACL resource
     */
    public function testUsesPublishAclResource(): void
    {
        $this->assertSame(
            'Swissup_BreezeThemeEditor::editor_publish',
            $this->resolver->getAclResource()
        );
    }

    /**
     * Test 5: Response contains both required keys
     */
    public function testResponseContainsRequiredKeys(): void
    {
        $args = ['publicationId' => 5];

        $this->deleteServiceMock->method('delete');

        $result = $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('message', $result);
    }

    /**
     * Test 6: Publication ID is cast to int before passing to service
     */
    public function testPublicationIdIsCastToInt(): void
    {
        $args = ['publicationId' => '7'];

        $this->deleteServiceMock
            ->expects($this->once())
            ->method('delete')
            ->with(7); // must be int 7, not string '7'

        $this->resolver->resolve(
            $this->fieldMock,
            $this->contextMock,
            $this->resolveInfoMock,
            null,
            $args
        );
    }
}
