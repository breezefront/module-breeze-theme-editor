/**
 * CSS Manager Tests
 * 
 * Tests for CSS Manager initialization and core functionality
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function(TestFramework, CssManager) {
    'use strict';
    
    return TestFramework.suite('CSS Manager', {
        
        'should be initialized': function(done) {
            var self = this;
            
            // Wait for CSS Manager to initialize
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                } else {
                    var status = CssManager.getCurrentStatus();
                    self.assertNotNull(status, 'CSS Manager should have status');
                }
                done(err);
            });
        },
        
        'should have valid status': function(done) {
            var self = this;
            
            // Wait for CSS Manager to initialize
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                } else {
                    var status = CssManager.getCurrentStatus();
                    self.assertContains(['DRAFT', 'PUBLISHED', 'PUBLICATION'], status, 
                        'Status should be one of: DRAFT, PUBLISHED, PUBLICATION');
                }
                done(err);
            });
        },
        
        'should be editable in DRAFT mode': function() {
            var status = CssManager.getCurrentStatus();
            if (status === 'DRAFT') {
                var isEditable = CssManager.isEditable();
                this.assertEquals(isEditable, true, 'DRAFT mode should be editable');
            }
        },
        
        'should NOT be editable in PUBLISHED mode': function(done) {
            var self = this;
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var isEditable = CssManager.isEditable();
                self.assertEquals(isEditable, false, 'PUBLISHED mode should be read-only');
                done();
            }, 100);
        },
        
        'should switch to DRAFT mode': function(done) {
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
                
                // Now switch to DRAFT
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    self.assertEquals(CssManager.getCurrentStatus(), 'DRAFT', 
                        'Should switch to DRAFT status');
                    done();
                }, 100);
            });
        }
    });
});
