/**
 * Mode Switching Tests
 * 
 * Tests for switching between DRAFT/PUBLISHED modes
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures'
], function(TestFramework, CssManager, fixtures) {
    'use strict';
    
    return TestFramework.suite('Mode Switching', {
        
        'should switch to PUBLISHED mode': function(done) {
            var self = this;
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var $draftIframe = self.$iframe().find('#bte-theme-css-variables-draft');
                self.assertEquals($draftIframe.attr('media'), 'not all', 
                    'Draft should be disabled (media="not all") in PUBLISHED mode');
                done();
            }, 200);
        },
        
        'should show red color in PUBLISHED mode': function(done) {
            var self = this;
            
            // Mock PUBLISHED CSS with red color
            self.mockCss({
                storeId: 1,
                themeId: 5,
                status: 'PUBLISHED'
            }, fixtures.publishedBase);
            
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var color = self.getCssVariable('--base-color');
                self.assertEquals(color, '180, 24, 24', 
                    'Color should be red (180, 24, 24) in PUBLISHED mode');
                done();
            }, 400);
        },
        
        'should switch to DRAFT mode': function(done) {
            var self = this;
            CssManager.switchTo('DRAFT');
            
            setTimeout(function() {
                var $draftIframe = self.$iframe().find('#bte-theme-css-variables-draft');
                self.assertEquals($draftIframe.attr('media'), 'all', 
                    'Draft should be enabled (media="all") in DRAFT mode');
                done();
            }, 200);
        },
        
        'should show blue color in DRAFT mode': function(done) {
            var self = this;
            
            // Mock DRAFT CSS with blue color
            self.mockCss({
                storeId: 1,
                themeId: 5,
                status: 'DRAFT'
            }, fixtures.draftWithChanges);
            
            CssManager.switchTo('DRAFT');
            
            setTimeout(function() {
                var color = self.getCssVariable('--base-color');
                self.assertEquals(color, '15, 39, 219', 
                    'Color should be blue (15, 39, 219) in DRAFT mode');
                done();
            }, 400);
        },
        
        'should sync media attribute from main to iframe': function(done) {
            var self = this;
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var $draftMain = self.$('#bte-theme-css-variables-draft');
                var $draftIframe = self.$iframe().find('#bte-theme-css-variables-draft');
                
                // Both should have same media attribute
                self.assertEquals($draftMain.attr('media'), $draftIframe.attr('media'),
                    'Media attribute should be synced from main to iframe');
                done();
            }, 200);
        },
        
        'should toggle correctly DRAFT -> PUBLISHED -> DRAFT': function(done) {
            var self = this;
            
            // Mock both DRAFT and PUBLISHED CSS
            self.mockCss({
                storeId: 1,
                themeId: 5,
                status: 'DRAFT'
            }, fixtures.draftWithChanges);
            
            self.mockCss({
                storeId: 1,
                themeId: 5,
                status: 'PUBLISHED'
            }, fixtures.publishedBase);
            
            // Start with DRAFT
            CssManager.switchTo('DRAFT');
            
            setTimeout(function() {
                var color1 = self.getCssVariable('--base-color');
                self.assertEquals(color1, '15, 39, 219', 'Step 1: DRAFT color (blue)');
                
                // Switch to PUBLISHED
                CssManager.switchTo('PUBLISHED');
                
                setTimeout(function() {
                    var color2 = self.getCssVariable('--base-color');
                    self.assertEquals(color2, '180, 24, 24', 'Step 2: PUBLISHED color (red)');
                    
                    // Switch back to DRAFT
                    CssManager.switchTo('DRAFT');
                    
                    setTimeout(function() {
                        var color3 = self.getCssVariable('--base-color');
                        self.assertEquals(color3, '15, 39, 219', 'Step 3: Back to DRAFT color (blue)');
                        done();
                    }, 400);
                }, 400);
            }, 400);
        }
    });
});
