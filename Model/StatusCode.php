<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model;

/**
 * Status code constants for theme editor values.
 *
 * Use these constants instead of raw string literals 'DRAFT' / 'PUBLISHED'
 * to make comparisons refactoring-safe and IDE-navigable.
 *
 * Usage:
 *   use Swissup\BreezeThemeEditor\Model\StatusCode;
 *
 *   $statusProvider->getStatusId(StatusCode::PUBLISHED);
 *   if ($statusCode === StatusCode::DRAFT) { ... }
 */
class StatusCode
{
    const DRAFT     = 'DRAFT';
    const PUBLISHED = 'PUBLISHED';
}
