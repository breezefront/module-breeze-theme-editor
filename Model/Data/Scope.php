<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Data;

use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;

/**
 * Immutable value object representing a scope (type + id).
 *
 * Type is stored in plural form ('stores', 'websites', 'default') to match
 * the ValueInterface::SCOPE_* constants used throughout this module.
 */
class Scope implements ScopeInterface
{
    public function __construct(
        private readonly string $type,
        private readonly int $scopeId
    ) {}

    // -----------------------------------------------------------------------
    // Swissup\BreezeThemeEditor\Api\Data\ScopeInterface (preferred accessors)
    // -----------------------------------------------------------------------

    public function getType(): string
    {
        return $this->type;
    }

    public function getScopeId(): int
    {
        return $this->scopeId;
    }

    // -----------------------------------------------------------------------
    // Magento\Framework\App\ScopeInterface (parent contract — alias methods)
    // -----------------------------------------------------------------------

    /** @inheritDoc */
    public function getScopeType(): string
    {
        return $this->type;
    }

    /** @inheritDoc */
    public function getId(): mixed
    {
        return $this->scopeId;
    }

    /** @inheritDoc */
    public function getCode(): string
    {
        return (string)$this->scopeId;
    }

    /** @inheritDoc */
    public function getScopeTypeName(): string
    {
        return match ($this->type) {
            ValueInterface::SCOPE_STORES   => 'Store View',
            ValueInterface::SCOPE_WEBSITES => 'Website',
            default                        => 'Default',
        };
    }

    /** @inheritDoc */
    public function getName(): string
    {
        return $this->type . '/' . $this->scopeId;
    }
}
