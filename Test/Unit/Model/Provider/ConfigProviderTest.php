<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\MockObject\MockObject;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Magento\Framework\Serialize\SerializerInterface;
use Magento\Theme\Model\ResourceModel\Theme\CollectionFactory as ThemeCollectionFactory;
use Magento\Framework\Component\ComponentRegistrar;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Test\Unit\Model\Provider\Stub\ArrayObjectStub;
use Magento\Framework\Exception\LocalizedException;

/**
 * Unit tests for ConfigProvider
 * 
 * Note: Tests for loadConfigFile and findConfigFile methods are limited due to
 * file system dependencies. These are better tested with integration tests.
 * We focus on testing the logic methods: deepMerge, mergeSections, mergeSettings,
 * and the public API methods that don't require file I/O.
 */
class ConfigProviderTest extends TestCase
{
    private ConfigProvider $configProvider;
    private SerializerInterface|MockObject $serializerMock;
    private ThemeCollectionFactory|MockObject $themeCollectionFactoryMock;
    private ComponentRegistrar|MockObject $componentRegistrarMock;
    private ThemeResolver|MockObject $themeResolverMock;

    protected function setUp(): void
    {
        $this->serializerMock = $this->createMock(SerializerInterface::class);
        $this->themeCollectionFactoryMock = $this->createMock(ThemeCollectionFactory::class);
        $this->componentRegistrarMock = $this->createMock(ComponentRegistrar::class);
        $this->themeResolverMock = $this->createMock(ThemeResolver::class);

        $this->configProvider = new ConfigProvider(
            $this->serializerMock,
            $this->themeCollectionFactoryMock,
            $this->componentRegistrarMock,
            $this->themeResolverMock
        );
    }

    /**
     * Test 1: getConfigurationWithInheritance merges parent configs
     * Uses reflection to test the merge logic
     */
    public function testGetConfigurationWithInheritanceMergesParentConfigs(): void
    {
        $parentConfig = [
            'version' => '1.0',
            'sections' => [
                ['id' => 'header', 'name' => 'Parent Header', 'settings' => [
                    ['id' => 'logo', 'type' => 'text', 'default' => 'parent_logo.png']
                ]]
            ],
            'presets' => [],
            'metadata' => []
        ];

        $childConfig = [
            'version' => '1.0',
            'sections' => [
                ['id' => 'header', 'name' => 'Child Header', 'settings' => [
                    ['id' => 'logo', 'type' => 'text', 'default' => 'child_logo.png']
                ]]
            ],
            'presets' => [],
            'metadata' => []
        ];

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child'],
            ['theme_id' => 10, 'theme_code' => 'parent']
        ];

        $this->themeResolverMock->method('getThemeHierarchy')->willReturn($hierarchy);

        // Use reflection to call deepMerge directly (testing merge logic)
        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $parentConfig, $childConfig);

        // Child should override parent's section name
        $this->assertEquals('Child Header', $result['sections'][0]['name']);
        // Child logo should override parent logo
        $this->assertEquals('child_logo.png', $result['sections'][0]['settings'][0]['default']);
    }

    /**
     * Test 2: mergeSections updates existing sections by ID
     */
    public function testMergeSectionsUpdatesExistingSectionsById(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header', 'order' => 10, 'settings' => []],
            ['id' => 'footer', 'name' => 'Footer', 'order' => 20, 'settings' => []]
        ];

        $overrideSections = [
            ['id' => 'header', 'name' => 'New Header', 'description' => 'Updated']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(2, $result);
        $this->assertEquals('New Header', $result[0]['name']);
        $this->assertEquals('Updated', $result[0]['description']);
        $this->assertEquals(10, $result[0]['order']); // Original field preserved
        $this->assertEquals('Footer', $result[1]['name']); // Unchanged section
    }

    /**
     * Test 3: mergeSections adds new sections not in base
     */
    public function testMergeSectionsAddsNewSections(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header', 'settings' => []]
        ];

        $overrideSections = [
            ['id' => 'sidebar', 'name' => 'Sidebar', 'settings' => []]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(2, $result);
        $this->assertEquals('header', $result[0]['id']);
        $this->assertEquals('sidebar', $result[1]['id']);
    }

    /**
     * Test 4: mergeSections merges settings when both sections have them
     */
    public function testMergeSectionsMergesSettings(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header', 'settings' => [
                ['id' => 'logo', 'type' => 'text', 'default' => 'logo.png']
            ]]
        ];

        $overrideSections = [
            ['id' => 'header', 'settings' => [
                ['id' => 'logo', 'default' => 'new_logo.png']
            ]]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertEquals('new_logo.png', $result[0]['settings'][0]['default']);
        $this->assertEquals('text', $result[0]['settings'][0]['type']); // Preserved from base
    }

    /**
     * Test 5: mergeSettings updates existing settings by ID
     */
    public function testMergeSettingsUpdatesExistingSettingsById(): void
    {
        $baseSettings = [
            ['id' => 'logo', 'type' => 'text', 'default' => 'logo.png', 'label' => 'Logo'],
            ['id' => 'title', 'type' => 'text', 'default' => 'Title']
        ];

        $overrideSettings = [
            ['id' => 'logo', 'default' => 'new_logo.png', 'description' => 'Updated logo']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSettingsMethod = $reflection->getMethod('mergeSettings');
        $mergeSettingsMethod->setAccessible(true);

        $result = $mergeSettingsMethod->invoke($this->configProvider, $baseSettings, $overrideSettings);

        $this->assertCount(2, $result);
        $this->assertEquals('new_logo.png', $result[0]['default']);
        $this->assertEquals('Updated logo', $result[0]['description']);
        $this->assertEquals('Logo', $result[0]['label']); // Preserved from base
        $this->assertEquals('Title', $result[1]['default']); // Unchanged setting
    }

    /**
     * Test 6: mergeSettings adds new settings not in base
     */
    public function testMergeSettingsAddsNewSettings(): void
    {
        $baseSettings = [
            ['id' => 'logo', 'type' => 'text']
        ];

        $overrideSettings = [
            ['id' => 'subtitle', 'type' => 'text', 'default' => 'Subtitle']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSettingsMethod = $reflection->getMethod('mergeSettings');
        $mergeSettingsMethod->setAccessible(true);

        $result = $mergeSettingsMethod->invoke($this->configProvider, $baseSettings, $overrideSettings);

        $this->assertCount(2, $result);
        $this->assertEquals('logo', $result[0]['id']);
        $this->assertEquals('subtitle', $result[1]['id']);
    }

    /**
     * Test 7: deepMerge handles simple value overrides
     */
    public function testDeepMergeSimpleValueOverrides(): void
    {
        $base = [
            'version' => '1.0',
            'author' => 'Original',
            'metadata' => ['theme' => 'base']
        ];

        $override = [
            'version' => '2.0',
            'metadata' => ['theme' => 'override']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $base, $override);

        $this->assertEquals('2.0', $result['version']);
        $this->assertEquals('Original', $result['author']); // Preserved
        $this->assertEquals('override', $result['metadata']['theme']);
    }

    /**
     * Test 8: deepMerge recursively merges nested arrays
     */
    public function testDeepMergeRecursivelyMergesNestedArrays(): void
    {
        $base = [
            'metadata' => [
                'theme' => 'base',
                'author' => 'John',
                'nested' => [
                    'level1' => 'value1',
                    'level2' => 'value2'
                ]
            ]
        ];

        $override = [
            'metadata' => [
                'theme' => 'override',
                'nested' => [
                    'level2' => 'new_value2',
                    'level3' => 'value3'
                ]
            ]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $base, $override);

        $this->assertEquals('override', $result['metadata']['theme']);
        $this->assertEquals('John', $result['metadata']['author']); // Preserved
        $this->assertEquals('value1', $result['metadata']['nested']['level1']);
        $this->assertEquals('new_value2', $result['metadata']['nested']['level2']);
        $this->assertEquals('value3', $result['metadata']['nested']['level3']);
    }

    /**
     * Test 9: deepMerge handles sections key specially
     */
    public function testDeepMergeHandlesSectionsSpecially(): void
    {
        $base = [
            'sections' => [
                ['id' => 'header', 'name' => 'Header']
            ]
        ];

        $override = [
            'sections' => [
                ['id' => 'header', 'name' => 'New Header'],
                ['id' => 'footer', 'name' => 'Footer']
            ]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $base, $override);

        // Sections should be merged by ID, not just overwritten
        $this->assertCount(2, $result['sections']);
        $this->assertEquals('New Header', $result['sections'][0]['name']);
        $this->assertEquals('footer', $result['sections'][1]['id']);
    }

    /**
     * Test 10: getAllDefaults extracts all default values
     */
    public function testGetAllDefaultsExtractsAllDefaultValues(): void
    {
        // We can't easily test this without mocking getConfiguration which loads from file
        // This test would require creating a stub ConfigProvider or using integration tests
        $this->markTestSkipped('Requires file I/O mocking - better suited for integration tests');
    }

    /**
     * Test 11: getFieldDefault returns null when field not found
     */
    public function testGetFieldDefaultReturnsNullWhenFieldNotFound(): void
    {
        $this->markTestSkipped('Requires file I/O mocking - better suited for integration tests');
    }

    /**
     * Test 14: mergeSections handles empty settings arrays
     */
    public function testMergeSectionsHandlesEmptySettingsArrays(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header', 'settings' => []]
        ];

        $overrideSections = [
            ['id' => 'header', 'name' => 'Updated Header']
            // No settings key provided
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(1, $result);
        $this->assertEquals('Updated Header', $result[0]['name']);
        $this->assertEquals([], $result[0]['settings']); // Empty array preserved
    }

    /**
     * Test 15: mergeSections preserves all updatable fields
     */
    public function testMergeSectionsPreservesAllUpdatableFields(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header', 'order' => 10, 'icon' => 'old_icon']
        ];

        $overrideSections = [
            ['id' => 'header', 'name' => 'New Header', 'description' => 'Desc', 'icon' => 'new_icon', 'order' => 5]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertEquals('New Header', $result[0]['name']);
        $this->assertEquals('Desc', $result[0]['description']);
        $this->assertEquals('new_icon', $result[0]['icon']);
        $this->assertEquals(5, $result[0]['order']);
    }

    /**
     * Test 15b: mergeSections propagates 'selector' from override to base section.
     */
    public function testMergeSectionsPropagatesSelectorField(): void
    {
        $baseSections = [
            ['id' => 'layout', 'name' => 'Layout']
        ];

        $overrideSections = [
            ['id' => 'layout', 'selector' => '.columns-container']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $method = $reflection->getMethod('mergeSections');
        $method->setAccessible(true);

        $result = $method->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertArrayHasKey('selector', $result[0]);
        $this->assertEquals('.columns-container', $result[0]['selector']);
    }

    /**
     * Test 15c: mergeSections allows array selector to be set via override.
     */
    public function testMergeSectionsAllowsArraySelector(): void
    {
        $baseSections = [
            ['id' => 'layout', 'name' => 'Layout']
        ];

        $overrideSections = [
            ['id' => 'layout', 'selector' => ['.columns-container', '.page-wrapper']]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $method = $reflection->getMethod('mergeSections');
        $method->setAccessible(true);

        $result = $method->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertEquals(['.columns-container', '.page-wrapper'], $result[0]['selector']);
    }

    /**
     * Test 15d: mergeSections does not add 'selector' key when override has none.
     */
    public function testMergeSectionsDoesNotAddSelectorWhenAbsent(): void
    {
        $baseSections = [
            ['id' => 'layout', 'name' => 'Layout']
        ];

        $overrideSections = [
            ['id' => 'layout', 'name' => 'New Layout']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $method = $reflection->getMethod('mergeSections');
        $method->setAccessible(true);

        $result = $method->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertArrayNotHasKey('selector', $result[0]);
    }


    public function testMergeSettingsFullyMergesSettingArrays(): void
    {
        $baseSettings = [
            ['id' => 'logo', 'type' => 'image', 'default' => 'old.png', 'label' => 'Logo', 'required' => false]
        ];

        $overrideSettings = [
            ['id' => 'logo', 'default' => 'new.png', 'description' => 'Upload logo', 'required' => true]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSettingsMethod = $reflection->getMethod('mergeSettings');
        $mergeSettingsMethod->setAccessible(true);

        $result = $mergeSettingsMethod->invoke($this->configProvider, $baseSettings, $overrideSettings);

        // array_merge should preserve all keys from base and override with new values
        $this->assertEquals('image', $result[0]['type']); // From base
        $this->assertEquals('Logo', $result[0]['label']); // From base
        $this->assertEquals('new.png', $result[0]['default']); // Overridden
        $this->assertEquals('Upload logo', $result[0]['description']); // New from override
        $this->assertTrue($result[0]['required']); // Overridden
    }

    /**
     * Test 17: deepMerge handles empty base array
     */
    public function testDeepMergeHandlesEmptyBaseArray(): void
    {
        $base = [];
        $override = [
            'version' => '1.0',
            'sections' => []
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $base, $override);

        $this->assertEquals($override, $result);
    }

    /**
     * Test 18: deepMerge handles empty override array
     */
    public function testDeepMergeHandlesEmptyOverrideArray(): void
    {
        $base = [
            'version' => '1.0',
            'sections' => []
        ];
        $override = [];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        $result = $deepMergeMethod->invoke($this->configProvider, $base, $override);

        $this->assertEquals($base, $result);
    }

    /**
     * Test 19: mergeSections handles empty base sections
     */
    public function testMergeSectionsHandlesEmptyBaseSections(): void
    {
        $baseSections = [];
        $overrideSections = [
            ['id' => 'header', 'name' => 'Header']
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(1, $result);
        $this->assertEquals('header', $result[0]['id']);
    }

    /**
     * Test 22: mergeSections removes a section when disable is true
     */
    public function testMergeSectionsRemovesSectionWhenDisableIsTrue(): void
    {
        $baseSections = [
            ['id' => 'layout', 'name' => 'Layout', 'settings' => []],
            ['id' => 'typography', 'name' => 'Typography', 'settings' => []]
        ];

        $overrideSections = [
            ['id' => 'layout', 'disable' => true]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(1, $result);
        $this->assertEquals('typography', $result[0]['id']);
    }

    /**
     * Test 23: mergeSections ignores disable on non-existing section (does not add it)
     */
    public function testMergeSectionsIgnoresDisableOnNonExistingSection(): void
    {
        $baseSections = [
            ['id' => 'typography', 'name' => 'Typography', 'settings' => []]
        ];

        $overrideSections = [
            ['id' => 'layout', 'disable' => true]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertCount(1, $result);
        $this->assertEquals('typography', $result[0]['id']);
    }

    /**
     * Test 24: mergeSettings removes a setting when disable is true
     */
    public function testMergeSettingsRemovesSettingWhenDisableIsTrue(): void
    {
        $baseSettings = [
            ['id' => 'max-width', 'type' => 'range', 'default' => '1260px'],
            ['id' => 'border-radius', 'type' => 'range', 'default' => '0px']
        ];

        $overrideSettings = [
            ['id' => 'border-radius', 'disable' => true]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSettingsMethod = $reflection->getMethod('mergeSettings');
        $mergeSettingsMethod->setAccessible(true);

        $result = $mergeSettingsMethod->invoke($this->configProvider, $baseSettings, $overrideSettings);

        $this->assertCount(1, $result);
        $this->assertEquals('max-width', $result[0]['id']);
    }

    /**
     * Test 25: mergeSettings ignores disable on non-existing setting (does not add it)
     */
    public function testMergeSettingsIgnoresDisableOnNonExistingSetting(): void
    {
        $baseSettings = [
            ['id' => 'max-width', 'type' => 'range', 'default' => '1260px']
        ];

        $overrideSettings = [
            ['id' => 'border-radius', 'disable' => true]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSettingsMethod = $reflection->getMethod('mergeSettings');
        $mergeSettingsMethod->setAccessible(true);

        $result = $mergeSettingsMethod->invoke($this->configProvider, $baseSettings, $overrideSettings);

        $this->assertCount(1, $result);
        $this->assertEquals('max-width', $result[0]['id']);
    }

    /**
     * Test: getConfigurationWithInheritance returns only own config when inheritParent is false
     */
    public function testGetConfigurationWithInheritanceSkipsParentsWhenInheritParentIsFalse(): void
    {
        $childConfig = [
            'version' => '1.0',
            'inheritParent' => false,
            'sections' => [
                ['id' => 'header', 'name' => 'Child Only Header', 'settings' => []]
            ],
            'presets' => [],
            'metadata' => ['themeId' => 20]
        ];

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child'],
            ['theme_id' => 10, 'theme_code' => 'parent']
        ];

        // getThemeHierarchy must NOT be called — we bail out before reaching it
        $this->themeResolverMock->expects($this->never())
            ->method('getThemeHierarchy');

        // Inject own config into cache via reflection
        $reflection = new \ReflectionClass($this->configProvider);
        $cacheProperty = $reflection->getProperty('configCache');
        $cacheProperty->setAccessible(true);
        $cacheProperty->setValue($this->configProvider, [20 => $childConfig]);

        $result = $this->configProvider->getConfigurationWithInheritance(20);

        $this->assertCount(1, $result['sections']);
        $this->assertEquals('Child Only Header', $result['sections'][0]['name']);
        $this->assertFalse($result['inheritParent']);
    }

    /**
     * Test: getConfigurationWithInheritance still merges parents when inheritParent key is absent
     */
    public function testGetConfigurationWithInheritanceMergesParentsWhenInheritParentKeyIsAbsent(): void
    {
        $parentConfig = [
            'version' => '1.0',
            'sections' => [
                ['id' => 'footer', 'name' => 'Parent Footer', 'settings' => []]
            ],
            'presets' => [],
            'metadata' => []
        ];

        $childConfig = [
            'version' => '1.0',
            // No 'inheritParent' key — defaults to true
            'sections' => [
                ['id' => 'header', 'name' => 'Child Header', 'settings' => []]
            ],
            'presets' => [],
            'metadata' => []
        ];

        $hierarchy = [
            ['theme_id' => 20, 'theme_code' => 'child'],
            ['theme_id' => 10, 'theme_code' => 'parent']
        ];

        $this->themeResolverMock->expects($this->once())
            ->method('getThemeHierarchy')
            ->with(20)
            ->willReturn($hierarchy);

        // Inject both configs into cache
        $reflection = new \ReflectionClass($this->configProvider);
        $cacheProperty = $reflection->getProperty('configCache');
        $cacheProperty->setAccessible(true);
        $cacheProperty->setValue($this->configProvider, [
            20 => $childConfig,
            10 => $parentConfig,
        ]);

        $result = $this->configProvider->getConfigurationWithInheritance(20);

        // Both sections should be present (normal merge)
        $ids = array_column($result['sections'], 'id');
        $this->assertContains('header', $ids);
        $this->assertContains('footer', $ids);
    }

    /**
     * Test 20: mergeSections handles empty override sections
     */
    public function testMergeSectionsHandlesEmptyOverrideSections(): void
    {
        $baseSections = [
            ['id' => 'header', 'name' => 'Header']
        ];
        $overrideSections = [];

        $reflection = new \ReflectionClass($this->configProvider);
        $mergeSectionsMethod = $reflection->getMethod('mergeSections');
        $mergeSectionsMethod->setAccessible(true);

        $result = $mergeSectionsMethod->invoke($this->configProvider, $baseSections, $overrideSections);

        $this->assertEquals($baseSections, $result);
    }

    /**
     * Test 21: Complex multi-level inheritance merge scenario
     */
    public function testComplexMultiLevelInheritanceMerge(): void
    {
        $grandparentConfig = [
            'version' => '1.0',
            'sections' => [
                ['id' => 'header', 'name' => 'Grandparent Header', 'settings' => [
                    ['id' => 'logo', 'default' => 'gp_logo.png'],
                    ['id' => 'title', 'default' => 'GP Title']
                ]],
                ['id' => 'footer', 'name' => 'Grandparent Footer', 'settings' => [
                    ['id' => 'copyright', 'default' => '2020']
                ]]
            ]
        ];

        $parentConfig = [
            'sections' => [
                ['id' => 'header', 'name' => 'Parent Header', 'settings' => [
                    ['id' => 'logo', 'default' => 'p_logo.png']
                    // title inherited from grandparent
                ]]
                // footer inherited completely from grandparent
            ]
        ];

        $childConfig = [
            'sections' => [
                ['id' => 'header', 'settings' => [
                    ['id' => 'title', 'default' => 'Child Title']
                    // logo inherited from parent
                ]],
                ['id' => 'sidebar', 'name' => 'Child Sidebar', 'settings' => [
                    ['id' => 'widget', 'default' => 'widget1']
                ]]
            ]
        ];

        $reflection = new \ReflectionClass($this->configProvider);
        $deepMergeMethod = $reflection->getMethod('deepMerge');
        $deepMergeMethod->setAccessible(true);

        // Merge grandparent -> parent
        $step1 = $deepMergeMethod->invoke($this->configProvider, $grandparentConfig, $parentConfig);
        
        // Merge result -> child
        $finalResult = $deepMergeMethod->invoke($this->configProvider, $step1, $childConfig);

        // Verify header section
        $headerSection = null;
        foreach ($finalResult['sections'] as $section) {
            if ($section['id'] === 'header') {
                $headerSection = $section;
                break;
            }
        }

        $this->assertNotNull($headerSection);
        $this->assertEquals('Parent Header', $headerSection['name']); // From parent

        // Find logo and title settings
        $logoSetting = null;
        $titleSetting = null;
        foreach ($headerSection['settings'] as $setting) {
            if ($setting['id'] === 'logo') $logoSetting = $setting;
            if ($setting['id'] === 'title') $titleSetting = $setting;
        }

        $this->assertEquals('p_logo.png', $logoSetting['default']); // From parent
        $this->assertEquals('Child Title', $titleSetting['default']); // From child

        // Verify footer exists (inherited from grandparent)
        $footerSection = null;
        foreach ($finalResult['sections'] as $section) {
            if ($section['id'] === 'footer') {
                $footerSection = $section;
                break;
            }
        }
        $this->assertNotNull($footerSection);
        $this->assertEquals('Grandparent Footer', $footerSection['name']);

        // Verify sidebar exists (only in child)
        $sidebarSection = null;
        foreach ($finalResult['sections'] as $section) {
            if ($section['id'] === 'sidebar') {
                $sidebarSection = $section;
                break;
            }
        }
        $this->assertNotNull($sidebarSection);
        $this->assertEquals('Child Sidebar', $sidebarSection['name']);

        // Total: 3 sections
        $this->assertCount(3, $finalResult['sections']);
    }

    // =========================================================================
    // getThemeIdsWithConfigFile
    // =========================================================================

    /**
     * Test: returns only the IDs of themes that actually have settings.json.
     *
     * Three themes in the collection:
     *   - theme 1 (id=1): has settings.json  → included
     *   - theme 2 (id=2): no settings.json   → excluded
     *   - theme 3 (id=3): has settings.json  → included
     */
    public function testGetThemeIdsWithConfigFile_returnsOnlyThemesWithFile(): void
    {
        // Arrange — temp directory with a real settings.json
        $tmpDir = sys_get_temp_dir() . '/bte_test_' . uniqid('', true);
        $configDir = $tmpDir . '/etc/theme_editor';
        mkdir($configDir, 0777, true);
        file_put_contents($configDir . '/settings.json', '{}');

        $makeTheme = function (int $id, string $path) {
            $theme = $this->createMock(\Magento\Theme\Model\Theme::class);
            $theme->method('getId')->willReturn($id);
            $theme->method('getFullPath')->willReturn($path);
            return $theme;
        };

        $theme1 = $makeTheme(1, 'frontend/Vendor/ThemeWithConfig');
        $theme2 = $makeTheme(2, 'frontend/Vendor/ThemeNoConfig');
        $theme3 = $makeTheme(3, 'frontend/Vendor/AnotherThemeWithConfig');

        $this->themeCollectionFactoryMock
            ->method('create')
            ->willReturn(new ArrayObjectStub([$theme1, $theme2, $theme3]));

        // ComponentRegistrar returns the temp dir for themes 1 & 3, null for theme 2
        $this->componentRegistrarMock
            ->method('getPath')
            ->willReturnCallback(function (string $type, string $code) use ($tmpDir): ?string {
                return in_array($code, ['frontend/Vendor/ThemeWithConfig', 'frontend/Vendor/AnotherThemeWithConfig'], true)
                    ? $tmpDir
                    : null;
            });

        // Act
        $result = $this->configProvider->getThemeIdsWithConfigFile();

        // Assert
        $this->assertSame([1 => true, 3 => true], $result);

        // Cleanup
        unlink($configDir . '/settings.json');
        rmdir($configDir);
        rmdir($tmpDir . '/etc');
        rmdir($tmpDir);
    }

    /**
     * Test: returns an empty array when the theme collection is empty.
     */
    public function testGetThemeIdsWithConfigFile_emptyCollection_returnsEmptyArray(): void
    {
        $this->themeCollectionFactoryMock
            ->method('create')
            ->willReturn(new ArrayObjectStub([]));

        $result = $this->configProvider->getThemeIdsWithConfigFile();

        $this->assertSame([], $result);
    }
}
