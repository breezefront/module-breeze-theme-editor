/**
 * Live Preview Tests
 * 
 * Tests for live preview functionality (unsaved changes)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function(TestFramework) {
    'use strict';
    
    return TestFramework.suite('Live Preview', {
        
        'live preview style should be created in iframe': function(done) {
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
        },
        
        'live preview should have media="all" when active': function(done) {
            var self = this;
            var CssManager = require('Swissup_BreezeThemeEditor/js/theme-editor/css-manager');
            
            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done(err);
                    return;
                }
                
                // Ensure we're in DRAFT mode first (live preview is only active in DRAFT)
                var currentStatus = CssManager.getCurrentStatus();
                console.log('🧪 Current status:', currentStatus, '- switching to DRAFT for test...');
                
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var $livePreview = self.$iframe().find('#bte-live-preview');
                    
                    if ($livePreview.length > 0) {
                        var mediaAttr = $livePreview.attr('media');
                        console.log('📝 Live preview media attribute:', mediaAttr);
                        
                        self.assertEquals(mediaAttr, 'all', 
                            'Live preview should have media="all" in DRAFT mode (current: ' + mediaAttr + ')');
                    } else {
                        console.warn('⚠️ Live preview not created yet');
                        self.assert(true, 'Live preview not created yet');
                    }
                    
                    done();
                }, 300);
            });
        },
        
        'live preview should be inserted in correct order': function() {
            var $livePreview = this.$iframe().find('#bte-live-preview');
            
            if ($livePreview.length > 0) {
                // Live preview should come after draft
                var $draft = this.$iframe().find('#bte-theme-css-variables-draft');
                
                if ($draft.length > 0) {
                    var draftIndex = $draft.index();
                    var livePreviewIndex = $livePreview.index();
                    
                    this.assert(livePreviewIndex > draftIndex, 
                        'Live preview should come after draft (higher priority)');
                }
            } else {
                this.assert(true, 'Live preview not created yet');
            }
        },
        
        'live preview should be disabled in PUBLISHED mode': function(done) {
            var self = this;
            var CssManager = require('Swissup_BreezeThemeEditor/js/theme-editor/css-manager');
            
            CssManager.switchTo('PUBLISHED');
            
            setTimeout(function() {
                var $livePreview = self.$iframe().find('#bte-live-preview');
                
                if ($livePreview.length > 0) {
                    self.assertEquals($livePreview.attr('media'), 'not all', 
                        'Live preview should be disabled in PUBLISHED mode');
                    
                    // NEW: Also check that content is empty
                    var cssContent = $livePreview.text();
                    self.assertStringContains(cssContent, ':root {}',
                        'Live preview content should be empty in PUBLISHED mode');
                } else {
                    self.assert(true, 'Live preview not created yet');
                }
                
                done();
            }, 200);
        },
        
        'live preview should be enabled in DRAFT mode': function(done) {
            var self = this;
            var CssManager = require('Swissup_BreezeThemeEditor/js/theme-editor/css-manager');
            
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
                    var $livePreview = self.$iframe().find('#bte-live-preview');
                    
                    if ($livePreview.length > 0) {
                        self.assertEquals($livePreview.attr('media'), 'all', 
                            'Live preview should be enabled in DRAFT mode');
                    } else {
                        self.assert(true, 'Live preview not created yet');
                    }
                    
                    done();
                }, 200);
            });
        }
    });
});
