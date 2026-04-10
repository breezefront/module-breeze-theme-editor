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
 *
 * Draft-userId helpers:
 *   StatusCode::draftUserId($statusCode, $userId)        → ?int  (null for PUBLISHED)
 *   StatusCode::draftUserIdForSave($statusCode, $userId) → int   (0 for PUBLISHED)
 */
class StatusCode
{
    const DRAFT     = 'DRAFT';
    const PUBLISHED = 'PUBLISHED';

    /**
     * Return $userId when status is DRAFT, null otherwise.
     *
     * Use when passing userId to service methods that accept nullable userId,
     * e.g. ValueService::getValuesByTheme().
     */
    public static function draftUserId(string $statusCode, int $userId): ?int
    {
        return $statusCode === self::DRAFT ? $userId : null;
    }

    /**
     * Return $userId when status is DRAFT, 0 otherwise.
     *
     * Use when calling ValueInterface::setUserId() before saving a model.
     */
    public static function draftUserIdForSave(string $statusCode, int $userId): int
    {
        return $statusCode === self::DRAFT ? $userId : 0;
    }
}
