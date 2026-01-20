/**
 * Mode Switching Tests
 * 
 * Tests for switching between DRAFT/PUBLISHED modes
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function(TestFramework, CssManager) {
    'use strict';
    
    return TestFramework.suite('Mode Switching', {
        
        'should switch to PUBLISHED mode': function(done) {
            var self = this;
            
            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done();
                    return;
                }
                
                // Now switch to PUBLISHED
                CssManager.switchTo('PUBLISHED');
                
                setTimeout(function() {
                    var $draftIframe = self.$iframe().find('#bte-theme-css-variables-draft');
                    self.assertEquals($draftIframe.attr('media'), 'not all', 
                        'Draft should be disabled (media="not all") in PUBLISHED mode');
                    done();
                }, 200);
            });
        },
        
        'should switch to DRAFT mode': function(done) {
            var self = this;
            
            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done();
                    return;
                }
                
                // Now switch to DRAFT
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var $draftIframe = self.$iframe().find('#bte-theme-css-variables-draft');
                    self.assertEquals($draftIframe.attr('media'), 'all', 
                        'Draft should be enabled (media="all") in DRAFT mode');
                    done();
                }, 200);
            });
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
        }
    });
});
