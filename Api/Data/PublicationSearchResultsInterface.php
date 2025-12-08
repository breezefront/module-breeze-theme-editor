<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

use Magento\Framework\Api\SearchResultsInterface;

interface PublicationSearchResultsInterface extends SearchResultsInterface
{
    /**
     * @return PublicationInterface[]
     */
    public function getItems();

    /**
     * @param PublicationInterface[] $items
     * @return $this
     */
    public function setItems(array $items);
}
