<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\ViewModel\Toolbar\Stub;

use Magento\Backend\Model\Auth\Session as AuthSession;

/**
 * AuthSession double: getUser() is a magic __call method on the real class,
 * so it is declared here to make it mockable
 * (PHPUnit 12 removed MockBuilder::addMethods()).
 */
abstract class AuthSessionStub extends AuthSession
{
    abstract public function getUser();
}
