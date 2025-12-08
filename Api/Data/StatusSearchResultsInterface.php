<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

use Magento\Framework\Api\SearchResultsInterface;

/**
 * Interface for value search results.
 * @api
 */
interface StatusSearchResultsInterface extends SearchResultsInterface
{
    /**
     * Get values list.
     *
     * @return \Swissup\BreezeThemeEditor\Api\Data\StatusInterface[]
     */
    public function getItems();

    /**
     * Set values list.
     *
     * @param \Swissup\BreezeThemeEditor\Api\Data\StatusInterface[] $items
     * @return $this
     */
    public function setItems(array $items);
}
