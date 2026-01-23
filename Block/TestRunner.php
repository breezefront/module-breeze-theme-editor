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
     * Get list of test modules to load
     *
     * @return array
     */
    public function getTestModules()
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
            // Note: Pickr color picker tests removed - Pickr functionality tested manually
        ];
    }
}
