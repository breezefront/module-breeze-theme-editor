<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Provider\ThemeAvailabilityProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Magento\Framework\Exception\LocalizedException;

class ThemeAvailabilityProviderTest extends TestCase
{
    private ThemeAvailabilityProvider $provider;
    private ThemeResolver|MockObject  $themeResolverMock;
    private ConfigProvider|MockObject $configProviderMock;
    private ScopeFactory|MockObject   $scopeFactoryMock;

    protected function setUp(): void
    {
        $this->themeResolverMock  = $this->createMock(ThemeResolver::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->scopeFactoryMock   = $this->createMock(ScopeFactory::class);

        $this->provider = new ThemeAvailabilityProvider(
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
        );
    }

    /**
     * Test 1: theme has settings.json → returns true.
     */
    public function testHasSettings_returnsTrueWhenThemeHasFile(): void
    {
        $scope = $this->createMock(ScopeInterface::class);
        $this->scopeFactoryMock->method('create')->willReturn($scope);

        $this->configProviderMock
            ->method('getThemeIdsWithConfigFile')
            ->willReturn([42 => true]);

        $this->themeResolverMock
            ->method('getThemeIdByScope')
            ->willReturn(42);

        $this->assertTrue($this->provider->hasSettings('stores', 1));
    }

    /**
     * Test 2: theme does NOT have settings.json → returns false.
     */
    public function testHasSettings_returnsFalseWhenThemeHasNoFile(): void
    {
        $scope = $this->createMock(ScopeInterface::class);
        $this->scopeFactoryMock->method('create')->willReturn($scope);

        $this->configProviderMock
            ->method('getThemeIdsWithConfigFile')
            ->willReturn([99 => true]); // themeId 7 is NOT in the map

        $this->themeResolverMock
            ->method('getThemeIdByScope')
            ->willReturn(7);

        $this->assertFalse($this->provider->hasSettings('stores', 1));
    }

    /**
     * Test 3: ThemeResolver throws (no theme assigned to scope) → returns false.
     */
    public function testHasSettings_returnsFalseWhenThemeResolverThrows(): void
    {
        $scope = $this->createMock(ScopeInterface::class);
        $this->scopeFactoryMock->method('create')->willReturn($scope);

        $this->configProviderMock
            ->method('getThemeIdsWithConfigFile')
            ->willReturn([1 => true]);

        $this->themeResolverMock
            ->method('getThemeIdByScope')
            ->willThrowException(new LocalizedException(__('No theme')));

        $this->assertFalse($this->provider->hasSettings('default', 0));
    }

    /**
     * Test 4: map is built only once even when hasSettings() is called multiple times.
     */
    public function testHasSettings_memoizesConfigFileMap(): void
    {
        $scope = $this->createMock(ScopeInterface::class);
        $this->scopeFactoryMock->method('create')->willReturn($scope);

        $this->configProviderMock
            ->expects($this->once())           // ← must be called exactly once
            ->method('getThemeIdsWithConfigFile')
            ->willReturn([5 => true, 10 => true]);

        $this->themeResolverMock
            ->method('getThemeIdByScope')
            ->willReturnOnConsecutiveCalls(5, 10, 99);

        // Three calls — map fetched only once
        $this->assertTrue($this->provider->hasSettings('stores', 1));
        $this->assertTrue($this->provider->hasSettings('stores', 2));
        $this->assertFalse($this->provider->hasSettings('stores', 3));
    }
}
