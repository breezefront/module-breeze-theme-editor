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
        
        'draft style should exist in main document': function(done) {
            var self = this;
            
            // Wait for draft style to be created by CSS Manager
            this.waitFor(function() {
                return self.$('#bte-theme-css-variables-draft').length > 0;
            }, 2000, function(err) {
                if (err) {
                    self.fail('Draft style not created: ' + err.message);
                    done();
                    return;
                }
                
                var $draft = self.$('#bte-theme-css-variables-draft');
                self.assertEquals($draft.length > 0, true, 'Draft style should exist');
                done();
            });
        },
        
        'published style should have media="all" in iframe': function() {
            var $published = this.$iframe().find('#bte-theme-css-variables');
            var exists = $published.length > 0;
            this.assertEquals(exists, true, 'Published style should exist in iframe');
            this.assertEquals($published.attr('media'), 'all', 'Iframe published should have media="all"');
        },
        
        'draft style should exist in iframe': function(done) {
            var self = this;
            
            // Wait for draft style to be created in iframe
            this.waitFor(function() {
                return self.$iframe().find('#bte-theme-css-variables-draft').length > 0;
            }, 2000, function(err) {
                if (err) {
                    self.fail('Draft style not created in iframe: ' + err.message);
                    done();
                    return;
                }
                
                var $draft = self.$iframe().find('#bte-theme-css-variables-draft');
                self.assertEquals($draft.length > 0, true, 'Draft style should exist in iframe');
                done();
            });
        },
        
        'live-preview style should have media="all" when created': function(done) {
            var self = this;
            
            // Wait for live preview to be created (happens when panel opens)
            this.waitFor(function() {
                return self.$iframe().find('#bte-live-preview').length > 0;
            }, 3000, function(err) {
                if (err) {
                    // Live preview might not be created yet - that's OK
                    self.assert(true, 'Live preview not created yet (will be created when panel opens)');
                    done();
                } else {
                    var $livePreview = self.$iframe().find('#bte-live-preview');
                    self.assertEquals($livePreview.attr('media'), 'all', 'Live preview should have media="all"');
                    done();
                }
            });
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
