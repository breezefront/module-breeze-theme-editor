<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service\Stub;

use Magento\Backend\Model\Auth\Session as BackendSession;

/**
 * BackendSession double: getUser/setData/unsetData are magic __call methods
 * on the real class, so they are declared here to make them mockable
 * (PHPUnit 12 removed MockBuilder::addMethods()).
 */
abstract class BackendSessionStub extends BackendSession
{
    abstract public function getUser();

    abstract public function setData($key, $value = null);

    abstract public function unsetData($key = null);
}
