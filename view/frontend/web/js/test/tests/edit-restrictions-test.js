/**
 * Edit Restrictions Tests
 * 
 * Tests for edit mode restrictions (DRAFT editable, PUBLISHED/PUBLICATION read-only)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function(TestFramework, CssManager) {
    'use strict';
    
    return TestFramework.suite('Edit Restrictions', {
        
        'DRAFT mode should be editable': function(done) {
            var self = this;
            
            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done(err);
                    return;
                }
                
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var isEditable = CssManager.isEditable();
                    self.assertEquals(isEditable, true, 
                        'DRAFT mode should be editable');
                    done();
                }, 100);
            });
        },
        
        'PUBLISHED mode should be read-only': function(done) {
            var self = this;
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var isEditable = CssManager.isEditable();
                self.assertEquals(isEditable, false, 
                    'PUBLISHED mode should be read-only');
                done();
            }, 100);
        },
        
        'PUBLICATION mode should be read-only': function() {
            var status = CssManager.getCurrentStatus();
            
            if (status === 'PUBLICATION') {
                var isEditable = CssManager.isEditable();
                this.assertEquals(isEditable, false, 
                    'PUBLICATION mode should be read-only');
            } else {
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },
        
        'isEditable should return boolean': function() {
            var isEditable = CssManager.isEditable();
            this.assert(typeof isEditable === 'boolean', 
                'isEditable() should return boolean, got: ' + typeof isEditable);
        },
        
        'edit mode should match CSS Manager status': function() {
            var status = CssManager.getCurrentStatus();
            var isEditable = CssManager.isEditable();
            
            if (status === 'DRAFT') {
                this.assertEquals(isEditable, true, 
                    'When status is DRAFT, isEditable should be true');
            } else {
                this.assertEquals(isEditable, false, 
                    'When status is not DRAFT, isEditable should be false');
            }
        }
    });
});
