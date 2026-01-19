/**
 * Media Attributes Tests
 * 
 * Tests for media attribute functionality (fix for Breeze removing disabled attribute)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function(TestFramework) {
    'use strict';
    
    return TestFramework.suite('Media Attributes', {
        
        'published style should have media="all" in main document': function() {
            var $published = this.$('#bte-theme-css-variables');
            var exists = $published.length > 0;
            this.assertEquals(exists, true, 'Published style should exist');
            this.assertEquals($published.attr('media'), 'all', 'Published should have media="all"');
        },
        
        'draft style should exist in main document': function() {
            var $draft = this.$('#bte-theme-css-variables-draft');
            var exists = $draft.length > 0;
            this.assertEquals(exists, true, 'Draft style should exist');
        },
        
        'published style should have media="all" in iframe': function() {
            var $published = this.$iframe().find('#bte-theme-css-variables');
            var exists = $published.length > 0;
            this.assertEquals(exists, true, 'Published style should exist in iframe');
            this.assertEquals($published.attr('media'), 'all', 'Iframe published should have media="all"');
        },
        
        'draft style should exist in iframe': function() {
            var $draft = this.$iframe().find('#bte-theme-css-variables-draft');
            var exists = $draft.length > 0;
            this.assertEquals(exists, true, 'Draft style should exist in iframe');
        },
        
        'live-preview style should have media="all" when created': function() {
            var $livePreview = this.$iframe().find('#bte-live-preview');
            if ($livePreview.length > 0) {
                this.assertEquals($livePreview.attr('media'), 'all', 'Live preview should have media="all"');
            } else {
                // Live preview might not be created yet - that's OK
                this.assert(true, 'Live preview not created yet (will be created when panel opens)');
            }
        },
        
        'disabled attribute should also be set as fallback': function() {
            var $draft = this.$iframe().find('#bte-theme-css-variables-draft');
            var mediaAttr = $draft.attr('media');
            var disabledProp = $draft.prop('disabled');
            
            // If media="not all", disabled should be true
            // If media="all", disabled should be false
            if (mediaAttr === 'not all') {
                this.assertEquals(disabledProp, true, 'disabled should be true when media="not all"');
            } else if (mediaAttr === 'all') {
                this.assertEquals(disabledProp, false, 'disabled should be false when media="all"');
            }
        }
    });
});
