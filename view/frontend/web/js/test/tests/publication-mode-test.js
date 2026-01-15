/**
 * Publication Mode Tests
 * 
 * Tests for PUBLICATION mode (viewing historical versions)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager'
], function(TestFramework, CssManager) {
    'use strict';
    
    return TestFramework.suite('Publication Mode', {
        
        'should have publication style element when in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();
            
            if (status === 'PUBLICATION') {
                var $publication = this.$iframe().find('#bte-publication-css');
                this.assertTrue($publication.length > 0, 
                    'Publication CSS style should exist in PUBLICATION mode');
            } else {
                // Not in PUBLICATION mode - skip test
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },
        
        'should NOT be editable in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();
            
            if (status === 'PUBLICATION') {
                this.assertFalse(CssManager.isEditable(), 
                    'PUBLICATION mode should be read-only');
            } else {
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },
        
        'publication style should have media="all"': function() {
            var $publication = this.$iframe().find('#bte-publication-css');
            
            if ($publication.length > 0) {
                this.assertEquals($publication.attr('media'), 'all', 
                    'Publication style should have media="all"');
            } else {
                this.assert(true, 'Publication style not present - test skipped');
            }
        },
        
        'published and draft styles should be disabled in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();
            
            if (status === 'PUBLICATION') {
                var $published = this.$iframe().find('#bte-theme-css-variables');
                var $draft = this.$iframe().find('#bte-theme-css-variables-draft');
                
                this.assertEquals($published.attr('media'), 'not all', 
                    'Published should be disabled in PUBLICATION mode');
                this.assertEquals($draft.attr('media'), 'not all', 
                    'Draft should be disabled in PUBLICATION mode');
            } else {
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        }
    });
});
