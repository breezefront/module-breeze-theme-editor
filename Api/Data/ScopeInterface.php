<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

/**
 * Represents a scope (type + id) for theme editor operations.
 *
 * Extends Magento's core ScopeInterface so this object can be passed
 * wherever a \Magento\Framework\App\ScopeInterface is accepted.
 *
 * Naming note: getType() and getScopeId() are the preferred accessors in
 * this module. getScopeType() and getId() satisfy the parent contract.
 */
interface ScopeInterface extends \Magento\Framework\App\ScopeInterface
{
    /**
     * Scope type in plural form used throughout this module.
     * One of: 'stores' | 'websites' | 'default'
     */
    public function getType(): string;

    /**
     * Numeric scope identifier (store_id, website_id, or 0 for default).
     */
    public function getScopeId(): int;
}
