<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

use Magento\Framework\Api\SearchResults;
use Swissup\BreezeThemeEditor\Api\Data\PublicationSearchResultsInterface;

/**
 * Publication search results implementation
 */
class PublicationSearchResults extends SearchResults implements PublicationSearchResultsInterface
{
}
