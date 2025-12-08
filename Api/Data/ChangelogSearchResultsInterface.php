<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

use Magento\Framework\Api\SearchResultsInterface;

interface ChangelogSearchResultsInterface extends SearchResultsInterface
{
    /**
     * @return ChangelogInterface[]
     */
    public function getItems();

    /**
     * @param ChangelogInterface[] $items
     * @return $this
     */
    public function setItems(array $items);
}
