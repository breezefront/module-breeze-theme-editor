<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Provider\StoreDataProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ThemeAvailabilityProvider;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\UrlInterface;

class StoreDataProviderTest extends TestCase
{
    private StoreDataProvider $provider;
    private StoreManagerInterface|MockObject $storeManagerMock;
    private UrlInterface|MockObject $urlBuilderMock;
    private ThemeAvailabilityProvider|MockObject $themeAvailabilityMock;

    protected function setUp(): void
    {
        $this->storeManagerMock      = $this->createMock(StoreManagerInterface::class);
        $this->urlBuilderMock        = $this->createMock(UrlInterface::class);
        $this->themeAvailabilityMock = $this->createMock(ThemeAvailabilityProvider::class);

        $this->provider = new StoreDataProvider(
            $this->storeManagerMock,
            $this->urlBuilderMock,
            $this->themeAvailabilityMock
        );
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a minimal store mock.
     *
     * @param int    $id
     * @param string $name
     * @param string $code
     * @param bool   $active
     * @param int    $websiteId
     * @param int    $groupId
     * @return MockObject
     */
    private function makeStore(
        int    $id,
        string $name,
        string $code,
        bool   $active   = true,
        int    $websiteId = 1,
        int    $groupId   = 1
    ): MockObject {
        $store = $this->createMock(\Magento\Store\Model\Store::class);
        $store->method('getId')->willReturn($id);
        $store->method('getName')->willReturn($name);
        $store->method('getCode')->willReturn($code);
        $store->method('isActive')->willReturn($active);
        $store->method('getWebsiteId')->willReturn($websiteId);
        $store->method('getGroupId')->willReturn($groupId);
        $store->method('getCurrentUrl')->willReturn('https://example.com/');
        $store->method('getBaseUrl')->willReturn('https://example.com/');
        return $store;
    }

    /**
     * Build a minimal group mock.
     *
     * @param int    $id
     * @param string $name
     * @param array  $stores
     * @return MockObject
     */
    private function makeGroup(int $id, string $name, array $stores): MockObject
    {
        $group = $this->createMock(\Magento\Store\Model\Group::class);
        $group->method('getId')->willReturn($id);
        $group->method('getName')->willReturn($name);
        $group->method('getStores')->willReturn($stores);
        return $group;
    }

    /**
     * Build a minimal website mock.
     *
     * @param int    $id
     * @param string $name
     * @param string $code
     * @param array  $groups
     * @return MockObject
     */
    private function makeWebsite(int $id, string $name, string $code, array $groups): MockObject
    {
        $website = $this->createMock(\Magento\Store\Model\Website::class);
        $website->method('getId')->willReturn($id);
        $website->method('getName')->willReturn($name);
        $website->method('getCode')->willReturn($code);
        $website->method('getGroups')->willReturn($groups);
        return $website;
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /**
     * Test 1: hasSettings is true for all scope types when ThemeAvailabilityProvider says so.
     */
    public function testGetHierarchicalStores_setsHasSettingsTrueForAllScopes(): void
    {
        $store   = $this->makeStore(1, 'Default Store', 'default');
        $group   = $this->makeGroup(1, 'Main Group', [$store]);
        $website = $this->makeWebsite(1, 'Main Website', 'base', [$group]);

        $currentStoreMock = $this->createMock(\Magento\Store\Model\Store::class);
        $currentStoreMock->method('getId')->willReturn(1);
        $this->storeManagerMock->method('getStore')->willReturn($currentStoreMock);
        $this->storeManagerMock->method('getWebsites')->willReturn([$website]);

        // All scopes return true
        $this->themeAvailabilityMock
            ->method('hasSettings')
            ->willReturn(true);

        $result = $this->provider->getHierarchicalStores();

        // Default entry
        $this->assertTrue($result[0]['hasSettings'], 'default scope should have hasSettings=true');

        // Website entry
        $this->assertTrue($result[1]['hasSettings'], 'website scope should have hasSettings=true');

        // Store entry
        $storeEntry = $result[1]['groups'][0]['stores'][0];
        $this->assertTrue($storeEntry['hasSettings'], 'store scope should have hasSettings=true');
    }

    /**
     * Test 2: hasSettings is false for all scope types when ThemeAvailabilityProvider says so.
     */
    public function testGetHierarchicalStores_setsHasSettingsFalseWhenNoConfigFile(): void
    {
        $store   = $this->makeStore(1, 'Default Store', 'default');
        $group   = $this->makeGroup(1, 'Main Group', [$store]);
        $website = $this->makeWebsite(1, 'Main Website', 'base', [$group]);

        $currentStoreMock = $this->createMock(\Magento\Store\Model\Store::class);
        $currentStoreMock->method('getId')->willReturn(1);
        $this->storeManagerMock->method('getStore')->willReturn($currentStoreMock);
        $this->storeManagerMock->method('getWebsites')->willReturn([$website]);

        // All scopes return false
        $this->themeAvailabilityMock
            ->method('hasSettings')
            ->willReturn(false);

        $result = $this->provider->getHierarchicalStores();

        $this->assertFalse($result[0]['hasSettings'], 'default scope should have hasSettings=false');
        $this->assertFalse($result[1]['hasSettings'], 'website scope should have hasSettings=false');
        $this->assertFalse($result[1]['groups'][0]['stores'][0]['hasSettings'], 'store scope should have hasSettings=false');
    }

    /**
     * Test 3: mixed scenario — default=true, website=false, store=true.
     * Verifies that hasSettings() is called with the correct scope/scopeId arguments
     * and that each entry independently reflects the returned value.
     */
    public function testGetHierarchicalStores_mixedScopes(): void
    {
        $store   = $this->makeStore(2, 'Second Store', 'second');
        $group   = $this->makeGroup(1, 'Main Group', [$store]);
        $website = $this->makeWebsite(1, 'Main Website', 'base', [$group]);

        $currentStoreMock = $this->createMock(\Magento\Store\Model\Store::class);
        $currentStoreMock->method('getId')->willReturn(99); // active store is different
        $this->storeManagerMock->method('getStore')->willReturn($currentStoreMock);
        $this->storeManagerMock->method('getWebsites')->willReturn([$website]);

        // Return different values based on (scope, scopeId)
        $this->themeAvailabilityMock
            ->method('hasSettings')
            ->willReturnMap([
                ['default',  0, true],   // default → true
                ['websites', 1, false],  // website → false
                ['stores',   2, true],   // store   → true
            ]);

        $result = $this->provider->getHierarchicalStores();

        $this->assertTrue($result[0]['hasSettings'],  'default scope hasSettings should be true');
        $this->assertFalse($result[1]['hasSettings'], 'website scope hasSettings should be false');
        $this->assertTrue($result[1]['groups'][0]['stores'][0]['hasSettings'], 'store scope hasSettings should be true');
    }
}
