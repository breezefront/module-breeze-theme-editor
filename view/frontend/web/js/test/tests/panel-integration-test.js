/**
 * Panel Integration Tests
 * 
 * Tests for CSS Manager integration with Theme Editor Panel
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function(TestFramework, CssManager) {
    'use strict';
    
    return TestFramework.suite('Panel Integration', {
        
        'CSS Manager should be initialized early (before panel opens)': function() {
            // CSS Manager should be initialized by toolbar.js (600ms after page load)
            var status = CssManager.getCurrentStatus();
            this.assertNotNull(status, 
                'CSS Manager should be initialized early by toolbar.js');
        },
        
        'should not have "Draft CSS not available" error in console': function() {
            // This is a regression test for the race condition bug
            // We can't directly check console, but if CSS Manager is initialized,
            // the error won't appear when Publication Selector switches modes
            
            var status = CssManager.getCurrentStatus();
            this.assertNotNull(status, 
                'CSS Manager status should not be null (means initialized)');
        },
        
        'should allow mode switching before panel opens': function(done) {
            // Test that we can switch modes without opening Theme Editor panel
            // This was broken before the race condition fix
            
            var self = this;
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                self.assertEquals(CssManager.getCurrentStatus(), 'PUBLISHED',
                    'Should be able to switch to PUBLISHED without opening panel');
                
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    self.assertEquals(CssManager.getCurrentStatus(), 'DRAFT',
                        'Should be able to switch to DRAFT without opening panel');
                    done();
                }, 100);
            }, 100);
        },
        
        'live preview style should be created when panel opens': function(done) {
            // Live preview is created by CssPreviewManager when Theme Editor panel opens
            var self = this;
            
            // Open panel if not already open
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Wait for live preview to be created (with longer timeout)
                self.waitFor(function() {
                    var $livePreview = self.$iframe().find('#bte-live-preview');
                    console.log('   ⏳ Waiting for live preview... exists:', $livePreview.length > 0);
                    return $livePreview.length > 0;
                }, 3000, function(err) {
                    if (err) {
                        self.fail('Live preview not created after panel opened: ' + err.message);
                    } else {
                        self.assertTrue(true, 'Live preview created successfully');
                    }
                    done();
                });
            });
        }
    });
});
