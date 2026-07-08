<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Utility\Stub;

/**
 * Theme entity double. The theme model exposes these getters magically,
 * so they are declared on a stub class to make them mockable
 * (PHPUnit 12 removed MockBuilder::addMethods()).
 */
class ThemeStub
{
    public function getId()
    {
        return null;
    }

    public function getCode()
    {
        return null;
    }

    public function getThemeTitle()
    {
        return null;
    }

    public function getThemePath()
    {
        return null;
    }

    public function getParentId()
    {
        return null;
    }
}
