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

    /**
     * Build a Scope from a raw GraphQL input array.
     *
     * Accepts the sub-array that resolvers receive as $args['scope']:
     *   ['type' => 'stores', 'scopeId' => 1]
     *
     * @param array $data Raw scope input (keys: type, scopeId)
     */
    public function fromInput(array $data): ScopeInterface
    {
        return $this->create(
            $data['type'] ?? 'stores',
            (int) ($data['scopeId'] ?? 0)
        );
    }
}
