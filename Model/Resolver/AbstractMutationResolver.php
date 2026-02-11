<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface;

/**
 * Abstract base class for all BreezeThemeEditor Mutation resolvers
 * 
 * Provides default ACL permission: ::editor_edit
 * Most mutations (save, apply preset, import, etc.) require "edit" permission.
 * 
 * For mutations that need different permissions (publish, rollback, export),
 * override getAclResource() in the child class.
 * 
 * Usage:
 * // Default: edit permission
 * class SaveValue extends AbstractMutationResolver
 * {
 *     public function resolve(Field $field, $context, ...) {
 *         // Mutation logic - ACL already checked by plugin
 *     }
 * }
 * 
 * // Override: publish permission
 * class Publish extends AbstractMutationResolver
 * {
 *     public function getAclResource(): string {
 *         return 'Swissup_BreezeThemeEditor::editor_publish';
 *     }
 * }
 */
abstract class AbstractMutationResolver implements ResolverInterface
{
    /**
     * {@inheritdoc}
     * 
     * Default ACL for most mutations: EDIT permission
     * Override in child class for special mutations (publish, rollback, export).
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_edit';
    }
}
