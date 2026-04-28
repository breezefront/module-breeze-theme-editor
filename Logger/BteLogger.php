<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Logger;

use Psr\Log\AbstractLogger;
use Swissup\Logger\Logger\LoggerSingleton;

/**
 * BTE Logger
 *
 * PSR-3 wrapper that delegates to LoggerSingleton.
 * Debug mode is enabled by defining BTE_DEBUG constant:
 *
 * ```php
 * // in pub/index.php or app/etc/env.php:
 * define('BTE_DEBUG', true);
 * ```
 */
class BteLogger extends AbstractLogger
{
    /**
     * @param mixed $level
     * @param string|\Stringable $message
     * @param array $context
     * @return void
     */
    #[\ReturnTypeWillChange]
    public function log($level, $message, array $context = []): void
    {
        LoggerSingleton::getInstance('BTE_DEBUG', '[BTE]')->log($level, $message, $context);
    }
}
