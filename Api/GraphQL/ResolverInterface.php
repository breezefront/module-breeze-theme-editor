<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\GraphQL;

use Magento\Framework\GraphQl\Query\ResolverInterface as MagentoResolverInterface;

/**
 * Extended GraphQL resolver interface with ACL support
 * 
 * All BreezeThemeEditor resolvers MUST implement this interface
 * to enable automatic ACL permission checking via plugin.
 * 
 * Similar to Magento admin controllers' _isAllowed() pattern.
 */
interface ResolverInterface extends MagentoResolverInterface
{
    /**
     * Get required ACL resource for this resolver
     * 
     * Examples:
     * - 'Swissup_BreezeThemeEditor::editor_view' - for queries
     * - 'Swissup_BreezeThemeEditor::editor_edit' - for mutations
     * - 'Swissup_BreezeThemeEditor::editor_publish' - for publish
     * - 'Swissup_BreezeThemeEditor::editor_rollback' - for rollback
     * 
     * @return string ACL resource identifier
     */
    public function getAclResource(): string;
}
