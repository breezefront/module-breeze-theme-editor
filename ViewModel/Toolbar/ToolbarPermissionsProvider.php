<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\ViewModel\Toolbar;

use Magento\Framework\AuthorizationInterface;

/**
 * Provides ACL permission checks for the admin toolbar.
 *
 * Responsibilities:
 * - Check individual permissions (canEdit, canPublish)
 * - Return the full permissions map used by the JS toolbar widget
 */
class ToolbarPermissionsProvider
{
    /**
     * @var AuthorizationInterface
     */
    private $authorization;

    /**
     * @param AuthorizationInterface $authorization
     */
    public function __construct(AuthorizationInterface $authorization)
    {
        $this->authorization = $authorization;
    }

    /**
     * Check if user has permission to edit theme.
     *
     * @return bool
     */
    public function canEdit(): bool
    {
        return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit');
    }

    /**
     * Check if user has permission to publish theme.
     *
     * @return bool
     */
    public function canPublish(): bool
    {
        return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish');
    }

    /**
     * Get the full ACL permissions map for the JS toolbar widget.
     *
     * @return array
     */
    public function getPermissions(): array
    {
        return [
            'canView'           => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_view'),
            'canEdit'           => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
            'canPublish'        => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
            'canRollback'       => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_rollback'),
            'canResetPublished' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_reset_published'),
        ];
    }
}
