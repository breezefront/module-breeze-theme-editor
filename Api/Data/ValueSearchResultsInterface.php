<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

use Magento\Framework\Api\SearchResultsInterface;

/**
 * Interface for value search results.
 * @api
 */
interface ValueSearchResultsInterface extends SearchResultsInterface
{
    /**
     * Get values list.
     *
     * @return \Swissup\BreezeThemeEditor\Api\Data\ValueInterface[]
     */
    public function getItems();

    /**
     * Set values list.
     *
     * @param \Swissup\BreezeThemeEditor\Api\Data\ValueInterface[] $items
     * @return $this
     */
    public function setItems(array $items);
}
