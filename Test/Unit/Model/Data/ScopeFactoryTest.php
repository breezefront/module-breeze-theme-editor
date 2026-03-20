<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Data;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;

class ScopeFactoryTest extends TestCase
{
    private ScopeFactory $factory;

    protected function setUp(): void
    {
        $this->factory = new ScopeFactory();
    }

    // -------------------------------------------------------------------------
    // fromInput — happy path
    // -------------------------------------------------------------------------

    public function testFromInputWithExplicitValues(): void
    {
        $scope = $this->factory->fromInput(['type' => 'websites', 'scopeId' => 3]);

        $this->assertSame('websites', $scope->getType());
        $this->assertSame(3, $scope->getScopeId());
    }

    public function testFromInputWithStoresType(): void
    {
        $scope = $this->factory->fromInput(['type' => 'stores', 'scopeId' => 7]);

        $this->assertSame('stores', $scope->getType());
        $this->assertSame(7, $scope->getScopeId());
    }

    public function testFromInputWithDefaultType(): void
    {
        $scope = $this->factory->fromInput(['type' => 'default', 'scopeId' => 0]);

        $this->assertSame('default', $scope->getType());
        $this->assertSame(0, $scope->getScopeId());
    }

    // -------------------------------------------------------------------------
    // fromInput — default fallbacks
    // -------------------------------------------------------------------------

    public function testFromInputMissingTypeDefaultsToStores(): void
    {
        $scope = $this->factory->fromInput(['scopeId' => 2]);

        $this->assertSame('stores', $scope->getType());
        $this->assertSame(2, $scope->getScopeId());
    }

    public function testFromInputMissingScopeIdDefaultsToZero(): void
    {
        $scope = $this->factory->fromInput(['type' => 'websites']);

        $this->assertSame('websites', $scope->getType());
        $this->assertSame(0, $scope->getScopeId());
    }

    public function testFromInputEmptyArrayUsesDefaults(): void
    {
        $scope = $this->factory->fromInput([]);

        $this->assertSame('stores', $scope->getType());
        $this->assertSame(0, $scope->getScopeId());
    }

    // -------------------------------------------------------------------------
    // fromInput — type coercion for scopeId
    // -------------------------------------------------------------------------

    public function testFromInputCastsScopeIdToInt(): void
    {
        $scope = $this->factory->fromInput(['type' => 'stores', 'scopeId' => '5']);

        $this->assertSame(5, $scope->getScopeId());
    }

    // -------------------------------------------------------------------------
    // create — existing contract still works
    // -------------------------------------------------------------------------

    public function testCreateStillWorks(): void
    {
        $scope = $this->factory->create('websites', 4);

        $this->assertSame('websites', $scope->getType());
        $this->assertSame(4, $scope->getScopeId());
    }
}
