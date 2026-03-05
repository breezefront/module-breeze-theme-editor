<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility;

use Magento\Framework\App\ResourceConnection;
use Magento\Framework\DB\Adapter\AdapterInterface;
use Magento\Framework\DB\Select;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Utility\AdminUserLoader;

class AdminUserLoaderTest extends TestCase
{
    private AdminUserLoader $loader;
    private ResourceConnection|MockObject $resourceConnection;
    private AdapterInterface|MockObject $connection;
    private Select|MockObject $select;

    protected function setUp(): void
    {
        $this->select     = $this->getMockBuilder(Select::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->select->method('from')->willReturnSelf();
        $this->select->method('where')->willReturnSelf();
        $this->select->method('limit')->willReturnSelf();

        $this->connection = $this->createMock(AdapterInterface::class);
        $this->connection->method('select')->willReturn($this->select);
        $this->connection->method('getTableName')->willReturnArgument(0);

        $this->resourceConnection = $this->createMock(ResourceConnection::class);
        $this->resourceConnection->method('getConnection')->willReturn($this->connection);
        $this->resourceConnection->method('getTableName')->willReturnArgument(0);

        $this->loader = new AdminUserLoader($this->resourceConnection);
    }

    // =========================================================================
    // getUserData
    // =========================================================================

    public function testReturnsNullWhenUserNotFoundInDb(): void
    {
        $this->connection->method('fetchRow')->willReturn(false);

        $result = $this->loader->getUserData(999);

        $this->assertNull($result);
    }

    public function testReturnsUserDataWhenFound(): void
    {
        $this->connection->method('fetchRow')->willReturn([
            'username'  => 'admin',
            'email'     => 'admin@example.com',
            'firstname' => 'John',
            'lastname'  => 'Doe',
        ]);

        $result = $this->loader->getUserData(1);

        $this->assertSame('admin', $result['username']);
        $this->assertSame('admin@example.com', $result['email']);
        $this->assertSame('John Doe', $result['fullname']);
    }

    public function testCachesUserDataAfterFirstLoad(): void
    {
        $this->connection
            ->expects($this->once()) // Only one DB call even for two getUserData calls
            ->method('fetchRow')
            ->willReturn([
                'username' => 'admin', 'email' => 'a@b.c',
                'firstname' => 'A', 'lastname' => 'B',
            ]);

        $this->loader->getUserData(1);
        $this->loader->getUserData(1); // Second call should hit cache
    }

    // =========================================================================
    // getUserFullName
    // =========================================================================

    public function testGetUserFullNameReturnsFullname(): void
    {
        $this->connection->method('fetchRow')->willReturn([
            'username' => 'jdoe', 'email' => 'j@d.com',
            'firstname' => 'Jane', 'lastname' => 'Doe',
        ]);

        $this->assertSame('Jane Doe', $this->loader->getUserFullName(1));
    }

    public function testGetUserFullNameReturnsNullWhenUserNotFound(): void
    {
        $this->connection->method('fetchRow')->willReturn(false);

        $this->assertNull($this->loader->getUserFullName(999));
    }

    // =========================================================================
    // getMultipleUsersData
    // =========================================================================

    public function testGetMultipleUsersDataReturnsEmptyArrayForEmptyInput(): void
    {
        $result = $this->loader->getMultipleUsersData([]);

        $this->assertSame([], $result);
    }

    public function testGetMultipleUsersDataReturnsMappedByUserId(): void
    {
        $this->connection->method('fetchAll')->willReturn([
            ['user_id' => 1, 'username' => 'admin', 'email' => 'a@b.c', 'firstname' => 'A', 'lastname' => 'B'],
            ['user_id' => 2, 'username' => 'editor', 'email' => 'e@b.c', 'firstname' => 'C', 'lastname' => 'D'],
        ]);

        $result = $this->loader->getMultipleUsersData([1, 2]);

        $this->assertArrayHasKey(1, $result);
        $this->assertArrayHasKey(2, $result);
        $this->assertSame('A B', $result[1]['fullname']);
    }
}
