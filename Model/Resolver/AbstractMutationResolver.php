<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface;
use Swissup\BreezeThemeEditor\Model\StatusCode;

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

    /**
     * Return userId for draft operations, null for published.
     *
     * Use when passing userId to service methods that accept nullable userId,
     * e.g. ValueService::getValuesByTheme().
     *
     * @param array $params Result of prepareBaseParams() or equivalent
     */
    protected function getDraftUserId(array $params): ?int
    {
        return StatusCode::draftUserId($params['statusCode'], (int)$params['userId']);
    }

    /**
     * Return userId for model setUserId(), 0 for published.
     *
     * Use when setting userId on a ValueInterface model before saving.
     *
     * @param array $params Result of prepareBaseParams() or equivalent
     */
    protected function getDraftUserIdForSave(array $params): int
    {
        return StatusCode::draftUserIdForSave($params['statusCode'], (int)$params['userId']);
    }
}
