<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Data;

use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;

/**
 * Factory for creating Scope value objects.
 *
 * Written by hand (not auto-generated) so the create() method is typed.
 */
class ScopeFactory
{
    public function create(string $type, int $scopeId): ScopeInterface
    {
        return new Scope($type, $scopeId);
    }
}
