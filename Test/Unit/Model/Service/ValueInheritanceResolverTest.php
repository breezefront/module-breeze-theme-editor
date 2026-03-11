<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Service;

use Magento\Store\Api\Data\StoreInterface;
use Magento\Store\Model\StoreManagerInterface;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Data\Scope;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Service\ValueInheritanceResolver;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ValueInheritanceResolverTest extends TestCase
{
    private ValueInheritanceResolver $resolver;
    private ValueService|MockObject $valueServiceMock;
    private ThemeResolver|MockObject $themeResolverMock;
    private ConfigProvider|MockObject $configProviderMock;
    private ScopeFactory|MockObject $scopeFactoryMock;

    protected function setUp(): void
    {
        $this->valueServiceMock = $this->createMock(ValueService::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);
        $this->configProviderMock = $this->createMock(ConfigProvider::class);
        $this->scopeFactoryMock = $this->createMock(ScopeFactory::class);
        $this->scopeFactoryMock->method('create')
            ->willReturnCallback(fn($type, $id) => new Scope($type, $id));

        $this->resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
        );
    }

    /**
     * Test 1: Single theme with no parents returns only its own values
     */
    public function testResolveAllValuesWithSingleTheme(): void
    {
        $themeId = 10;
        $storeId = 1;
        $statusId = 2;
        $userId = null;

        $hierarchy = [
            ['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]
        ];

        $values = [
            ['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'logo.png'],
            ['section_code' => 'footer', 'setting_code' => 'copyright', 'value' => '2024']
        ];

        $this->themeResolverMock->expects($this->once())
            ->method('getThemeHierarchy')
            ->with($themeId)
            ->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), $statusId, $userId)
            ->willReturn($values);

        $result = $this->resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId, $userId);

        $this->assertCount(2, $result);
        $this->assertEquals($values, $result);
    }

    /**
     * Test 2: Multi-level hierarchy merges values from child to parent
     */
    public function testResolveAllValuesWithMultiLevelHierarchy(): void
    {
        $themeId = 30;
        $storeId = 1;
        $statusId = 2;

        // Hierarchy: child (30) -> parent (20) -> grandparent (10)
        $hierarchy = [
            ['theme_id' => 30, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 20, 'theme_code' => 'parent', 'level' => 1],
            ['theme_id' => 10, 'theme_code' => 'grandparent', 'level' => 2]
        ];

        // Grandparent values (loaded first due to array_reverse)
        $grandparentValues = [
            ['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'default_logo.png'],
            ['section_code' => 'colors', 'setting_code' => 'primary', 'value' => '#000000']
        ];

        // Parent values (override logo)
        $parentValues = [
            ['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'parent_logo.png'],
            ['section_code' => 'footer', 'setting_code' => 'text', 'value' => 'Parent Footer']
        ];

        // Child values (override logo again)
        $childValues = [
            ['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'child_logo.png']
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->exactly(3))
            ->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId) use ($grandparentValues, $parentValues, $childValues) {
                return match($themeId) {
                    10 => $grandparentValues,
                    20 => $parentValues,
                    30 => $childValues,
                };
            });

        $result = $this->resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        // Should have 3 unique keys: header.logo (from child), colors.primary (from grandparent), footer.text (from parent)
        $this->assertCount(3, $result);

        // Find values by key
        $logoValue = null;
        $primaryValue = null;
        $footerValue = null;
        foreach ($result as $value) {
            $key = $value['section_code'] . '.' . $value['setting_code'];
            if ($key === 'header.logo') $logoValue = $value;
            if ($key === 'colors.primary') $primaryValue = $value;
            if ($key === 'footer.text') $footerValue = $value;
        }

        // Child overrides parent and grandparent
        $this->assertEquals('child_logo.png', $logoValue['value']);
        // Grandparent value not overridden
        $this->assertEquals('#000000', $primaryValue['value']);
        // Parent value not overridden
        $this->assertEquals('Parent Footer', $footerValue['value']);
    }

    /**
     * Test 3: Empty hierarchy returns empty array
     */
    public function testResolveAllValuesWithEmptyHierarchy(): void
    {
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn([]);

        $result = $this->resolver->resolveAllValues(999, new Scope('stores', 1), 2);

        $this->assertEmpty($result);
    }

    /**
     * Test 4: Single value found in child theme (level 0)
     */
    public function testResolveSingleValueFoundInChildTheme(): void
    {
        $themeId = 10;
        $storeId = 1;
        $statusId = 2;
        $sectionCode = 'header';
        $fieldCode = 'logo';

        $hierarchy = [
            ['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->once())
            ->method('getSingleValue')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), $statusId, $sectionCode, $fieldCode, null)
            ->willReturn('child_logo.png');

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, $sectionCode, $fieldCode);

        $this->assertEquals('child_logo.png', $result['value']);
        $this->assertFalse($result['isInherited']);
        $this->assertNull($result['inheritedFrom']);
        $this->assertEquals(0, $result['inheritanceLevel']);
    }

    /**
     * Test 5: Single value found in parent theme (level 1)
     */
    public function testResolveSingleValueFoundInParentTheme(): void
    {
        $themeId = 20;
        $storeId = 1;
        $statusId = 2;
        $sectionCode = 'header';
        $fieldCode = 'logo';

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1, 'theme_title' => 'Parent Theme']
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->exactly(2))
            ->method('getSingleValue')
            ->willReturnCallback(function ($themeId) {
                // Child returns null, parent returns value
                return $themeId === 20 ? null : 'parent_logo.png';
            });

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, $sectionCode, $fieldCode);

        $this->assertEquals('parent_logo.png', $result['value']);
        $this->assertTrue($result['isInherited']);
        $this->assertEquals('parent', $result['inheritedFrom']['theme_code']);
        $this->assertEquals(1, $result['inheritanceLevel']);
    }

    /**
     * Test 6: Single value found in grandparent theme (level 2)
     */
    public function testResolveSingleValueFoundInGrandparentTheme(): void
    {
        $themeId = 30;
        $storeId = 1;
        $statusId = 2;
        $sectionCode = 'colors';
        $fieldCode = 'primary';

        $hierarchy = [
            ['theme_id' => 30, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 20, 'theme_code' => 'parent', 'level' => 1],
            ['theme_id' => 10, 'theme_code' => 'grandparent', 'level' => 2, 'theme_title' => 'Grandparent Theme']
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->exactly(3))
            ->method('getSingleValue')
            ->willReturnCallback(function ($themeId) {
                // Only grandparent has value
                return $themeId === 10 ? '#FF0000' : null;
            });

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, $sectionCode, $fieldCode);

        $this->assertEquals('#FF0000', $result['value']);
        $this->assertTrue($result['isInherited']);
        $this->assertEquals('grandparent', $result['inheritedFrom']['theme_code']);
        $this->assertEquals(2, $result['inheritanceLevel']);
    }

    /**
     * Test 7: Single value not found anywhere, fallback to config default
     */
    public function testResolveSingleValueFallbackToConfigDefault(): void
    {
        $themeId = 10;
        $storeId = 1;
        $statusId = 2;
        $sectionCode = 'header';
        $fieldCode = 'logo';

        $hierarchy = [
            ['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getSingleValue')->willReturn(null);

        $this->configProviderMock->expects($this->once())
            ->method('getFieldDefault')
            ->with($themeId, $sectionCode, $fieldCode)
            ->willReturn('default_logo.png');

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, $sectionCode, $fieldCode);

        $this->assertEquals('default_logo.png', $result['value']);
        $this->assertFalse($result['isInherited']);
        $this->assertNull($result['inheritedFrom']);
        $this->assertEquals(-1, $result['inheritanceLevel']);
    }

    /**
     * Test 8: Single value fallback returns null when config has no default
     */
    public function testResolveSingleValueFallbackReturnsNull(): void
    {
        $hierarchy = [['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->method('getSingleValue')->willReturn(null);
        $this->configProviderMock->method('getFieldDefault')->willReturn(null);

        $result = $this->resolver->resolveSingleValue(10, new Scope('stores', 1), 2, 'header', 'logo');

        $this->assertNull($result['value']);
        $this->assertFalse($result['isInherited']);
        $this->assertEquals(-1, $result['inheritanceLevel']);
    }

    /**
     * Test 9: isValueInherited returns true when value from parent
     */
    public function testIsValueInheritedReturnsTrueForParentValue(): void
    {
        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->exactly(2))
            ->method('getSingleValue')
            ->willReturnCallback(fn($themeId) => $themeId === 10 ? 'parent_value' : null);

        $result = $this->resolver->isValueInherited(20, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertTrue($result);
    }

    /**
     * Test 10: isValueInherited returns false when value from child
     */
    public function testIsValueInheritedReturnsFalseForChildValue(): void
    {
        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->method('getSingleValue')->willReturn('child_value');

        $result = $this->resolver->isValueInherited(20, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertFalse($result);
    }

    /**
     * Test 11: isValueInherited returns false when value from config default
     */
    public function testIsValueInheritedReturnsFalseForConfigDefault(): void
    {
        $hierarchy = [['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->method('getSingleValue')->willReturn(null);
        $this->configProviderMock->method('getFieldDefault')->willReturn('default_value');

        $result = $this->resolver->isValueInherited(10, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertFalse($result);
    }

    /**
     * Test 12: getInheritedFromTheme returns parent theme info
     */
    public function testGetInheritedFromThemeReturnsParentInfo(): void
    {
        $parentThemeInfo = ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1, 'theme_title' => 'Parent'];

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            $parentThemeInfo
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->expects($this->exactly(2))
            ->method('getSingleValue')
            ->willReturnCallback(fn($themeId) => $themeId === 10 ? 'parent_value' : null);

        $result = $this->resolver->getInheritedFromTheme(20, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertEquals($parentThemeInfo, $result);
        $this->assertEquals('parent', $result['theme_code']);
    }

    /**
     * Test 13: getInheritedFromTheme returns null when value from child
     */
    public function testGetInheritedFromThemeReturnsNullForChildValue(): void
    {
        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->method('getSingleValue')->willReturn('child_value');

        $result = $this->resolver->getInheritedFromTheme(20, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertNull($result);
    }

    /**
     * Test 14: getInheritedFromTheme returns null when value from config
     */
    public function testGetInheritedFromThemeReturnsNullForConfigDefault(): void
    {
        $hierarchy = [['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);
        $this->valueServiceMock->method('getSingleValue')->willReturn(null);
        $this->configProviderMock->method('getFieldDefault')->willReturn('default_value');

        $result = $this->resolver->getInheritedFromTheme(10, new Scope('stores', 1), 2, 'section', 'field');

        $this->assertNull($result);
    }

    /**
     * Test 15: resolveAllValues with userId parameter
     */
    public function testResolveAllValuesWithUserId(): void
    {
        $themeId = 10;
        $storeId = 1;
        $statusId = 1; // DRAFT
        $userId = 5;

        $hierarchy = [['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]];
        $values = [['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'user_logo.png']];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), $statusId, $userId)
            ->willReturn($values);

        $result = $this->resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId, $userId);

        $this->assertCount(1, $result);
        $this->assertEquals('user_logo.png', $result[0]['value']);
    }

    /**
     * Test 16: resolveSingleValue with userId parameter
     */
    public function testResolveSingleValueWithUserId(): void
    {
        $themeId = 10;
        $storeId = 1;
        $statusId = 1; // DRAFT
        $userId = 5;

        $hierarchy = [['theme_id' => 10, 'theme_code' => 'child', 'level' => 0]];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->once())
            ->method('getSingleValue')
            ->with(10, $this->isInstanceOf(ScopeInterface::class), $statusId, 'header', 'logo', $userId)
            ->willReturn('user_logo.png');

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, 'header', 'logo', $userId);

        $this->assertEquals('user_logo.png', $result['value']);
    }

    /**
     * Test 17: Child value overrides parent when both exist (first match wins)
     */
    public function testChildValueOverridesParentInResolveSingleValue(): void
    {
        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        // Both child and parent have value, but child should win
        $this->valueServiceMock->expects($this->once()) // Only called once - stops at child
            ->method('getSingleValue')
            ->with(20, $this->isInstanceOf(ScopeInterface::class), 2, 'header', 'logo', null)
            ->willReturn('child_logo.png');

        $result = $this->resolver->resolveSingleValue(20, new Scope('stores', 1), 2, 'header', 'logo');

        $this->assertEquals('child_logo.png', $result['value']);
        $this->assertFalse($result['isInherited']);
        $this->assertEquals(0, $result['inheritanceLevel']);
    }

    /**
     * Test 18: Deep hierarchy (4 levels) correctly merges values
     */
    public function testResolveAllValuesWithDeepHierarchy(): void
    {
        $hierarchy = [
            ['theme_id' => 40, 'theme_code' => 'great-grandchild', 'level' => 0],
            ['theme_id' => 30, 'theme_code' => 'grandchild', 'level' => 1],
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 2],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 3]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId) {
                return match($themeId) {
                    10 => [['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'v1_parent']],
                    20 => [['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'v1_child']],
                    30 => [['section_code' => 's2', 'setting_code' => 'f2', 'value' => 'v2_grandchild']],
                    40 => [['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'v1_great']],
                };
            });

        $result = $this->resolver->resolveAllValues(40, new Scope('stores', 1), 2);

        $this->assertCount(2, $result);
        
        // s1.f1 should be from great-grandchild (last override)
        $s1f1 = array_values(array_filter($result, fn($v) => $v['section_code'] === 's1'));
        $this->assertEquals('v1_great', $s1f1[0]['value']);
        
        // s2.f2 should be from grandchild (only one with this value)
        $s2f2 = array_values(array_filter($result, fn($v) => $v['section_code'] === 's2'));
        $this->assertEquals('v2_grandchild', $s2f2[0]['value']);
    }

    /**
     * Test 19: Empty values from themes don't break merging
     */
    public function testResolveAllValuesHandlesEmptyThemeValues(): void
    {
        $hierarchy = [
            ['theme_id' => 30, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 20, 'theme_code' => 'parent', 'level' => 1],
            ['theme_id' => 10, 'theme_code' => 'grandparent', 'level' => 2]
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId) {
                return match($themeId) {
                    10 => [['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'logo.png']],
                    20 => [], // Parent has no values
                    30 => [['section_code' => 'footer', 'setting_code' => 'text', 'value' => 'Footer']],
                };
            });

        $result = $this->resolver->resolveAllValues(30, new Scope('stores', 1), 2);

        $this->assertCount(2, $result);
    }

    /**
     * Test: resolveAllValues only queries the child theme when inheritParent is false
     */
    public function testResolveAllValuesSkipsParentsWhenInheritParentIsFalse(): void
    {
        $themeId = 20;
        $storeId = 1;
        $statusId = 2;

        $ownConfig = ['version' => '1.0', 'inheritParent' => false, 'sections' => []];
        $ownValues = [
            ['section_code' => 'header', 'setting_code' => 'logo', 'value' => 'child_logo.png']
        ];

        $this->configProviderMock->expects($this->once())
            ->method('getConfiguration')
            ->with($themeId)
            ->willReturn($ownConfig);

        // getThemeHierarchy must NOT be called
        $this->themeResolverMock->expects($this->never())
            ->method('getThemeHierarchy');

        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with($themeId, $this->isInstanceOf(ScopeInterface::class), $statusId, null)
            ->willReturn($ownValues);

        $result = $this->resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        $this->assertCount(1, $result);
        $this->assertEquals('child_logo.png', $result[0]['value']);
    }

    /**
     * Test: resolveSingleValue only searches child theme when inheritParent is false
     */
    public function testResolveSingleValueSkipsParentsWhenInheritParentIsFalse(): void
    {
        $themeId = 20;
        $storeId = 1;
        $statusId = 2;

        $ownConfig = ['version' => '1.0', 'inheritParent' => false, 'sections' => []];

        $this->configProviderMock->expects($this->once())
            ->method('getConfiguration')
            ->with($themeId)
            ->willReturn($ownConfig);

        // getThemeHierarchy must NOT be called
        $this->themeResolverMock->expects($this->never())
            ->method('getThemeHierarchy');

        // Only one getSingleValue call — for the child theme itself
        $this->valueServiceMock->expects($this->once())
            ->method('getSingleValue')
            ->with($themeId, $this->isInstanceOf(ScopeInterface::class), $statusId, 'header', 'logo', null)
            ->willReturn('child_logo.png');

        $result = $this->resolver->resolveSingleValue($themeId, new Scope('stores', $storeId), $statusId, 'header', 'logo');

        $this->assertEquals('child_logo.png', $result['value']);
        $this->assertFalse($result['isInherited']);
        $this->assertEquals(0, $result['inheritanceLevel']);
    }

    /**
     * Test: shouldInheritParent defaults to true when getConfiguration throws (no settings.json)
     */
    public function testResolveAllValuesDefaultsToInheritWhenConfigThrows(): void
    {
        $themeId = 20;
        $storeId = 1;
        $statusId = 2;

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        // getConfiguration throws — no settings.json
        $this->configProviderMock->expects($this->once())
            ->method('getConfiguration')
            ->with($themeId)
            ->willThrowException(new \Exception('File not found'));

        // Normal hierarchy lookup must still happen
        $this->themeResolverMock->expects($this->once())
            ->method('getThemeHierarchy')
            ->with($themeId)
            ->willReturn($hierarchy);

        $this->valueServiceMock->expects($this->exactly(2))
            ->method('getValuesByTheme')
            ->willReturn([]);

        $result = $this->resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        $this->assertIsArray($result);
    }

    // ========================================================================
    // ISSUE-014: scope chain websiteId — tests for StoreManager integration
    // ========================================================================

    /**
     * Issue-014 / Test A (documents current broken behaviour — PASS before fix):
     * Without StoreManager injected, buildScopeChain for stores/3 returns a
     * single-entry chain [stores/3] because websiteId defaults to 0.
     */
    public function testBuildScopeChainForStoreWithoutStoreManagerReturnsSingleEntry(): void
    {
        // Resolver constructed without StoreManager (current state)
        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
            // no StoreManagerInterface
        );

        $scope = new Scope('stores', 3);
        $chain = $resolver->buildScopeChain($scope);

        // Bug: should be 3, but is 1 without StoreManager
        $this->assertCount(1, $chain, 'Without StoreManager the chain is a single entry (current broken behaviour)');
        $this->assertEquals('stores', $chain[0]->getType());
        $this->assertEquals(3, $chain[0]->getScopeId());
    }

    /**
     * Issue-014 / Test B (documents current broken behaviour — PASS before fix):
     * A value saved at default/0 is NOT visible to a store view when
     * StoreManager is not injected — inheritance chain never includes default.
     */
    public function testDefaultScopeValueNotInheritedByStoreViewWithoutStoreManager(): void
    {
        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
        );

        $themeId  = 10;
        $storeId  = 3;
        $statusId = 2;

        $hierarchy = [['theme_id' => $themeId, 'theme_code' => 'child', 'level' => 0]];
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        // Only stores/3 scope is queried — default/0 is never reached
        $this->valueServiceMock->expects($this->once())
            ->method('getValuesByTheme')
            ->with(
                $themeId,
                $this->callback(fn(ScopeInterface $s) => $s->getType() === 'stores' && $s->getScopeId() === $storeId),
                $statusId,
                null
            )
            ->willReturn([]); // nothing at stores/3

        $result = $resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        // Bug confirmed: value from default/0 never consulted, result is empty
        $this->assertEmpty($result, 'Without StoreManager default-scope values are not inherited (current broken behaviour)');
    }

    /**
     * Issue-014 / Test C (FAIL before fix, PASS after fix):
     * With StoreManager injected, buildScopeChain for stores/3 (website 2)
     * must return [default/0, websites/2, stores/3].
     */
    public function testBuildScopeChainForStoreWithStoreManagerReturnsFullChain(): void
    {
        $storeMock = $this->createMock(StoreInterface::class);
        $storeMock->method('getWebsiteId')->willReturn(2);

        $storeManagerMock = $this->createMock(StoreManagerInterface::class);
        $storeManagerMock->method('getStore')->with(3)->willReturn($storeMock);

        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock,
            $storeManagerMock
        );

        $scope = new Scope('stores', 3);
        $chain = $resolver->buildScopeChain($scope);

        $this->assertCount(3, $chain, 'Full scope chain must have 3 entries: default/0, websites/2, stores/3');
        $this->assertEquals('default',  $chain[0]->getType());
        $this->assertEquals(0,          $chain[0]->getScopeId());
        $this->assertEquals('websites', $chain[1]->getType());
        $this->assertEquals(2,          $chain[1]->getScopeId());
        $this->assertEquals('stores',   $chain[2]->getType());
        $this->assertEquals(3,          $chain[2]->getScopeId());
    }

    /**
     * Issue-014 / Test D (FAIL before fix, PASS after fix):
     * A value saved at default/0 must be inherited by stores/3 when
     * StoreManager is injected and returns websiteId=2.
     */
    public function testDefaultScopeValueIsInheritedByStoreViewViaStoreManager(): void
    {
        $storeMock = $this->createMock(StoreInterface::class);
        $storeMock->method('getWebsiteId')->willReturn(2);

        $storeManagerMock = $this->createMock(StoreManagerInterface::class);
        $storeManagerMock->method('getStore')->with(3)->willReturn($storeMock);

        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock,
            $storeManagerMock
        );

        $themeId  = 10;
        $storeId  = 3;
        $statusId = 2;
        $defaultValue = ['section_code' => 'header', 'setting_code' => 'color', 'value' => 'red'];

        $hierarchy = [['theme_id' => $themeId, 'theme_code' => 'child', 'level' => 0]];
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function (int $tid, ScopeInterface $s) use ($defaultValue) {
                // Only default/0 has the value; websites/2 and stores/3 are empty
                return ($s->getType() === 'default') ? [$defaultValue] : [];
            });

        $result = $resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        $this->assertCount(1, $result, 'Value from default/0 must be inherited by store view');
        $this->assertEquals('red', $result[0]['value']);
    }

    /**
     * Issue-014 / Test E (FAIL before fix, PASS after fix):
     * A value saved at websites/2 must be inherited by stores/3.
     */
    public function testWebsiteScopeValueIsInheritedByStoreViewViaStoreManager(): void
    {
        $storeMock = $this->createMock(StoreInterface::class);
        $storeMock->method('getWebsiteId')->willReturn(2);

        $storeManagerMock = $this->createMock(StoreManagerInterface::class);
        $storeManagerMock->method('getStore')->with(3)->willReturn($storeMock);

        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock,
            $storeManagerMock
        );

        $themeId  = 10;
        $storeId  = 3;
        $statusId = 2;
        $websiteValue = ['section_code' => 'colors', 'setting_code' => 'bg', 'value' => 'blue'];

        $hierarchy = [['theme_id' => $themeId, 'theme_code' => 'child', 'level' => 0]];
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function (int $tid, ScopeInterface $s) use ($websiteValue) {
                return ($s->getType() === 'websites' && $s->getScopeId() === 2) ? [$websiteValue] : [];
            });

        $result = $resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        $this->assertCount(1, $result, 'Value from websites/2 must be inherited by stores/3');
        $this->assertEquals('blue', $result[0]['value']);
    }

    /**
     * Issue-014 / Test F (FAIL before fix, PASS after fix):
     * Store-view value overrides website and default; all three scopes are queried.
     */    public function testStoreViewValueOverridesWebsiteAndDefaultViaStoreManager(): void
    {
        $storeMock = $this->createMock(StoreInterface::class);
        $storeMock->method('getWebsiteId')->willReturn(2);

        $storeManagerMock = $this->createMock(StoreManagerInterface::class);
        $storeManagerMock->method('getStore')->with(3)->willReturn($storeMock);

        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock,
            $storeManagerMock
        );

        $themeId  = 10;
        $storeId  = 3;
        $statusId = 2;

        $hierarchy = [['theme_id' => $themeId, 'theme_code' => 'child', 'level' => 0]];
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        // All three scopes return a value for the same key; stores/3 must win
        $this->valueServiceMock->expects($this->exactly(3))
            ->method('getValuesByTheme')
            ->willReturnCallback(function (int $tid, ScopeInterface $s) {
                $map = [
                    'default'  => 'from-default',
                    'websites' => 'from-website',
                    'stores'   => 'from-store',
                ];
                $raw = $map[$s->getType()] ?? null;
                return $raw
                    ? [['section_code' => 'header', 'setting_code' => 'color', 'value' => $raw]]
                    : [];
            });

        $result = $resolver->resolveAllValues($themeId, new Scope('stores', $storeId), $statusId);

        $this->assertCount(1, $result, 'Duplicate keys must be merged to a single entry');
        $this->assertEquals('from-store', $result[0]['value'], 'Store-view value must override website and default');
    }

    /**
     * Issue-014 bonus / Test G:
     * buildScopeChain for websites/2 returns [default/0, websites/2]
     * WITHOUT StoreManager — websiteId is already in scopeId.
     */
    public function testBuildScopeChainForWebsiteScopeReturnsChainWithDefault(): void
    {
        // Resolver without StoreManager — websites scope must still resolve correctly
        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
            // no StoreManagerInterface
        );

        $scope = new Scope('websites', 2);
        $chain = $resolver->buildScopeChain($scope);

        $this->assertCount(2, $chain, 'websites/W chain must have 2 entries: default/0, websites/2');
        $this->assertEquals('default',  $chain[0]->getType());
        $this->assertEquals(0,          $chain[0]->getScopeId());
        $this->assertEquals('websites', $chain[1]->getType());
        $this->assertEquals(2,          $chain[1]->getScopeId());
    }

    /**
     * Issue-014 bonus / Test H:
     * A value saved at default/0 must be inherited by websites/2
     * WITHOUT StoreManager — websiteId is resolved directly from scopeId.
     */
    public function testDefaultScopeValueIsInheritedByWebsiteScopeWithoutStoreManager(): void
    {
        // Resolver without StoreManager
        $resolver = new ValueInheritanceResolver(
            $this->valueServiceMock,
            $this->themeResolverMock,
            $this->configProviderMock,
            $this->scopeFactoryMock
        );

        $themeId  = 10;
        $statusId = 2;
        $defaultValue = ['section_code' => 'header', 'setting_code' => 'color', 'value' => 'green'];

        $hierarchy = [['theme_id' => $themeId, 'theme_code' => 'child', 'level' => 0]];
        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function (int $tid, ScopeInterface $s) use ($defaultValue) {
                return ($s->getType() === 'default') ? [$defaultValue] : [];
            });

        $result = $resolver->resolveAllValues($themeId, new Scope('websites', 2), $statusId);

        $this->assertCount(1, $result, 'Value from default/0 must be inherited by websites/2');
        $this->assertEquals('green', $result[0]['value']);
    }

    /**
     * Test 20: Correct merge order (parent values applied before child)
     */
    public function testResolveAllValuesMergeOrderIsCorrect(): void
    {
        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child', 'level' => 0],
            ['theme_id' => 10, 'theme_code' => 'parent', 'level' => 1]
        ];

        $parentValues = [
            ['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'parent_value']
        ];

        $childValues = [
            ['section_code' => 's1', 'setting_code' => 'f1', 'value' => 'child_value']
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        // Mock to track call order
        $callOrder = [];
        $this->valueServiceMock->method('getValuesByTheme')
            ->willReturnCallback(function ($themeId) use (&$callOrder, $parentValues, $childValues) {
                $callOrder[] = $themeId;
                return $themeId === 10 ? $parentValues : $childValues;
            });

        $result = $this->resolver->resolveAllValues(20, new Scope('stores', 1), 2);

        // Verify parent was called first (due to array_reverse in implementation)
        $this->assertEquals([10, 20], $callOrder);
        
        // Verify child value won
        $this->assertEquals('child_value', $result[0]['value']);
    }
}
