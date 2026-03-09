<?php

namespace Swissup\BreezeThemeEditor\Block;

use Magento\Framework\View\Element\Template;

class TestRunner extends Template
{
    /**
     * Check if tests should be rendered based on URL parameter
     *
     * @return bool
     */
    public function shouldRenderTests()
    {
        $request = $this->getRequest();
        $jstest = $request->getParam('jstest');
        
        return $jstest === 'true' || $jstest === '1';
    }
    
    /**
     * Check if tests should auto-run
     *
     * @return bool
     */
    public function shouldAutoRun()
    {
        $request = $this->getRequest();
        $autorun = $request->getParam('autorun');
        
        return $autorun === 'true' || $autorun === '1';
    }
    
    /**
     * Get specific test suite to run (or null for all)
     *
     * @return string|null
     */
    public function getTestSuite()
    {
        return $this->getRequest()->getParam('suite');
    }
    
    /**
     * Check if this is admin context
     *
     * @return bool
     */
    public function isAdminContext()
    {
        // Primary method: Check area code
        try {
            $objectManager = \Magento\Framework\App\ObjectManager::getInstance();
            $state = $objectManager->get(\Magento\Framework\App\State::class);
            $areaCode = $state->getAreaCode();
            
            if ($areaCode === 'adminhtml') {
                return true;
            }
        } catch (\Exception $e) {
            // Area not set yet, continue to fallback
        }
        
        // Fallback method 1: Check request route
        try {
            $request = $this->getRequest();
            $moduleName = $request->getModuleName();
            $controllerName = $request->getControllerName();
            
            // Check if it's admin editor route
            if ($moduleName === 'breeze_editor' && $controllerName === 'editor') {
                return true;
            }
            
            // Check if request is in admin area
            if ($moduleName === 'admin' || strpos($moduleName, 'admin') === 0) {
                return true;
            }
        } catch (\Exception $e) {
            // Request not available, continue to fallback
        }
        
        // Fallback method 2: Check template path
        $template = $this->getTemplate();
        if ($template && (strpos($template, 'adminhtml') !== false || strpos($template, 'admin/') !== false)) {
            return true;
        }
        
        // Default: assume frontend
        return false;
    }
    
    /**
     * Get list of test modules to load
     *
     * @return array
     */
    public function getTestModules()
    {
        return $this->isAdminContext() 
            ? $this->getAdminTestModules()
            : $this->getFrontendTestModules();
    }
    
    /**
     * Get frontend test modules
     *
     * @return array
     */
    protected function getFrontendTestModules()
    {
        return [
            'Swissup_BreezeThemeEditor/js/test/tests/auth-manager-test',
            'Swissup_BreezeThemeEditor/js/test/tests/css-manager-test',
            'Swissup_BreezeThemeEditor/js/test/tests/media-attributes-test',
            'Swissup_BreezeThemeEditor/js/test/tests/mode-switching-test',
            'Swissup_BreezeThemeEditor/js/test/tests/panel-integration-test',
            'Swissup_BreezeThemeEditor/js/test/tests/publication-mode-test',
            'Swissup_BreezeThemeEditor/js/test/tests/live-preview-test',
            'Swissup_BreezeThemeEditor/js/test/tests/edit-restrictions-test',
            'Swissup_BreezeThemeEditor/js/test/tests/error-handling-test',
            // Palette & Preset Disabled State Tests (7 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/palette-preset-disabled-test',
            // Color Utils Tests (8 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/color-utils-test',
            // Color Utils RGB Wrapper Tests (6 tests) - NEW
            'Swissup_BreezeThemeEditor/js/test/tests/color-utils-rgb-wrapper-test',
            // Palette Format Mapping Tests (8 tests) - NEW
            'Swissup_BreezeThemeEditor/js/test/tests/palette-format-mapping-test',
            // Badge Renderer Tests (8 tests) - NEW
            'Swissup_BreezeThemeEditor/js/test/tests/badge-renderer-test',
            // Palette System Tests (32 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/palette-manager-test',
            'Swissup_BreezeThemeEditor/js/test/tests/palette-graphql-test',
            'Swissup_BreezeThemeEditor/js/test/tests/palette-section-renderer-test',
            'Swissup_BreezeThemeEditor/js/test/tests/palette-integration-test',
            // Color Field Palette Reference Tests (10 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/color-field-palette-ref-test',
            // Cascade Behavior Tests (7 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/cascade-behavior-test',
            // Color Field Renderer Tests (13 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/color-renderer-test',
            // Field Badges Reset Tests (6 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/field-badges-reset-test',
            // Note: Pickr color picker tests removed - Pickr functionality tested manually
        ];
    }
    
    /**
     * Get admin test modules
     *
     * @return array
     */
    protected function getAdminTestModules()
    {
        return [
            // Admin-specific tests
            'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
            'Swissup_BreezeThemeEditor/js/test/tests/url-navigation-persistence-test',
            // Storage Helper JSON methods (11 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/storage-helper-test',
            // Color Utils Tests (12 tests) - Bug 0 fix verification
            'Swissup_BreezeThemeEditor/js/test/tests/color-utils-test',
            // DOM Color Utils HEX8 Tests (9 tests) - Alpha channel support
            'Swissup_BreezeThemeEditor/js/test/tests/dom-color-utils-test',
            // Page Selector Sync Tests (10 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/page-selector-sync-test',
            // Phase 3: Navigation Panel Tests (20 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/panel-positioning-test',
            'Swissup_BreezeThemeEditor/js/test/tests/navigation-widget-test',
            'Swissup_BreezeThemeEditor/js/test/tests/panel-events-test',
            'Swissup_BreezeThemeEditor/js/test/tests/panel-integration-test',
            // Panel Close Integration Tests (5 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/panel-close-integration-test',
            // Admin-Frontend Alignment Tests (14 tests)
            'Swissup_BreezeThemeEditor/js/test/tests/publication-events-alignment-test',
            'Swissup_BreezeThemeEditor/js/test/tests/selector-alignment-test',
            // Critical Fixes Tests (5 tests) - Pickr CSS + Field Editability
            'Swissup_BreezeThemeEditor/js/test/tests/critical-fixes-test',
            // CssPreviewManager Palette Injection Tests (11 tests) - Bug 3 JS layer fix
            'Swissup_BreezeThemeEditor/js/test/tests/css-preview-manager-palette-test',
            // Palette Reset Behavior Tests (8 tests) - focus-return click fix
            'Swissup_BreezeThemeEditor/js/test/tests/palette-reset-behavior-test',
            // Field Renderers Tests (64 tests) - prepareData() coverage + property rename + selectedLabel + fontStylesheetMap
            'Swissup_BreezeThemeEditor/js/test/tests/field-renderers-test',
            // Font Picker Dropdown Handler Tests (14 tests) - open/close/select/outside-click/Escape
            'Swissup_BreezeThemeEditor/js/test/tests/font-picker-test',
            // Font Palette Manager Tests (25 tests) - all public API incl. setCurrentValue/getCurrentValue
            'Swissup_BreezeThemeEditor/js/test/tests/font-palette-manager-test',
            // Font Palette Section Renderer Tests (33 tests) - pure-logic + DOM inline integration
            'Swissup_BreezeThemeEditor/js/test/tests/font-palette-section-renderer-test',
            // Palette Manager Tests (11 tests) - isColorModified uses saved DB value, not unsaved
            'Swissup_BreezeThemeEditor/js/test/tests/palette-manager-test',
            // Publication Selector Tests (15 tests) - canPublish logic + Bug 1 + Bug 2 regression
            'Swissup_BreezeThemeEditor/js/test/tests/publication-selector-test',
            // Settings Editor Reset/Restore CSS Preview Tests (10 tests) - data-property vs data-css-var bug
            'Swissup_BreezeThemeEditor/js/test/tests/settings-editor-reset-test',
            // Discard Published Preview Refresh Tests (14 tests) - bte:publishedDiscarded had no listener
            'Swissup_BreezeThemeEditor/js/test/tests/discard-published-preview-test',
            // Toastify Library Tests (17 tests) - DOM structure, types, options, hide/show, shortcuts
            'Swissup_BreezeThemeEditor/js/test/tests/toastify-test',
        ];
    }
}
