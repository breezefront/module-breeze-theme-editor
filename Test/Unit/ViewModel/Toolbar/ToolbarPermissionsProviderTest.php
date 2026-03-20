<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar;

use Magento\Framework\AuthorizationInterface;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\ViewModel\Toolbar\ToolbarPermissionsProvider;

/**
 * Unit tests for ToolbarPermissionsProvider
 *
 * Covers: canEdit(), canPublish(), getPermissions()
 */
class ToolbarPermissionsProviderTest extends TestCase
{
    private AuthorizationInterface $authorization;
    private ToolbarPermissionsProvider $provider;

    protected function setUp(): void
    {
        $this->authorization = $this->createMock(AuthorizationInterface::class);
        $this->provider = new ToolbarPermissionsProvider($this->authorization);
    }

    // =========================================================================
    // canEdit()
    // =========================================================================

    /** @test */
    public function testCanEditReturnsTrueWhenAllowed(): void
    {
        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_edit')
            ->willReturn(true);

        $this->assertTrue($this->provider->canEdit());
    }

    /** @test */
    public function testCanEditReturnsFalseWhenDenied(): void
    {
        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_edit')
            ->willReturn(false);

        $this->assertFalse($this->provider->canEdit());
    }

    // =========================================================================
    // canPublish()
    // =========================================================================

    /** @test */
    public function testCanPublishReturnsTrueWhenAllowed(): void
    {
        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_publish')
            ->willReturn(true);

        $this->assertTrue($this->provider->canPublish());
    }

    /** @test */
    public function testCanPublishReturnsFalseWhenDenied(): void
    {
        $this->authorization->method('isAllowed')
            ->with('Swissup_BreezeThemeEditor::editor_publish')
            ->willReturn(false);

        $this->assertFalse($this->provider->canPublish());
    }

    // =========================================================================
    // getPermissions()
    // =========================================================================

    /** @test */
    public function testGetPermissionsReturnsAllKeysWithAllAllowed(): void
    {
        $this->authorization->method('isAllowed')->willReturn(true);

        $permissions = $this->provider->getPermissions();

        $this->assertTrue($permissions['canView']);
        $this->assertTrue($permissions['canEdit']);
        $this->assertTrue($permissions['canPublish']);
        $this->assertTrue($permissions['canRollback']);
        $this->assertTrue($permissions['canResetPublished']);
    }

    /** @test */
    public function testGetPermissionsReturnsAllKeysWithAllDenied(): void
    {
        $this->authorization->method('isAllowed')->willReturn(false);

        $permissions = $this->provider->getPermissions();

        $this->assertFalse($permissions['canView']);
        $this->assertFalse($permissions['canEdit']);
        $this->assertFalse($permissions['canPublish']);
        $this->assertFalse($permissions['canRollback']);
        $this->assertFalse($permissions['canResetPublished']);
    }

    /** @test */
    public function testGetPermissionsContainsExactlyFiveKeys(): void
    {
        $this->authorization->method('isAllowed')->willReturn(false);

        $permissions = $this->provider->getPermissions();

        $this->assertCount(5, $permissions);
        $this->assertArrayHasKey('canView', $permissions);
        $this->assertArrayHasKey('canEdit', $permissions);
        $this->assertArrayHasKey('canPublish', $permissions);
        $this->assertArrayHasKey('canRollback', $permissions);
        $this->assertArrayHasKey('canResetPublished', $permissions);
    }

    /** @test */
    public function testGetPermissionsMapsCorrectAclResources(): void
    {
        $expected = [
            'canView'           => 'Swissup_BreezeThemeEditor::editor_view',
            'canEdit'           => 'Swissup_BreezeThemeEditor::editor_edit',
            'canPublish'        => 'Swissup_BreezeThemeEditor::editor_publish',
            'canRollback'       => 'Swissup_BreezeThemeEditor::editor_rollback',
            'canResetPublished' => 'Swissup_BreezeThemeEditor::editor_reset_published',
        ];

        $called = [];
        $this->authorization->method('isAllowed')
            ->willReturnCallback(function (string $resource) use (&$called): bool {
                $called[] = $resource;
                return true;
            });

        $this->provider->getPermissions();

        foreach ($expected as $aclResource) {
            $this->assertContains($aclResource, $called);
        }
    }
}
