<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface;

/**
 * Abstract base class for all BreezeThemeEditor Query resolvers
 * 
 * Provides default ACL permission: ::editor_view
 * All queries inherit "view" permission by default.
 * 
 * Usage:
 * class Config extends AbstractQueryResolver
 * {
 *     public function resolve(Field $field, $context, ...) {
 *         // Query logic - ACL already checked by plugin
 *     }
 * }
 */
abstract class AbstractQueryResolver implements ResolverInterface
{
    /**
     * {@inheritdoc}
     * 
     * Default ACL for all queries: VIEW permission
     * Override in child class if specific query needs different permission.
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_view';
    }
}
